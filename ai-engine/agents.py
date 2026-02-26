from typing import List, Dict, Any

class Agent:
    def explain(self, decision: str) -> str:
        return f"AI Reasoning: {decision}"

class SkillMatchingAgent(Agent):
    def analyze(self, user_skills: List[str], job_skills: List[str]) -> Dict[str, Any]:
        """
        Calculates skill match percentage based on exact and partial matches.
        """
        if not user_skills or not job_skills:
            return {"match_score": 0, "missing_skills": job_skills, "explanation": "Insufficient data provided."}

        user_skills_set = set(s.lower().strip() for s in user_skills)
        job_skills_set = set(s.lower().strip() for s in job_skills)
        
        matches = user_skills_set.intersection(job_skills_set)
        missing = job_skills_set - user_skills_set
        
        score = (len(matches) / len(job_skills_set)) * 100
        
        explanation = (
            f"You match {int(score)}% of the required skills. "
            f"You have: {', '.join(matches) if matches else 'None'}. "
            f"Missing: {', '.join(missing) if missing else 'None'}."
        )
        
        return {
            "match_score": round(score, 1),
            "matched_skills": list(matches),
            "missing_skills": list(missing),
            "explanation": explanation
        }

class ValueAlignmentAgent(Agent):
    def analyze(self, user_values: List[str], job_values: List[str]) -> Dict[str, Any]:
        """
        Matches user values (e.g., 'Work-Life Balance') with Job Ethos.
        """
        if not user_values or not job_values:
             return {"alignment_score": 50, "explanation": "Neutral alignment due to missing value inputs."} # Default to neutral

        user_vals = set(v.lower() for v in user_values)
        job_vals = set(v.lower() for v in job_values)
        
        matches = user_vals.intersection(job_vals)
        score = (len(matches) / len(user_vals)) * 100 if user_vals else 0
        
        explanation = f"Values aligned: {', '.join(matches)}." if matches else "No strong value alignment found."
        
        return {
            "alignment_score": round(score, 1),
            "explanation": explanation
        }

class WellBeingAgent(Agent):
    def analyze(self, stress_tolerance: int, job_stress_level: int) -> Dict[str, Any]:
        """
        Analyzes stress fit.
        Stress Tolerance: 1 (Low) to 10 (High)
        Job Stress: 1 (Low) to 10 (High)
        """
        # If user has low tolerance (e.g. 3) and job is high stress (e.g. 8), Score is low.
        # If user has high tolerance (e.g. 9) and job is high stress (e.g. 8), Score is high.
        
        # Gap calculation
        gap = stress_tolerance - job_stress_level
        
        if gap >= 0:
            score = 100 # Comfortable
            status = "Excellent"
        elif gap >= -2:
            score = 75 # Manageable
            status = "Good"
        elif gap >= -4:
            score = 50 # Challenging
            status = "Moderate Risk"
        else:
            score = 25 # High Burnout Risk
            status = "High Burnout Risk"
            
        return {
            "wellbeing_score": score,
            "status": status,
            "explanation": f"Based on your stress tolerance of {stress_tolerance}/10 and the job's stress level of {job_stress_level}/10, this role is rated as '{status}'."
        }

class RegretPredictionAgent(Agent):
    def analyze(self, match_score: float, alignment_score: float, wellbeing_score: float) -> Dict[str, Any]:
        """
        Predicts long-term regret probability.
        High match + Low alignment + Low wellbeing = High Regret.
        """
        # Weighting: Wellbeing (40%), Alignment (40%), Skills (20%) - Skills matter less for happiness than values/stress
        
        satisfaction_index = (match_score * 0.2) + (alignment_score * 0.4) + (wellbeing_score * 0.4)
        regret_probability = 100 - satisfaction_index
        
        if regret_probability > 70:
            risk = "High"
        elif regret_probability > 30:
            risk = "Medium"
        else:
            risk = "Low"
            
        return {
            "regret_probability": round(regret_probability, 1),
            "risk_level": risk,
            "explanation": f"Predicted regret risk is {risk} ({round(regret_probability, 1)}%). This is driven by your values and well-being alignment."
        }
