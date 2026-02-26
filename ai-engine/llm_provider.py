
import os
import time
import google.generativeai as genai
from google.api_core import exceptions
from dotenv import load_dotenv

load_dotenv()

class LLMProvider:
    _instance = None
    
    def __new__(cls):
        if cls._instance is None:
            cls._instance = super(LLMProvider, cls).__new__(cls)
            cls._instance._initialize()
        return cls._instance
    
    def _initialize(self):
        self.api_key = os.getenv("GEMINI_API_KEY")
        if self.api_key:
            genai.configure(api_key=self.api_key)
            print("✅ LLMProvider: Gemini Configured")
        else:
            print("⚠️ LLMProvider: No API Key found")

        # Centralized Model Registry - Priority List
        # Using Exact names from available_models.txt
        self.candidates = [
            'models/gemini-2.0-flash',
            'models/gemini-2.0-flash-lite',
            'models/gemini-flash-latest',
            'models/gemini-1.5-flash-latest'
        ]

    def get_model(self, model_name=None):
        target = model_name if model_name else self.candidates[0]
        return genai.GenerativeModel(target)

    def generate_with_retry(self, prompt, model_name=None, retries=1, delay=1, system_instruction=None, generation_config=None):
        if not self.api_key:
            raise Exception("No API Key available for LLM generation")

        # If strict model requested, use only that. Otherwise rotate.
        model_list = [model_name] if model_name else self.candidates
        
        last_error = None
        
        # 1. Try Round Robin
        for model_tag in model_list:
            # Instantiate model with system instruction if provided
            model = genai.GenerativeModel(model_tag, system_instruction=system_instruction)
            for attempt in range(retries):
                try:
                    return model.generate_content(prompt, generation_config=generation_config)
                except exceptions.ResourceExhausted:
                    print(f"⚠️ [LLMProvider] Quota Exceeded on {model_tag} (Attempt {attempt+1}).")
                    time.sleep(delay) 
                    continue
                except Exception as e:
                    print(f"❌ [LLMProvider] Error on {model_tag}: {e}")
                    last_error = e
                    break # Break sub-loop to try next model
            
            print(f"🔄 Switching to next available model...")

        # 2. Last Resort: If all failed due to Quota, wait 15s and try Primary again.
        if isinstance(last_error, exceptions.ResourceExhausted) or not last_error:
             print("⏳ All models exhausted. Waiting 15s for Quota Reset...")
             time.sleep(15)
             try:
                 print("🔄 Final Attempt with Primary Model...")
                 # Recalculate model with system instruction
                 model = genai.GenerativeModel(self.candidates[0], system_instruction=system_instruction)
                 return model.generate_content(prompt, generation_config=generation_config)
             except Exception as e:
                 print(f"❌ Final Attempt Failed: {e}")
                 last_error = e

        print("❌ All AI models exhausted.")
        raise last_error or Exception("All AI models exhausted")

