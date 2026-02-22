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

    if top_categories:
        top = top_categories[0]
        insights.append(
            {
                "type": "spending_analysis",
                "severity": "info",
                "title": "Top spending category",
                "text": f"Your highest expense category is {top['category']} (₹{top['spent']:.2f}) in the selected period.",
            }
        )

    # Budget recommendations: use spend in this window to propose next month limit
    recs = []
    for cat, spent in sorted(by_category.items(), key=lambda kv: kv[1], reverse=True):
        recommended = round(spent * 1.1, 2)
        recs.append({"category": cat, "recommendedLimit": recommended, "basisSpent": round(spent, 2)})

    if recs:
        insights.append(
            {
                "type": "budget_recommendation",
                "severity": "info",
                "title": "Suggested budget limits",
                "text": "I recommended next-period limits as ~10% above your recent spend for each category.",
                "recommendations": recs[:5],
            }
        )

    # Budget overrun alerts (based on current stored budgets + recomputed spent in that month)
    budget_alerts = []
    for b in budgets:
        cat = str(b.get("category") or "Uncategorized")
        limit = float(b.get("limit") or 0)
        month = int(b.get("month") or 0)
        year = int(b.get("year") or 0)
        if not limit or not month or not year:
            continue

        start = datetime(year, month, 1)
        end = datetime(year + (1 if month == 12 else 0), 1 if month == 12 else month + 1, 1)

        spent = 0.0
        for t in expenses:
            dt = t.get("date")
            if dt and start <= dt < end and str(t.get("category") or "Uncategorized") == cat:
                spent += float(t.get("amount") or 0)

        pct = (spent / limit) * 100 if limit > 0 else 0
        if pct >= float(b.get("alertAt") or 80):
            budget_alerts.append(
                {
                    "category": cat,
                    "spent": round(spent, 2),
                    "limit": round(limit, 2),
                    "percentage": round(pct, 1),
                    "month": month,
                    "year": year,
                }
            )

    if budget_alerts:
        worst = sorted(budget_alerts, key=lambda x: x["percentage"], reverse=True)[0]
        insights.append(
            {
                "type": "budget_alert",
                "severity": "warning",
                "title": "Budget alert",
                "text": f"You are at {worst['percentage']}% of your {worst['category']} budget (₹{worst['spent']:.2f} / ₹{worst['limit']:.2f}).",
                "alerts": budget_alerts,
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
        insights.append(
            {
                "type": "anomaly",
                "severity": "alert",
                "title": "Unusual expense detected",
                "text": f"Unusually large expense: {a['category']} ₹{a['amount']:.2f} (z={a['zScore']}).",
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
