import requests
import json

url = "http://localhost:8000/grade_test"

payload = {
    "topic": "Python",
    "level": "Intermediate",
    "submissions": [
        {
            "question_idx": 0,
            "question": "What is the output of print(2**3)?",
            "type": "mcq",
            "user_answer_idx": 0,
            "correct_idx": 0
        },
        {
            "question_idx": 1,
            "question": "Write a python function to add two numbers.",
            "type": "code",
            "user_answer": "def add(a, b):\n    return a + b"
        },
        {
             "question_idx": 2,
             "question": "Write a function to return True.",
             "type": "code",
             "user_answer": "sadfasdf asdf" 
        }
    ]
}

try:
    print("Sending request to AI Engine...")
    response = requests.post(url, json=payload)
    print("Status Code:", response.status_code)
    print("Response JSON:")
    print(json.dumps(response.json(), indent=2))
except Exception as e:
    print("Error:", e)
