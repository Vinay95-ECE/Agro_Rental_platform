"""
AgriRent Hub — YOLO11 Plant Disease Classifier Training Script
==============================================================
Downloads the PlantVillage dataset and trains YOLO11n-cls on it.

Usage:
  python train_yolo11.py

Requirements:
  pip install ultralytics kaggle gdown

Options (edit below):
  USE_KAGGLE   = True  → download from Kaggle (needs kaggle.json)
  USE_GDRIVE   = True  → download from Google Drive mirror (no auth)
  EPOCHS       = number of training epochs (50 recommended)
  IMG_SIZE     = image size (224 for classification)
"""

import os
import sys
import json
import shutil
import zipfile
import argparse
import time

MODELS_DIR = os.path.join(os.path.dirname(__file__), "models")
DATASET_DIR = os.path.join(os.path.dirname(__file__), "datasets")
MODEL_OUTPUT = os.path.join(MODELS_DIR, "plant_disease_yolo11.pt")

# ── Config ─────────────────────────────────────────────────────────────────────
EPOCHS = 50
IMG_SIZE = 224
BATCH_SIZE = 16
DEVICE = "0"  # '0' for GPU, 'cpu' for CPU

# Google Drive file ID for PlantVillage dataset zip (public mirror)
GDRIVE_FILE_ID = "1aBcZyXwVU"  # placeholder — update with real ID

# Kaggle dataset path
KAGGLE_DATASET = "emmarex/plantdisease"


def check_dependencies():
    """Ensure ultralytics is installed."""
    try:
        from ultralytics import YOLO
        print("✅ ultralytics installed")
        return True
    except ImportError:
        print("❌ ultralytics not installed!")
        print("   Install with: pip install ultralytics")
        return False


def download_via_kaggle():
    """Download PlantVillage dataset from Kaggle."""
    print("\n📥 Downloading PlantVillage dataset from Kaggle...")
    try:
        import kaggle
        os.makedirs(DATASET_DIR, exist_ok=True)
        kaggle.api.authenticate()
        kaggle.api.dataset_download_files(
            KAGGLE_DATASET,
            path=DATASET_DIR,
            unzip=True,
            quiet=False
        )
        print("✅ Dataset downloaded from Kaggle")
        return True
    except Exception as e:
        print(f"❌ Kaggle download failed: {e}")
        print("   Make sure you have ~/kaggle/kaggle.json with your API credentials")
        return False


def download_via_gdown():
    """Download PlantVillage dataset from Google Drive."""
    print("\n📥 Attempting Google Drive download...")
    try:
        import gdown
        os.makedirs(DATASET_DIR, exist_ok=True)
        zip_path = os.path.join(DATASET_DIR, "plantvillage.zip")

        # Public PlantVillage mirror on GDrive
        url = f"https://drive.google.com/uc?id={GDRIVE_FILE_ID}"
        gdown.download(url, zip_path, quiet=False)

        print("📦 Extracting...")
        with zipfile.ZipFile(zip_path, 'r') as z:
            z.extractall(DATASET_DIR)
        os.remove(zip_path)
        print("✅ Dataset extracted")
        return True
    except Exception as e:
        print(f"❌ GDrive download failed: {e}")
        return False


def find_dataset_root() -> str:
    """Find the PlantVillage dataset root directory."""
    # Common extraction patterns
    possible_roots = [
        os.path.join(DATASET_DIR, "PlantVillage"),
        os.path.join(DATASET_DIR, "plantvillage_dataset", "color"),
        os.path.join(DATASET_DIR, "dataset", "color"),
        os.path.join(DATASET_DIR, "color"),
        DATASET_DIR,
    ]

    for root in possible_roots:
        if os.path.isdir(root):
            # Check if it has class subdirectories
            subdirs = [d for d in os.listdir(root) if os.path.isdir(os.path.join(root, d))]
            if len(subdirs) >= 5:  # at least 5 classes
                print(f"✅ Found dataset at: {root} ({len(subdirs)} classes)")
                return root

    return None


def prepare_dataset_yaml(dataset_root: str) -> str:
    """
    YOLO classification training expects a flat structure:
      dataset_root/
        class1/
          img1.jpg ...
        class2/
          ...
    
    PlantVillage is already in this format. Just write the YAML.
    """
    yaml_path = os.path.join(DATASET_DIR, "plantvillage.yaml")
    # For cls models, just need the path
    content = f"""# PlantVillage Dataset for YOLO11 Classification
path: {dataset_root}
train: .
val: .
nc: 38
names:
  - Apple___Apple_scab
  - Apple___Black_rot
  - Apple___Cedar_apple_rust
  - Apple___healthy
  - Blueberry___healthy
  - Cherry_(including_sour)___Powdery_mildew
  - Cherry_(including_sour)___healthy
  - Corn_(maize)___Cercospora_leaf_spot Gray_leaf_spot
  - Corn_(maize)___Common_rust_
  - Corn_(maize)___Northern_Leaf_Blight
  - Corn_(maize)___healthy
  - Grape___Black_rot
  - Grape___Esca_(Black_Measles)
  - Grape___Leaf_blight_(Isariopsis_Leaf_Spot)
  - Grape___healthy
  - Orange___Haunglongbing_(Citrus_greening)
  - Peach___Bacterial_spot
  - Peach___healthy
  - Pepper,_bell___Bacterial_spot
  - Pepper,_bell___healthy
  - Potato___Early_blight
  - Potato___Late_blight
  - Potato___healthy
  - Raspberry___healthy
  - Soybean___healthy
  - Squash___Powdery_mildew
  - Strawberry___Leaf_scorch
  - Strawberry___healthy
  - Tomato___Bacterial_spot
  - Tomato___Early_blight
  - Tomato___Late_blight
  - Tomato___Leaf_Mold
  - Tomato___Septoria_leaf_spot
  - Tomato___Spider_mites Two-spotted_spider_mite
  - Tomato___Target_Spot
  - Tomato___Tomato_Yellow_Leaf_Curl_Virus
  - Tomato___Tomato_mosaic_virus
  - Tomato___healthy
"""
    with open(yaml_path, "w") as f:
        f.write(content)
    print(f"✅ Dataset YAML written to: {yaml_path}")
    return yaml_path


def train_yolo11(dataset_root: str):
    """Train YOLO11n-cls on PlantVillage dataset."""
    from ultralytics import YOLO

    os.makedirs(MODELS_DIR, exist_ok=True)

    print(f"\n🚀 Starting YOLO11n-cls training...")
    print(f"   Dataset: {dataset_root}")
    print(f"   Epochs:  {EPOCHS}")
    print(f"   Img size: {IMG_SIZE}")
    print(f"   Device:  {DEVICE}")
    print(f"   Output:  {MODEL_OUTPUT}")
    print()

    # Load YOLO11n-cls (nano classification model)
    model = YOLO("yolo11n-cls.pt")

    # Train
    results = model.train(
        data=dataset_root,
        epochs=EPOCHS,
        imgsz=IMG_SIZE,
        batch=BATCH_SIZE,
        device=DEVICE,
        project=MODELS_DIR,
        name="plant_disease_v1",
        exist_ok=True,
        patience=10,            # early stopping
        optimizer="AdamW",
        lr0=0.001,
        augment=True,
        cache=True,             # cache images for speed
        workers=4,
        verbose=True,
    )

    # Copy best weights to standard location
    best_weights = os.path.join(MODELS_DIR, "plant_disease_v1", "weights", "best.pt")
    if os.path.exists(best_weights):
        shutil.copy(best_weights, MODEL_OUTPUT)
        print(f"\n✅ Training complete! Model saved to: {MODEL_OUTPUT}")

        # Save training report
        report = {
            "training_complete": True,
            "timestamp": time.strftime("%Y-%m-%d %H:%M:%S"),
            "epochs": EPOCHS,
            "img_size": IMG_SIZE,
            "model_path": MODEL_OUTPUT,
            "top1_acc": float(results.results_dict.get("metrics/accuracy_top1", 0)),
            "top5_acc": float(results.results_dict.get("metrics/accuracy_top5", 0)),
        }
        report_path = os.path.join(MODELS_DIR, "training_report.json")
        with open(report_path, "w") as f:
            json.dump(report, f, indent=2)
        print(f"📊 Training report: {report_path}")
        print(f"   Top-1 Accuracy: {report['top1_acc']*100:.1f}%")
        print(f"   Top-5 Accuracy: {report['top5_acc']*100:.1f}%")
    else:
        print("❌ Training completed but best.pt not found!")
        print(f"   Check: {os.path.join(MODELS_DIR, 'plant_disease_v1', 'weights')}")


def main():
    global EPOCHS, BATCH_SIZE, DEVICE
    parser = argparse.ArgumentParser(description="Train YOLO11 on PlantVillage dataset")
    parser.add_argument("--epochs", type=int, default=EPOCHS, help="Number of training epochs")
    parser.add_argument("--batch", type=int, default=BATCH_SIZE, help="Batch size")
    parser.add_argument("--device", type=str, default=DEVICE, help="Device: '0' for GPU, 'cpu' for CPU")
    parser.add_argument("--dataset-path", type=str, default=None, help="Path to existing PlantVillage dataset")
    parser.add_argument("--skip-download", action="store_true", help="Skip dataset download (use existing)")
    args = parser.parse_args()

    print("=" * 60)
    print("  AgriRent Hub — YOLO11 Disease Model Trainer")
    print("=" * 60)

    if not check_dependencies():
        sys.exit(1)

    EPOCHS = args.epochs
    BATCH_SIZE = args.batch
    DEVICE = args.device

    # Find or download dataset
    dataset_root = args.dataset_path

    if not dataset_root or not os.path.isdir(dataset_root):
        if not args.skip_download:
            # Try Kaggle first
            if not download_via_kaggle():
                print("ℹ️  Kaggle failed. Trying Google Drive...")
                if not download_via_gdown():
                    print("\n❌ Could not download dataset automatically.")
                    print("   Please download PlantVillage dataset manually:")
                    print("   https://www.kaggle.com/datasets/emmarex/plantdisease")
                    print(f"   Extract to: {DATASET_DIR}/")
                    print("   Then run: python train_yolo11.py --skip-download")
                    sys.exit(1)

        dataset_root = find_dataset_root()
        if not dataset_root:
            print(f"\n❌ Could not find PlantVillage dataset in {DATASET_DIR}")
            print("   Expected structure:")
            print("   datasets/")
            print("     Apple___Apple_scab/   ← class folders")
            print("     Apple___Black_rot/")
            print("     ...")
            print(f"\n   Or specify path: python train_yolo11.py --dataset-path /path/to/plantvillage")
            sys.exit(1)

    print(f"\n✅ Dataset found: {dataset_root}")
    train_yolo11(dataset_root)
    print("\n🎉 Done! Restart the disease_detector.py service to use the new model.")


if __name__ == "__main__":
    main()
