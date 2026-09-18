#!/usr/bin/env python3
"""
Sample Generator for MedTimeline OCR + LLM validation
Generates valid PNG images for sample lab reports, discharge summaries, and handwritten prescriptions.
"""

import os
from PIL import Image, ImageDraw, ImageFont

def generate_sample_images(output_dir="sample_documents"):
    os.makedirs(output_dir, exist_ok=True)

    # 1. Generate Lab Report PNG
    img_lab = Image.new('RGB', (800, 600), color=(255, 255, 255))
    d = ImageDraw.Draw(img_lab)
    d.text((50, 30), "METROPOLITAN CLINICAL LABORATORY", fill=(0, 51, 102))
    d.text((50, 60), "PATIENT REPORT - COMPREHENSIVE METABOLIC PANEL", fill=(0, 0, 0))
    d.text((50, 90), "Patient Name: Eleanor Vance | DOB: 1985-04-12 | Date: 2026-03-10", fill=(100, 100, 100))
    d.line([(50, 115), (750, 115)], fill=(0, 0, 0), width=2)

    d.text((50, 130), "TEST NAME                     RESULT       UNITS      REFERENCE RANGE   STATUS", fill=(0, 0, 0))
    d.line([(50, 150), (750, 150)], fill=(200, 200, 200), width=1)
    d.text((50, 165), "Fasting Plasma Glucose        126          mg/dL      70 - 99 mg/dL     HIGH", fill=(0, 0, 0))
    d.text((50, 195), "Serum Potassium               4.2          mmol/L     3.5 - 5.0 mmol/L  NORMAL", fill=(0, 0, 0))
    d.text((50, 225), "Hemoglobin A1c                6.8          %          4.0 - 5.6 %       HIGH", fill=(0, 0, 0))

    img_lab.save(os.path.join(output_dir, "lab_report_blood_panel.png"))

    # 2. Generate Discharge Summary PNG
    img_ds = Image.new('RGB', (800, 700), color=(255, 255, 255))
    d = ImageDraw.Draw(img_ds)
    d.text((50, 30), "ST. JUDE MEDICAL CENTER - CARDIOLOGY DISCHARGE SUMMARY", fill=(150, 0, 0))
    d.text((50, 70), "Admission Date: 2026-03-01 | Discharge Date: 2026-03-05", fill=(0, 0, 0))
    d.text((50, 110), "PRIMARY DIAGNOSIS: Acute Coronary Syndrome / NSTEMI (Resolved)", fill=(0, 0, 0))
    d.text((50, 140), "ALLERGIES: Sulfa Antibiotics (Hives), Penicillin (Mild Rash)", fill=(200, 0, 0))
    d.text((50, 180), "DISCHARGE MEDICATIONS:", fill=(0, 0, 0))
    d.text((70, 210), "1. Atorvastatin 40 mg PO daily at bedtime", fill=(0, 0, 0))
    d.text((70, 240), "2. Lisinopril 10 mg PO once daily in morning", fill=(0, 0, 0))
    d.text((70, 270), "3. Aspirin 81 mg PO once daily", fill=(0, 0, 0))

    img_ds.save(os.path.join(output_dir, "discharge_summary_cardiology.png"))

    # 3. Generate Simulated Handwritten Prescription PNG
    img_rx = Image.new('RGB', (800, 500), color=(250, 248, 239))
    d = ImageDraw.Draw(img_rx)
    d.text((50, 30), "Rx - CLINICAL PRESCRIPTION NOTE", fill=(0, 0, 150))
    d.text((50, 70), "Dr. Arthur Pendelton, MD", fill=(50, 50, 50))
    d.text((50, 120), "Rx: Amoxicillin 250mg", fill=(20, 20, 120))
    d.text((50, 160), "Sig: 1 tab PO Tid x 7 days (Unclear doctor shorthand)", fill=(100, 20, 20))
    d.text((50, 210), "Note: Low contrast scanned handwritten prescription note.", fill=(120, 120, 120))

    img_rx.save(os.path.join(output_dir, "prescription_handwritten_sample.png"))

    print(f"Sample images successfully generated in '{output_dir}/'")

if __name__ == "__main__":
    generate_sample_images()
