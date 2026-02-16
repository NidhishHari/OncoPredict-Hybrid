import requests
import json

try:
    response = requests.post(
        "http://localhost:8000/valuate",
        json={"data_content": "This is a test sequence for valuation purposes."}
    )
    print(f"Status: {response.status_code}")
    print(response.json())
except Exception as e:
    print(f"Error: {e}")
