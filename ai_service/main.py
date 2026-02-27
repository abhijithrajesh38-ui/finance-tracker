from __future__ import annotations

import os
import re
import io
from datetime import datetime, timedelta
from typing import Any

from dotenv import load_dotenv
from fastapi import FastAPI, HTTPException, UploadFile, File
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel, Field

from services.db import get_db
from services.insights import build_insights
from services.gemini_client import answer_query, extract_transaction_from_text, generate_financial_health_explanation
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


def _is_greeting(question: str) -> bool:
    q = (question or "").strip().lower()
    if not q:
        return False

    greetings = {
        "hi",
        "hello",
        "hey",
        "good morning",
        "good afternoon",
        "good evening",
        "greetings",
        "howdy",
    }

    # Match exact phrase, or phrase at start with punctuation after it.
    # Avoid substring matches like "hi" in "this".
    for g in greetings:
        if " " in g:
            if q == g or q.startswith(g + " ") or q.startswith(g + "!") or q.startswith(g + ",") or q.startswith(g + "."):
                return True
        else:
            if re.search(rf"\b{re.escape(g)}\b", q):
                return True

    return False


def _is_finance_tracker_question(question: str) -> bool:
    """Enhanced question filtering with better keyword matching."""
    q = (question or "").strip().lower()
    if not q:
        return False

    # Allow greetings - they should get a friendly response, not rejection
    if _is_greeting(q):
        return True  # Treat as valid but will handle specially

    # Expanded finance keywords
    finance_keywords = {
        "transaction", "transactions", "income", "expense", "expenses",
        "spent", "spend", "spending", "saving", "savings", "save", "saved",
        "budget", "budgets", "budgeting", "category", "categories",
        "month", "monthly", "week", "weekly", "day", "daily", "today", "yesterday",
        "month", "monthly", "year", "yearly", "average", "avg", "total",
        "net", "balance", "cash", "card", "bank", "rent", "salary",
        "payment", "paid", "cost", "costs", "money", "financial",
        "trend", "pattern", "predict", "forecast", "compare", "comparison",
        "overspend", "overspending", "anomaly", "unusual", "alert",
        "₹", "rupees", "inr", "rs", "how much", "where did",
    }

    # Quick reject for clearly unrelated topics
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


@app.post("/receipt/parse")
async def receipt_parse(file: UploadFile = File(...)) -> dict[str, Any]:
    if not file:
        raise HTTPException(status_code=400, detail="file is required")

    try:
        content = await file.read()
    except Exception as e:
        raise HTTPException(status_code=400, detail=f"failed to read file: {e}")

    if not content:
        raise HTTPException(status_code=400, detail="empty file")

    try:
        import numpy as np
        from PIL import Image
        import easyocr

        img = Image.open(io.BytesIO(content)).convert("RGB")
        img_arr = np.array(img)

        if not hasattr(receipt_parse, "_easyocr_reader"):
            receipt_parse._easyocr_reader = easyocr.Reader(["en"], gpu=False)  # type: ignore[attr-defined]
        reader = receipt_parse._easyocr_reader  # type: ignore[attr-defined]

        results = reader.readtext(img_arr)
        receipt_text = "\n".join([r[1] for r in results if r and len(r) > 1])
        if not receipt_text.strip():
            raise RuntimeError("EasyOCR produced empty text")

        parsed = extract_transaction_from_text(receipt_text=receipt_text)
    except Exception as e:
        raise HTTPException(status_code=502, detail=f"receipt parsing failed: {e}")

    def _norm_payment_method(pm: Any) -> str | None:
        if not pm:
            return None
        v = str(pm).strip().lower()
        if v in {"cash", "card", "bank", "upi", "other"}:
            return v
        if "upi" in v:
            return "upi"
        if "card" in v or "credit" in v or "debit" in v:
            return "card"
        if "cash" in v:
            return "cash"
        if "bank" in v or "transfer" in v or "netbank" in v:
            return "bank"
        return "other"

    def _norm_type(t: Any) -> str:
        v = str(t or "expense").strip().lower()
        return "income" if v == "income" else "expense"

    def _to_float(x: Any) -> float | None:
        try:
            return float(x)
        except Exception:
            return None

    transaction = {
        "type": _norm_type(parsed.get("type")),
        "category": (parsed.get("category") or None),
        "amount": _to_float(parsed.get("amount")),
        "description": (parsed.get("description") or "").strip(),
        "date": parsed.get("date") or None,
        "paymentMethod": _norm_payment_method(parsed.get("paymentMethod")),
        "categoryConfidence": parsed.get("categoryConfidence"),
    }

    missing = []
    if not transaction.get("amount") or transaction["amount"] <= 0:
        missing.append("amount")
    if not transaction.get("description"):
        missing.append("description")
    if not transaction.get("date"):
        missing.append("date")
    if not transaction.get("paymentMethod"):
        missing.append("paymentMethod")
    if not transaction.get("category"):
        missing.append("category")

    return {"transaction": transaction, "missing": missing, "ocrText": receipt_text}


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


def _clamp(x: float, lo: float, hi: float) -> float:
    if x < lo:
        return lo
    if x > hi:
        return hi
    return x


def _mean(values: list[float]) -> float:
    return sum(values) / len(values) if values else 0.0


def _std(values: list[float]) -> float:
    if len(values) < 2:
        return 0.0
    m = _mean(values)
    var = sum((v - m) ** 2 for v in values) / (len(values) - 1)
    return var ** 0.5


def _cv(values: list[float]) -> float:
    m = _mean(values)
    if m <= 0:
        return 0.0
    return _std(values) / m


def _risk_level(score: int) -> str:
    if score >= 80:
        return "Low"
    if score >= 60:
        return "Moderate"
    if score >= 40:
        return "High"
    return "Critical"


def _volatility_label(cv: float) -> str:
    if cv < 0.25:
        return "Low"
    if cv < 0.5:
        return "Moderate"
    return "High"


def _consistency_label(cv: float) -> str:
    if cv < 0.15:
        return "Stable"
    if cv < 0.35:
        return "Moderate"
    return "Volatile"


def _adherence_label(overspend_ratio: float) -> str:
    if overspend_ratio <= 0:
        return "Strong"
    if overspend_ratio <= 0.25:
        return "Moderate"
    return "Weak"


def _score_for_month(*, summary: dict[str, Any], raw: dict[str, Any], month_key: str) -> dict[str, Any]:
    income_by_month: dict[str, Any] = summary.get("incomeByMonth", {}) or {}
    expense_by_month: dict[str, Any] = summary.get("expenseByMonth", {}) or {}
    income = float(income_by_month.get(month_key, 0) or 0)
    expenses = float(expense_by_month.get(month_key, 0) or 0)
    net = income - expenses
    savings_rate_pct = (net / income) * 100.0 if income > 0 else 0.0

    expense_by_day: dict[str, Any] = summary.get("expenseByDay", {}) or {}
    month_expense_days = [float(v or 0) for k, v in expense_by_day.items() if str(k).startswith(month_key)]
    expense_cv = _cv(month_expense_days)

    monthly_incomes = []
    for k, v in sorted(income_by_month.items()):
        if float(v or 0) > 0:
            monthly_incomes.append(float(v or 0))
    income_cv = _cv(monthly_incomes[-3:]) if len(monthly_incomes) >= 2 else 0.0

    budgets = raw.get("allBudgets") or []
    year = int(month_key[:4])
    month = int(month_key[5:7])
    month_budgets = [b for b in budgets if int(b.get("year") or 0) == year and int(b.get("month") or 0) == month]
    total_limit = 0.0
    total_overspend = 0.0
    if month_budgets:
        by_cat_month: dict[str, list[float]] = {}
        recent = raw.get("recentTransactions") or []
        for t in recent:
            if (t.get("type") or "").lower() != "expense":
                continue
            date_str = str(t.get("date") or "")
            if not date_str.startswith(month_key):
                continue
            cat = str(t.get("category") or "Uncategorized").strip().lower()
            by_cat_month.setdefault(cat, []).append(float(t.get("amount") or 0))

        for b in month_budgets:
            lim = float(b.get("limit") or 0)
            total_limit += lim
            cat = str(b.get("category") or "Uncategorized").strip().lower()
            spent = sum(by_cat_month.get(cat, []))
            if spent > lim and lim > 0:
                total_overspend += (spent - lim)

    overspend_ratio = (total_overspend / total_limit) if total_limit > 0 else 0.0

    expense_amounts = month_expense_days
    anomalies = 0
    if len(expense_amounts) >= 8:
        m = _mean(expense_amounts)
        s = _std(expense_amounts)
        if s > 0:
            anomalies = sum(1 for v in expense_amounts if ((v - m) / s) >= 2.8 and v > 0)

    base = 50

    savings_value = _clamp((savings_rate_pct - 20.0) / 30.0, -1.0, 1.0)
    savings_impact = int(round(savings_value * 30))

    expense_value = _clamp(1.0 - (expense_cv / 0.3), -1.0, 1.0)
    expense_impact = int(round(expense_value * 20))

    income_value = _clamp(1.0 - (income_cv / 0.25), -1.0, 1.0)
    income_impact = int(round(income_value * 20))

    budget_value = _clamp(1.0 - (overspend_ratio / 0.25), -1.0, 1.0)
    budget_impact = int(round(budget_value * 15))

    anomaly_penalty = -int(min(15, anomalies * 5))

    score = int(_clamp(float(base + savings_impact + expense_impact + income_impact + budget_impact + anomaly_penalty), 0.0, 100.0))

    return {
        "score": score,
        "riskLevel": _risk_level(score),
        "components": {
            "savingsRateImpact": savings_impact,
            "expenseStabilityImpact": expense_impact,
            "incomeConsistencyImpact": income_impact,
            "budgetAdherenceImpact": budget_impact,
            "anomalyPenalty": anomaly_penalty,
        },
        "metrics": {
            "savingsRatePct": round(savings_rate_pct, 1),
            "expenseVolatility": _volatility_label(expense_cv),
            "incomeConsistency": _consistency_label(income_cv),
            "budgetAdherence": _adherence_label(overspend_ratio),
            "anomalies": anomalies,
        },
    }


def _fallback_short_explanation(*, score: int, risk_level: str, metrics: dict[str, Any]) -> str:
    sr = metrics.get("savingsRatePct")
    ev = metrics.get("expenseVolatility")
    ic = metrics.get("incomeConsistency")
    ba = metrics.get("budgetAdherence")
    an = metrics.get("anomalies")

    return (
        f"Your financial health score is {score}/100 ({risk_level} risk). "
        f"Savings rate is {sr}%, expense volatility is {ev}, and income consistency is {ic}. "
        f"Budget adherence is {ba} with {an} anomaly signals detected."
    )


def _fallback_long_explanation(*, score: int, risk_level: str, metrics: dict[str, Any], components: dict[str, Any]) -> str:
    sr = metrics.get("savingsRatePct")
    ev = metrics.get("expenseVolatility")
    ic = metrics.get("incomeConsistency")
    ba = metrics.get("budgetAdherence")
    an = metrics.get("anomalies")

    def _fmt(n: Any) -> str:
        try:
            n = int(n)
        except Exception:
            return "--"
        return f"{n:+d}"

    return (
        f"Score: {score}/100 ({risk_level} risk). "
        f"Savings rate: {sr}%. Expense volatility: {ev}. Income consistency: {ic}. "
        f"Budget adherence: {ba}. Anomalies detected: {an}. "
        f"Component impacts: Savings Rate {_fmt(components.get('savingsRateImpact'))}, "
        f"Expense Stability {_fmt(components.get('expenseStabilityImpact'))}, "
        f"Income Consistency {_fmt(components.get('incomeConsistencyImpact'))}, "
        f"Budget Adherence {_fmt(components.get('budgetAdherenceImpact'))}, "
        f"Anomaly Penalty {_fmt(components.get('anomalyPenalty'))}."
    )


def _is_incomplete_explanation(text: str) -> bool:
    t = (text or "").strip()
    if not t:
        return True
    if len(t) < 50:
        return True
    if t.endswith((" a", " an", " the", " to", " of", " and", " or", " but")):
        return True
    if t.count(" ") < 6:
        return True
    if t[-1] not in {".", "!"}:
        return True
    return False


@app.get("/financial-health")
def financial_health(userId: str) -> dict[str, Any]:
    if not userId:
        raise HTTPException(status_code=400, detail="userId is required")

    db = get_db()
    ctx = build_insights(db=db, user_id=userId, since=None, load_all=True)
    summary = ctx.get("summary", {}) or {}
    raw = ctx.get("raw", {}) or {}

    this_month_key = str(summary.get("thisMonthKey") or "")
    last_month_key = str(summary.get("lastMonthKey") or "")
    if not this_month_key or len(this_month_key) < 7:
        raise HTTPException(status_code=500, detail="missing month context")

    current = _score_for_month(summary=summary, raw=raw, month_key=this_month_key)
    previous = _score_for_month(summary=summary, raw=raw, month_key=last_month_key) if last_month_key else {"score": None}

    prompt = (
        "You are a financial risk analyst. Based on: "
        f"Score: {current['score']} "
        f"Savings rate: {current['metrics']['savingsRatePct']}% "
        f"Expense volatility: {current['metrics']['expenseVolatility']} "
        f"Income consistency: {current['metrics']['incomeConsistency']} "
        f"Budget adherence: {current['metrics']['budgetAdherence']} "
        f"Anomalies: {current['metrics']['anomalies']} detected "
        "Generate a concise 2–3 sentence explanation in plain text. "
        "Do not use markdown. Do not use emojis. Keep it under 3 lines. Sound professional."
    )

    long_prompt = (
        "You are a financial risk analyst. "
        "Provide a concise professional explanation (4–5 lines) for a dashboard modal based on: "
        f"Score: {current['score']}. "
        f"Components: savingsRateImpact {current['components']['savingsRateImpact']}, "
        f"expenseStabilityImpact {current['components']['expenseStabilityImpact']}, "
        f"incomeConsistencyImpact {current['components']['incomeConsistencyImpact']}, "
        f"budgetAdherenceImpact {current['components']['budgetAdherenceImpact']}, "
        f"anomalyPenalty {current['components']['anomalyPenalty']}. "
        "Plain text only. No markdown. No emojis."
    )

    ai_explanation = _fallback_short_explanation(
        score=current["score"],
        risk_level=current["riskLevel"],
        metrics=current["metrics"],
    )
    expanded_explanation = _fallback_long_explanation(
        score=current["score"],
        risk_level=current["riskLevel"],
        metrics=current["metrics"],
        components=current["components"],
    )
    try:
        ai_explanation = generate_financial_health_explanation(prompt=prompt, max_output_tokens=160)
        ai_explanation = " ".join(ai_explanation.split())
        if len(ai_explanation.splitlines()) > 3:
            ai_explanation = " ".join(ai_explanation.splitlines()[:3]).strip()
        if _is_incomplete_explanation(ai_explanation):
            ai_explanation = _fallback_short_explanation(
                score=current["score"],
                risk_level=current["riskLevel"],
                metrics=current["metrics"],
            )
    except Exception as e:
        print(f"Financial health Gemini short explanation failed: {e}")

    try:
        expanded_explanation = generate_financial_health_explanation(prompt=long_prompt, max_output_tokens=280)
        expanded_explanation = " ".join(expanded_explanation.split())
        if _is_incomplete_explanation(expanded_explanation):
            expanded_explanation = _fallback_long_explanation(
                score=current["score"],
                risk_level=current["riskLevel"],
                metrics=current["metrics"],
                components=current["components"],
            )
    except Exception as e:
        print(f"Financial health Gemini expanded explanation failed: {e}")

    payload = {
        "score": current["score"],
        "riskLevel": current["riskLevel"],
        "components": current["components"],
        "aiExplanation": ai_explanation,
        "expandedExplanation": expanded_explanation,
        "previousMonthScore": previous.get("score"),
        "deltaFromPreviousMonth": (current["score"] - int(previous["score"])) if previous.get("score") is not None else None,
    }
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
    q = (body.question or "").strip().lower()
    
    # Handle greetings with friendly Finn introduction
    if _is_greeting(q):
        return {
            "answer": "Hello! I'm Finn, your personal finance assistant.  What would you like to know about your finances today?",
            "source": "greeting"
        }
    
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
