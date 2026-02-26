
import requests
import json

url = "http://localhost:8001/generate_skill_test"
payload = {"topic": "Python", "level": "Beginner"}
headers = {"Content-Type": "application/json"}

try:
    response = requests.post(url, json=payload, headers=headers)
    print(f"Status Code: {response.status_code}")
    print(f"Response Headers: {response.headers}")
    
    try:
        data = response.json()
        print(f"Response Data Type: {type(data)}")
        if isinstance(data, list):
            print(f"Success! Received a list of {len(data)} items.")
            print("First item sample:", data[0] if data else "Empty List")
        else:
            print("Failed! Response is not a list.")
            print("Response content:", data)
    except json.JSONDecodeError:
        print("Failed to decode JSON response.")
        print("Raw content:", response.text)

except Exception as e:
    print(f"Request failed: {e}")
