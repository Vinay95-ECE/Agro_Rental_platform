"""
AgriRent Hub -- Plant Disease Detection Microservice v3.0
=========================================================
Endpoints:
  POST /detect          → single image file upload
  POST /detect-frame    → single base64 frame (webcam live)
  POST /detect-video    → video file upload (mp4/avi/mov)
  GET  /health          → service status

Key improvements over v2:
  • Real YOLO11n-cls confidence scores (no hardcoded values)
  • Strict invalid-image detection (selfies → low confidence + rejection)
  • Video frame-by-frame analysis with per-frame results
  • Webcam base64 frame endpoint
  • Gemini Vision fallback with real confidence extraction
  • Training-ready: saves to ml_service/models/plant_disease_yolo11.pt
"""

from fastapi import FastAPI, File, UploadFile, Form, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from contextlib import asynccontextmanager
from pydantic import BaseModel
import uvicorn
import base64
import io
import os
import sys
import json
import time
import traceback
import numpy as np
from PIL import Image, ImageDraw, ImageFont
from typing import Optional, List

# Force UTF-8 stdout on Windows to avoid cp1252 encoding errors
import sys
if sys.platform == "win32":
    sys.stdout.reconfigure(encoding="utf-8", errors="replace")
    sys.stderr.reconfigure(encoding="utf-8", errors="replace")

# Load .env from server root (picks up GEMINI_API_KEY etc.)
try:
    from dotenv import load_dotenv
    _env_path = os.path.join(os.path.dirname(__file__), '..', '.env')
    load_dotenv(dotenv_path=_env_path)
    print(f"[OK] Loaded .env from {os.path.abspath(_env_path)}")
except ImportError:
    pass  # dotenv not installed, rely on system env

# -- Optional heavy imports (graceful degradation) ------------------------------
try:
    import cv2
    CV2_AVAILABLE = True
except ImportError:
    CV2_AVAILABLE = False
    print("[WARN] opencv-python not installed -- video analysis disabled")

try:
    from ultralytics import YOLO
    YOLO_AVAILABLE = True
except ImportError:
    YOLO_AVAILABLE = False
    print("[WARN] ultralytics not installed -- running in Gemini-only mode")

# -- FastAPI App (lifespan-based startup) --------------------------------------
@asynccontextmanager
async def lifespan(app: FastAPI):
    # Startup
    print("[START] AgriRent Disease Detection Service v3.0 starting...")
    load_models()
    gemini_key = os.getenv("GEMINI_API_KEY", "")
    if gemini_key and gemini_key not in ("your_gemini_api_key", ""):
        print("[OK] Gemini Vision API configured")
    else:
        print("[WARN] No GEMINI_API_KEY set -- Gemini fallback disabled")
        print("      Add GEMINI_API_KEY=your_key to server/.env to enable cloud analysis")
    print("[READY] Service running on http://0.0.0.0:5002")
    yield
    print("[STOP] Disease Detection Service shutting down")

app = FastAPI(title="AgriRent Disease Detection API", version="3.0", lifespan=lifespan)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"],
)

# -- Globals --------------------------------------------------------------------
disease_model = None       # YOLO11n-cls trained on PlantVillage
MODELS_DIR = os.path.join(os.path.dirname(__file__), "models")

# -- PlantVillage 38-class labels -----------------------------------------------
PLANT_VILLAGE_CLASSES = [
    "Apple___Apple_scab", "Apple___Black_rot", "Apple___Cedar_apple_rust", "Apple___healthy",
    "Blueberry___healthy",
    "Cherry_(including_sour)___Powdery_mildew", "Cherry_(including_sour)___healthy",
    "Corn_(maize)___Cercospora_leaf_spot Gray_leaf_spot", "Corn_(maize)___Common_rust_",
    "Corn_(maize)___Northern_Leaf_Blight", "Corn_(maize)___healthy",
    "Grape___Black_rot", "Grape___Esca_(Black_Measles)",
    "Grape___Leaf_blight_(Isariopsis_Leaf_Spot)", "Grape___healthy",
    "Orange___Haunglongbing_(Citrus_greening)",
    "Peach___Bacterial_spot", "Peach___healthy",
    "Pepper,_bell___Bacterial_spot", "Pepper,_bell___healthy",
    "Potato___Early_blight", "Potato___Late_blight", "Potato___healthy",
    "Raspberry___healthy",
    "Soybean___healthy",
    "Squash___Powdery_mildew",
    "Strawberry___Leaf_scorch", "Strawberry___healthy",
    "Tomato___Bacterial_spot", "Tomato___Early_blight", "Tomato___Late_blight",
    "Tomato___Leaf_Mold", "Tomato___Septoria_leaf_spot",
    "Tomato___Spider_mites Two-spotted_spider_mite", "Tomato___Target_Spot",
    "Tomato___Tomato_Yellow_Leaf_Curl_Virus", "Tomato___Tomato_mosaic_virus",
    "Tomato___healthy",
]

# -- Disease treatment database -------------------------------------------------
DISEASE_TREATMENTS = {
    "Tomato___Early_blight": {
        "diseaseName": "Early Blight (Alternaria solani)",
        "severity": "High",
        "explanation": "Fungal disease causing dark concentric ring lesions on older leaves, spreading upward. Causes 20–80% yield loss.",
        "treatment": "Apply Chlorothalonil 75% WP @ 2 g/L or Mancozeb 75% WP @ 2.5 g/L every 7–10 days.",
        "fertilizer": "Calcium nitrate @ 10 g/L foliar spray. Potassium @ 60 kg/ha boosts resistance.",
        "pesticide": "Mancozeb (Dithane M-45) or Iprodione 50% WP @ 1.5 g/L water.",
        "prevention": "Remove infected leaves. Use drip irrigation. Maintain proper plant spacing. Rotate crops.",
    },
    "Tomato___Late_blight": {
        "diseaseName": "Late Blight (Phytophthora infestans)",
        "severity": "Severe",
        "explanation": "Water-mould causing dark water-soaked lesions, spreads rapidly in humid conditions. Can destroy entire crops.",
        "treatment": "Apply Metalaxyl + Mancozeb (Ridomil Gold) @ 2.5 g/L. Repeat every 7 days.",
        "fertilizer": "Increase Potassium @ 80 kg/ha. Calcium @ 40 kg/ha strengthens cell walls.",
        "pesticide": "Metalaxyl-M 4% + Mancozeb 64% (Ridomil Gold MZ) or Cymoxanil + Mancozeb.",
        "prevention": "Plant certified seeds. Ensure good drainage. Avoid overhead irrigation.",
    },
    "Tomato___Bacterial_spot": {
        "diseaseName": "Bacterial Spot (Xanthomonas campestris)",
        "severity": "Moderate",
        "explanation": "Bacterial infection causing small dark water-soaked spots on leaves and fruits, reducing marketability.",
        "treatment": "Spray Copper hydroxide 77% WP @ 2 g/L. Apply Streptomycin sulfate @ 0.5 g/L.",
        "fertilizer": "Foliar spray of Zinc sulphate 0.5% to boost immunity.",
        "pesticide": "Copper-based bactericides (Kocide 3000) @ 2–3 g/L every 10 days.",
        "prevention": "Use certified disease-free seeds. Avoid working in wet fields. Rotate crops.",
    },
    "Tomato___Leaf_Mold": {
        "diseaseName": "Leaf Mold (Passalora fulva)",
        "severity": "Moderate",
        "explanation": "Fungal disease producing pale yellow spots on upper leaf surface with olive-brown mold beneath.",
        "treatment": "Apply Chlorothalonil 75% WP @ 2 g/L or Copper oxychloride @ 3 g/L every 10 days.",
        "fertilizer": "Reduce nitrogen application. Apply potassium to strengthen plant defense.",
        "pesticide": "Mancozeb 75% WP or Tebuconazole 250 EC @ 1 mL/L water.",
        "prevention": "Improve ventilation. Reduce humidity. Remove infected leaves promptly.",
    },
    "Tomato___Septoria_leaf_spot": {
        "diseaseName": "Septoria Leaf Spot (Septoria lycopersici)",
        "severity": "Moderate",
        "explanation": "Fungal disease with small circular spots with dark borders and light gray centers on lower leaves.",
        "treatment": "Apply Chlorothalonil @ 2 g/L or Mancozeb 75% WP @ 2.5 g/L every 7–10 days.",
        "fertilizer": "Balanced NPK fertilization. Avoid excessive nitrogen.",
        "pesticide": "Copper-based fungicides or Azoxystrobin 23% SC @ 1 mL/L.",
        "prevention": "Remove infected plant material. Stake plants for better air circulation.",
    },
    "Tomato___Target_Spot": {
        "diseaseName": "Target Spot (Corynespora cassiicola)",
        "severity": "High",
        "explanation": "Fungal disease causing concentric ring target-like spots on leaves, stems and fruits.",
        "treatment": "Spray Flutriafol or Tebuconazole 250 EC @ 1 mL/L at first signs.",
        "fertilizer": "Reduce nitrogen. Increase potassium and calcium for resistance.",
        "pesticide": "Pyraclostrobin + Boscalid (Pristine) or Azoxystrobin @ 1 mL/L.",
        "prevention": "Avoid dense planting. Use drip irrigation. Remove crop debris after harvest.",
    },
    "Tomato___Tomato_Yellow_Leaf_Curl_Virus": {
        "diseaseName": "Tomato Yellow Leaf Curl Virus (TYLCV)",
        "severity": "Severe",
        "explanation": "Viral disease spread by whiteflies causing leaf curling, yellowing and severe yield reduction up to 100%.",
        "treatment": "No cure for infected plants. Control whitefly vectors immediately with insecticides.",
        "fertilizer": "Foliar spray of micronutrients to boost plant immunity.",
        "pesticide": "Imidacloprid 17.8% SL @ 0.5 mL/L or Thiamethoxam 25% WG @ 0.3 g/L for whitefly control.",
        "prevention": "Use virus-resistant varieties. Install yellow sticky traps. Apply reflective mulch.",
    },
    "Tomato___Tomato_mosaic_virus": {
        "diseaseName": "Tomato Mosaic Virus (ToMV)",
        "severity": "High",
        "explanation": "Viral disease causing mosaic pattern of light and dark green on leaves, stunted growth and reduced fruit quality.",
        "treatment": "Remove and destroy infected plants. No chemical cure available.",
        "fertilizer": "Balanced nutrition to maintain plant vigor. Avoid excess nitrogen.",
        "pesticide": "Control aphid vectors with Imidacloprid @ 0.5 mL/L or Pymetrozine.",
        "prevention": "Use certified virus-free seeds. Disinfect tools. Control aphid populations.",
    },
    "Tomato___Spider_mites Two-spotted_spider_mite": {
        "diseaseName": "Spider Mite Infestation (Tetranychus urticae)",
        "severity": "Moderate",
        "explanation": "Tiny arachnid pests causing stippled yellow/bronze discoloration on leaves with fine webbing underneath.",
        "treatment": "Apply Abamectin 1.9% EC @ 1 mL/L or Bifenazate 43% SC @ 2 mL/L. Repeat every 7 days.",
        "fertilizer": "Foliar spray of Silica @ 0.2% to strengthen leaf cell walls against mites.",
        "pesticide": "Spiromesifen (Oberon) 24% SC or Hexythiazox 5.45% EC @ 1 mL/L.",
        "prevention": "Avoid water stress. Dust control. Introduce predatory mites (Phytoseiidae).",
    },
    "Tomato___healthy": {
        "diseaseName": "No Disease Detected -- Healthy Plant [OK]",
        "severity": "Healthy",
        "explanation": "The plant appears healthy with no visible signs of disease or pest damage.",
        "treatment": "No treatment required. Maintain regular watering and balanced fertilization.",
        "fertilizer": "Continue balanced NPK (60:30:30 kg/ha). Foliar spray micronutrients monthly.",
        "pesticide": "Preventive spray of Mancozeb 75% WP @ 2 g/L monthly as protection.",
        "prevention": "Monitor weekly for early symptoms. Maintain crop rotation. Ensure good drainage.",
    },
    "Potato___Early_blight": {
        "diseaseName": "Early Blight (Alternaria solani)",
        "severity": "Moderate",
        "explanation": "Fungal disease causing dark brown concentric ring lesions on older leaves.",
        "treatment": "Apply Mancozeb 75% WP @ 2.5 g/L or Chlorothalonil 75% WP @ 2 g/L every 7–10 days.",
        "fertilizer": "Adequate Potassium (80 kg/ha) to boost immunity. Avoid excess nitrogen.",
        "pesticide": "Propiconazole 25% EC or Tebuconazole 250 EC @ 1 mL/L.",
        "prevention": "Use certified seed tubers. Maintain proper plant spacing. Remove infected foliage.",
    },
    "Potato___Late_blight": {
        "diseaseName": "Late Blight (Phytophthora infestans)",
        "severity": "Severe",
        "explanation": "Most destructive potato disease with dark water-soaked lesions spreading rapidly in cool humid conditions.",
        "treatment": "Apply Metalaxyl + Mancozeb (Ridomil Gold) @ 2.5 g/L preventively. Apply every 7 days.",
        "fertilizer": "Potassium @ 80 kg/ha. Calcium @ 40 kg/ha strengthens cell walls.",
        "pesticide": "Metalaxyl-M 4% + Mancozeb 64% or Cymoxanil + Mancozeb.",
        "prevention": "Plant certified disease-free seed tubers. Ensure good drainage. Avoid overhead irrigation.",
    },
    "Potato___healthy": {
        "diseaseName": "No Disease Detected -- Healthy Plant [OK]",
        "severity": "Healthy",
        "explanation": "Potato plant appears healthy with no visible disease symptoms.",
        "treatment": "No treatment needed. Continue standard care.",
        "fertilizer": "NPK 120:60:80 kg/ha. Hilling at 30 and 60 days after planting.",
        "pesticide": "Preventive Mancozeb spray every 15 days during high humidity.",
        "prevention": "Monitor for late blight weekly during monsoon. Ensure good drainage.",
    },
    "Corn_(maize)___Cercospora_leaf_spot Gray_leaf_spot": {
        "diseaseName": "Grey Leaf Spot (Cercospora zeae-maydis)",
        "severity": "Moderate",
        "explanation": "Fungal blight producing rectangular gray spots on leaves, reducing yield by 30–50%.",
        "treatment": "Apply Azoxystrobin 23% SC or Tebuconazole 250 EC @ 0.1% at VT/R1 growth stage.",
        "fertilizer": "Urea @ 80 kg/ha in split doses. Balanced NPK (120:60:60) strengthens cell walls.",
        "pesticide": "Strobilurin fungicides (Quadris) or Triazole @ 0.5–1 mL/L water.",
        "prevention": "Till crop residue post-harvest. Plant resistant hybrids (DKC 9144).",
    },
    "Corn_(maize)___Common_rust_": {
        "diseaseName": "Common Rust (Puccinia sorghi)",
        "severity": "Moderate",
        "explanation": "Fungal disease causing circular to elongated pustules on both leaf surfaces.",
        "treatment": "Apply Propiconazole 25% EC @ 1 mL/L or Tebuconazole @ 1 mL/L at first sign.",
        "fertilizer": "Balanced NPK with adequate Potassium to boost immunity.",
        "pesticide": "Mancozeb 75% WP @ 2 g/L or Azoxystrobin 23% SC @ 1 mL/L.",
        "prevention": "Plant rust-resistant hybrids. Monitor during warm/humid periods.",
    },
    "Corn_(maize)___Northern_Leaf_Blight": {
        "diseaseName": "Northern Leaf Blight (Setosphaeria turcica)",
        "severity": "High",
        "explanation": "Fungal disease causing long cigar-shaped grayish-green lesions on leaves.",
        "treatment": "Apply Azoxystrobin + Propiconazole (Quilt Xcel) or Pyraclostrobin @ 1 mL/L.",
        "fertilizer": "Adequate Nitrogen in split doses. Silicon foliar spray for resistance.",
        "pesticide": "Trifloxystrobin (Flint) 50% WG @ 0.15 g/L or Propiconazole 25% EC.",
        "prevention": "Use resistant hybrids. Rotate with non-host crops. Till crop debris.",
    },
    "Corn_(maize)___healthy": {
        "diseaseName": "No Disease Detected -- Healthy Plant [OK]",
        "severity": "Healthy",
        "explanation": "Corn/Maize plant appears healthy with no visible disease symptoms.",
        "treatment": "No treatment required.",
        "fertilizer": "NPK 150:75:60 kg/ha. Top dress urea at knee-high and tasseling stage.",
        "pesticide": "Preventive Mancozeb spray during high humidity periods.",
        "prevention": "Monitor weekly. Maintain proper plant density. Rotate crops annually.",
    },
    "Apple___Apple_scab": {
        "diseaseName": "Apple Scab (Venturia inaequalis)",
        "severity": "High",
        "explanation": "Fungal disease causing olive-green to black scab lesions on leaves and fruits.",
        "treatment": "Apply Captan 50% WP @ 2 g/L or Myclobutanil 10% WP @ 1 g/L every 10–14 days.",
        "fertilizer": "Balanced NPK. Avoid excess nitrogen.",
        "pesticide": "Difenoconazole (Score) or Trifloxystrobin every 14 days.",
        "prevention": "Remove fallen leaves. Plant resistant varieties. Prune for air circulation.",
    },
    "Apple___Black_rot": {
        "diseaseName": "Black Rot (Botryosphaeria obtusa)",
        "severity": "High",
        "explanation": "Fungal disease causing rotting of fruits with concentric rings and leaf spots.",
        "treatment": "Apply Captan 50% WP @ 2 g/L or Thiophanate-methyl 70% WP @ 1 g/L.",
        "fertilizer": "Balanced calcium nutrition to strengthen fruit skin.",
        "pesticide": "Ziram 27% SC or Mancozeb 75% WP @ 2.5 g/L.",
        "prevention": "Remove mummified fruits and dead wood. Prune regularly.",
    },
    "Apple___Cedar_apple_rust": {
        "diseaseName": "Cedar Apple Rust (Gymnosporangium juniperi-virginianae)",
        "severity": "Moderate",
        "explanation": "Fungal disease causing bright orange-yellow spots on leaves and fruits.",
        "treatment": "Apply Myclobutanil or Propiconazole at bud break and repeat every 7–10 days.",
        "fertilizer": "Adequate Potassium and Calcium to strengthen plant defense.",
        "pesticide": "Mancozeb 75% WP @ 2.5 g/L or Trifloxystrobin @ 0.5 mL/L.",
        "prevention": "Remove nearby cedar/juniper trees. Plant rust-resistant apple varieties.",
    },
    "Apple___healthy": {
        "diseaseName": "No Disease Detected -- Healthy Plant [OK]",
        "severity": "Healthy",
        "explanation": "Apple plant appears healthy.",
        "treatment": "No treatment required.",
        "fertilizer": "Balanced NPK with Calcium and Boron spray at flowering.",
        "pesticide": "Preventive copper spray during dormant period.",
        "prevention": "Annual pruning. Monitor for scab and fire blight.",
    },
    "Grape___Black_rot": {
        "diseaseName": "Grape Black Rot (Guignardia bidwellii)",
        "severity": "High",
        "explanation": "Fungal disease causing black rotted berries and circular brown leaf spots with black margins.",
        "treatment": "Apply Myclobutanil (Rally) @ 1 g/L or Mancozeb 75% WP @ 2 g/L from budbreak.",
        "fertilizer": "Balanced NPK. Potassium @ 60 kg/ha strengthens berry skin.",
        "pesticide": "Captan 50% WP or Ziram 27% SC @ 2.5 g/L every 10–14 days.",
        "prevention": "Remove mummified berries. Ensure good canopy ventilation. Prune in dry weather.",
    },
    "Grape___Esca_(Black_Measles)": {
        "diseaseName": "Grape Esca / Black Measles (Phaeoacremonium spp.)",
        "severity": "Severe",
        "explanation": "Fungal trunk disease causing tiger-stripe leaf pattern and berry spotting. Long-term vine decline.",
        "treatment": "No cure -- remove and destroy infected wood. Apply wound sealant after pruning.",
        "fertilizer": "Balanced nutrition to maintain vine vigor.",
        "pesticide": "Sodium arsenite (restricted) or Thiophanate-methyl trunk injection.",
        "prevention": "Prune during dry periods. Seal pruning wounds. Plant certified vines.",
    },
    "Grape___healthy": {
        "diseaseName": "No Disease Detected -- Healthy Plant [OK]",
        "severity": "Healthy",
        "explanation": "Grape vine appears healthy.",
        "treatment": "No treatment required.",
        "fertilizer": "NPK 80:40:80 kg/ha. Boron @ 2 kg/ha at flowering.",
        "pesticide": "Preventive copper + sulfur spray during humid season.",
        "prevention": "Monitor weekly. Maintain canopy management. Avoid overhead irrigation.",
    },
    "Soybean___healthy": {
        "diseaseName": "No Disease Detected -- Healthy Plant [OK]",
        "severity": "Healthy",
        "explanation": "Soybean plant appears healthy.",
        "treatment": "No treatment required.",
        "fertilizer": "NPK 30:80:40 kg/ha (low N as soybean fixes nitrogen). Rhizobium inoculant at sowing.",
        "pesticide": "Preventive copper-based spray during high humidity.",
        "prevention": "Monitor for rust and pod borer. Rotate with non-legume crops.",
    },
    "Strawberry___Leaf_scorch": {
        "diseaseName": "Strawberry Leaf Scorch (Diplocarpon earlianum)",
        "severity": "Moderate",
        "explanation": "Fungal disease causing small purple/red spots that enlarge to scorched lesions on strawberry leaves.",
        "treatment": "Apply Captan 50% WP @ 2 g/L or Myclobutanil @ 1 g/L every 10 days.",
        "fertilizer": "Balanced NPK. Potassium @ 40 kg/ha to strengthen leaf tissue.",
        "pesticide": "Azoxystrobin 23% SC @ 1 mL/L or Pyraclostrobin.",
        "prevention": "Remove and destroy infected leaves. Ensure good air circulation. Avoid wetting foliage.",
    },
    "Strawberry___healthy": {
        "diseaseName": "No Disease Detected -- Healthy Plant [OK]",
        "severity": "Healthy",
        "explanation": "Strawberry plant appears healthy.",
        "treatment": "No treatment required.",
        "fertilizer": "NPK 80:40:60 kg/ha. Calcium foliar spray at fruit set.",
        "pesticide": "Preventive Captan spray monthly during wet periods.",
        "prevention": "Monitor for grey mold and leaf scorch. Maintain mulch cover.",
    },
    "Peach___Bacterial_spot": {
        "diseaseName": "Bacterial Spot (Xanthomonas arboricola pv. pruni)",
        "severity": "High",
        "explanation": "Bacterial disease causing water-soaked spots on leaves and fruits, leading to defoliation and fruit defects.",
        "treatment": "Apply Copper hydroxide @ 2 g/L from green tip through cover sprays.",
        "fertilizer": "Balanced nutrition. Avoid excess nitrogen. Calcium foliar spray.",
        "pesticide": "Oxytetracycline @ 0.5 g/L or Copper-based bactericides every 10 days.",
        "prevention": "Plant resistant varieties. Avoid overhead irrigation. Remove infected material.",
    },
    "Peach___healthy": {
        "diseaseName": "No Disease Detected -- Healthy Plant [OK]",
        "severity": "Healthy",
        "explanation": "Peach tree appears healthy.",
        "treatment": "No treatment required.",
        "fertilizer": "NPK 100:50:70 kg/ha. Zinc and Boron spray at pink bud stage.",
        "pesticide": "Dormant copper spray to prevent bacterial spot.",
        "prevention": "Annual pruning for air circulation. Monitor for brown rot at harvest.",
    },
    "Pepper,_bell___Bacterial_spot": {
        "diseaseName": "Bacterial Spot on Pepper (Xanthomonas campestris)",
        "severity": "Moderate",
        "explanation": "Bacterial disease causing small, water-soaked spots on leaves and fruits.",
        "treatment": "Spray Copper hydroxide 77% WP @ 2 g/L. Apply Streptomycin 0.5 g/L at 7-day intervals.",
        "fertilizer": "Balanced NPK. Calcium foliar spray to strengthen fruit walls.",
        "pesticide": "Copper-based bactericides. Avoid overhead irrigation during spray.",
        "prevention": "Use certified seeds. Avoid working in wet conditions. Rotate crops.",
    },
    "Pepper,_bell___healthy": {
        "diseaseName": "No Disease Detected -- Healthy Plant [OK]",
        "severity": "Healthy",
        "explanation": "Bell pepper plant appears healthy.",
        "treatment": "No treatment required.",
        "fertilizer": "NPK 100:50:80 kg/ha. Boron spray at flowering.",
        "pesticide": "Preventive copper spray monthly.",
        "prevention": "Monitor for anthracnose and bacterial spot. Maintain good drainage.",
    },
    "Orange___Haunglongbing_(Citrus_greening)": {
        "diseaseName": "Citrus Greening / Huanglongbing (Candidatus Liberibacter)",
        "severity": "Severe",
        "explanation": "Devastating bacterial disease spread by psyllids causing asymmetric leaf yellowing, misshapen bitter fruits. No cure.",
        "treatment": "Remove and destroy infected trees. No chemical treatment available.",
        "fertilizer": "Foliar micronutrient sprays to maintain vigor of remaining trees.",
        "pesticide": "Imidacloprid @ 0.5 mL/L or Thiamethoxam to control psyllid vectors.",
        "prevention": "Plant certified disease-free budwood. Control Asian citrus psyllid populations.",
    },
    "Squash___Powdery_mildew": {
        "diseaseName": "Powdery Mildew on Squash (Podosphaera xanthii)",
        "severity": "Moderate",
        "explanation": "Fungal disease causing white powdery coating on leaf surfaces, reducing photosynthesis.",
        "treatment": "Apply Sulfur 80% WP @ 3 g/L or Myclobutanil @ 1 g/L. Repeat every 7 days.",
        "fertilizer": "Balanced NPK. Avoid excess nitrogen which promotes susceptibility.",
        "pesticide": "Potassium bicarbonate @ 5 g/L or Azoxystrobin 23% SC @ 1 mL/L.",
        "prevention": "Plant resistant varieties. Ensure good air circulation. Avoid overhead irrigation.",
    },
    "Cherry_(including_sour)___Powdery_mildew": {
        "diseaseName": "Cherry Powdery Mildew (Podosphaera clandestina)",
        "severity": "Moderate",
        "explanation": "Fungal disease producing white powdery growth on young leaves and shoots.",
        "treatment": "Apply Myclobutanil (Rally) @ 1 g/L or Sulfur 80% WP @ 3 g/L every 10–14 days.",
        "fertilizer": "Balanced NPK. Avoid excess nitrogen which promotes succulent growth.",
        "pesticide": "Trifloxystrobin (Flint) 50% WG or Azoxystrobin @ 1 mL/L.",
        "prevention": "Prune for air circulation. Plant resistant varieties. Remove infected shoots.",
    },
    "Cherry_(including_sour)___healthy": {
        "diseaseName": "No Disease Detected -- Healthy Plant [OK]",
        "severity": "Healthy",
        "explanation": "Cherry tree appears healthy.",
        "treatment": "No treatment required.",
        "fertilizer": "NPK 100:50:80 kg/ha. Calcium and Boron at full bloom.",
        "pesticide": "Preventive copper spray at dormant season.",
        "prevention": "Monitor for brown rot and powdery mildew at bloom.",
    },
    "Blueberry___healthy": {
        "diseaseName": "No Disease Detected -- Healthy Plant [OK]",
        "severity": "Healthy",
        "explanation": "Blueberry plant appears healthy.",
        "treatment": "No treatment required.",
        "fertilizer": "Acid fertilizer (Ammonium sulfate) @ 100 g/plant. Maintain soil pH 4.5–5.5.",
        "pesticide": "Preventive copper spray in spring.",
        "prevention": "Monitor for mummy berry disease. Maintain good drainage.",
    },
    "Raspberry___healthy": {
        "diseaseName": "No Disease Detected -- Healthy Plant [OK]",
        "severity": "Healthy",
        "explanation": "Raspberry plant appears healthy.",
        "treatment": "No treatment required.",
        "fertilizer": "NPK 60:40:60 kg/ha. Mulch with straw to maintain moisture.",
        "pesticide": "Preventive Captan spray at bloom.",
        "prevention": "Remove old canes after fruiting. Monitor for cane blight.",
    },
}

# -- Image validation -----------------------------------------------------------

def analyze_image_quality(image: Image.Image):
    """
    Returns (is_plant: bool, confidence: float, reason: str, scores: dict)
    Confidence range: 0.0–1.0
    """
    img = np.array(image.convert("RGB"), dtype=np.float32)
    r, g, b = img[:, :, 0], img[:, :, 1], img[:, :, 2]
    total_pixels = r.size

    # -- Green dominance (healthy leaves) --------------------------------------
    green_mask = (g > r + 10) & (g > b + 8) & (g > 50)
    green_ratio = green_mask.sum() / total_pixels

    # -- Diseased / yellow-brown leaves ----------------------------------------
    # Yellow: high R and G, low B
    yellow_mask = (r > 120) & (g > 90) & (b < 90) & (r > b + 40)
    yellow_ratio = yellow_mask.sum() / total_pixels

    # Brown: moderate R, lower G, low B
    brown_mask = (r > 80) & (r < 200) & (g > 40) & (g < 150) & (b < 80) & (r > g + 20)
    brown_ratio = brown_mask.sum() / total_pixels

    # -- Skin tone detection ----------------------------------------------------
    # Standard skin tone heuristic
    skin_mask = (
        (r > 95) & (g > 40) & (b > 20) &
        (r > g) & (r > b) &
        (np.abs(r - g) > 15) & (r - b > 15) &
        (r < 240) & (g < 200)
    )
    skin_ratio = skin_mask.sum() / total_pixels

    # -- Texture complexity (leaves have fine texture) --------------------------
    gray = (0.299 * r + 0.587 * g + 0.114 * b).astype(np.uint8)
    # Compute gradient magnitude
    gy = np.abs(np.diff(gray.astype(np.float32), axis=0))
    gx = np.abs(np.diff(gray.astype(np.float32), axis=1))
    texture = float(np.mean(gy) + np.mean(gx)) / 2.0  # 0-255 range

    # -- Blue/indoor background detection --------------------------------------
    blue_mask = (b > r + 30) & (b > g + 10) & (b > 80)
    blue_ratio = blue_mask.sum() / total_pixels

    plant_color_ratio = green_ratio + yellow_ratio * 0.6 + brown_ratio * 0.4

    scores = {
        "green_ratio": round(float(green_ratio), 3),
        "yellow_ratio": round(float(yellow_ratio), 3),
        "brown_ratio": round(float(brown_ratio), 3),
        "plant_color_ratio": round(float(plant_color_ratio), 3),
        "skin_ratio": round(float(skin_ratio), 3),
        "blue_ratio": round(float(blue_ratio), 3),
        "texture": round(float(texture), 2),
    }

    # -- Decision logic ---------------------------------------------------------
    # High skin → selfie/human photo
    if skin_ratio > 0.20:
        conf = max(0.03, 0.15 - skin_ratio * 0.5)
        return False, conf, f"Human skin detected ({skin_ratio*100:.0f}% skin pixels) -- not a plant image", scores

    # Some skin + low plant → selfie with some background
    if skin_ratio > 0.10 and plant_color_ratio < 0.15:
        conf = max(0.05, 0.20 - skin_ratio)
        return False, conf, f"Mostly non-plant content ({skin_ratio*100:.0f}% skin, {plant_color_ratio*100:.0f}% plant colors)", scores

    # Very low plant color → random non-plant photo (car, wall, etc.)
    if plant_color_ratio < 0.04 and skin_ratio < 0.08:
        conf = max(0.05, plant_color_ratio * 2)
        return False, conf, f"No plant-like colors detected ({plant_color_ratio*100:.0f}%)", scores

    # Moderate plant color -- borderline
    if plant_color_ratio < 0.08:
        conf = 0.35 + plant_color_ratio * 2
        return False, conf, f"Low plant-like colors ({plant_color_ratio*100:.0f}%)", scores

    # Good plant color ratio
    if plant_color_ratio >= 0.20:
        conf = min(0.92, 0.55 + plant_color_ratio * 1.5)
        return True, conf, f"Strong plant colors ({plant_color_ratio*100:.0f}% -- green:{green_ratio*100:.0f}% yellow/brown:{(yellow_ratio+brown_ratio)*100:.0f}%)", scores

    # Moderate -- probably plant
    conf = 0.45 + plant_color_ratio * 1.0
    return True, conf, f"Moderate plant colors ({plant_color_ratio*100:.0f}%)", scores


def draw_detection_overlay(image: Image.Image, detections: list, label: str, severity: str) -> Image.Image:
    """Draw bounding boxes and labels on the image."""
    img_copy = image.copy().convert("RGBA")
    draw = ImageDraw.Draw(img_copy)

    color_map = {
        "Severe": (255, 50, 50),
        "High": (255, 140, 0),
        "Moderate": (255, 210, 0),
        "Low": (100, 200, 80),
        "Healthy": (50, 220, 100),
        "Unknown": (150, 150, 200),
    }
    color = color_map.get(severity, (255, 210, 0))

    for det in detections:
        x1, y1, x2, y2 = det.get("bbox", [0, 0, image.width, image.height])
        conf_text = f"{det.get('confidence', 0):.1f}%"
        text = f"{det.get('class', label)[:25]} {conf_text}"

        # Box
        draw.rectangle([x1, y1, x2, y2], outline=color, width=3)
        # Label background
        label_w = len(text) * 7 + 4
        draw.rectangle([x1, max(0, y1 - 22), x1 + label_w, y1], fill=color)
        draw.text((x1 + 3, max(0, y1 - 20)), text, fill=(0, 0, 0))

    return img_copy.convert("RGB")


# -- Model loading --------------------------------------------------------------

def load_models():
    global disease_model
    if not YOLO_AVAILABLE:
        print("[WARN]  YOLO not available -- using Gemini Vision fallback only")
        return

    os.makedirs(MODELS_DIR, exist_ok=True)
    model_path = os.path.join(MODELS_DIR, "plant_disease_yolo11.pt")

    if os.path.exists(model_path):
        try:
            disease_model = YOLO(model_path)
            print(f"[OK] Loaded trained disease model: {model_path}")
        except Exception as e:
            print(f"[ERROR] Failed to load model: {e}")
    else:
        print("[WARN]  No trained model found at ml_service/models/plant_disease_yolo11.pt")
        print("   Run: python train_yolo11.py   to train the model")
        print("   Falling back to Gemini Vision API for analysis")


# -- Gemini Vision fallback (google.genai SDK) ---------------------------------

def analyze_with_gemini(b64_image: str, mime_type: str, crop_name: str):
    """Call Gemini Vision using the new google.genai SDK with real confidence."""
    gemini_key = os.getenv("GEMINI_API_KEY", "")
    if not gemini_key or gemini_key in ("your_gemini_api_key", "your_key", ""):
        return None

    prompt = "\n".join([
        f"You are an expert agricultural plant pathologist. Analyze this {crop_name} leaf/plant image.",
        "",
        "RULES:",
        "- If image has NO plant/leaf (selfie, face, car, wall etc): is_plant=false, confidence<15",
        "- Be HONEST about confidence. Do NOT always give high confidence.",
        "- Confidence = actual visual certainty 0-100",
        "",
        'Respond ONLY valid JSON (no markdown):',
        '{',
        '  "is_plant": true,',
        '  "diseaseName": "Full disease name",',
        '  "confidence": 78.5,',
        '  "severity": "Healthy|Low|Moderate|High|Severe|Unknown",',
        '  "explanation": "2-3 sentence scientific explanation",',
        '  "treatment": "Specific treatment with dosage",',
        '  "fertilizer": "Specific fertilizer recommendation",',
        '  "pesticide": "Specific pesticide/fungicide",',
        '  "prevention": "3-4 prevention methods",',
        '  "detected_crop": "crop name or none"',
        '}',
        "",
        "If NOT a plant: is_plant=false, confidence<15, severity=Unknown, diseaseName=Not a Plant Image -- Cannot Analyze",
        "If HEALTHY: severity=Healthy, diseaseName=No Disease Detected - Healthy Plant",
    ])

    # Try models in order (most quota-friendly first)
    models_to_try = [
        "gemini-1.5-flash",
        "gemini-1.5-flash-8b",
        "gemini-2.0-flash-lite",
        "gemini-2.0-flash",
    ]

    for model_name in models_to_try:
        try:
            from google import genai
            from google.genai import types

            client = genai.Client(api_key=gemini_key)
            image_part = types.Part.from_bytes(
                data=base64.b64decode(b64_image),
                mime_type=mime_type or "image/jpeg"
            )
            response = client.models.generate_content(
                model=model_name,
                contents=[prompt, image_part],
            )
            text = response.text.strip()
            cleaned = text.replace("```json", "").replace("```", "").strip()
            data = json.loads(cleaned)
            print(f"[OK] Gemini model: {model_name}, disease: {data.get('diseaseName','?')[:40]}, conf: {data.get('confidence')}")
            return data
        except Exception as e:
            err_str = str(e)
            if any(x in err_str for x in ["429", "quota", "rate limit", "RESOURCE_EXHAUSTED"]):
                print(f"[WARN] {model_name} quota exceeded, trying next model...")
                continue
            elif any(x in err_str.lower() for x in ["404", "not found", "unknown model"]):
                print(f"[WARN] {model_name} not available, trying next model...")
                continue
            else:
                print(f"Gemini Vision error ({model_name}): {err_str[:300]}")
                return None

    print("[WARN] All Gemini models quota exceeded -- falling back to heuristic.")
    return None


# -- Core detection logic -------------------------------------------------------

def run_detection(pil_image: Image.Image, crop_name: str) -> dict:
    """
    Main detection pipeline:
    1. Image quality validation (skin/plant heuristics)
    2. YOLO11 classification if model loaded
    3. Gemini Vision fallback
    4. Return structured result with REAL confidence
    """
    img_w, img_h = pil_image.width, pil_image.height

    # -- Step 1: Image validation -----------------------------------------------
    is_plant, plant_conf, plant_reason, pixel_scores = analyze_image_quality(pil_image)

    # Hard reject: clear non-plant with very low score
    if not is_plant and plant_conf < 0.15:
        return {
            "success": True,
            "is_plant": False,
            "plant_confidence": round(plant_conf * 100, 1),
            "plant_detection_reason": plant_reason,
            "pixel_scores": pixel_scores,
            "yolo_used": False,
            "predicted_class": None,
            "annotated_image": None,
            "diagnosis": {
                "diseaseName": "[ERROR] Invalid Image -- Not a Plant",
                "severity": "Unknown",
                "confidence": f"{round(plant_conf * 100, 1)}%",
                "explanation": f"The uploaded image does not appear to contain plant or crop material. {plant_reason}. Please upload a clear close-up photo of a plant leaf or crop showing symptoms.",
                "treatment": "Please retake the photo: use natural daylight, focus closely on the affected leaf.",
                "fertilizer": "N/A -- image must show a plant leaf",
                "pesticide": "N/A -- image must show a plant leaf",
                "prevention": "Tips: (1) Natural daylight (2) Close-up of leaf (3) Include 2-3 leaves showing symptoms (4) Avoid blurry/dark images",
                "bboxes": [],
                "analysisMethod": "heuristic-validation",
            }
        }

    # -- Step 2: YOLO11 classification -----------------------------------------
    detections = []
    predicted_class = None
    yolo_confidence = 0.0
    yolo_used = False

    if disease_model is not None:
        yolo_used = True
        try:
            results = disease_model.predict(source=pil_image, conf=0.10, verbose=False)
            if results and len(results) > 0:
                result = results[0]

                if hasattr(result, 'probs') and result.probs is not None:
                    # Classification model
                    top1_idx = result.probs.top1
                    top1_conf = float(result.probs.top1conf.item())
                    predicted_class = result.names[top1_idx]
                    yolo_confidence = round(top1_conf * 100, 1)

                    # Only accept if confidence is reasonable
                    if top1_conf > 0.15:
                        margin = int(min(img_w, img_h) * 0.06)
                        detections.append({
                            "class": predicted_class,
                            "confidence": yolo_confidence,
                            "bbox": [margin, margin, img_w - margin, img_h - margin],
                        })
                    else:
                        predicted_class = None  # Not confident enough

                elif hasattr(result, 'boxes') and result.boxes is not None and len(result.boxes) > 0:
                    # Detection model with bboxes
                    for box in result.boxes:
                        cls_id = int(box.cls.item())
                        conf = float(box.conf.item())
                        xyxy = box.xyxy[0].tolist()
                        class_name = result.names.get(cls_id, f"class_{cls_id}")
                        detections.append({
                            "class": class_name,
                            "confidence": round(conf * 100, 1),
                            "bbox": [int(v) for v in xyxy],
                        })
                    if detections:
                        best = max(detections, key=lambda d: d["confidence"])
                        predicted_class = best["class"]
                        yolo_confidence = best["confidence"]
        except Exception as e:
            print(f"YOLO prediction error: {e}")
            yolo_used = False

    # -- Step 3: Gemini fallback if YOLO not available or not confident ---------
    gemini_result = None
    if not yolo_used or predicted_class is None:
        b64 = base64.b64encode(
            _pil_to_bytes(pil_image)
        ).decode()
        gemini_result = analyze_with_gemini(b64, "image/jpeg", crop_name)

        if gemini_result:
            # Override is_plant based on Gemini
            if not gemini_result.get("is_plant", True):
                conf_val = float(gemini_result.get("confidence", 10.0))
                return {
                    "success": True,
                    "is_plant": False,
                    "plant_confidence": round(conf_val, 1),
                    "plant_detection_reason": "Gemini Vision: " + gemini_result.get("explanation", "Not a plant image"),
                    "pixel_scores": pixel_scores,
                    "yolo_used": False,
                    "predicted_class": None,
                    "annotated_image": None,
                    "diagnosis": {
                        "diseaseName": "[ERROR] Invalid Image -- Not a Plant",
                        "severity": "Unknown",
                        "confidence": f"{round(conf_val, 1)}%",
                        "explanation": gemini_result.get("explanation", "Not a plant image."),
                        "treatment": "Please upload a clear photo of a plant leaf.",
                        "fertilizer": "N/A",
                        "pesticide": "N/A",
                        "prevention": "Use natural daylight, focus on affected leaf area.",
                        "bboxes": [],
                        "analysisMethod": "gemini-vision",
                    }
                }

            # Gemini says it is a plant
            gemini_conf = float(gemini_result.get("confidence", 55.0))
            # Annotate image with a region
            if gemini_conf > 30:
                margin = int(min(img_w, img_h) * 0.06)
                detections.append({
                    "class": gemini_result.get("diseaseName", "Disease Region")[:30],
                    "confidence": gemini_conf,
                    "bbox": [margin, margin, img_w - margin, img_h - margin],
                })

    # -- Step 4: Get treatment info ---------------------------------------------
    treatment_info = None
    final_confidence = 0.0
    analysis_method = "heuristic-analysis"

    if yolo_used and predicted_class and predicted_class in DISEASE_TREATMENTS:
        treatment_info = DISEASE_TREATMENTS[predicted_class]
        final_confidence = yolo_confidence
        analysis_method = "yolo11-classification"

    elif gemini_result and gemini_result.get("is_plant", True):
        # Use Gemini's full result
        treatment_info = {
            "diseaseName": gemini_result.get("diseaseName", "Unknown Disease"),
            "severity": gemini_result.get("severity", "Moderate"),
            "explanation": gemini_result.get("explanation", ""),
            "treatment": gemini_result.get("treatment", "Consult a local agronomist."),
            "fertilizer": gemini_result.get("fertilizer", "Balanced NPK recommended."),
            "pesticide": gemini_result.get("pesticide", "Consult local agricultural expert."),
            "prevention": gemini_result.get("prevention", "Monitor crops regularly."),
        }
        final_confidence = float(gemini_result.get("confidence", 55.0))
        analysis_method = "gemini-vision"

    # -- Step 5: Draw overlay ---------------------------------------------------
    annotated_b64 = None
    if detections and treatment_info:
        severity = treatment_info.get("severity", "Moderate")
        annotated_img = draw_detection_overlay(pil_image, detections, treatment_info.get("diseaseName", ""), severity)
        annotated_b64 = base64.b64encode(_pil_to_bytes(annotated_img)).decode()

    # -- Step 6: Build final response -------------------------------------------
    if treatment_info:
        return {
            "success": True,
            "is_plant": True,
            "plant_confidence": round(plant_conf * 100, 1),
            "plant_detection_reason": plant_reason,
            "pixel_scores": pixel_scores,
            "yolo_used": yolo_used,
            "predicted_class": predicted_class,
            "annotated_image": annotated_b64,
            "diagnosis": {
                **treatment_info,
                "confidence": f"{round(final_confidence, 1)}%",
                "bboxes": detections,
                "analysisMethod": analysis_method,
            }
        }

    # Plant detected but no model + no Gemini key
    return {
        "success": True,
        "is_plant": True,
        "plant_confidence": round(plant_conf * 100, 1),
        "plant_detection_reason": plant_reason,
        "pixel_scores": pixel_scores,
        "yolo_used": False,
        "predicted_class": None,
        "annotated_image": None,
        "diagnosis": {
            "diseaseName": "[WARN] Analysis Incomplete -- Setup Required",
            "severity": "Unknown",
            "confidence": f"{round(plant_conf * 40, 1)}%",
            "explanation": f"A plant/leaf was detected (plant score: {plant_conf*100:.0f}%) but no AI model is configured. Please either: (1) Train the YOLO model with `python train_yolo11.py`, or (2) Add a GEMINI_API_KEY to your .env file for cloud-based analysis.",
            "treatment": "Setup required: train YOLO model or configure Gemini API key.",
            "fertilizer": "Cannot recommend without accurate diagnosis.",
            "pesticide": "Cannot recommend without accurate diagnosis.",
            "prevention": "Please consult a local agricultural expert (Krishi Vigyan Kendra) for in-person diagnosis.",
            "bboxes": [],
            "analysisMethod": "heuristic-only",
        }
    }


def _pil_to_bytes(img: Image.Image) -> bytes:
    buf = io.BytesIO()
    img.save(buf, format="JPEG", quality=88)
    return buf.getvalue()


def _resize_image(img: Image.Image, max_size: int = 640) -> Image.Image:
    w, h = img.size
    if max(w, h) <= max_size:
        return img
    ratio = max_size / max(w, h)
    return img.resize((int(w * ratio), int(h * ratio)), Image.LANCZOS)





# -- Health endpoint ------------------------------------------------------------

@app.get("/health")
def health_check():
    _gemini_key = os.getenv("GEMINI_API_KEY", "")
    _gemini_ok = bool(_gemini_key) and _gemini_key not in ("your_gemini_api_key", "your_key", "")
    return {
        "status": "ok",
        "service": "AgriRent Disease Detector v3.0",
        "yolo_loaded": disease_model is not None,
        "cv2_available": CV2_AVAILABLE,
        "gemini_configured": _gemini_ok,
        "mode": (
            "yolo11-trained" if disease_model else
            "gemini-vision" if _gemini_ok else
            "heuristic-only"
        ),
        "model_path": os.path.join(MODELS_DIR, "plant_disease_yolo11.pt"),
        "tip": (
            "Add a real GEMINI_API_KEY to server/.env for AI-powered analysis" if not _gemini_ok and disease_model is None
            else "Run: python train_yolo11.py to train YOLO11 model for offline inference"
        ),
    }



# -- Image detect endpoint ------------------------------------------------------

@app.post("/detect")
async def detect_disease(
    image: UploadFile = File(...),
    crop_name: str = Form(default="Tomato"),
):
    """Analyze a single uploaded image file."""
    try:
        contents = await image.read()
        pil_image = Image.open(io.BytesIO(contents)).convert("RGB")
        pil_image = _resize_image(pil_image, 640)
        return run_detection(pil_image, crop_name)
    except Exception as e:
        print(f"[/detect] Error: {traceback.format_exc()}")
        raise HTTPException(status_code=500, detail=f"Detection failed: {str(e)}")


# -- Webcam frame endpoint ------------------------------------------------------

class FrameRequest(BaseModel):
    image_b64: str            # base64-encoded JPEG frame
    crop_name: str = "Tomato"
    mime_type: str = "image/jpeg"


@app.post("/detect-frame")
async def detect_frame(body: FrameRequest):
    """Analyze a single base64-encoded frame (webcam live detection)."""
    try:
        img_bytes = base64.b64decode(body.image_b64)
        pil_image = Image.open(io.BytesIO(img_bytes)).convert("RGB")
        pil_image = _resize_image(pil_image, 480)  # smaller for speed
        result = run_detection(pil_image, body.crop_name)
        # For webcam we skip the annotated image to save bandwidth (optional)
        return result
    except Exception as e:
        print(f"[/detect-frame] Error: {traceback.format_exc()}")
        raise HTTPException(status_code=500, detail=f"Frame detection failed: {str(e)}")


# -- Video detect endpoint ------------------------------------------------------

@app.post("/detect-video")
async def detect_video(
    video: UploadFile = File(...),
    crop_name: str = Form(default="Tomato"),
    sample_fps: float = Form(default=1.0),  # frames per second to sample
):
    """
    Analyze a video file. Samples frames at sample_fps and runs detection.
    Returns per-frame results + an overall summary.
    """
    if not CV2_AVAILABLE:
        raise HTTPException(
            status_code=503,
            detail="Video analysis requires opencv-python. Install with: pip install opencv-python-headless"
        )

    try:
        # Save video to a temp file
        video_bytes = await video.read()
        tmp_path = os.path.join(MODELS_DIR, f"tmp_video_{int(time.time())}.mp4")
        os.makedirs(MODELS_DIR, exist_ok=True)

        with open(tmp_path, "wb") as f:
            f.write(video_bytes)

        cap = cv2.VideoCapture(tmp_path)
        if not cap.isOpened():
            raise HTTPException(status_code=400, detail="Could not open video file.")

        fps = cap.get(cv2.CAP_PROP_FPS) or 25.0
        total_frames = int(cap.get(cv2.CAP_PROP_FRAME_COUNT))
        duration_s = total_frames / fps
        frame_interval = max(1, int(fps / max(0.1, sample_fps)))

        frame_results = []
        frame_idx = 0
        analyzed = 0
        max_frames = 30  # cap to avoid timeout

        while analyzed < max_frames:
            cap.set(cv2.CAP_PROP_POS_FRAMES, frame_idx)
            ret, frame = cap.read()
            if not ret:
                break

            # Convert BGR→RGB
            rgb_frame = cv2.cvtColor(frame, cv2.COLOR_BGR2RGB)
            pil_frame = Image.fromarray(rgb_frame)
            pil_frame = _resize_image(pil_frame, 480)

            result = run_detection(pil_frame, crop_name)
            timestamp_s = frame_idx / fps

            frame_results.append({
                "frame_index": frame_idx,
                "timestamp_s": round(timestamp_s, 2),
                "timestamp_str": f"{int(timestamp_s//60):02d}:{int(timestamp_s%60):02d}",
                "is_plant": result.get("is_plant", False),
                "diseaseName": result.get("diagnosis", {}).get("diseaseName", ""),
                "confidence": result.get("diagnosis", {}).get("confidence", "0%"),
                "severity": result.get("diagnosis", {}).get("severity", "Unknown"),
                "analysisMethod": result.get("diagnosis", {}).get("analysisMethod", ""),
            })

            frame_idx += frame_interval
            analyzed += 1

        cap.release()
        try:
            os.remove(tmp_path)
        except Exception:
            pass

        # Build summary: most common disease across frames
        plant_frames = [f for f in frame_results if f["is_plant"]]
        if plant_frames:
            from collections import Counter
            disease_counts = Counter(f["diseaseName"] for f in plant_frames)
            dominant_disease = disease_counts.most_common(1)[0][0]
            avg_conf = np.mean([
                float(f["confidence"].replace("%", ""))
                for f in plant_frames
                if f["confidence"] != "0%"
            ]) if plant_frames else 0.0
        else:
            dominant_disease = "No plant detected"
            avg_conf = 0.0

        return {
            "success": True,
            "video_info": {
                "duration_s": round(duration_s, 1),
                "total_frames": total_frames,
                "fps": round(fps, 1),
                "frames_analyzed": len(frame_results),
                "plant_frames": len(plant_frames),
            },
            "summary": {
                "dominant_disease": dominant_disease,
                "average_confidence": f"{round(avg_conf, 1)}%",
                "severity": plant_frames[0]["severity"] if plant_frames else "Unknown",
            },
            "frames": frame_results,
        }

    except HTTPException:
        raise
    except Exception as e:
        print(f"[/detect-video] Error: {traceback.format_exc()}")
        try:
            if os.path.exists(tmp_path):
                os.remove(tmp_path)
        except Exception:
            pass
        raise HTTPException(status_code=500, detail=f"Video analysis failed: {str(e)}")


# -- Entry point ----------------------------------------------------------------

if __name__ == "__main__":
    uvicorn.run(app, host="0.0.0.0", port=5002, log_level="info")
