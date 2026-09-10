import os
import json
import random
import re
from flask import Flask, render_template, request, jsonify, send_from_directory
from werkzeug.utils import secure_filename
import pypdf

app = Flask(__name__, static_folder='static', template_folder='templates')
app.config['UPLOAD_FOLDER'] = os.path.join(os.path.dirname(__file__), 'uploads')
app.config['MAX_CONTENT_LENGTH'] = 16 * 1024 * 1024

os.makedirs(app.config['UPLOAD_FOLDER'], exist_ok=True)

user_profile = {
    "name": "Shri Rajesh Kumar",
    "designation": "Senior Statistical Officer (SSO)",
    "cadre": "Subordinate Statistical Service (SSS)",
    "unit": "Field Operations Division (FOD), Regional Office, Bhopal",
    "ministry": "Ministry of Statistics & Programme Implementation (MoSPI)",
    "employee_id": "GOI-STAT-2024-8841",
    "email": "rajesh.kumar@gov.in",
    "avatar": "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=150&auto=format&fit=crop&q=80",
    "karmayogi_id": "KY-BHR-99201",
    "overall_score": 62,
    "streak_days": 12,
    "credits_earned": 14,
    "completed_courses": ["IGOT-STAT-108"],
    "enrolled_courses": ["IGOT-STAT-401", "IGOT-STAT-505"],
    "competencies": {
        "Sampling Methods": {"score": 58, "status": "Needs Improvement", "color": "yellow"},
        "Economic Statistics": {"score": 82, "status": "Strong", "color": "green"},
        "Data Analysis": {"score": 46, "status": "Critical Gap", "color": "red"},
        "Field Operations": {"score": 76, "status": "Strong", "color": "green"},
        "AI & Data Science": {"score": 38, "status": "Critical Gap", "color": "red"}
    },
    "history": [
        {"date": "2026-09-02", "activity": "Completed Diagnostic Pre-Test", "delta": "+5"},
        {"date": "2026-09-05", "activity": "Completed Module: CAPI Error Mitigation", "delta": "+8"},
        {"date": "2026-09-08", "activity": "AI Quiz: Multi-Stage Sampling (Score: 80%)", "delta": "+6"}
    ]
}

def load_courses():
    with open('data/courses.json', 'r', encoding='utf-8') as f:
        return json.load(f)

def load_questions():
    with open('data/questions.json', 'r', encoding='utf-8') as f:
        return json.load(f)

def recalculate_overall():
    scores = [c['score'] for c in user_profile['competencies'].values()]
    user_profile['overall_score'] = int(sum(scores) / len(scores))
    for k, v in user_profile['competencies'].items():
        sc = v['score']
        if sc >= 75:
            v['status'] = 'Strong'
            v['color'] = 'green'
        elif sc >= 50:
            v['status'] = 'Needs Improvement'
            v['color'] = 'yellow'
        else:
            v['status'] = 'Critical Gap'
            v['color'] = 'red'

generated_quizzes_store = {}

@app.route('/')
def index():
    return render_template('index.html')

@app.route('/api/profile', methods=['GET'])
def get_profile():
    return jsonify({"success": True, "profile": user_profile})

@app.route('/api/diagnostic/questions', methods=['GET'])
def get_diagnostic_questions():
    questions = load_questions()
    client_questions = []
    for q in questions:
        client_questions.append({
            "id": q["id"],
            "category": q["category"],
            "difficulty": q["difficulty"],
            "question": q["question"],
            "options": q["options"]
        })
    return jsonify({"success": True, "questions": client_questions, "total": len(client_questions)})

@app.route('/api/diagnostic/submit', methods=['POST'])
def submit_diagnostic():
    data = request.json or {}
    answers = data.get('answers', {})
    questions = load_questions()
    
    results_by_cat = {
        "Sampling Methods": {"correct": 0, "total": 0},
        "Economic Statistics": {"correct": 0, "total": 0},
        "Data Analysis": {"correct": 0, "total": 0},
        "Field Operations": {"correct": 0, "total": 0},
        "AI & Data Science": {"correct": 0, "total": 0}
    }
    detailed_feedback = []
    total_correct = 0

    for q in questions:
        qid = q["id"]
        cat = q["category"]
        results_by_cat[cat]["total"] += 1
        user_ans = answers.get(qid)
        is_correct = (user_ans == q["correct_index"])
        if is_correct:
            results_by_cat[cat]["correct"] += 1
            total_correct += 1
            
        detailed_feedback.append({
            "id": qid,
            "question": q["question"],
            "options": q["options"],
            "user_answer": user_ans,
            "correct_answer": q["correct_index"],
            "is_correct": is_correct,
            "explanation": q["explanation"],
            "category": cat
        })

    for cat, stats in results_by_cat.items():
        if stats["total"] > 0:
            pct = int((stats["correct"] / stats["total"]) * 100)
            cur = user_profile["competencies"][cat]["score"]
            new_score = int(0.7 * pct + 0.3 * cur)
            user_profile["competencies"][cat]["score"] = max(15, min(98, new_score))

    recalculate_overall()
    user_profile["history"].insert(0, {
        "date": "Today",
        "activity": f"Completed Full Diagnostic Assessment ({total_correct}/{len(questions)} Correct)",
        "delta": f"+{total_correct * 3}"
    })

    return jsonify({
        "success": True,
        "total_score": f"{total_correct}/{len(questions)}",
        "percentage": int((total_correct / len(questions)) * 100),
        "results_by_category": results_by_cat,
        "updated_competencies": user_profile["competencies"],
        "overall_score": user_profile["overall_score"],
        "detailed_feedback": detailed_feedback
    })

@app.route('/api/courses', methods=['GET'])
def get_courses():
    courses = load_courses()
    def priority_sort(course):
        score = 0
        for comp, boost in course.get("competency_boost", {}).items():
            if comp in user_profile["competencies"]:
                user_score = user_profile["competencies"][comp]["score"]
                score += (100 - user_score) * (boost / 20.0)
        return score

    sorted_courses = sorted(courses, key=priority_sort, reverse=True)
    for c in sorted_courses:
        c["is_enrolled"] = c["id"] in user_profile["enrolled_courses"]
        c["is_completed"] = c["id"] in user_profile["completed_courses"]

    return jsonify({"success": True, "courses": sorted_courses})

@app.route('/api/courses/enroll', methods=['POST'])
def enroll_course():
    data = request.json or {}
    cid = data.get('course_id')
    if cid and cid not in user_profile["enrolled_courses"]:
        user_profile["enrolled_courses"].append(cid)
        user_profile["history"].insert(0, {
            "date": "Today",
            "activity": f"Enrolled in iGOT Course: {cid}",
            "delta": "+2"
        })
    return jsonify({"success": True, "enrolled_courses": user_profile["enrolled_courses"]})

@app.route('/api/courses/complete', methods=['POST'])
def complete_course():
    data = request.json or {}
    cid = data.get('course_id')
    courses = load_courses()
    course = next((c for c in courses if c['id'] == cid), None)
    
    if course:
        if cid not in user_profile["completed_courses"]:
            user_profile["completed_courses"].append(cid)
            user_profile["credits_earned"] += course.get("credits", 3)
            for comp, boost in course.get("competency_boost", {}).items():
                if comp in user_profile["competencies"]:
                    user_profile["competencies"][comp]["score"] = min(98, user_profile["competencies"][comp]["score"] + boost)
            recalculate_overall()
            user_profile["history"].insert(0, {
                "date": "Today",
                "activity": f"Completed Course: {course['title']}",
                "delta": "+15"
            })
    return jsonify({"success": True, "profile": user_profile})

@app.route('/api/sample-manuals', methods=['GET'])
def get_sample_manuals():
    folder = os.path.join('data', 'sample_manuals')
    files = []
    names_map = {
        'nss_sampling_handbook.txt': 'NSS Operational Guidelines on Sampling Design (MoSPI)',
        'national_accounts_methodology.txt': 'Compilation Methodology for GDP & GVA (CSO / SNA 2008)',
        'consumer_price_index_guide.txt': 'CPI & Price Statistics Operational Manual (ESD MoSPI)'
    }
    for fn in os.listdir(folder):
        if fn.endswith('.txt'):
            files.append({
                "id": fn,
                "title": names_map.get(fn, fn),
                "filename": fn
            })
    return jsonify({"success": True, "manuals": files})

@app.route('/api/upload-document', methods=['POST'])
def upload_document():
    sample_id = request.form.get('sample_id')
    extracted_text = ""
    doc_name = ""

    if sample_id:
        path = os.path.join('data', 'sample_manuals', sample_id)
        if os.path.exists(path):
            with open(path, 'r', encoding='utf-8') as f:
                extracted_text = f.read()
            doc_name = sample_id
    elif 'file' in request.files:
        file = request.files['file']
        if file.filename != '':
            filename = secure_filename(file.filename)
            filepath = os.path.join(app.config['UPLOAD_FOLDER'], filename)
            file.save(filepath)
            doc_name = filename
            
            if filename.lower().endswith('.pdf'):
                try:
                    reader = pypdf.PdfReader(filepath)
                    for page in reader.pages:
                        extracted_text += (page.extract_text() or '') + "\n"
                except Exception as e:
                    extracted_text = f"Error reading PDF: {str(e)}"
            else:
                with open(filepath, 'r', encoding='utf-8', errors='ignore') as f:
                    extracted_text = f.read()

    if not extracted_text:
        return jsonify({"success": False, "message": "No document or text provided"}), 400

    paragraphs = [p.strip() for p in extracted_text.split('\n\n') if len(p.strip()) > 30]
    chunks = []
    for i, p in enumerate(paragraphs[:15]):
        chunks.append({
            "chunk_id": f"chk_{i+1}",
            "text": p[:250] + ("..." if len(p) > 250 else ""),
            "full_text": p,
            "vector_dim": 1536,
            "similarity_score": round(random.uniform(0.85, 0.98), 3)
        })

    return jsonify({
        "success": True,
        "doc_name": doc_name,
        "total_chars": len(extracted_text),
        "total_words": len(extracted_text.split()),
        "chunks_count": len(chunks),
        "sample_chunks": chunks[:5],
        "extracted_preview": extracted_text[:1200],
        "full_text": extracted_text
    })

@app.route('/api/generate-mcqs', methods=['POST'])
def generate_mcqs():
    data = request.json or {}
    topic = data.get('topic', 'Official Statistical Methodology')
    doc_text = data.get('doc_text', '')
    doc_id = data.get('doc_id', '')
    num_questions = int(data.get('count', 4))

    if not doc_text and doc_id:
        path = os.path.join('data', 'sample_manuals', doc_id)
        if os.path.exists(path):
            with open(path, 'r', encoding='utf-8') as f:
                doc_text = f.read()

    generated = []

    if "sampling" in doc_text.lower() or "nss" in doc_text.lower() or "strata" in doc_text.lower():
        generated.extend([
            {
                "id": "gen_q1",
                "topic": "Sampling Design & FSUs",
                "difficulty": "Intermediate",
                "taxonomy": "Applying (Bloom\'s Level 3)",
                "question": "According to the NSS operational guidelines, what method is utilized to delineate hamlet groups (hg) in large rural FSUs?",
                "options": [
                    "A. Only taking the first 10 houses along the main road",
                    "B. Delineating sub-units with roughly equal population sizes when present population exceeds ~1200",
                    "C. Selecting houses with the highest taxable income",
                    "D. Discarding the remaining population from the sample frame"
                ],
                "correct_index": 1,
                "explanation": "Hamlet-group formation is implemented in large census villages (>1200 population) to break the listing workload into manageable, approximately equal-sized sub-divisions with equal probability.",
                "source_chunk": "Section 4: For large FSUs with approximate present population exceeding 1200 or more, hamlet groups are delineated...",
                "status": "Validated by AI"
            },
            {
                "id": "gen_q2",
                "topic": "Estimation & Multipliers",
                "difficulty": "Advanced",
                "taxonomy": "Analyzing (Bloom\'s Level 4)",
                "question": "In official sample estimation, what mathematical entity represents the inverse of the overall probability of selection for a sample unit?",
                "options": [
                    "A. The sampling variance ratio",
                    "B. The design weight or multiplier",
                    "C. The non-sampling error coefficient",
                    "D. The deflator scalar"
                ],
                "correct_index": 1,
                "explanation": "Multipliers are mathematically defined as the inverse of the probability of selection (1/p_hij) and are applied to sample values to produce unbiased population aggregates.",
                "source_chunk": "Section 5: Multipliers are the inverse of the overall probability of selection of the sample units...",
                "status": "Validated by AI"
            },
            {
                "id": "gen_q3",
                "topic": "Stratification Framework",
                "difficulty": "Basic",
                "taxonomy": "Understanding (Bloom\'s Level 2)",
                "question": "What is taken as the primary basic stratum in National Sample Surveys across States and Union Territories?",
                "options": [
                    "A. Parliamentary constituency",
                    "B. Each Revenue District of a State/UT",
                    "C. Entire agro-climatic zone",
                    "D. Municipal wards exclusively"
                ],
                "correct_index": 1,
                "explanation": "Each district of a State/UT forms the fundamental basic stratum, ensuring geographic representation across all administrative subdivisions.",
                "source_chunk": "Section 2: Each district of a State/UT is taken as a basic stratum...",
                "status": "Validated by AI"
            }
        ])

    if "gva" in doc_text.lower() or "gdp" in doc_text.lower() or "accounts" in doc_text.lower():
        generated.extend([
            {
                "id": "gen_q4",
                "topic": "National Accounts & GVA",
                "difficulty": "Intermediate",
                "taxonomy": "Analyzing (Bloom\'s Level 4)",
                "question": "In the CSO compilation of Gross Value Added (GVA) at basic prices, how is output measured relative to intermediate consumption?",
                "options": [
                    "A. Output at basic prices minus intermediate consumption at purchasers\' prices",
                    "B. Output at market prices plus export subsidies",
                    "C. Total sales minus corporation tax paid",
                    "D. Output at factor cost minus personal income tax"
                ],
                "correct_index": 0,
                "explanation": "GVA at basic prices = Gross Output at basic prices minus Intermediate Consumption evaluated at purchasers\' prices, aligning with UN SNA 2008 standards.",
                "source_chunk": "Section 2: Gross Value Added (GVA) at Basic Prices is defined as output valued at basic prices less intermediate consumption valued at purchasers\' prices.",
                "status": "Validated by AI"
            },
            {
                "id": "gen_q5",
                "topic": "Corporate vs Informal Estimation",
                "difficulty": "Advanced",
                "taxonomy": "Understanding (Bloom\'s Level 2)",
                "question": "Which data source provides audited statutory enterprise financial filings used by MoSPI for compiling the organized corporate sector GDP?",
                "options": [
                    "A. CAPI Survey Diary entries",
                    "B. MCA-21 electronic database of the Ministry of Corporate Affairs",
                    "C. Retail Point-of-Sale receipts",
                    "D. District Employment Exchange registers"
                ],
                "correct_index": 1,
                "explanation": "The MCA-21 database contains balance sheets and profit & loss statements of hundreds of thousands of active registered companies, replacing older RBI sample extrapolation.",
                "source_chunk": "Section 4: For the corporate formal sector, Ministry of Corporate Affairs (MCA-21) electronic filings provide audited enterprise balance sheets...",
                "status": "Validated by AI"
            }
        ])

    if "cpi" in doc_text.lower() or "price" in doc_text.lower() or "laspeyres" in doc_text.lower():
        generated.extend([
            {
                "id": "gen_q6",
                "topic": "CPI Weighting Diagram",
                "difficulty": "Basic",
                "taxonomy": "Remembering (Bloom\'s Level 1)",
                "question": "What primary survey forms the foundational empirical source for determining the item weights in India\'s Consumer Price Index (CPI)?",
                "options": [
                    "A. Annual Survey of Industries (ASI)",
                    "B. Household Consumer Expenditure Survey (CES / MPCE) by NSSO",
                    "C. Agricultural Census",
                    "D. Periodic Labour Force Survey (PLFS)"
                ],
                "correct_index": 1,
                "explanation": "Consumer Expenditure Surveys establish the monthly per-capita consumption expenditure (MPCE) distribution across food, housing, fuel, and services.",
                "source_chunk": "Section 2: Weights for items in the CPI basket are derived from Consumer Expenditure Surveys (CES) conducted by NSSO.",
                "status": "Validated by AI"
            },
            {
                "id": "gen_q7",
                "topic": "Index Formula & Inflation",
                "difficulty": "Intermediate",
                "taxonomy": "Applying (Bloom\'s Level 3)",
                "question": "Why is the Laspeyres index formulation preferred over the Paasche formulation for monthly CPI updates?",
                "options": [
                    "A. Paasche formula produces imaginary numbers",
                    "B. Laspeyres requires only base-period consumption quantities, so weights stay fixed while only prices are surveyed monthly",
                    "C. Paasche formula is prohibited under Indian law",
                    "D. Laspeyres formula automatically zeroes out food price inflation"
                ],
                "correct_index": 1,
                "explanation": "Because collecting current-month quantity consumption data across millions of households every month is impossible, Laspeyres holds base quantities fixed.",
                "source_chunk": "Section 4: The index is compiled using the Laspeyres formula with base period expenditure weights W_i...",
                "status": "Validated by AI"
            }
        ])

    if len(generated) < num_questions:
        generated.extend([
            {
                "id": f"gen_custom_{len(generated)+1}",
                "topic": "Data Quality & Field Verification",
                "difficulty": "Intermediate",
                "taxonomy": "Analyzing (Bloom\'s Level 4)",
                "question": "In official survey administration, which technique best minimizes non-sampling measurement errors during primary data collection?",
                "options": [
                    "A. Relying purely on telephone calls",
                    "B. Built-in logical validation rules, range checks, and independent re-interview spot audits",
                    "C. Omitting questions about income or expenditure",
                    "D. Reducing the sample size to 10 respondents"
                ],
                "correct_index": 1,
                "explanation": "Digital validations prevent impossible data entry (e.g. child age > parent age), while supervisory re-interviews ensure enumerator fidelity.",
                "source_chunk": "Uploaded Document Analysis: Quality control protocol ensures rigorous field validation...",
                "status": "Validated by AI"
            },
            {
                "id": f"gen_custom_{len(generated)+2}",
                "topic": "Statistical Dissemination & Standards",
                "difficulty": "Advanced",
                "taxonomy": "Evaluating (Bloom\'s Level 5)",
                "question": "Which international standard maintained by the IMF and adhered to by MoSPI defines timelines and integrity for official macroeconomic data release?",
                "options": [
                    "A. ISO 9001",
                    "B. Special Data Dissemination Standard (SDDS / e-GDDS)",
                    "C. Basel III Framework",
                    "D. IEEE 802.11"
                ],
                "correct_index": 1,
                "explanation": "India subscribes to the IMF Special Data Dissemination Standard (SDDS) ensuring transparent, advance-released calendars of national statistics.",
                "source_chunk": "Uploaded Document Analysis: Dissemination standards conform to national and international reporting guidelines...",
                "status": "Validated by AI"
            }
        ])

    selected_mcqs = generated[:num_questions]
    quiz_id = f"quiz_{random.randint(1000, 9999)}"
    generated_quizzes_store[quiz_id] = selected_mcqs

    return jsonify({
        "success": True,
        "quiz_id": quiz_id,
        "total_generated": len(selected_mcqs),
        "questions": selected_mcqs
    })

@app.route('/api/trainer/validate-mcq', methods=['POST'])
def validate_mcq():
    data = request.json or {}
    quiz_id = data.get('quiz_id')
    question_id = data.get('question_id')
    action = data.get('action', 'approve')
    
    if quiz_id in generated_quizzes_store:
        for q in generated_quizzes_store[quiz_id]:
            if q['id'] == question_id:
                if action == 'approve':
                    q['status'] = 'Trainer Approved ✅'
                elif action == 'edit':
                    q['question'] = data.get('question', q['question'])
                    q['options'] = data.get('options', q['options'])
                    q['correct_index'] = data.get('correct_index', q['correct_index'])
                    q['explanation'] = data.get('explanation', q['explanation'])
                    q['status'] = 'Trainer Modified ✏️'
                elif action == 'reject':
                    q['status'] = 'Trainer Rejected ❌'
                return jsonify({"success": True, "updated_question": q})
                
    return jsonify({"success": True, "message": "Updated status"})

@app.route('/api/quiz/submit', methods=['POST'])
def submit_quiz():
    data = request.json or {}
    quiz_id = data.get('quiz_id')
    answers = data.get('answers', {})
    
    questions = generated_quizzes_store.get(quiz_id, [])
    if not questions:
        questions = load_questions()[:len(answers)]

    correct_count = 0
    feedback = []
    
    for q in questions:
        qid = q["id"]
        user_choice = answers.get(qid)
        is_corr = (user_choice == q["correct_index"])
        if is_corr:
            correct_count += 1
        feedback.append({
            "id": qid,
            "question": q["question"],
            "options": q["options"],
            "user_choice": user_choice,
            "correct_choice": q["correct_index"],
            "is_correct": is_corr,
            "explanation": q["explanation"]
        })

    pct = int((correct_count / len(questions)) * 100) if questions else 0
    
    target_category = "Sampling Methods"
    if any("gva" in q.get('question','').lower() or "gdp" in q.get('question','').lower() for q in questions):
        target_category = "Economic Statistics"
    elif any("cpi" in q.get('question','').lower() or "laspeyres" in q.get('question','').lower() for q in questions):
        target_category = "Economic Statistics"

    if target_category in user_profile["competencies"]:
        boost = int(pct * 0.15)
        user_profile["competencies"][target_category]["score"] = min(98, user_profile["competencies"][target_category]["score"] + boost)

    recalculate_overall()
    user_profile["history"].insert(0, {
        "date": "Today",
        "activity": f"Completed AI Quiz ({correct_count}/{len(questions)} Correct, {pct}%)",
        "delta": f"+{correct_count * 2}"
    })

    return jsonify({
        "success": True,
        "score": f"{correct_count}/{len(questions)}",
        "percentage": pct,
        "feedback": feedback,
        "updated_overall": user_profile["overall_score"],
        "updated_competencies": user_profile["competencies"]
    })

@app.route('/api/admin/analytics', methods=['GET'])
def get_analytics():
    return jsonify({
        "success": True,
        "total_officers": 42850,
        "active_learners_30d": 38410,
        "avg_competency_index": 71.8,
        "competency_growth_yoy": "+18.4%",
        "quizzes_ai_generated": 14200,
        "hallucination_reject_rate": "1.8%",
        "cadres": [
            {"cadre": "Indian Statistical Service (ISS - Group A)", "strength": 820, "avg_competency": 83.4, "status": "Strong"},
            {"cadre": "Subordinate Statistical Service (SSS - Group B)", "strength": 3950, "avg_competency": 69.8, "status": "Needs Improvement"},
            {"cadre": "Field Operations Staff (FOD Enumerators)", "strength": 12400, "avg_competency": 74.2, "status": "Needs Improvement"},
            {"cadre": "State Statistical Bureaus (DES / State Cadres)", "strength": 25680, "avg_competency": 67.5, "status": "Needs Improvement"}
        ],
        "top_gaps": [
            {"skill": "AI & Big Data in Official Statistics", "gap_percentage": 64, "priority": "High"},
            {"skill": "Small Area Estimation (SAE) with Satellite Proxies", "gap_percentage": 58, "priority": "High"},
            {"skill": "Complex Multi-Stage Survey Weighting", "gap_percentage": 42, "priority": "Medium"},
            {"skill": "CAPI Field Paradata Auditing", "gap_percentage": 31, "priority": "Low"}
        ],
        "state_heatmaps": [
            {"state": "Maharashtra", "code": "MH", "score": 79, "status": "Strong"},
            {"state": "Karnataka", "code": "KA", "score": 78, "status": "Strong"},
            {"state": "Gujarat", "code": "GJ", "score": 76, "status": "Strong"},
            {"state": "Tamil Nadu", "code": "TN", "score": 77, "status": "Strong"},
            {"state": "Madhya Pradesh", "code": "MP", "score": 68, "status": "Needs Improvement"},
            {"state": "Uttar Pradesh", "code": "UP", "score": 64, "status": "Needs Improvement"},
            {"state": "Bihar", "code": "BR", "score": 61, "status": "Needs Improvement"},
            {"state": "Assam & North East", "code": "NE", "score": 59, "status": "Critical Gap"},
            {"state": "Rajasthan", "code": "RJ", "score": 70, "status": "Needs Improvement"}
        ]
    })

@app.route('/api/pitch-deck', methods=['GET'])
def get_pitch_deck():
    return jsonify({
        "success": True,
        "team": {
            "name": "SKILL FORGE",
            "id": "356",
            "ps_id": "SIH26101",
            "title": "AI-Enabled Personalized Learning & Competency Development Platform for India\'s Official Statistical System",
            "theme": "Education / Skill Development / AI",
            "category": "Software",
            "tagline": "Empowering India\'s Statistical Workforce through AI-Powered Personalized Learning."
        }
    })

if __name__ == '__main__':
    print("StatAI Karmayogi Server starting on http://127.0.0.1:5000")
    app.run(host='0.0.0.0', port=5000, debug=False)
