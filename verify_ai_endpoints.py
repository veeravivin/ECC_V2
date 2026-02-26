import requests
import json

BASE_URL = "http://localhost:8000"

def test_endpoint(name, method, endpoint, data=None, files=None):
    print(f"Testing {name} ({method} {endpoint})...")
    url = f"{BASE_URL}{endpoint}"
    try:
        if method == "GET":
            response = requests.get(url)
        elif method == "POST":
            if files:
                response = requests.post(url, files=files)
            else:
                response = requests.post(url, json=data)
        
        if response.status_code == 200:
            print(f"✅ {name}: Success")
            # print(response.json())
        else:
            print(f"❌ {name}: Failed with status {response.status_code}")
            print(response.text)
    except Exception as e:
        print(f"❌ {name}: Error - {str(e)}")
    print("-" * 20)

# 1. Market Trends
test_endpoint("Market Trends", "GET", "/market_trends")

# 2. Analyze Career Match
data_match = {
    "user_skills": ["Python", "AI"],
    "job_skills": ["Python", "Data Science"],
    "user_values": ["Ethics"],
    "job_values": ["Profit"],
    "stress_tolerance": 5,
    "job_stress_level": 8
}
test_endpoint("Career Match", "POST", "/analyze_career_match", data=data_match)

# 3. Recommend Career Paths
data_paths = {
    "name": "Test User",
    "user_skills": ["Python", "Communication"],
    "user_values": ["Work-Life Balance"],
    "stress_tolerance": 7
}
test_endpoint("Career Paths", "POST", "/recommend_career_paths", data=data_paths)

# 4. Generate Roadmap
data_roadmap = {
    "target_role": "Backend Developer",
    "current_skills": ["Python"],
    "time_available": "3 months"
}
test_endpoint("Generate Roadmap", "POST", "/generate_roadmap", data=data_roadmap)

# 5. Generate Skill Test
data_test = {
    "topic": "Python",
    "level": "Beginner"
}
test_endpoint("Generate Skill Test", "POST", "/generate_skill_test", data=data_test)

# 6. Parse Resume (Dummy file)
files = {'file': ('resume.txt', 'This is a sample resume content for testing.', 'text/plain')}
test_endpoint("Parse Resume", "POST", "/parse_resume", files=files)

# 7. Run Code Simulation
data_code = {
    "code": "print('Hello')",
    "language": "python",
    "task": "Print hello"
}
test_endpoint("Run Code Simulation", "POST", "/run_code_simulation", data=data_code)

# 8. Recommend Jobs
data_jobs = {
    "skills": ["Python", "Django"],
    "role": "Backend Developer",
    "location": "Remote"
}
test_endpoint("Recommend Jobs", "POST", "/recommend_jobs", data=data_jobs)

# 9. Grade Test (requires submission structure)
data_grade = {
    "submissions": [],
    "topic": "Python",
    "level": "Beginner"
}
test_endpoint("Grade Test", "POST", "/grade_test", data=data_grade)
