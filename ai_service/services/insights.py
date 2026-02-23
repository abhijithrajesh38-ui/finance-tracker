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


def build_insights(db, user_id: str, since: datetime | None = None, load_all: bool = False) -> dict[str, Any]:
    oid = _to_object_id(user_id)

    # Build query filter - if load_all or since is None, get ALL transactions
    query_filter = {"userId": oid}
    if not load_all and since is not None:
        query_filter["date"] = {"$gte": since}

    transactions = list(
        db["transactions"].find(
            query_filter,
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

    # Calculate averages and statistics
    expense_amounts = [float(t.get("amount") or 0) for t in expenses]
    income_amounts = [float(t.get("amount") or 0) for t in income]
    
    avg_expense = _mean(expense_amounts) if expense_amounts else 0
    avg_income = _mean(income_amounts) if income_amounts else 0
    max_expense = max(expense_amounts) if expense_amounts else 0
    min_expense = min(expense_amounts) if expense_amounts else 0
    
    # Get unique months for average calculations
    unique_months = set()
    for t in transactions:
        date = t.get("date")
        if date:
            month_key = date.strftime("%Y-%m") if hasattr(date, "strftime") else str(date)[:7]
            unique_months.add(month_key)
    
    num_months = len(unique_months) if unique_months else 1
    avg_monthly_expenses = total_expenses / num_months if num_months > 0 else 0
    avg_monthly_income = total_income / num_months if num_months > 0 else 0

    by_category: dict[str, float] = defaultdict(float)
    for t in expenses:
        by_category[str(t.get("category") or "Uncategorized")] += float(t.get("amount") or 0)

    # Aggregate spending by month
    by_month: dict[str, float] = defaultdict(float)
    for t in expenses:
        date = t.get("date")
        if date:
            month_key = date.strftime("%Y-%m") if hasattr(date, "strftime") else str(date)[:7]
            by_month[month_key] += float(t.get("amount") or 0)

    # Aggregate INCOME by month
    income_by_month: dict[str, float] = defaultdict(float)
    for t in income:
        date = t.get("date")
        if date:
            month_key = date.strftime("%Y-%m") if hasattr(date, "strftime") else str(date)[:7]
            income_by_month[month_key] += float(t.get("amount") or 0)

    # Calculate SAVINGS by month (income - expenses)
    all_months = set(income_by_month.keys()) | set(by_month.keys())
    savings_by_month: dict[str, float] = {}
    for month_key in all_months:
        inc = income_by_month.get(month_key, 0)
        exp = by_month.get(month_key, 0)
        savings_by_month[month_key] = inc - exp

    # Sort months by savings (highest first)
    top_savings_months = sorted(
        [{"month": k, "savings": round(v, 2)} for k, v in savings_by_month.items()],
        key=lambda x: x["savings"],
        reverse=True,
    )

    # Aggregate spending by category AND month (for detailed queries)
    by_category_month: dict[str, dict[str, float]] = defaultdict(lambda: defaultdict(float))
    for t in expenses:
        date = t.get("date")
        category = str(t.get("category") or "Uncategorized")
        if date:
            month_key = date.strftime("%Y-%m") if hasattr(date, "strftime") else str(date)[:7]
            by_category_month[month_key][category] += float(t.get("amount") or 0)

    # Convert to regular dict for JSON serialization
    category_by_month: dict[str, list[dict]] = {}
    for month_key, categories in by_category_month.items():
        sorted_cats = sorted(
            [{"category": k, "spent": round(v, 2)} for k, v in categories.items()],
            key=lambda x: x["spent"],
            reverse=True,
        )
        category_by_month[month_key] = sorted_cats

    top_categories = sorted(
        [{"category": k, "spent": round(v, 2)} for k, v in by_category.items()],
        key=lambda x: x["spent"],
        reverse=True,
    )

    # Sort months by spending for the response
    top_months = sorted(
        [{"month": k, "spent": round(v, 2)} for k, v in by_month.items()],
        key=lambda x: x["spent"],
        reverse=True,
    )

    # Sort months by income
    top_income_months = sorted(
        [{"month": k, "income": round(v, 2)} for k, v in income_by_month.items()],
        key=lambda x: x["income"],
        reverse=True,
    )

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
            "since": since.isoformat() if since else "all-time",
            "transactions": len(transactions),
            "income": round(total_income, 2),
            "expenses": round(total_expenses, 2),
            "net": round(net, 2),
            "savingsRate": round((net / total_income) * 100, 1) if total_income > 0 else 0,
            "topCategories": top_categories[:5],
            "allCategories": top_categories,
            "topMonths": top_months,
            "topIncomeMonths": top_income_months,
            "topSavingsMonths": top_savings_months,
            "categoryByMonth": category_by_month,
            "incomeByMonth": dict(income_by_month),
            "expenseByMonth": dict(by_month),
            "statistics": {
                "avgExpense": round(avg_expense, 2),
                "avgIncome": round(avg_income, 2),
                "maxExpense": round(max_expense, 2),
                "minExpense": round(min_expense, 2),
                "avgMonthlyExpenses": round(avg_monthly_expenses, 2),
                "avgMonthlyIncome": round(avg_monthly_income, 2),
                "numMonths": num_months,
                "totalTransactions": len(transactions),
                "incomeTransactions": len(income),
                "expenseTransactions": len(expenses),
            },
        },
        "insights": insights,
        "raw": {
            "budgetsCount": len(budgets),
            "allBudgets": budgets,
        },
    }
