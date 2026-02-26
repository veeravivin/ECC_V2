import requests
import json

# Testing the Node.js Proxy (Port 3000) which forwards to Python (Port 8000)
url = "http://localhost:3000/api/ai/grade"

payload = {
    "topic": "Python",
    "level": "Intermediate",
    "submissions": [
        {
            "question_idx": 0,
            "question": "TEST Q1",
            "type": "mcq",
            "user_answer_idx": 0,
            "correct_idx": 0
        }
    ]
}

print(f"Testing Proxy Route: {url}")
try:
    resp = requests.post(url, json=payload)
    print(f"Status: {resp.status_code}")
    if resp.status_code == 200:
        print("Success! Proxy returned:", json.dumps(resp.json(), indent=2))
    else:
        print("Failed. Response:", resp.text)
except Exception as e:
    print(f"Connection Error: {e}")
