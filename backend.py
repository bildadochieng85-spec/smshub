from flask import Flask, request, jsonify
from flask_cors import CORS
import requests

app = Flask(__name__)
CORS(app)

BOT_TOKEN = "8301086359:AAE7rpPM5VpPO3roaVFpiV3utxqvLD0E8cY"
CHAT_ID = "7711425125"

messages = []

@app.post("/send")
def send_message():
    data = request.json
    text = data.get("message", "")
    messages.append({"from": "website", "text": text})

    # send to Telegram
    url = f"https://api.telegram.org/bot{BOT_TOKEN}/sendMessage"
    requests.post(url, json={"chat_id": CHAT_ID, "text": text})
    return {"ok": True}

@app.post("/telegram")
def telegram_webhook():
    data = request.json
    text = data.get("text", "")
    messages.append({"from": "telegram", "text": text})
    return {"ok": True}

@app.get("/messages")
def get_messages():
    return jsonify(messages)

if __name__ == "__main__":
    app.run(port=5000)
