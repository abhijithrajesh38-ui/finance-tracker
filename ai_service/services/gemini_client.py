from __future__ import annotations

import os
import json
from typing import Any

import google.generativeai as genai


def answer_query(question: str, insights: dict[str, Any], conversation_history: str = "") -> str:
    api_key = os.getenv("GEMINI_API_KEY")
    if not api_key:
        raise RuntimeError("Missing environment variable: GEMINI_API_KEY")

    genai.configure(api_key=api_key)

    model_name = os.getenv("GEMINI_MODEL", "gemini-2.0-flash")
    model = genai.GenerativeModel(model_name)

    summary = insights.get("summary", {})
    top = summary.get("topCategories", [])
    alerts = []
    for item in insights.get("insights", []):
        if item.get("type") in {"budget_alert", "anomaly"}:
            alerts.append(item)

    context = {
        "summary": summary,
        "topCategories": top,
        "alerts": alerts,
    }

    prompt = (
        "You are a Finance Chatbot Agent inside a personal finance tracking system.\n"
        "Your role is to answer questions using the user's financial data provided below.\n\n"
        "Rules:\n"
        "- Base your answers ONLY on the provided financial data.\n"
        "- Do NOT invent numbers or assume missing values.\n"
        "- For savings questions: calculate from Income - Expenses = Net savings, then suggest reducing top expense categories.\n"
        "- For overspending: identify categories where spend exceeds budget or is unusually high.\n"
        "- Do NOT provide generic financial advice unrelated to the user's data.\n"
        "- If truly no relevant data exists, respond: I could not find this information in your financial records.\n"
        "- Output MUST be plain text without markdown, asterisks, or bullet symbols.\n"
        "- Keep it concise and practical. Use INR currency (₹).\n"
        "- If the user refers to 'that', 'it', 'this month', or similar references, use the previous conversation context to understand what they're asking about.\n"
        f"{conversation_history}\n"
        f"User Financial Data (JSON):\n{json.dumps(context, default=str)}\n\n"
        f"User Question: {question}"
    )

    resp = model.generate_content(prompt)
    return (getattr(resp, "text", None) or "").strip() or "I couldn't generate an answer right now."
