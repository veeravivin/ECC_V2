
import os
from google.genai import Client
from dotenv import load_dotenv

load_dotenv()
api_key = os.getenv("GOOGLE_API_KEY") or os.getenv("GEMINI_API_KEY")

client = Client(api_key=api_key)
try:
    for m in client.models.list():
        if "gemini" in m.name:
            print(f"Model: {m.name}")
except Exception as e:
    print(f"Error: {e}")
