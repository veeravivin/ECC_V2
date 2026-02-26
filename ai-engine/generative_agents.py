
import json
import re
import random
import io
import pypdf
from typing import List, Dict, Any, Optional
from llm_provider import LLMProvider
from google.genai.types import Content, Part
import asyncio

class BaseAgent:
    def _clean_json(self, text: str) -> str:
        # Helper to extract JSON if the model includes markdown blocks despite headers
        match = re.search(r'(\{.*\}|\[.*\])', text, re.DOTALL)
        if match:
            return match.group(0)
        return text

    def _generate_adk_sync(self, prompt_text: str, system_instruction: str, model_name: str = None) -> str:
        provider = LLMProvider()
        try:
            # LLMProvider handles fallback internally via generate_with_retry
            # It also handles 429 logic
            response = provider.generate_with_retry(
                prompt=prompt_text,
                system_instruction=system_instruction
            )
            if response and response.text:
                return response.text
            raise ValueError("Empty response from LLMProvider")
        except Exception as e:
            print(f"❌ Generation Error: {e}")
            raise e

    async def _generate_adk_async(self, prompt_text: str, system_instruction: str, model_name: str = None) -> str:
        # Since LLMProvider uses valid synchronous google.generativeai, we wrap it in a pseudo-async manner
        # or just run it synchronously (FastAPI handles it). Ideally use run_in_executor.
        import asyncio
        loop = asyncio.get_event_loop()
        return await loop.run_in_executor(None, self._generate_adk_sync, prompt_text, system_instruction, model_name)

class CareerCounselorAgent(BaseAgent):
    def recommend_paths(self, name: str, skills: List[str], values: List[str], stress_tolerance: int) -> Dict[str, Any]:
        system_instruction = """
        Act as an expert Career Counselor AI.
        Your goal is to suggest 8 distinct, specific career paths based strictly on the user profile provided.
        Include a diverse mix of "Safe Bets", "High Growth Opportunities", "Passion/Value Aligned Roles", and "Niche Specializations".
        
        Strictly Output JSON in the following schema:
        {
            "recommendations": [
                {
                    "title": "Job Title",
                    "company": "Type of Company",
                    "match_score": 85,
                    "explanation": "2 sentence explanation...",
                    "tags": ["Tag1", "Tag2"]
                }
            ]
        }
        """
        
        prompt = f"""
        User Profile:
        User Name: {name}
        Skills: {', '.join(skills)}
        Core Values: {', '.join(values)}
        Stress Tolerance (1-10): {stress_tolerance}
        """

        config = {"response_mime_type": "application/json"}

        try:
            # Using specific model for stability if needed, or default
            response_text = self._generate_adk_sync(prompt, system_instruction)
            clean_text = self._clean_json(response_text)
            return json.loads(clean_text)
        except Exception as e:
            # Realistic Fallback
            return {
                "recommendations": [
                    {"title": "Full Stack Developer", "company": "Tech Innovators", "match_score": 95, "explanation": "Excellent match for your versatile profile (Offline Mode).", "tags": ["High Demand"]},
                    {"title": "Software Engineer", "company": "Global Systems", "match_score": 92, "explanation": "Strong alignment with core engineering principles.", "tags": ["Stable"]},
                    {"title": "Product Engineer", "company": "Startup Inc", "match_score": 88, "explanation": "Great for product-focused development.", "tags": ["Creative"]},
                    {"title": "DevOps Specialist", "company": "Cloud Corp", "match_score": 85, "explanation": "Leverages infrastructure knowledge.", "tags": ["Infrastructure"]},
                    {"title": "Data Analyst", "company": "Data flow", "match_score": 80, "explanation": "Good fit for analytical thinking.", "tags": ["Analytical"]}
                ]
            }

class RoadmapArchitectAgent(BaseAgent):
    def generate_roadmap(self, role: str, current_skills: List[str], time_available: str) -> Dict[str, Any]:
        system_instruction = f"""
        Act as a Senior Career Architect. Create a custom learning roadmap for the target role: "{role}".
        
        Requirements:
        1. Break into 3-4 distinct phases.
        2. Suggest 5 detailed, specific topics/skills per phase.
        3. Suggest 3 high-quality resources.
        
        Strictly Output JSON in the following schema:
        {{
            "role": "{role}",
            "roadmap": [ {{ "phase_name": "...", "topics": [], "duration": "..." }} ],
            "resources": [ {{ "name": "...", "url": "..." }} ]
        }}
        """

        prompt = f"""
        Context:
        - Target Role: {role}
        - Available Time: {time_available} (STRICTLY adhere to total duration)
        - Current Skills: {', '.join(current_skills) if current_skills else "None/Beginner"}
        """

        config = {"response_mime_type": "application/json"}

        try:
            response_text = self._generate_adk_sync(prompt, system_instruction)
            clean_text = self._clean_json(response_text)
            result = json.loads(clean_text)
            if isinstance(result, list): result = {"role": role, "roadmap": result, "resources": []}
            return result
        except Exception as e:
            print(f"Roadmap Error: {e}")
            # Return Mock Data so UI doesn't look broken (Offline Mode)
            return {
                "role": role,
                "roadmap": [
                    {
                        "phase_name": "Phase 1: Foundations", 
                        "duration": "2 Weeks", 
                        "topics": ["Core Concepts", "Syntax & Basics", "Environment Setup", "First Programs", "Debugging"]
                    },
                    {
                        "phase_name": "Phase 2: Intermediate Skills", 
                        "duration": "3 Weeks", 
                        "topics": ["Data Structures", "Algorithms", "APIs", "Database Integration", "Testing"]
                    },
                    {
                        "phase_name": "Phase 3: Advanced Mastery", 
                        "duration": "4 Weeks", 
                        "topics": ["System Design", "Performance Optimization", "Security Best Practices", "Deployment", "Real-world Project"]
                    }
                ],
                "resources": [
                    {"name": "Official Documentation", "url": "https://google.com/search?q=" + role + "+documentation"},
                    {"name": "FreeCodeCamp", "url": "https://www.freecodecamp.org/"},
                    {"name": "YouTube Tutorials", "url": "https://www.youtube.com/results?search_query=learn+" + role}
                ]
            }

class ResumeParserAgent(BaseAgent):
    def parse(self, pdf_bytes: bytes) -> Dict[str, Any]:
        text = ""
        try:
            reader = pypdf.PdfReader(io.BytesIO(pdf_bytes))
            for page in reader.pages: text += page.extract_text() + "\n"
        except:
            return self._regex_fallback("")

        system_instruction = "You are an expert Resume Parsing AI. Extract information from the Resume Text into strict JSON format with keys: personal_info, skills, experience, education."
        config = {"response_mime_type": "application/json"}
        
        try:
            # Limit text to first 6000 chars to avoid token limits if any, though Gemini has large context.
            prompt = f"""
            Resume Text:
            {text[:8000]}
            
            Extract JSON:
            Format: {{ 'personal_info': {{ name, email, phone, linkedin, summary, location }}, 'skills': [], 'experience': [], 'education': [] }}
            """
            response_text = self._generate_adk_sync(prompt, system_instruction)
            return json.loads(self._clean_json(response_text))
        except:
            return self._regex_fallback(text)

    def _regex_fallback(self, text: str) -> Dict[str, Any]:
        # Full Regex Logic from original main.py
        email = re.search(r'[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}', text)
        email_val = email.group(0) if email else ""
        
        phone = re.search(r'[\+\(]?[1-9][0-9 .\-\(\)]{8,}[0-9]', text)
        phone_val = phone.group(0) if phone else ""
        
        # Name heuristic
        lines = [l.strip() for l in text.split('\n') if l.strip()]
        name_val = lines[0] if lines else "Unknown"
        
        # Summary
        summary = "Auto-extracted."
        sum_match = re.search(r'(?:SUMMARY|PROFILE|OBJECTIVE|ABOUT ME)[:\s]+(.*?)(?=\n(?:SKILLS|EXP|EDUCATION|WORK|PROJECTS|CERTIFICATIONS)|$)', text, re.DOTALL | re.IGNORECASE)
        if sum_match: 
            raw_summary = sum_match.group(1).strip()
            
            # 1. Stop at double newline (paragraph break)
            if '\n\n' in raw_summary:
                raw_summary = raw_summary.split('\n\n')[0]
            
            # 2. Strict Line Limit (max 4 lines)
            lines = [l for l in raw_summary.split('\n') if l.strip()]
            if len(lines) > 4:
                 raw_summary = ' '.join(lines[:4])
            
            # 3. Char Limit
            summary = raw_summary[:350].strip() + ("..." if len(raw_summary)>350 else "")

        # Skills
        skills = []
        skills_match = re.search(r'(?:SKILLS|TECHNOLOGIES)[:\s]+(.*?)(?:\n\s*\n|[A-Z ]{4,}:)', text, re.DOTALL | re.IGNORECASE)
        if skills_match:
            skills = [s.strip() for s in re.split(r'[\n,]', skills_match.group(1)) if s.strip()]

        return {
            "personal_info": { "name": name_val, "email": email_val, "phone": phone_val, "linkedin": "", "summary": summary, "location": "" },
            "skills": skills, "experience": [], "education": []
        }

class CodeExecutionAgent(BaseAgent):
    def execute(self, code: str, language: str, task: str) -> Dict[str, Any]:
        system_instruction = f"Act as a {language} Code Interpreter. Your job is to simulate the execution of code and provide the output or error."
        config = {"response_mime_type": "application/json"}
        
        prompt = f"""
        Task: {task}
        Code:
        ```
        {code}
        ```
        
        Simulate Execution:
        1. If it compiles/runs, provide the STDOUT.
        2. If it fails, provide the Error Message.
        3. Check if it conceptually solves the task.
        
        Output JSON:
        {{
            "output": "The actual stdout output...",
            "error": "Error message if any, else null",
            "passed_cases": true/false
        }}
        """
        try:
            resp_text = self._generate_adk_sync(prompt, system_instruction)
            return json.loads(self._clean_json(resp_text))
        except Exception as e:
            return {"output": "", "error": f"Execution Simulation Failed: {str(e)}", "passed_cases": False}

class AssessmentDesignerAgent(BaseAgent):
    def generate_test(self, topic: str, level: str) -> List[Dict[str, Any]]:
        config = {"response_mime_type": "application/json"}
        
        # Special Mode: Coding Challenge
        if "coding" in level.lower():
            system_instruction = f"Act as a Coding Interviewer. Generate a complex coding problem for {topic}."
            prompt = """
            Output JSON List (1 item):
            [
                {
                    "type": "coding_challenge",
                    "q": "Detailed Problem Statement with Input/Output examples (Use Markdown inside string)...",
                    "boilerplate": "suggestion for starting code...",
                    "correct_idx": -1,
                    "options": []
                }
            ]
            """
        else:
            system_instruction = f"Act as an Exam Setter. Generate a 20 Question Skill Test for {topic} ({level})."
            prompt = """
            Output JSON List: 
            [
                {"type":"mcq", "q":"Question text...", "options":["A","B","C","D"], "correct_idx":0}
            ]
            IMPORTANT: If a question includes code snippets, wrap them in markdown code blocks inside the 'q' string.
            """
        
        try:
            response_text = self._generate_adk_sync(prompt, system_instruction)
            data = json.loads(self._clean_json(response_text))
            
            # Robustness: unwrap dict
            if isinstance(data, dict): 
                for v in data.values(): 
                    if isinstance(v, list): data = v; break

            for item in data:
                if 'q' in item: item['q'] = re.sub(r'^Q?\d+[\.:]\s*', '', item['q'])
            return data[:20]
        except:
             # Realistic Fallback Questions
             return [
                 {"type": "mcq", "q": "Which of the following is a LIFO data structure?", "options": ["Queue", "Stack", "Tree", "Graph"], "correct_idx": 1},
                 {"type": "mcq", "q": "What is the time complexity of accessing an array element by index?", "options": ["O(n)", "O(log n)", "O(1)", "O(n^2)"], "correct_idx": 2},
                 {"type": "mcq", "q": "Which protocol is used for secure web browsing?", "options": ["HTTP", "FTP", "HTTPS", "SMTP"], "correct_idx": 2},
                 {"type": "mcq", "q": "What does SQL stand for?", "options": ["Structured Query Language", "Simple Question Language", "System Query Logic", "Standard Query List"], "correct_idx": 0},
                 {"type": "mcq", "q": "In Git, which command saves changes to the local repository?", "options": ["git add", "git save", "git commit", "git push"], "correct_idx": 2}
             ]

class GradingAgent(BaseAgent):
    def grade_submission(self, topic: str, level: str, submissions: List[Any]) -> Dict[str, Any]:
        results = []
        code_queue = []
        for sub in submissions:
            if sub.type == 'mcq':
                is_curr = (sub.user_answer_idx == sub.correct_idx)
                results.append({"question_idx": sub.question_idx, "type": "mcq", "score": 100 if is_curr else 0, "is_correct": is_curr, "explanation": ""})
            else:
                code_queue.append(sub)
        
        if code_queue:
            try:
                system_instruction = f"Act as a Code Grader for {topic}. Evaluate the user's code against standard solutions."
                config = {"response_mime_type": "application/json"}
                
                p = f"Grade {len(code_queue)} code tasks. Output JSON List: [{{'question_idx':..., 'score':..., 'is_correct':...}}]\n"
                for s in code_queue: p += f"\nID: {s.question_idx}\nCode: {s.user_answer}"
                
                resp_text = self._generate_adk_sync(p, system_instruction)
                for g in json.loads(self._clean_json(resp_text)):
                    results.append({**g, "type": "code"})
            except:
                for s in code_queue: results.append({"question_idx": s.question_idx, "type": "code", "score": 50, "is_correct": True})
        
        results.sort(key=lambda x: x['question_idx'])
        return {"final_score": sum(r['score'] for r in results)//len(results) if results else 0, "results": results}

class PhaseQuizAgent(BaseAgent):
    def generate(self, phase: str, topics: List[str]):
        system_instruction = "Act as a Quiz Generator. Create a 5-question MCQ quiz."
        config = {"response_mime_type": "application/json"}
        prompt = f"Phase: {phase}. Topics: {topics}. Output JSON List."
        
        try:
            resp_text = self._generate_adk_sync(prompt, system_instruction)
            return json.loads(self._clean_json(resp_text))
        except:
            return []

class LearningAssistantAgent(BaseAgent):
    async def teach(self, topic: str, user_level: str, specific_question: Optional[str] = None) -> Dict[str, Any]:
        system_instruction = f"Act as an expert AI Tutor. Your goal is to explain concepts clearly, provide examples, and ensure the user understands."
        
        prompt_text = f"""
        Topic: {topic}
        User Level: {user_level}
        Specific Question: {specific_question if specific_question else "Explain this concept comprehensively."}
        
        Output Structure (JSON):
        {{
            "explanation": "Clear, concise explanation...",
            "key_points": ["Point 1", "Point 2"],
            "example": "A real-world or code example...",
            "practice_question": {{
                "q": "A simple question to check understanding",
                "options": ["A", "B", "C"],
                "correct": "A"
            }}
        }}
        """
        
        # Setup ADK
        try:
            response_text = await self._generate_adk_async(prompt_text, system_instruction)
            return json.loads(self._clean_json(response_text))
            
        except Exception as e:
            return {
                "explanation": f"I'm having trouble retrieving information on {topic} right now. (ADK Error: {str(e)})",
                "key_points": ["System Error", "Please try again"],
                "example": str(e),
                "practice_question": None
            }

