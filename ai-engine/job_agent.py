import os
import requests
import json
from typing import List, Dict, Any

from google.genai.types import Content, Part
from llm_provider import LLMProvider

class JobSearchAgent:
    def __init__(self):
        self.api_key = os.getenv("SERPAPI_KEY")
        self.base_url = "https://serpapi.com/search.json"
        self.llm = LLMProvider()

    def search_jobs(self, skills: List[str], role: str = "", location: str = "Remote") -> List[Dict[str, Any]]:
        # Helper to clean JSON
        def _clean_json(text: str) -> str:
            import re
            match = re.search(r'(\{.*\}|\[.*\])', text, re.DOTALL)
            if match:
                return match.group(0)
            return text

        if not self.api_key:
            return [{"title": "Error", "company": "System", "description": "SerpAPI Key missing"}]
        
        # 1. Use LLM to construct the optimal query
        try:
            system_instruction = "Act as a Job Search Query Expert. Your task is to construct a single, highly effective Google Jobs search query string."
            prompt = f"""
            User Data:
            - Skills: {', '.join(skills)}
            - Desired Role: {role if role else 'Software Engineer'}
            - Location: {location}
            
            Task:
            Construct a query string to find relevant job openings.
            Include the top critical skills and the role. Do not include the location in the string if it's meant for the 'location' parameter, but if 'Remote' is requested, include 'Remote' in the text.
            
            Output JSON: {{ "query": "string" }}
            """
            
            # Using LLMProvider directly to avoid broken ADK wrapper
            response = self.llm.generate_with_retry(prompt, system_instruction=system_instruction)
            query_response_text = response.text if response else ""
            
            if not query_response_text:
                 raise RuntimeError("Empty response from LLMProvider for query generation.")
            
            data = json.loads(_clean_json(query_response_text))
            query = data.get("query", "").strip()
            print(f"🤖 LLM Generated Query: {query}")
        except Exception as e:
            print(f"LLM Error: {e}. Fallback to strict string construction.")
            query = f"{role} {' '.join(skills[:3])}"

        # 2. Add Location Logic
        search_location = location
        if location.lower() == "remote":
            search_location = "India" # Default region for Remote if no specific country is given, or keep empty.
            if "Remote" not in query:
                query += " Remote"

        params = {
            "engine": "google_jobs",
            "q": query,
            "location": search_location,
            "api_key": self.api_key,
            "hl": "en",
        }

        # Helper function to process raw job results
        def process_jobs(raw_jobs, existing_jobs, unique_ids):
            processed = []
            for job in raw_jobs:
                # Unique ID roughly based on company + title to avoid exact duplicates
                uid = f"{job.get('company_name')}-{job.get('title')}"
                if uid in unique_ids:
                    continue
                unique_ids.add(uid)

                # Extract Schedule
                schedule_type = "Unknown"
                if "detected_extensions" in job and "schedule_type" in job["detected_extensions"]:
                    schedule_type = job["detected_extensions"]["schedule_type"]
                
                loc = job.get("location", location)
                if "Remote" in loc: schedule_type = "Remote"

                # Extract Apply Links
                apply_links = []
                if "apply_options" in job:
                    apply_links = [{"source": opt.get("title", "Apply"), "link": opt.get("link")} for opt in job["apply_options"]]
                elif "related_links" in job:
                     apply_links = [{"source": opt.get("title", "Apply"), "link": opt.get("link")} for opt in job["related_links"]]
                
                if not apply_links:
                    apply_links = [{"source": "Apply Now", "link": job.get("share_link", "#")}]

                formatted = {
                    "title": job.get("title", "Unknown Role"),
                    "company": job.get("company_name", "Unknown Company"),
                    "location": loc,
                    "description": job.get("description", "No description available.")[:200] + "...",
                    "links": apply_links,
                    "apply_links": apply_links,
                    "type": schedule_type,
                    "posted_at": job.get("detected_extensions", {}).get("posted_at", "")
                }
                processed.append(formatted)
            return processed

        all_formatted_jobs = []
        seen_job_ids = set()

        try:
            # --- 1. Primary AI-Driven Search ---
            print(f"Searching SerpAPI for: {query} in {search_location}")
            response = requests.get(self.base_url, params=params)
            response.raise_for_status()
            results = response.json()
            
            jobs = results.get("jobs_results", [])
            all_formatted_jobs.extend(process_jobs(jobs, all_formatted_jobs, seen_job_ids))

            # --- 2. Fallback Loop (Expand if < 3 jobs) ---
            if len(all_formatted_jobs) < 3 and skills:
                print(f"Found only {len(all_formatted_jobs)} jobs. expanding search loop...")
                
                # Iterate through top skills to find more matches
                for skill in skills[:3]: # check top 3 skills
                    if len(all_formatted_jobs) >= 3:
                        break
                    
                    fallback_query = f"{skill} {role} {location}"
                    if location.lower() == "remote" and "Remote" not in fallback_query:
                        fallback_query += " Remote"
                        
                    print(f"Looping: Searching for {fallback_query}")
                    params["q"] = fallback_query
                    
                    try:
                        res = requests.get(self.base_url, params=params)
                        new_results = res.json().get("jobs_results", [])
                        all_formatted_jobs.extend(process_jobs(new_results, all_formatted_jobs, seen_job_ids))
                    except Exception as loop_err:
                        print(f"Values loop error for {skill}: {loop_err}")
                        continue

            return all_formatted_jobs[:10]

        except Exception as e:
            print(f"SerpAPI Error: {e}")
            return []

if __name__ == "__main__":
    agent = JobSearchAgent()
    print(agent.search_jobs(["Python", "FastAPI"], "Backend Developer", "India"))
