from __future__ import annotations

from typing import Any


def build_fallback_answer(question: str, insights: dict[str, Any]) -> str:
    q = (question or "").strip().lower()

    summary = insights.get("summary", {})
    top = summary.get("topCategories", [])
    top_months = summary.get("topMonths", [])
    category_by_month = summary.get("categoryByMonth", {})

    budget_alert_item = next((i for i in insights.get("insights", []) if i.get("type") == "budget_alert"), None)
    anomaly_item = next((i for i in insights.get("insights", []) if i.get("type") == "anomaly"), None)

    def fmt_money(x: Any) -> str:
        try:
            return f"₹{float(x):.2f}"
        except Exception:  # noqa: BLE001
            return f"₹{x}"

    # Helper to extract month from question
    def extract_month_from_question(q: str) -> str | None:
        import re
        from datetime import datetime
        
        month_map = {
            'january': '01', 'february': '02', 'march': '03', 'april': '04',
            'may': '05', 'june': '06', 'july': '07', 'august': '08',
            'september': '09', 'october': '10', 'november': '11', 'december': '12',
            'jan': '01', 'feb': '02', 'mar': '03', 'apr': '04', 'may': '05', 'jun': '06',
            'jul': '07', 'aug': '08', 'sep': '09', 'sept': '09', 'oct': '10', 'nov': '11', 'dec': '12'
        }
        
        # Look for month name + year pattern
        for month_name, month_num in month_map.items():
            if month_name in q:
                # Look for year (2024, 2025, 2026, etc.)
                year_match = re.search(r'20\d\d', q)
                if year_match:
                    year = year_match.group()
                    return f"{year}-{month_num}"
        
        return None

    # Handle category-specific queries for a particular month
    if ("category" in q or "categories" in q or "spent" in q or "spending" in q) and ("in" in q or "during" in q or "for" in q):
        target_month = extract_month_from_question(q)
        if target_month and target_month in category_by_month:
            cats = category_by_month[target_month]
            if cats:
                top_cat = cats[0]
                # Convert YYYY-MM to readable format
                try:
                    from datetime import datetime
                    dt = datetime.strptime(target_month, "%Y-%m")
                    month_display = dt.strftime("%B %Y")
                except Exception:
                    month_display = target_month
                return f"In {month_display}, your highest spending category was {top_cat['category']} with {fmt_money(top_cat['spent'])}."

    # Handle average queries
    if "average" in q or "avg" in q:
        stats = summary.get("statistics", {})
        if "expense" in q or "spend" in q:
            if "month" in q:
                return f"Your average monthly expenses are {fmt_money(stats.get('avgMonthlyExpenses', 0))}."
            return f"Your average expense amount is {fmt_money(stats.get('avgExpense', 0))}."
        if "income" in q:
            if "month" in q:
                return f"Your average monthly income is {fmt_money(stats.get('avgMonthlyIncome', 0))}."
            return f"Your average income amount is {fmt_money(stats.get('avgIncome', 0))}."
        # Generic average question
        return (
            f"Average expense: {fmt_money(stats.get('avgExpense', 0))}\n"
            f"Average monthly expenses: {fmt_money(stats.get('avgMonthlyExpenses', 0))}\n"
            f"Average income: {fmt_money(stats.get('avgIncome', 0))}\n"
            f"Average monthly income: {fmt_money(stats.get('avgMonthlyIncome', 0))}"
        )

    # Handle maximum/minimum queries
    if "max" in q or "highest" in q or "most expensive" in q:
        stats = summary.get("statistics", {})
        if "transaction" in q or "expense" in q:
            return f"Your highest expense was {fmt_money(stats.get('maxExpense', 0))}."

    if "min" in q or "lowest" in q or "smallest" in q:
        stats = summary.get("statistics", {})
        if "transaction" in q or "expense" in q:
            return f"Your smallest expense was {fmt_money(stats.get('minExpense', 0))}."

    # Handle transaction count queries
    if "how many" in q or "count" in q or "number of" in q:
        stats = summary.get("statistics", {})
        if "transaction" in q:
            return f"You have {stats.get('totalTransactions', 0)} total transactions ({stats.get('incomeTransactions', 0)} income, {stats.get('expenseTransactions', 0)} expenses)."
        if "expense" in q:
            return f"You have {stats.get('expenseTransactions', 0)} expense transactions."
        if "income" in q:
            return f"You have {stats.get('incomeTransactions', 0)} income transactions."

    # Handle total/all-time queries
    if "total" in q and ("all" in q or "everything" in q or "all-time" in q):
        return (
            f"Your all-time totals:\n"
            f"Income: {fmt_money(summary.get('income', 0))}\n"
            f"Expenses: {fmt_money(summary.get('expenses', 0))}\n"
            f"Net: {fmt_money(summary.get('net', 0))}\n"
            f"Savings Rate: {summary.get('savingsRate', 0)}%"
        )

    # Handle savings rate queries
    if "savings rate" in q or "saving rate" in q:
        return f"Your savings rate is {summary.get('savingsRate', 0)}%."

    # Handle "which month had most income"
    if ("month" in q or "when" in q) and ("income" in q or "earned" in q or "made" in q):
        top_income_months = summary.get("topIncomeMonths", [])
        if top_income_months:
            top = top_income_months[0]
            month_name = top.get("month", "")
            try:
                from datetime import datetime
                dt = datetime.strptime(month_name, "%Y-%m")
                month_display = dt.strftime("%B %Y")
            except Exception:
                month_display = month_name
            return f"You earned the most in {month_display}: {fmt_money(top.get('income', 0))}."

    # Handle total spending queries for a particular month
    if ("spend" in q or "spent" in q or "total" in q or "expense" in q or "expenses" in q) and ("in" in q or "during" in q or "for" in q):
        target_month = extract_month_from_question(q)
        if target_month:
            for tm in top_months:
                if tm.get("month") == target_month:
                    try:
                        from datetime import datetime
                        dt = datetime.strptime(target_month, "%Y-%m")
                        month_display = dt.strftime("%B %Y")
                    except Exception:
                        month_display = target_month
                    return f"Your total spending in {month_display} was {fmt_money(tm.get('spent', 0))}."
            # If not in top_months but in category_by_month, calculate total
            if target_month in category_by_month:
                cats = category_by_month[target_month]
                total = sum(c.get('spent', 0) for c in cats)
                try:
                    from datetime import datetime
                    dt = datetime.strptime(target_month, "%Y-%m")
                    month_display = dt.strftime("%B %Y")
                except Exception:
                    month_display = target_month
                return f"Your total spending in {month_display} was {fmt_money(total)}."
    # Handle overspending queries
    if "overspend" in q or "over spend" in q or "overspending" in q:
        if not top and not (budget_alert_item and budget_alert_item.get("alerts")):
            return "I could not find this information in your financial records."

        lines: list[str] = []
        if top:
            lines.append("Top categories by spend (recent):")
            for item in top[:5]:
                lines.append(f"{item.get('category')}: {fmt_money(item.get('spent'))}")

        if budget_alert_item and budget_alert_item.get("alerts"):
            lines.append("Budget alerts:")
            for a in budget_alert_item.get("alerts", [])[:5]:
                lines.append(
                    f"{a.get('category')}: {a.get('percentage')}% used ({fmt_money(a.get('spent'))} / {fmt_money(a.get('limit'))})"
                )

        if anomaly_item and anomaly_item.get("anomalies"):
            a = anomaly_item.get("anomalies")[0]
            lines.append(
                f"Unusual expense: {a.get('category')} {fmt_money(a.get('amount'))} {a.get('description') or ''}".strip()
            )

        lines.append("If you want, tell me the month you want to analyze.")
        return "\n".join(lines)

    # Handle "which month had most savings" (check BEFORE generic savings handler)
    if ("month" in q or "when" in q) and ("save" in q or "saving" in q or "savings" in q):
        top_savings_months = summary.get("topSavingsMonths", [])
        if top_savings_months:
            top = top_savings_months[0]
            month_name = top.get("month", "")
            savings = top.get("savings", 0)
            try:
                from datetime import datetime
                dt = datetime.strptime(month_name, "%Y-%m")
                month_display = dt.strftime("%B %Y")
            except Exception:
                month_display = month_name
            if savings >= 0:
                return f"You saved the most in {month_display}: {fmt_money(savings)}."
            else:
                return f"In {month_display}, you had the lowest deficit: {fmt_money(abs(savings))} (you spent more than earned)."

    if "saving" in q or "savings" in q or "save" in q:
        if not top:
            return "I could not find this information in your financial records."
        lines = [
            "Your biggest expense categories (recent) are:",
        ]
        for item in top[:5]:
            lines.append(f"{item.get('category')}: {fmt_money(item.get('spent'))}")
        lines.append("Reducing spend in the top category is the fastest way to improve savings based on your records.")
        return "\n".join(lines)

    if "summary" in q:
        if not summary:
            return "I could not find this information in your financial records."
        return (
            "Spending summary (recent):\n"
            f"Income: {fmt_money(summary.get('income', 0))}\n"
            f"Expenses: {fmt_money(summary.get('expenses', 0))}\n"
            f"Net: {fmt_money(summary.get('net', 0))}"
        )

    # Handle "which month spent most" queries
    if "month" in q or "most" in q or "highest spend" in q:
        if not top_months:
            return "I could not find monthly spending data in your financial records."
        top_month = top_months[0]
        month_name = top_month.get("month", "")
        # Convert YYYY-MM to Month Name
        try:
            from datetime import datetime
            dt = datetime.strptime(month_name, "%Y-%m")
            month_display = dt.strftime("%B %Y")
        except Exception:
            month_display = month_name
        return f"You spent the most in {month_display}: {fmt_money(top_month.get('spent', 0))}."

    # Comprehensive fallback - provide all key metrics
    stats = summary.get("statistics", {})
    all_cats = summary.get("allCategories", [])
    
    lines = [
        "Here's your financial overview:",
        "",
        f"Total Income: {fmt_money(summary.get('income', 0))}",
        f"Total Expenses: {fmt_money(summary.get('expenses', 0))}",
        f"Net Savings: {fmt_money(summary.get('net', 0))}",
        f"Savings Rate: {summary.get('savingsRate', 0)}%",
        "",
        f"Transactions: {stats.get('totalTransactions', 0)} total ({stats.get('incomeTransactions', 0)} income, {stats.get('expenseTransactions', 0)} expenses)",
        f"Average Monthly Expenses: {fmt_money(stats.get('avgMonthlyExpenses', 0))}",
        f"Average Monthly Income: {fmt_money(stats.get('avgMonthlyIncome', 0))}",
        "",
        "Top spending categories:",
    ]
    
    for cat in all_cats[:5]:
        lines.append(f"  {cat['category']}: {fmt_money(cat['spent'])}")
    
    if top_months:
        top = top_months[0]
        month_name = top.get("month", "")
        try:
            from datetime import datetime
            dt = datetime.strptime(month_name, "%Y-%m")
            month_display = dt.strftime("%B %Y")
        except Exception:
            month_display = month_name
        lines.append("")
        lines.append(f"Highest spending month: {month_display} ({fmt_money(top.get('spent', 0))})")
    
    return "\n".join(lines)
