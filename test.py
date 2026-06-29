import os
import json
import urllib.request

api_key = os.environ.get("OPENROUTER_API_KEY", "")
if not api_key:
    print("No api key")
    exit(1)

# create a dummy base64 red image
red_base64 = "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg=="

data = {
    "model": "google/gemini-2.5-flash",
    "messages": [
        {
            "role": "user",
            "content": [
                {"type": "text", "text": "Describe el color principal de la imagen. Solo una palabra."},
                {"type": "image_url", "image_url": {"url": f"data:image/png;base64,{red_base64}"}}
            ]
        }
    ],
    "temperature": 0.5
}

req = urllib.request.Request(
    "https://openrouter.ai/api/v1/chat/completions",
    data=json.dumps(data).encode('utf-8'),
    headers={
        "Authorization": f"Bearer {api_key}",
        "Content-Type": "application/json"
    }
)

try:
    response = urllib.request.urlopen(req)
    print(response.read().decode('utf-8'))
except Exception as e:
    print("Error:", e)
    if hasattr(e, 'read'):
        print(e.read().decode('utf-8'))

