from groq import Groq
import os, json
from dotenv import load_dotenv
load_dotenv()
client = Groq(api_key=os.environ['GROQ_API_KEY'])

prompt = 'Return ONLY this JSON, no markdown: {"title": "Test Trip", "days": []}'

for model in ['openai/gpt-oss-120b', 'openai/gpt-oss-20b', 'qwen/qwen3.8-27b']:
    try:
        resp = client.chat.completions.create(
            model=model,
            messages=[
                {'role': 'system', 'content': 'You are a travel planner. Return valid JSON only. No markdown, no explanation.'},
                {'role': 'user', 'content': prompt}
            ],
            max_tokens=200,
            temperature=0.1
        )
        content = resp.choices[0].message.content or '(empty)'
        finish = resp.choices[0].finish_reason
        print(f'--- {model} (finish={finish}) ---')
        print(repr(content[:300]))
        print()
    except Exception as e:
        print(f'FAIL {model}: {str(e)[:200]}')
