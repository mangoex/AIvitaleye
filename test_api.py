import urllib.request
import json

red_pixel = "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg=="
data = {
    "imageBase64": f"data:image/png;base64,{red_pixel}",
    "mimeType": "image/png",
    "patientName": "Test Patient",
    "age": "30",
    "gender": "Masculino",
    "additionalNotes": "Prueba técnica"
}

req = urllib.request.Request(
    "https://aivitaleye-production.up.railway.app/api/analyze-photo",
    data=json.dumps(data).encode('utf-8'),
    headers={"Content-Type": "application/json"}
)

try:
    with urllib.request.urlopen(req) as response:
        print("Status Code:", response.status)
        print("Response:", response.read().decode('utf-8'))
except urllib.error.HTTPError as e:
    print("HTTP Error:", e.code)
    print(e.read().decode('utf-8'))
except Exception as e:
    print("Error:", e)
