
from fastapi import FastAPI, UploadFile, File, Form, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from dotenv import load_dotenv
import os
import io
import json
import uvicorn
from pydantic import BaseModel
from typing import List, Optional

# Deterministic Agents (Math-based)
from agents import SkillMatchingAgent, ValueAlignmentAgent, WellBeingAgent, RegretPredictionAgent

# Generative Agents (LLM-based)
from generative_agents import (
    CareerCounselorAgent, RoadmapArchitectAgent, ResumeParserAgent,
    AssessmentDesignerAgent, GradingAgent, PhaseQuizAgent, CodeExecutionAgent,
    LearningAssistantAgent
)
from job_agent import JobSearchAgent

load_dotenv()

app = FastAPI()

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# --- INSTANTIATE AGENTS (Singleton) ---
career_counselor = CareerCounselorAgent()
roadmap_architect = RoadmapArchitectAgent()
resume_parser = ResumeParserAgent()
assessment_designer = AssessmentDesignerAgent()
grader = GradingAgent()
quiz_generator = PhaseQuizAgent()
code_runner = CodeExecutionAgent()
learning_assistant = LearningAssistantAgent()
job_search_agent = JobSearchAgent()

# --- PYDANTIC MODELS ---
class CareerAnalysisRequest(BaseModel):
    user_skills: List[str]
    job_skills: List[str]
    user_values: List[str]
    job_values: List[str]
    stress_tolerance: int
    job_stress_level: int

class RoadmapRequest(BaseModel):
    target_role: str
    current_skills: List[str]
    time_available: str

class CareerDiscoveryRequest(BaseModel):
    user_skills: List[str]
    user_values: List[str]
    stress_tolerance: int
    name: str

class SkillTestRequest(BaseModel):
    topic: str
    level: str

class TestSubmissionItem(BaseModel):
    question_idx: int
    question: str
    type: str 
    user_answer: Optional[str] = None 
    user_answer_idx: Optional[int] = None 
    correct_idx: Optional[int] = None 

class TestGradeRequest(BaseModel):
    submissions: List[TestSubmissionItem]
    topic: str
    level: str

class PhaseQuizRequest(BaseModel):
    phase_name: str
    topics: List[str]

class LearningRequest(BaseModel):
    topic: str
    user_level: str
    specific_question: Optional[str] = None

# --- ROUTES ---

@app.post("/analyze_career_match")
def analyze_career_match(data: CareerAnalysisRequest):
    # Deterministic Logic
    skill_agent = SkillMatchingAgent()
    skill_match = skill_agent.analyze(data.user_skills, data.job_skills)
    
    value_agent = ValueAlignmentAgent()
    value_match = value_agent.analyze(data.user_values, data.job_values)
    
    wellbeing_agent = WellBeingAgent()
    burnout_risk = wellbeing_agent.analyze(data.stress_tolerance, data.job_stress_level)
    
    regret_agent = RegretPredictionAgent()
    regret_result = regret_agent.analyze(
        skill_match["match_score"], 
        value_match["alignment_score"], 
        burnout_risk["wellbeing_score"]
    )
    
    return {
        "skill_match": skill_match,
        "value_match": value_match,
        "burnout_risk": burnout_risk,
        "regret_probability": regret_result["regret_probability"],
        "final_verdict": regret_result
    }

@app.post("/recommend_career_paths")
async def recommend_career_paths(data: CareerDiscoveryRequest):
    return career_counselor.recommend_paths(
        data.name, data.user_skills, data.user_values, data.stress_tolerance
    )

@app.post("/generate_roadmap")
def generate_roadmap(data: RoadmapRequest):
    return roadmap_architect.generate_roadmap(
        data.target_role, data.current_skills, data.time_available
    )

@app.post("/parse_resume")
async def parse_resume(file: UploadFile = File(...)):
    content = await file.read()
    return resume_parser.parse(content)

@app.post("/generate_skill_test")
def generate_skill_test(data: SkillTestRequest):
    return assessment_designer.generate_test(data.topic, data.level)

@app.post("/grade_test")
def grade_test(data: TestGradeRequest):
    return grader.grade_submission(data.topic, data.level, data.submissions)

@app.post("/generate_phase_test")
def generate_phase_test(data: PhaseQuizRequest):
    return quiz_generator.generate(data.phase_name, data.topics)

@app.get("/market_trends")
def get_market_trends():
    return {
        "trends": [
            {"label": "AI Ethics & Governance", "score": 92},
            {"label": "Sustainable Tech", "score": 85},
            {"label": "Rust Programming", "score": 78},
            {"label": "Quantum Readiness", "score": 70}
        ],
        "jobs": [
            "AI Ethics Officer",
            "Sustainable Technology Lead",
            "Trust & Safety Engineer",
            "Algorithmic Auditor"
        ]
    }



@app.post("/recommend_jobs")
def recommend_jobs(data: dict):
    skills = data.get("skills", [])
    location = data.get("location", "Remote")
    role = "" # We can infer role from skills or pass it if available
    
    # If explicit 'role' is passed, use it
    if "role" in data:
        role = data["role"]
    
    return job_search_agent.search_jobs(skills, role, location)

class CodeRunRequest(BaseModel):
    code: str
    language: str
    task: str

@app.post("/run_code_simulation")
def run_code_simulation(data: CodeRunRequest):
    return code_runner.execute(data.code, data.language, data.task)

@app.post("/learning_assistant")
async def learning_assistant_endpoint(data: LearningRequest):
    return await learning_assistant.teach(data.topic, data.user_level, data.specific_question)

if __name__ == "__main__":
    uvicorn.run(app, host="0.0.0.0", port=8000)
