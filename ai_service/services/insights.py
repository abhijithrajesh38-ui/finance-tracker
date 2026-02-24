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


def _calculate_trend(values: list[float]) -> dict[str, Any]:
    """Calculate trend direction and percentage change."""
    if len(values) < 2:
        return {"direction": "stable", "change": 0.0}
    
    # Simple linear trend: compare first half vs second half
    mid = len(values) // 2
    first_half_avg = _mean(values[:mid]) if mid > 0 else 0
    second_half_avg = _mean(values[mid:]) if mid > 0 else 0
    
    if first_half_avg == 0:
        return {"direction": "stable", "change": 0.0}
    
    change_pct = ((second_half_avg - first_half_avg) / first_half_avg) * 100
    
    if change_pct > 5:
        direction = "increasing"
    elif change_pct < -5:
        direction = "decreasing"
    else:
        direction = "stable"
    
    return {"direction": direction, "change": round(change_pct, 1)}


def _predict_next_month(monthly_values: dict[str, float]) -> float:
    """Simple prediction based on recent average."""
    if not monthly_values:
        return 0.0
    
    # Sort by month and take last 3 months
    sorted_months = sorted(monthly_values.items())
    recent_values = [v for _, v in sorted_months[-3:]]
    
    return _mean(recent_values) if recent_values else 0.0


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

    # Use latest transaction date as a stable reference for relative time questions
    latest_tx_date: datetime | None = None
    for t in transactions:
        d = t.get("date")
        if hasattr(d, "strftime"):
            if latest_tx_date is None or d > latest_tx_date:
                latest_tx_date = d

    this_month_key: str | None = None
    last_month_key: str | None = None
    if latest_tx_date is not None:
        this_month_key = latest_tx_date.strftime("%Y-%m")
        # Compute previous month key
        y = latest_tx_date.year
        m = latest_tx_date.month
        if m == 1:
            y -= 1
            m = 12
        else:
            m -= 1
        last_month_key = f"{y:04d}-{m:02d}"
    
    # Convert ObjectIds to strings for JSON serialization
    for transaction in transactions:
        if "_id" in transaction:
            transaction["_id"] = str(transaction["_id"])
        if "userId" in transaction:
            transaction["userId"] = str(transaction["userId"])

    budgets = list(
        db["budgets"].find(
            {"userId": oid},
            {"category": 1, "limit": 1, "month": 1, "year": 1, "alertAt": 1, "spent": 1},
        )
    )
    
    # Convert ObjectIds to strings for JSON serialization
    for budget in budgets:
        if "_id" in budget:
            budget["_id"] = str(budget["_id"])
        if "userId" in budget:
            budget["userId"] = str(budget["userId"])

    income = [t for t in transactions if t.get("type") == "income"]
    expenses = [t for t in transactions if t.get("type") == "expense"]

    # All-time totals (always computed from full transaction history)
    all_time_income = list(
        db["transactions"].find(
            {"userId": oid, "type": "income"},
            {"amount": 1},
        )
    )
    all_time_expenses = list(
        db["transactions"].find(
            {"userId": oid, "type": "expense"},
            {"amount": 1},
        )
    )

    total_income = sum(float(t.get("amount") or 0) for t in all_time_income)
    total_expenses = sum(float(t.get("amount") or 0) for t in all_time_expenses)
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

    # Aggregate EXPENSES by day and by ISO week
    expense_by_day: dict[str, float] = defaultdict(float)
    expense_by_week: dict[str, float] = defaultdict(float)
    for t in expenses:
        date = t.get("date")
        if not date:
            continue

        if hasattr(date, "strftime"):
            day_key = date.strftime("%Y-%m-%d")
            iso_year, iso_week, _ = date.isocalendar()
            week_key = f"{iso_year}-W{iso_week:02d}"
        else:
            # Fallback if date is already string
            date_str = str(date)
            day_key = date_str[:10]
            week_key = day_key[:7]

        expense_by_day[day_key] += float(t.get("amount") or 0)
        expense_by_week[week_key] += float(t.get("amount") or 0)

    # Aggregate INCOME by month
    income_by_month: dict[str, float] = defaultdict(float)
    for t in income:
        date = t.get("date")
        if date:
            month_key = date.strftime("%Y-%m") if hasattr(date, "strftime") else str(date)[:7]
            income_by_month[month_key] += float(t.get("amount") or 0)

    # This-month values (for dashboard monthly summary)
    this_month_income = float(income_by_month.get(this_month_key or "", 0) or 0)
    this_month_expenses = float(by_month.get(this_month_key or "", 0) or 0)
    this_month_net = this_month_income - this_month_expenses

    # Aggregate INCOME by day and by ISO week
    income_by_day: dict[str, float] = defaultdict(float)
    income_by_week: dict[str, float] = defaultdict(float)
    for t in income:
        date = t.get("date")
        if not date:
            continue

        if hasattr(date, "strftime"):
            day_key = date.strftime("%Y-%m-%d")
            iso_year, iso_week, _ = date.isocalendar()
            week_key = f"{iso_year}-W{iso_week:02d}"
        else:
            date_str = str(date)
            day_key = date_str[:10]
            week_key = day_key[:7]

        income_by_day[day_key] += float(t.get("amount") or 0)
        income_by_week[week_key] += float(t.get("amount") or 0)

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

    # Calculate trends
    expense_trend = _calculate_trend([v for _, v in sorted(by_month.items())])
    income_trend = _calculate_trend([v for _, v in sorted(income_by_month.items())])
    
    # Predict next month
    predicted_expenses = _predict_next_month(by_month)
    predicted_income = _predict_next_month(income_by_month)
    predicted_savings = predicted_income - predicted_expenses

    insights: list[dict[str, Any]] = []

    # Monthly Financial Health Summary (THIS month, not all-time)
    this_month_savings_rate = (
        round((this_month_net / this_month_income) * 100, 1) if this_month_income > 0 else 0
    )

    if this_month_net >= 0:
        monthly_summary_text = f"You saved ₹{this_month_net:,.2f} this month."
    else:
        monthly_summary_text = f"You overspent by ₹{abs(this_month_net):,.2f} this month."

    if this_month_savings_rate > 0 and this_month_net >= 0:
        monthly_summary_text += f" Savings rate is {this_month_savings_rate}%."

    # 2. Spending Analysis - ALWAYS show
    if top_categories:
        top = top_categories[0]
        spending_text = f"Your highest spending category is {top['category']} (₹{top['spent']:,.2f})."
    else:
        spending_text = "No expense transactions yet. Start tracking your spending to see analysis."
    
    insights.append(
        {
            "type": "spending_analysis",
            "severity": "info",
            "title": "Spending Analysis",
            "text": spending_text,
        }
    )

    # 3. Budget Recommendation - ALWAYS show
    recs = []
    for cat, spent in sorted(by_category.items(), key=lambda kv: kv[1], reverse=True):
        recommended = round(spent * 1.1, 2)
        recs.append({"category": cat, "recommendedLimit": recommended, "basisSpent": round(spent, 2)})

    if recs:
        top_rec = recs[0]
        budget_text = f"Based on your history, recommended {top_rec['category']} budget is ₹{top_rec['recommendedLimit']:,.2f} per month."
    else:
        budget_text = "Add expense transactions to get personalized budget recommendations."
    
    insights.append(
        {
            "type": "budget_recommendation",
            "severity": "info",
            "title": "Budget Recommendation",
            "text": budget_text,
            "recommendations": recs[:5] if recs else [],
        }
    )

    # 4. Anomaly Detection - ALWAYS show
    amounts = [float(t.get("amount") or 0) for t in expenses]
    m = _mean(amounts)
    s = _std(amounts)

    anomalies = []
    if s > 0:
        for t in expenses:
            amt = float(t.get("amount") or 0)
            z = (amt - m) / s
            if z >= 2.8 and amt > 0:
                # Convert date to string for JSON serialization
                date_val = t.get("date")
                if hasattr(date_val, "isoformat"):
                    date_str = date_val.isoformat()
                elif date_val:
                    date_str = str(date_val)
                else:
                    date_str = None
                
                anomalies.append(
                    {
                        "transactionId": str(t.get("_id")),
                        "category": str(t.get("category") or "Uncategorized"),
                        "amount": round(amt, 2),
                        "date": date_str,
                        "description": t.get("description"),
                        "zScore": round(float(z), 2),
                    }
                )

    if anomalies:
        a = sorted(anomalies, key=lambda x: x["zScore"], reverse=True)[0]
        date_str = a.get('date', '').strftime('%b %d') if hasattr(a.get('date'), 'strftime') else ''
        anomaly_text = f"Unusual expense detected: ₹{a['amount']:,.2f} on {a['category']}{' on ' + date_str if date_str else ''}."
    else:
        anomaly_text = "No unusual spending patterns detected. All transactions look normal."
    
    insights.append(
        {
            "type": "anomaly",
            "severity": "alert" if anomalies else "info",
            "title": "Unusual Activity",
            "text": anomaly_text,
            "anomalies": anomalies[:10] if anomalies else [],
        }
    )

    # Monthly Summary - ALWAYS show (placed under Unusual Activity)
    insights.append(
        {
            "type": "monthly_summary",
            "severity": "info",
            "title": "Monthly Summary",
            "text": monthly_summary_text,
            "thisMonthKey": this_month_key,
            "income": round(this_month_income, 2),
            "expenses": round(this_month_expenses, 2),
            "net": round(this_month_net, 2),
            "savingsRate": this_month_savings_rate,
        }
    )

    return {
        "summary": {
            "since": since.isoformat() if since else "all-time",
            "referenceDate": latest_tx_date.isoformat() if latest_tx_date else None,
            "thisMonthKey": this_month_key,
            "lastMonthKey": last_month_key,
            "transactions": len(transactions),
            "income": round(total_income, 2),
            "expenses": round(total_expenses, 2),
            "net": round(net, 2),
            "savingsRate": round((net / total_income) * 100, 1) if total_income > 0 else 0,
            "thisMonth": {
                "income": round(this_month_income, 2),
                "expenses": round(this_month_expenses, 2),
                "net": round(this_month_net, 2),
                "savingsRate": this_month_savings_rate,
            },
            "topCategories": top_categories[:5],
            "allCategories": top_categories,
            "topMonths": top_months,
            "topIncomeMonths": top_income_months,
            "topSavingsMonths": top_savings_months,
            "categoryByMonth": category_by_month,
            "incomeByMonth": dict(income_by_month),
            "expenseByMonth": dict(by_month),
            "incomeByDay": dict(income_by_day),
            "expenseByDay": dict(expense_by_day),
            "incomeByWeek": dict(income_by_week),
            "expenseByWeek": dict(expense_by_week),
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
            "trends": {
                "expenses": expense_trend,
                "income": income_trend,
            },
            "predictions": {
                "nextMonthExpenses": round(predicted_expenses, 2),
                "nextMonthIncome": round(predicted_income, 2),
                "nextMonthSavings": round(predicted_savings, 2),
            },
        },
        "insights": insights,
        "raw": {
            "budgetsCount": len(budgets),
            "allBudgets": budgets,
            "recentTransactions": sorted(
                [
                    {
                        "id": t.get("_id"),
                        "type": t.get("type"),
                        "category": t.get("category"),
                        "amount": float(t.get("amount") or 0),
                        "description": t.get("description"),
                        "date": t.get("date").isoformat() if hasattr(t.get("date"), "isoformat") else (str(t.get("date")) if t.get("date") else None),
                    }
                    for t in transactions
                ],
                key=lambda x: x.get("date") or "",
                reverse=True,
            )[:50],
        },
    }
