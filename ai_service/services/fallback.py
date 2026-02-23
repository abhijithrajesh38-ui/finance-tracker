from __future__ import annotations

from typing import Any


def build_fallback_answer(question: str, insights: dict[str, Any], conversation_history: str = "") -> str:
    """Enhanced fallback with better pattern matching and comprehensive responses."""
    q = (question or "").strip().lower()

    summary = insights.get("summary", {})
    stats = summary.get("statistics", {})
    trends = summary.get("trends", {})
    predictions = summary.get("predictions", {})
    top = summary.get("topCategories", [])
    top_months = summary.get("topMonths", [])
    category_by_month = summary.get("categoryByMonth", {})
    all_cats = summary.get("allCategories", [])
    expense_by_day = summary.get("expenseByDay", {})
    income_by_day = summary.get("incomeByDay", {})
    expense_by_week = summary.get("expenseByWeek", {})
    income_by_week = summary.get("incomeByWeek", {})
    reference_date = summary.get("referenceDate")

    # Extract last mentioned month from conversation history for follow-ups
    last_month = None
    if "December 2025" in conversation_history:
        last_month = "2025-12"
    elif "November 2025" in conversation_history:
        last_month = "2025-11"
    elif "January 2026" in conversation_history:
        last_month = "2026-01"
    elif "February 2026" in conversation_history:
        last_month = "2026-02"

    budget_alert_item = next((i for i in insights.get("insights", []) if i.get("type") == "budget_alert"), None)
    anomaly_item = next((i for i in insights.get("insights", []) if i.get("type") == "anomaly"), None)

    def fmt_money(x: Any) -> str:
        try:
            return f"₹{float(x):.2f}"
        except Exception:  # noqa: BLE001
            return f"₹{x}"

    def _sum_days(day_keys: list[str]) -> tuple[float, float]:
        exp = 0.0
        inc = 0.0
        for dk in day_keys:
            try:
                exp += float(expense_by_day.get(dk, 0) or 0)
            except Exception:
                pass
            try:
                inc += float(income_by_day.get(dk, 0) or 0)
            except Exception:
                pass
        return exp, inc

    def _get_anchor_today():
        from datetime import datetime

        if reference_date:
            try:
                # referenceDate is stored as ISO string
                return datetime.fromisoformat(str(reference_date)[:19]).date()
            except Exception:
                pass
        return datetime.utcnow().date()

    # Handle day/week specific questions
    if ("week" in q or "day" in q or "today" in q or "yesterday" in q or "last" in q) and (
        "spend" in q or "spent" in q or "expense" in q or "expenses" in q or "income" in q or "earned" in q
    ):
        import re
        from datetime import datetime, timedelta

        # Specific date: YYYY-MM-DD
        date_match = re.search(r"\b(20\d\d-\d\d-\d\d)\b", q)
        if date_match:
            dk = date_match.group(1)
            exp = float(expense_by_day.get(dk, 0) or 0)
            inc = float(income_by_day.get(dk, 0) or 0)
            if "income" in q or "earned" in q:
                return f"Your income on {dk} was {fmt_money(inc)}."
            if "spend" in q or "spent" in q or "expense" in q:
                return f"Your spending on {dk} was {fmt_money(exp)}."
            return f"On {dk}: Income {fmt_money(inc)}, Expenses {fmt_money(exp)}, Net {fmt_money(inc - exp)}."

        # Today / yesterday (anchored to latest transaction date when available)
        today = _get_anchor_today()
        if "today" in q:
            dk = today.strftime("%Y-%m-%d")
            exp = float(expense_by_day.get(dk, 0) or 0)
            inc = float(income_by_day.get(dk, 0) or 0)
            if "income" in q or "earned" in q:
                return f"Your income today ({dk}) is {fmt_money(inc)}."
            return f"Your spending today ({dk}) is {fmt_money(exp)}."

        if "yesterday" in q:
            dk = (today - timedelta(days=1)).strftime("%Y-%m-%d")
            exp = float(expense_by_day.get(dk, 0) or 0)
            inc = float(income_by_day.get(dk, 0) or 0)
            if "income" in q or "earned" in q:
                return f"Your income yesterday ({dk}) was {fmt_money(inc)}."
            return f"Your spending yesterday ({dk}) was {fmt_money(exp)}."

        # Last N days
        n_days_match = re.search(r"\blast\s+(\d{1,3})\s+days\b", q)
        if n_days_match:
            n = int(n_days_match.group(1))
            if n <= 0:
                n = 1
            if n > 365:
                n = 365
            days = [(today - timedelta(days=i)).strftime("%Y-%m-%d") for i in range(n)]
            exp, inc = _sum_days(days)
            if "income" in q or "earned" in q:
                return f"Your total income in the last {n} days is {fmt_money(inc)}."
            return f"Your total spending in the last {n} days is {fmt_money(exp)}."

        # Last week (previous ISO week)
        if "last week" in q:
            iso_year, iso_week, _ = today.isocalendar()
            prev_week = iso_week - 1
            prev_year = iso_year
            if prev_week <= 0:
                prev_year = iso_year - 1
                prev_week = 52
            wk = f"{prev_year}-W{prev_week:02d}"
            exp = float(expense_by_week.get(wk, 0) or 0)
            inc = float(income_by_week.get(wk, 0) or 0)
            if "income" in q or "earned" in q:
                return f"Your income in last week ({wk}) was {fmt_money(inc)}."
            return f"Your spending in last week ({wk}) was {fmt_money(exp)}."

        # This week (current ISO week)
        if "this week" in q:
            iso_year, iso_week, _ = today.isocalendar()
            wk = f"{iso_year}-W{iso_week:02d}"
            exp = float(expense_by_week.get(wk, 0) or 0)
            inc = float(income_by_week.get(wk, 0) or 0)
            if "income" in q or "earned" in q:
                return f"Your income in this week ({wk}) is {fmt_money(inc)}."
            return f"Your spending in this week ({wk}) is {fmt_money(exp)}."

        # This month (anchored)
        if "this month" in q:
            month_key = today.strftime("%Y-%m")
            exp = float(summary.get("expenseByMonth", {}).get(month_key, 0) or 0)
            inc = float(summary.get("incomeByMonth", {}).get(month_key, 0) or 0)
            if "income" in q or "earned" in q:
                return f"Your income in {month_key} is {fmt_money(inc)}."
            return f"Your spending in {month_key} is {fmt_money(exp)}."

        # This year (sum months in the year)
        if "this year" in q:
            year_prefix = today.strftime("%Y-")
            exp = 0.0
            inc = 0.0
            for k, v in (summary.get("expenseByMonth", {}) or {}).items():
                if str(k).startswith(year_prefix):
                    try:
                        exp += float(v or 0)
                    except Exception:
                        pass
            for k, v in (summary.get("incomeByMonth", {}) or {}).items():
                if str(k).startswith(year_prefix):
                    try:
                        inc += float(v or 0)
                    except Exception:
                        pass
            if "income" in q or "earned" in q:
                return f"Your income in {today.year} is {fmt_money(inc)}."
            return f"Your spending in {today.year} is {fmt_money(exp)}."

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

    # Handle FOLLOW-UP questions using conversation history context
    # If user asks about "that", "it", or short questions after a month was mentioned
    if last_month and len(q.split()) <= 5:
        # Follow-up about category in the last mentioned month
        if "category" in q or "what was" in q:
            if last_month in category_by_month:
                cats = category_by_month[last_month]
                if cats:
                    top_cat = cats[0]
                    try:
                        from datetime import datetime
                        dt = datetime.strptime(last_month, "%Y-%m")
                        month_display = dt.strftime("%B %Y")
                    except Exception:
                        month_display = last_month
                    return f"In {month_display}, your highest spending category was {top_cat['category']} with {fmt_money(top_cat['spent'])}."
        
        # Follow-up about total spending in the last mentioned month
        if "how much" in q or "total" in q or "amount" in q:
            for tm in top_months:
                if tm.get("month") == last_month:
                    try:
                        from datetime import datetime
                        dt = datetime.strptime(last_month, "%Y-%m")
                        month_display = dt.strftime("%B %Y")
                    except Exception:
                        month_display = last_month
                    return f"Your total spending in {month_display} was {fmt_money(tm.get('spent', 0))}."

    # Handle category queries with "overall" or "all months" 
    if ("category" in q and ("overall" in q or "all" in q or "total" in q or "most" in q)):
        if all_cats:
            top_cat = all_cats[0]
            return f"Overall, your highest spending category is {top_cat['category']} with {fmt_money(top_cat['spent'])}."

    # Handle category-specific queries for a particular month (explicit mention)
    if ("category" in q or "categories" in q) and ("in" in q or "during" in q or "for" in q):
        target_month = extract_month_from_question(q)
        if target_month and target_month in category_by_month:
            cats = category_by_month[target_month]
            if cats:
                top_cat = cats[0]
                try:
                    from datetime import datetime
                    dt = datetime.strptime(target_month, "%Y-%m")
                    month_display = dt.strftime("%B %Y")
                except Exception:
                    month_display = target_month
                return f"In {month_display}, your highest spending category was {top_cat['category']} with {fmt_money(top_cat['spent'])}."

    # Handle trend queries
    if "trend" in q or "trending" in q or "pattern" in q:
        expense_trend = trends.get("expenses", {})
        income_trend = trends.get("income", {})
        
        lines = ["Your financial trends:"]
        
        exp_dir = expense_trend.get("direction", "stable")
        exp_change = expense_trend.get("change", 0)
        if exp_dir == "increasing":
            lines.append(f"Expenses are increasing by {abs(exp_change):.1f}%")
        elif exp_dir == "decreasing":
            lines.append(f"Expenses are decreasing by {abs(exp_change):.1f}%")
        else:
            lines.append("Expenses are stable")
        
        inc_dir = income_trend.get("direction", "stable")
        inc_change = income_trend.get("change", 0)
        if inc_dir == "increasing":
            lines.append(f"Income is increasing by {abs(inc_change):.1f}%")
        elif inc_dir == "decreasing":
            lines.append(f"Income is decreasing by {abs(inc_change):.1f}%")
        else:
            lines.append("Income is stable")
        
        return "\n".join(lines)

    # Handle prediction/forecast queries
    if "predict" in q or "forecast" in q or "next month" in q or "future" in q:
        pred_exp = predictions.get("nextMonthExpenses", 0)
        pred_inc = predictions.get("nextMonthIncome", 0)
        pred_sav = predictions.get("nextMonthSavings", 0)
        
        lines = ["Based on your recent patterns:"]
        lines.append(f"Predicted next month expenses: {fmt_money(pred_exp)}")
        lines.append(f"Predicted next month income: {fmt_money(pred_inc)}")
        
        if pred_sav >= 0:
            lines.append(f"Predicted savings: {fmt_money(pred_sav)}")
        else:
            lines.append(f"Predicted deficit: {fmt_money(abs(pred_sav))}")
        
        return "\n".join(lines)

    # Handle comparison queries
    if "compare" in q or "comparison" in q or "vs" in q or "versus" in q:
        if len(top_months) >= 2:
            month1 = top_months[0]
            month2 = top_months[1]
            
            try:
                from datetime import datetime
                dt1 = datetime.strptime(month1["month"], "%Y-%m")
                dt2 = datetime.strptime(month2["month"], "%Y-%m")
                m1_display = dt1.strftime("%B %Y")
                m2_display = dt2.strftime("%B %Y")
            except:
                m1_display = month1["month"]
                m2_display = month2["month"]
            
            diff = month1["spent"] - month2["spent"]
            pct = (diff / month2["spent"] * 100) if month2["spent"] > 0 else 0
            
            lines = [f"Comparing {m1_display} vs {m2_display}:"]
            lines.append(f"{m1_display}: {fmt_money(month1['spent'])}")
            lines.append(f"{m2_display}: {fmt_money(month2['spent'])}")
            
            if diff > 0:
                lines.append(f"You spent {fmt_money(diff)} more ({pct:.1f}% increase)")
            else:
                lines.append(f"You spent {fmt_money(abs(diff))} less ({abs(pct):.1f}% decrease)")
            
            return "\n".join(lines)

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

    # Handle unusual/anomaly spending queries (before generic month handlers)
    if "unusual" in q or "anomaly" in q or "strange" in q or "weird" in q:
        anomaly_item = next((i for i in insights.get("insights", []) if i.get("type") == "anomaly"), None)
        if anomaly_item and anomaly_item.get("anomalies"):
            anomalies = anomaly_item.get("anomalies", [])
            if anomalies:
                a = anomalies[0]  # Most unusual
                date_str = ""
                if a.get("date"):
                    try:
                        from datetime import datetime
                        if hasattr(a.get("date"), "strftime"):
                            date_str = a.get("date").strftime("%B %d, %Y")
                        else:
                            date_str = str(a.get("date"))[:10]
                    except:
                        pass
                desc = f" on {date_str}" if date_str else ""
                return f"Your most unusual spending was {fmt_money(a.get('amount', 0))} on {a.get('category', 'Unknown')}{desc}. Description: {a.get('description', 'N/A')}."
        return "No unusual spending patterns detected in your transactions."

    # Handle "how can I improve savings" type questions
    # This must be checked BEFORE month-ranking savings queries.
    if ("save" in q or "saving" in q or "savings" in q) and (
        "better" in q or "improve" in q or "increase" in q or "reduce" in q or "what do i need" in q
    ):
        if not all_cats:
            return "I could not find this information in your financial records."

        top1 = all_cats[0]
        top2 = all_cats[1] if len(all_cats) > 1 else None
        top3 = all_cats[2] if len(all_cats) > 2 else None

        lines = [
            "To improve savings, focus on reducing your biggest expense categories:",
            f"1) {top1['category']}: {fmt_money(top1['spent'])}",
        ]
        if top2:
            lines.append(f"2) {top2['category']}: {fmt_money(top2['spent'])}")
        if top3:
            lines.append(f"3) {top3['category']}: {fmt_money(top3['spent'])}")

        # Simple, data-backed targets
        try:
            cut1 = float(top1.get("spent") or 0) * 0.10
        except Exception:
            cut1 = 0
        if cut1 > 0:
            lines.append(f"If you cut {top1['category']} by 10%, you could save about {fmt_money(cut1)} more in the same period.")

        return "\n".join(lines)

    # Handle "which month had most savings" (check BEFORE generic savings handler)
    # Only trigger this if the user is explicitly asking for a month ranking.
    if ("month" in q or "months" in q or "when" in q) and ("save" in q or "saving" in q or "savings" in q):
        import re

        wants_ranking = re.search(r"\b(which|most|highest|max)\b", q) is not None
        wants_improvement = re.search(r"\b(better|improve|increase|reduce)\b", q) is not None

        if wants_ranking and not wants_improvement:
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
