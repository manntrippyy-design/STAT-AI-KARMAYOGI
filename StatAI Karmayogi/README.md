# StatAI Karmayogi — Official Statistics Competency & Personalized Learning Platform

### Smart India Hackathon 2026 (SIH 2026)
- **Problem Statement ID**: SIH26101
- **Problem Statement Title**: AI-Enabled Personalized Learning & Competency Development Platform for India's Official Statistical System
- **Theme**: Education / Skill Development / AI
- **Category**: Software
- **Team ID**: 356
- **Team Name**: SKILL FORGE
- **Official Domain Alignment**: `https://statai.igotkarmayogi.gov.in` (iGOT Karmayogi / Mission Karmayogi / MoSPI)

---

## 🏛️ Platform Overview
**StatAI Karmayogi** is an enterprise-grade AI-powered competency assessment, personalized learning path, and automatic MCQ/quiz generation platform purpose-built for personnel in India's Official Statistical System (MoSPI, ISS, SSS, FOD, and State DES).

### Core Features:
1. **Official iGOT Karmayogi Tech UI**:
   - Government of India national styling, Ashoka Lion emblem, tricolor bar, and live domain badge (`https://statai.igotkarmayogi.gov.in`).
   - Bilingual support (English & हिंदी) and accessibility controls (High Contrast, Large Font).
   - Role switching: Learner (Statistical Officer), Master Trainer (NSSTA/MoSPI), and Ministry Administrator.

2. **Diagnostic Assessment Engine**:
   - 10-question pre-assessment covering 5 pillars:
     - Sampling Design & Multi-Stage Stratification (NSS)
     - National Accounts & Macroeconomics (GDP/GVA)
     - Applied Statistical Analysis & Econometrics (R/Python)
     - Field Operations & CAPI Data Quality (FOD)
     - AI & Modern Data Science in Public Administration
   - Automatic scoring and instant calibration of user competency profile.

3. **AI Competency Gap Analyzer & Radar Chart**:
   - Compares individual officer competency with MoSPI national cadre benchmarks.
   - Categorizes competencies into 🟢 Strong (>=75%), 🟡 Needs Improvement (50-74%), and 🔴 Critical Gap (<50%).

4. **Dynamic Personalized Learning Paths (iGOT Integration)**:
   - Adaptive course recommendations prioritizing identified critical gaps.
   - Interactive course enrollment and module completion simulator with competency boosts.

5. **RAG-Powered AI MCQ & Quiz Generator**:
   - Upload PDF/DOCX or select pre-loaded MoSPI manuals (NSS Guidelines, National Accounts, Price Indices).
   - Live visualizer of the RAG pipeline: Text extraction $\to$ Semantic chunking $\to$ 1536-dim vector indexing $\to$ LLM grounded question synthesis.
   - Generates 4-option MCQs with explanations, difficulty tiers, and Bloom\'s Taxonomy cognitive tags.
   - Trainer review gate (Approve/Reject) to eliminate AI hallucinations.
   - Interactive practice quiz mode with real-time feedback and profile competency updates.

6. **Ministry & Cadre Analytics**:
   - National statistical index, cadre comparisons (ISS vs SSS vs FOD vs DES), and state-level competency heatmaps.

7. **Interactive SIH 2026 Presentation Viewer**:
   - Embedded 6-slide pitch deck matching the official SIH submission slides.

---

## 🚀 How to Run

```bash
# 1. Install dependencies
pip install -r requirements.txt

# 2. Run the platform
python app.py
```

Open your browser and navigate to:
`http://127.0.0.1:5000`
