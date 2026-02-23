from __future__ import annotations

import math
from collections import defaultdict
from datetime import datetime
from typing import Any

from bson import ObjectId


def _to_object_id(user_id: str) -> ObjectId:
    try:
        return ObjectId(user_id)
    except Exception as e:  # noqa: BLE001
        raise ValueError("Invalid userId") from e


def _mean(values: list[float]) -> float:
    if not values:
        return 0.0
    return sum(values) / len(values)


def _std(values: list[float]) -> float:
    if len(values) < 2:
        return 0.0
    m = _mean(values)
    var = sum((x - m) ** 2 for x in values) / (len(values) - 1)
    return math.sqrt(var)


def build_insights(db, user_id: str, since: datetime) -> dict[str, Any]:
    oid = _to_object_id(user_id)

    transactions = list(
        db["transactions"].find(
            {"userId": oid, "date": {"$gte": since}},
            {"type": 1, "category": 1, "amount": 1, "description": 1, "date": 1},
        )
    )

    budgets = list(
        db["budgets"].find(
            {"userId": oid},
            {"category": 1, "limit": 1, "month": 1, "year": 1, "alertAt": 1, "spent": 1},
        )
    )

    income = [t for t in transactions if t.get("type") == "income"]
    expenses = [t for t in transactions if t.get("type") == "expense"]

    total_income = sum(float(t.get("amount") or 0) for t in income)
    total_expenses = sum(float(t.get("amount") or 0) for t in expenses)
    net = total_income - total_expenses

    by_category: dict[str, float] = defaultdict(float)
    for t in expenses:
        by_category[str(t.get("category") or "Uncategorized")] += float(t.get("amount") or 0)

    top_categories = sorted(
        [{"category": k, "spent": round(v, 2)} for k, v in by_category.items()],
        key=lambda x: x["spent"],
        reverse=True,
    )[:5]

    insights: list[dict[str, Any]] = []

    # Monthly Financial Health Summary - Always add this first
    savings_rate = round((net / total_income) * 100, 1) if total_income > 0 else 0
    
    if net >= 0:
        monthly_summary_text = f"You saved ₹{net:,.2f} this month."
    else:
        monthly_summary_text = f"You overspent by ₹{abs(net):,.2f} this month."
    
    if savings_rate > 0 and net >= 0:
        monthly_summary_text += f" Savings rate is {savings_rate}%."
    
    insights.append(
        {
            "type": "monthly_summary",
            "severity": "info",
            "title": "Monthly Summary",
            "text": monthly_summary_text,
        }
    )

    if top_categories:
        top = top_categories[0]
        insights.append(
            {
                "type": "spending_analysis",
                "severity": "info",
                "title": "Spending Analysis",
                "text": f"Your highest spending category is {top['category']} (₹{top['spent']:,.2f}).",
            }
        )

    # Budget recommendations: use spend in this window to propose next month limit
    recs = []
    for cat, spent in sorted(by_category.items(), key=lambda kv: kv[1], reverse=True):
        recommended = round(spent * 1.1, 2)
        recs.append({"category": cat, "recommendedLimit": recommended, "basisSpent": round(spent, 2)})

    if recs:
        top_rec = recs[0]
        insights.append(
            {
                "type": "budget_recommendation",
                "severity": "info",
                "title": "Budget Recommendation",
                "text": f"Based on your history, recommended {top_rec['category']} budget is ₹{top_rec['recommendedLimit']:,.2f} per month.",
                "recommendations": recs[:5],
            }
        )

    # Anomaly detection: z-score on expense transaction amounts
    amounts = [float(t.get("amount") or 0) for t in expenses]
    m = _mean(amounts)
    s = _std(amounts)

    anomalies = []
    if s > 0:
        for t in expenses:
            amt = float(t.get("amount") or 0)
            z = (amt - m) / s
            if z >= 2.8 and amt > 0:
                anomalies.append(
                    {
                        "transactionId": str(t.get("_id")),
                        "category": str(t.get("category") or "Uncategorized"),
                        "amount": round(amt, 2),
                        "date": t.get("date"),
                        "description": t.get("description"),
                        "zScore": round(float(z), 2),
                    }
                )

    if anomalies:
        a = sorted(anomalies, key=lambda x: x["zScore"], reverse=True)[0]
        date_str = a.get('date', '').strftime('%b %d') if hasattr(a.get('date'), 'strftime') else ''
        insights.append(
            {
                "type": "anomaly",
                "severity": "alert",
                "title": "Unusual Activity",
                "text": f"Unusual expense detected: ₹{a['amount']:,.2f} on {a['category']}{' on ' + date_str if date_str else ''}.",
                "anomalies": anomalies[:10],
            }
        )

    return {
        "summary": {
            "since": since.isoformat(),
            "transactions": len(transactions),
            "income": round(total_income, 2),
            "expenses": round(total_expenses, 2),
            "net": round(net, 2),
            "topCategories": top_categories,
        },
        "insights": insights,
        "raw": {"budgetsCount": len(budgets)},
    }
