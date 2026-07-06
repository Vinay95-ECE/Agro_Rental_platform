"""Patch script: upgrades disease_detector.py to use google.genai SDK"""
import re

with open('disease_detector.py', 'r', encoding='utf-8') as f:
    content = f.read()

# Find the function and replace it
start_marker = '# -- Gemini Vision fallback'
end_marker   = '\n\n# -- Core detection logic'

start_idx = content.find(start_marker)
end_idx   = content.find(end_marker)

if start_idx == -1 or end_idx == -1:
    print(f'MARKERS NOT FOUND: start={start_idx}, end={end_idx}')
    # Show surrounding context
    idx = content.find('generativeai')
    print(f'generativeai at: {idx}')
    raise SystemExit(1)

new_func = r'''# -- Gemini Vision fallback (google.genai SDK) ---------------------------------

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
'''

# Replace the section
new_content = content[:start_idx] + new_func + end_marker + content[end_idx + len(end_marker):]

with open('disease_detector.py', 'w', encoding='utf-8') as f:
    f.write(new_content)

print(f'[OK] Patched successfully. File size: {len(new_content)} bytes')
