
import requests
import json

url = "http://localhost:8000/generate_roadmap"
payload = {
    "target_role": "Data Scientist",
    "current_skills": ["Python", "SQL"],
    "time_available": "3 Months"
}
headers = {"Content-Type": "application/json"}

try:
    print("Sending request to generate_roadmap...")
    response = requests.post(url, json=payload, headers=headers)
    print(f"Status Code: {response.status_code}")
    
    if response.status_code == 200:
        data = response.json()
        print(f"Response Type: {type(data)}")
        if isinstance(data, dict):
            keys = data.keys()
            print(f"Keys: {list(keys)}")
            if "roadmap" in data and isinstance(data["roadmap"], list):
                print(f"✅ Success! Found 'roadmap' list with {len(data['roadmap'])} phases.")
                print(f"Sample Phase 1: {data['roadmap'][0].get('phase_name', 'Unknown')}")
            else:
                print("❌ Failure: 'roadmap' key missing or not a list.")
        else:
            print("❌ Failure: Response is not a dict.")
            print(data)
    else:
        print(f"❌ Error: {response.text}")

except Exception as e:
    print(f"Request failed: {e}")
