from __future__ import annotations

from typing import Any


def build_fallback_answer(question: str, insights: dict[str, Any]) -> str:
    q = (question or "").strip().lower()

    summary = insights.get("summary", {})
    top = summary.get("topCategories", [])

    budget_alert_item = next((i for i in insights.get("insights", []) if i.get("type") == "budget_alert"), None)
    anomaly_item = next((i for i in insights.get("insights", []) if i.get("type") == "anomaly"), None)

    def fmt_money(x: Any) -> str:
        try:
            return f"₹{float(x):.2f}"
        except Exception:  # noqa: BLE001
            return f"₹{x}"

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

    return "I could not find this information in your financial records."
