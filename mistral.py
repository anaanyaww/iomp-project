import requests

API_KEY = "btlkG2LDDJAswJluuAaZmrWDtLUcQAe3" # Replace with your actual API key
URL = "https://api.mistral.ai/v1/chat/completions"

headers = {
    "Authorization": f"Bearer {API_KEY}",
    "Content-Type": "application/json"
}

data = {
    "model": "mistral-medium",  # Use "mistral-tiny", "mistral-small", or "mistral-medium"
    "messages": [
        {"role": "system", "content": "You are a helpful AI assistant."},
        {"role": "user", "content": "Tell me a story"}
    ]
}

response = requests.post(URL, headers=headers, json=data)

if response.status_code == 200:
    print(response.json()["choices"][0]["message"]["content"])  # Get AI response
else:
    print("Error:", response.json())
