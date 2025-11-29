import os
import google.generativeai as genai
from dotenv import load_dotenv

load_dotenv()
genai.configure(api_key=os.getenv("GOOGLE_API_KEY"))

print("あなたのAPIキーで使用可能なモデル一覧:")
print("-" * 30)
for m in genai.list_models():
    if 'generateContent' in m.supported_generation_methods:
        print(m.name)