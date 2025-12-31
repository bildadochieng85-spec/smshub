from telegram import Update
from telegram.ext import ApplicationBuilder, CommandHandler, MessageHandler, ContextTypes, filters
import requests

TOKEN = "8301086359:AAE7rpPM5VpPO3roaVFpiV3utxqvLD0E8cY"  # Telegram bot token
BACKEND_URL = "http://127.0.0.1:5500"  # Flask backend URL

async def start(update: Update, context: ContextTypes.DEFAULT_TYPE):
    await update.message.reply_text("Hello! I'm your Telegram bot 🙂")

async def echo(update: Update, context: ContextTypes.DEFAULT_TYPE):
    text = update.message.text

    # send message to the website backend
    try:
        response = requests.post(f"{BACKEND_URL}/telegram", json={"text": text}, timeout=5)
        if response.status_code != 200:
            print(f"Backend returned {response.status_code}")
    except requests.exceptions.RequestException as e:
        print(f"Error sending message to backend: {e}")

    await update.message.reply_text(f"You said: {text}")

def main():
    app = ApplicationBuilder().token(TOKEN).build()

    app.add_handler(CommandHandler("start", start))
    app.add_handler(MessageHandler(filters.TEXT & ~filters.COMMAND, echo))

    print("Bot is running...")
    app.run_polling()

if __name__ == "__main__":
    main()
