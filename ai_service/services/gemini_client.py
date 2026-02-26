from __future__ import annotations

import os
import json
import re
from typing import Any

import google.generativeai as genai


def answer_query(question: str, insights: dict[str, Any], conversation_history: str = "") -> str:
    api_key = os.getenv("GEMINI_API_KEY")
    if not api_key:
        raise RuntimeError("Missing environment variable: GEMINI_API_KEY")

    genai.configure(api_key=api_key)

    model_name = os.getenv("GEMINI_MODEL", "gemini-2.0-flash")
    
    # Enhanced generation config for better responses
    generation_config = {
        "temperature": 0.3,  # Lower temperature for more factual, consistent responses
        "top_p": 0.95,
        "top_k": 40,
        "max_output_tokens": 2048,  # Increased for longer, more detailed responses
    }
    
    # Safety settings to allow financial discussions
    safety_settings = [
        {"category": "HARM_CATEGORY_HARASSMENT", "threshold": "BLOCK_NONE"},
        {"category": "HARM_CATEGORY_HATE_SPEECH", "threshold": "BLOCK_NONE"},
        {"category": "HARM_CATEGORY_SEXUALLY_EXPLICIT", "threshold": "BLOCK_NONE"},
        {"category": "HARM_CATEGORY_DANGEROUS_CONTENT", "threshold": "BLOCK_NONE"},
    ]
    
    model = genai.GenerativeModel(
        model_name,
        generation_config=generation_config,
        safety_settings=safety_settings
    )

    summary = insights.get("summary", {})
    stats = summary.get("statistics", {})
    top = summary.get("topCategories", [])
    all_cats = summary.get("allCategories", [])
    top_months = summary.get("topMonths", [])
    top_income_months = summary.get("topIncomeMonths", [])
    top_savings_months = summary.get("topSavingsMonths", [])
    category_by_month = summary.get("categoryByMonth", {})
    raw = insights.get("raw", {})
    
    alerts = []
    for item in insights.get("insights", []):
        if item.get("type") in {"budget_alert", "anomaly"}:
            alerts.append(item)

    # Build more structured context with better organization
    context = {
        "overview": {
            "totalIncome": summary.get("income", 0),
            "totalExpenses": summary.get("expenses", 0),
            "netSavings": summary.get("net", 0),
            "savingsRate": summary.get("savingsRate", 0),
            "timeframe": summary.get("since", "all-time"),
            "referenceDate": summary.get("referenceDate"),
        },
        "statistics": {
            "totalTransactions": stats.get("totalTransactions", 0),
            "incomeTransactions": stats.get("incomeTransactions", 0),
            "expenseTransactions": stats.get("expenseTransactions", 0),
            "avgExpense": stats.get("avgExpense", 0),
            "avgIncome": stats.get("avgIncome", 0),
            "avgMonthlyExpenses": stats.get("avgMonthlyExpenses", 0),
            "avgMonthlyIncome": stats.get("avgMonthlyIncome", 0),
            "maxExpense": stats.get("maxExpense", 0),
            "minExpense": stats.get("minExpense", 0),
            "numMonths": stats.get("numMonths", 1),
        },
        "topSpendingCategories": all_cats[:10],  # Provide more categories
        "monthlySpending": top_months[:12],  # Last 12 months
        "monthlyIncome": top_income_months[:12],
        "monthlySavings": top_savings_months[:12],
        "categoryByMonth": category_by_month,  # Detailed month-by-month breakdown
        "dailyTotals": {
            "incomeByDay": dict(list((summary.get("incomeByDay", {}) or {}).items())[-31:]),
            "expenseByDay": dict(list((summary.get("expenseByDay", {}) or {}).items())[-31:]),
        },
        "weeklyTotals": {
            "incomeByWeek": summary.get("incomeByWeek", {}),
            "expenseByWeek": summary.get("expenseByWeek", {}),
        },
        "collections": {
            "recentTransactions": (raw.get("recentTransactions") or [])[:50],
            "budgets": (raw.get("allBudgets") or [])[:50],
        },
        "alerts": alerts,
    }

    # Enhanced prompt with better instructions
    prompt = (
        "You are Finn, an intelligent personal finance assistant integrated into a finance tracking system.\n"
        "Your role is to provide accurate, data-driven insights based on the user's actual financial data.\n\n"
        "CORE PRINCIPLES:\n"
        "1. ACCURACY: Base ALL answers strictly on the provided financial data. Never invent or assume numbers.\n"
        "2. CLARITY: Provide clear, actionable insights in plain conversational language.\n"
        "3. CONTEXT: Use conversation history to understand follow-up questions and references.\n"
        "4. CURRENCY: Always use INR (₹) format for monetary values.\n"
        "5. FORMAT: Output plain text only - no markdown, asterisks, or special formatting.\n\n"
        "RESPONSE GUIDELINES:\n"
        "- For savings questions: Calculate from Income - Expenses, identify top expense categories to reduce\n"
        "- For spending analysis: Use categoryByMonth data for month-specific queries\n"
        "- For trends: Compare monthly data to identify patterns\n"
        "- For recommendations: Base suggestions on actual spending patterns, not generic advice\n"
        "- For comparisons: Use the monthlySpending, monthlyIncome, and monthlySavings arrays\n"
        "- If data is missing or insufficient: Clearly state 'I could not find this information in your financial records'\n\n"
        "CONVERSATION CONTEXT:\n"
        "- When user says 'that month', 'it', 'this', refer to the previous conversation\n"
        "- Track what was discussed to provide coherent follow-up responses\n"
        "- Maintain context across multiple related questions\n\n"
        "ACTIONABLE INSIGHTS:\n"
        "- Always provide specific numbers from the data\n"
        "- Suggest concrete actions based on spending patterns\n"
        "- Highlight unusual patterns or anomalies\n"
        "- Compare current vs average to show trends\n\n"
    )
    
    if conversation_history:
        prompt += f"PREVIOUS CONVERSATION:\n{conversation_history}\n\n"
    
    prompt += f"USER FINANCIAL DATA:\n{json.dumps(context, indent=2, default=str)}\n\n"
    prompt += f"USER QUESTION: {question}\n\n"
    prompt += "Provide a helpful, accurate response based on the data above:"

    try:
        resp = model.generate_content(prompt)
        answer = (getattr(resp, "text", None) or "").strip()
        
        # Fallback if response is empty or blocked
        if not answer or len(answer) < 10:
            return "I couldn't generate a complete answer. Please try rephrasing your question."
        
        return answer
    except Exception as e:
        # Log the error but don't expose internal details
        print(f"Gemini API error: {e}")
        raise  # Re-raise to trigger fallback in main.py


def extract_transaction_from_image(*, image_bytes: bytes, mime_type: str = "image/jpeg") -> dict[str, Any]:
    api_key = os.getenv("GEMINI_API_KEY")
    if not api_key:
        raise RuntimeError("Missing environment variable: GEMINI_API_KEY")

    genai.configure(api_key=api_key)

    model_name = os.getenv("GEMINI_MODEL", "gemini-2.0-flash")
    generation_config = {
        "temperature": 0.1,
        "top_p": 0.95,
        "top_k": 40,
        "max_output_tokens": 1024,
    }

    safety_settings = [
        {"category": "HARM_CATEGORY_HARASSMENT", "threshold": "BLOCK_NONE"},
        {"category": "HARM_CATEGORY_HATE_SPEECH", "threshold": "BLOCK_NONE"},
        {"category": "HARM_CATEGORY_SEXUALLY_EXPLICIT", "threshold": "BLOCK_NONE"},
        {"category": "HARM_CATEGORY_DANGEROUS_CONTENT", "threshold": "BLOCK_NONE"},
    ]

    model = genai.GenerativeModel(
        model_name,
        generation_config=generation_config,
        safety_settings=safety_settings,
    )

    prompt = (
        "You are extracting a single financial transaction from a receipt image.\n"
        "Return ONLY valid JSON (no markdown, no extra text).\n"
        "Schema:\n"
        "{\n"
        '  "type": "expense" | "income",\n'
        '  "category": string | null,\n'
        '  "amount": number,\n'
        '  "description": string,\n'
        '  "date": "YYYY-MM-DD" | null,\n'
        '  "paymentMethod": "cash" | "card" | "bank" | "upi" | "other" | null,\n'
        '  "categoryConfidence": number\n'
        "}\n"
        "Rules:\n"
        "- If category cannot be confidently inferred, set category=null and categoryConfidence<0.5\n"
        "- amount must be the total paid (positive number)\n"
        "- description should be merchant/store name if present, otherwise a short summary\n"
        "- If date is not found, set date=null\n"
    )

    image_part = {"mime_type": mime_type, "data": image_bytes}
    resp = model.generate_content([prompt, image_part])
    text = (getattr(resp, "text", None) or "").strip()
    if not text:
        raise RuntimeError("Empty response from Gemini")

    try:
        return json.loads(text)
    except Exception:
        m = re.search(r"\{[\s\S]*\}", text)
        if not m:
            raise
        return json.loads(m.group(0))


def extract_transaction_from_text(*, receipt_text: str, max_retries: int = 2) -> dict[str, Any]:
    api_key = os.getenv("GEMINI_API_KEY")
    if not api_key:
        raise RuntimeError("Missing environment variable: GEMINI_API_KEY")

    genai.configure(api_key=api_key)

    model_name = os.getenv("GEMINI_MODEL", "gemini-2.0-flash")
    generation_config = {
        "temperature": 0.1,
        "top_p": 0.95,
        "top_k": 40,
        "max_output_tokens": 2048,
        "response_mime_type": "application/json",
    }

    safety_settings = [
        {"category": "HARM_CATEGORY_HARASSMENT", "threshold": "BLOCK_NONE"},
        {"category": "HARM_CATEGORY_HATE_SPEECH", "threshold": "BLOCK_NONE"},
        {"category": "HARM_CATEGORY_SEXUALLY_EXPLICIT", "threshold": "BLOCK_NONE"},
        {"category": "HARM_CATEGORY_DANGEROUS_CONTENT", "threshold": "BLOCK_NONE"},
    ]

    model = genai.GenerativeModel(
        model_name,
        generation_config=generation_config,
        safety_settings=safety_settings,
    )

    prompt = (
        "You are extracting a single financial transaction from OCR text of a receipt.\n"
        "Return ONLY a JSON object (no markdown, no extra text, no code blocks).\n"
        "Schema:\n"
        "{\n"
        '  "type": "expense" | "income",\n'
        '  "category": string | null,\n'
        '  "amount": number,\n'
        '  "description": string,\n'
        '  "date": "YYYY-MM-DD" | null,\n'
        '  "paymentMethod": "cash" | "card" | "bank" | "upi" | "other" | null,\n'
        '  "categoryConfidence": number\n'
        "}\n"
        "Rules:\n"
        "- Use the TOTAL amount paid (not individual line items).\n"
        "- Prefer merchant/store name for description.\n"
        "- If category cannot be confidently inferred, set category=null and categoryConfidence=0\n"
        "- If date is not found, set date=null\n"
        "- If payment method is not found, set paymentMethod=null\n"
        "\nOCR TEXT:\n"
        f"{receipt_text}\n"
    )

    last_error = None
    for attempt in range(max_retries + 1):
        try:
            resp = model.generate_content(prompt)
            
            # Try to get text from different response formats
            text = None
            if hasattr(resp, 'text') and resp.text:
                text = resp.text.strip()
            elif hasattr(resp, 'parts') and resp.parts:
                text = ''.join([p.text for p in resp.parts if hasattr(p, 'text')]).strip()
            elif isinstance(resp, str):
                text = resp.strip()
            
            if not text:
                # Try candidates
                if hasattr(resp, 'candidates') and resp.candidates:
                    for cand in resp.candidates:
                        if hasattr(cand, 'content') and cand.content:
                            if hasattr(cand.content, 'parts') and cand.content.parts:
                                text = ''.join([p.text for p in cand.content.parts if hasattr(p, 'text')]).strip()
                                break
            
            if not text:
                if attempt < max_retries:
                    print(f"[Gemini] Empty response on attempt {attempt + 1}, retrying...")
                    continue
                raise RuntimeError(f"Empty response from Gemini after {max_retries + 1} attempts. Response: {resp}")

            # Clean up markdown code blocks if present
            text = re.sub(r'^```json\s*', '', text)
            text = re.sub(r'```\s*$', '', text)
            text = text.strip()

            try:
                return json.loads(text)
            except json.JSONDecodeError as e:
                # Try to extract JSON from the text
                m = re.search(r'\{[\s\S]*\}', text)
                if m:
                    try:
                        return json.loads(m.group(0))
                    except:
                        pass
                if attempt < max_retries:
                    print(f"[Gemini] JSON parse error on attempt {attempt + 1}: {e}, retrying...")
                    continue
                raise RuntimeError(f"Failed to parse JSON after {max_retries + 1} attempts. Text: {text[:500]}")
                
        except Exception as e:
            last_error = e
            if attempt < max_retries:
                print(f"[Gemini] Error on attempt {attempt + 1}: {e}, retrying...")
                continue
            raise last_error
    
    raise RuntimeError("Unexpected end of retry loop")
