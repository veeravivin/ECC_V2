import requests
import json
import time

BASE_URL = "http://localhost:8000"

def run_verification():
    print("=== SKILL TEST MODULE VERIFICATION ===")
    
    # 1. Test Beginner (MCQ Only)
    print("\n--- 1. Testing BEGINNER Level (MCQ Only) ---")
    payload_beg = {"topic": "Python", "level": "Beginner"}
    try:
        resp = requests.post(f"{BASE_URL}/generate_skill_test", json=payload_beg)
        data = resp.json()
        print(f"Status: {resp.status_code}")
        print(f"Questions Generated: {len(data)}")
        
        # Check structure
        mcq_count = sum(1 for q in data if q.get('type') == 'mcq')
        code_count = sum(1 for q in data if q.get('type') == 'code')
        print(f"MCQs: {mcq_count}, Code: {code_count}")
        
        # Verify no numbering
        has_numbering = any(q['q'].strip()[0].isdigit() for q in data)
        print(f"Clean Text (No Numbering): {not has_numbering}")
        
        if mcq_count == 20 and code_count == 0:
            print("✅ Beginner Logic CORRECT")
        else:
            print("❌ Beginner Logic INCORRECT")
            
    except Exception as e:
        print(f"❌ Error: {e}")

    # 2. Test Intermediate (Mixed)
    print("\n--- 2. Testing INTERMEDIATE Level (MCQ + Code) ---")
    payload_int = {"topic": "Python", "level": "Intermediate"}
    try:
        resp = requests.post(f"{BASE_URL}/generate_skill_test", json=payload_int)
        data = resp.json()
        
        mcq_count = sum(1 for q in data if q.get('type') == 'mcq')
        code_count = sum(1 for q in data if q.get('type') == 'code')
        print(f"Questions: {len(data)} (MCQ: {mcq_count}, Code: {code_count})")
        
        if len(data) == 15 and code_count >= 5:
             print("✅ Intermediate Logic CORRECT")
        else:
             print("❌ Intermediate Logic INCORRECT")

    except Exception as e:
        print(f"❌ Error: {e}")

    # 3. Test Advanced (Code Heavy)
    print("\n--- 3. Testing ADVANCED Level (Complex) ---")
    payload_adv = {"topic": "Python", "level": "Advanced"}
    try:
        resp = requests.post(f"{BASE_URL}/generate_skill_test", json=payload_adv)
        data = resp.json()
        
        mcq_count = sum(1 for q in data if q.get('type') == 'mcq')
        code_count = sum(1 for q in data if q.get('type') == 'code')
        print(f"Questions: {len(data)} (MCQ: {mcq_count}, Code: {code_count})")
        
        if code_count >= 10:
             print("✅ Advanced Logic CORRECT")
        else:
             print("❌ Advanced Logic INCORRECT")

    except Exception as e:
        print(f"❌ Error: {e}")

    # 4. Grading Verification
    print("\n--- 4. Testing GRADING (AI + Heuristic) ---")
    grade_payload = {
        "topic": "Python",
        "level": "Intermediate",
        "submissions": [
            { "question_idx": 0, "question": "Q1", "type": "mcq", "user_answer_idx": 0, "correct_idx": 0 }, # Correct
            { "question_idx": 1, "question": "Q2", "type": "code", "user_answer": "def test(): return True" } # Valid Code
        ]
    }
    try:
        resp = requests.post(f"{BASE_URL}/grade_test", json=grade_payload)
        res_data = resp.json()
        print(f"Grading Score: {res_data['final_score']}")
        print(f"Results: {json.dumps(res_data['results'], indent=2)}")
        
        if res_data['final_score'] > 0:
            print("✅ Grading Logic CORRECT")
        else:
            print("❌ Grading Logic INCORRECT")
            
    except Exception as e:
        print(f"❌ Error: {e}")

if __name__ == "__main__":
    run_verification()
