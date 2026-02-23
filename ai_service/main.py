from __future__ import annotations

import os
from datetime import datetime, timedelta
from typing import Any

from dotenv import load_dotenv
from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel, Field

from services.db import get_db
from services.insights import build_insights
from services.gemini_client import answer_query
from services.fallback import build_fallback_answer

load_dotenv()

app = FastAPI(title="Finance Tracker AI Service", version="1.0.0")

# Print startup info
print("=" * 60)
print("🤖 Finance Tracker AI Service Starting...")
print("=" * 60)
print(f"MongoDB URI: {'✓ Set' if os.getenv('MONGODB_URI') else '✗ Missing'}")
print(f"MongoDB DB: {os.getenv('MONGODB_DB_NAME', 'Not set')}")
print(f"Gemini API Key: {'✓ Set' if os.getenv('GEMINI_API_KEY') else '✗ Missing (fallback mode)'}")
print(f"Gemini Model: {os.getenv('GEMINI_MODEL', 'gemini-2.0-flash')}")
print("=" * 60)

# Simple in-memory conversation history (userId -> list of Q&A pairs)
# TODO: Move to MongoDB for persistence across restarts
conversation_history: dict[str, list[dict[str, str]]] = {}
MAX_HISTORY_LENGTH = 5  # Increased from 3 for better context


def _is_finance_tracker_question(question: str) -> bool:
    """Enhanced question filtering with better keyword matching."""
    q = (question or "").strip().lower()
    if not q:
        return False

    # Expanded finance keywords
    finance_keywords = {
        "transaction", "transactions", "income", "expense", "expenses",
        "spent", "spend", "spending", "saving", "savings", "save", "saved",
        "budget", "budgets", "budgeting", "category", "categories",
        "month", "monthly", "year", "yearly", "average", "avg", "total",
        "net", "balance", "cash", "card", "bank", "rent", "salary",
        "payment", "paid", "cost", "costs", "money", "financial",
        "trend", "pattern", "predict", "forecast", "compare", "comparison",
        "overspend", "overspending", "anomaly", "unusual", "alert",
        "₹", "rupees", "inr", "rs", "how much", "where did",
    }

    # Expanded unrelated keywords
    unrelated_keywords = {
        "president", "prime minister", "cricket", "football", "movie",
        "actor", "actress", "country", "capital", "weather", "recipe",
        "song", "music", "game", "sport", "politics", "election",
        "celebrity", "news", "entertainment", "travel", "hotel",
    }

    # Quick reject for clearly unrelated topics
    if any(k in q for k in unrelated_keywords):
        return False

    # Accept if contains finance keywords
    if any(k in q for k in finance_keywords):
        return True
    
    # Accept common question patterns even without keywords
    question_patterns = [
        "how can i", "what should i", "tell me about", "show me",
        "give me", "what is my", "what are my", "do i have",
    ]
    
    return any(pattern in q for pattern in question_patterns)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


class QueryRequest(BaseModel):
    userId: str = Field(..., min_length=1)
    question: str = Field(..., min_length=1)


@app.get("/health")
def health() -> dict[str, str]:
    return {"status": "ok"}


@app.get("/insights")
def insights(userId: str, days: int = 90) -> dict[str, Any]:
    if not userId:
        raise HTTPException(status_code=400, detail="userId is required")

    if days < 7 or days > 365:
        raise HTTPException(status_code=400, detail="days must be between 7 and 365")

    db = get_db()
    since = datetime.utcnow() - timedelta(days=days)

    payload = build_insights(db=db, user_id=userId, since=since)
    return payload


@app.post("/query")
def query(body: QueryRequest) -> dict[str, Any]:
    """
    Enhanced query endpoint with improved AI responses.
    
    Features:
    - Conversation history tracking (last 5 exchanges)
    - Trend analysis and predictions
    - Better context awareness
    - Comprehensive fallback system
    """
    if not _is_finance_tracker_question(body.question):
        return {
            "answer": "I can only answer questions about your finance tracker data (income, expenses, transactions, budgets, savings).",
            "source": "filter"
        }

    try:
        db = get_db()
    except Exception as e:
        print(f"Database connection error: {e}")
        raise HTTPException(status_code=503, detail="Database connection failed")
    
    try:
        # Load ALL user data (no time limit) for comprehensive answers
        context = build_insights(db=db, user_id=body.userId, since=None, load_all=True)
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))
    except Exception as e:
        print(f"Error building insights: {e}")
        raise HTTPException(status_code=500, detail="Failed to analyze financial data")

    # Get conversation history for this user
    user_history = conversation_history.get(body.userId, [])
    
    # Build conversation context string with better formatting
    conversation_context = ""
    if user_history:
        conversation_context = "\n--- Previous Conversation ---\n"
        for i, exchange in enumerate(user_history, 1):
            conversation_context += f"[{i}] User: {exchange['question']}\n"
            conversation_context += f"[{i}] Finn: {exchange['answer']}\n\n"
        conversation_context += "--- End Previous Conversation ---\n"

    source = "gemini"
    try:
        text = answer_query(
            question=body.question, 
            insights=context,
            conversation_history=conversation_context
        )
    except Exception as e:
        # Fallback also needs history for context
        print(f"Gemini failed: {e}, using fallback")
        source = "fallback"
        try:
            text = build_fallback_answer(
                question=body.question, 
                insights=context,
                conversation_history=conversation_context
            )
        except Exception as fallback_error:
            print(f"Fallback also failed: {fallback_error}")
            text = "I'm having trouble processing your question right now. Please try again or rephrase your question."

    # Store this exchange in history
    if body.userId not in conversation_history:
        conversation_history[body.userId] = []
    conversation_history[body.userId].append({
        "question": body.question,
        "answer": text,
        "timestamp": datetime.utcnow().isoformat(),
        "source": source
    })
    # Keep only last N exchanges
    conversation_history[body.userId] = conversation_history[body.userId][-MAX_HISTORY_LENGTH:]

    return {"answer": text, "source": source}


@app.delete("/conversation/{userId}")
def clear_conversation(userId: str) -> dict[str, str]:
    """Clear conversation history for a specific user."""
    if userId in conversation_history:
        del conversation_history[userId]
        return {"status": "success", "message": f"Conversation history cleared for user {userId}"}
    return {"status": "success", "message": "No conversation history found for this user"}
