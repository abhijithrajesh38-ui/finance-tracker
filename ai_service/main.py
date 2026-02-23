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

# Simple in-memory conversation history (userId -> list of Q&A pairs)
conversation_history: dict[str, list[dict[str, str]]] = {}

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
    db = get_db()
    # Load ALL user data (no time limit) for comprehensive answers
    context = build_insights(db=db, user_id=body.userId, since=None, load_all=True)

    # Get conversation history for this user (last 3 exchanges)
    user_history = conversation_history.get(body.userId, [])
    
    # Build conversation context string
    conversation_context = ""
    if user_history:
        conversation_context = "\n\nPrevious Conversation:\n"
        for exchange in user_history:
            conversation_context += f"User: {exchange['question']}\n"
            conversation_context += f"Assistant: {exchange['answer']}\n"

    try:
        text = answer_query(
            question=body.question, 
            insights=context,
            conversation_history=conversation_context
        )
    except Exception as e:
        # Fallback also needs history for context
        print(f"Gemini failed: {e}, using fallback")
        text = build_fallback_answer(
            question=body.question, 
            insights=context,
            conversation_history=conversation_context
        )

    # Store this exchange in history (keep last 3)
    if body.userId not in conversation_history:
        conversation_history[body.userId] = []
    conversation_history[body.userId].append({
        "question": body.question,
        "answer": text
    })
    # Keep only last 3 exchanges
    conversation_history[body.userId] = conversation_history[body.userId][-3:]

    return {"answer": text}
