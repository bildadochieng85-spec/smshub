from telegram import Update
from telegram.ext import ApplicationBuilder, CommandHandler, MessageHandler, ContextTypes, filters
import requests

TOKEN = "8301086359:AAE7rpPM5VpPO3roaVFpiV3utxqvLD0E8cY"  # Telegram bot token
BACKEND_URL = "http://127.0.0.1:5000"  # Flask backend URL

async def start(update: Update, context: ContextTypes.DEFAULT_TYPE):
    await update.message.reply_text("Hello! I'm your Telegram bot 🙂")

async def echo(update: Update, context: ContextTypes.DEFAULT_TYPE):
    text = update.message.text

    # send message back to website backend
    try:
        requests.post(f"{BACKEND_URL}/telegram", json={"text": text})
    except:
        pass  # ignore errors if backend is not running

    await update.message.reply_text(f"You said: {text}")

def main():
    app = ApplicationBuilder().token(TOKEN).build()

    app.add_handler(CommandHandler("start", start))
    app.add_handler(MessageHandler(filters.TEXT & ~filters.COMMAND, echo))

    app.run_polling()

if __name__ == "__main__":
    main()

