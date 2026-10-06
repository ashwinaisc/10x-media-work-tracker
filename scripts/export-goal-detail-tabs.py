import html
import json
import sqlite3
import sys
from pathlib import Path


if len(sys.argv) != 3:
    raise SystemExit("Usage: export-goal-detail-tabs.py <database.sqlite> <output.html>")

connection = sqlite3.connect(sys.argv[1])
connection.row_factory = sqlite3.Row

preferred_order = [
    "Ads", "Reels", "Carousel", "Story", "Shoot", "Longform",
    "Video Carousel", "Schedule", "FFC", "Post", "Others",
]


def clean(value):
    return str(value or "").replace("\t", " ").replace("\r", " ").replace("\n", " ").strip()


def link_formula(url):
    url = clean(url)
    if not url:
        return ""
    return f'=HYPERLINK("{url.replace(chr(34), chr(34) * 2)}","Open output")'


rows = connection.execute(
    """
    SELECT gt.name AS goal_type, s.completed AS work_date,
           pe.employee_id, pe.name AS employee, s.title AS work_name,
           s.status, s.url
    FROM submissions s
    JOIN plans p ON p.id=s.plan_id
    JOIN goal_types gt ON gt.id=p.type_id
    JOIN people pe ON pe.id=p.member_id
    WHERE p.month='2026-09'
      AND gt.unit='jobs'
      AND pe.role='creator'
      AND pe.active=1
      AND s.completed >= '2026-09-16'
      AND s.completed <= '2026-09-30'
    ORDER BY gt.name COLLATE NOCASE, s.completed, pe.name COLLATE NOCASE, s.title COLLATE NOCASE
    """
).fetchall()

by_goal = {goal: [] for goal in preferred_order}
status_labels = {
    "approved": "Approved",
    "changes": "Changes requested",
    "pending": "Pending review",
}
for row in rows:
    goal = row["goal_type"]
    by_goal.setdefault(goal, []).append([
        row["work_date"],
        clean(row["employee_id"]) or "—",
        clean(row["employee"]),
        clean(row["work_name"]),
        status_labels.get(clean(row["status"]), clean(row["status"]).replace("_", " ").title()),
        link_formula(row["url"]),
    ])

tabs = []
for goal in preferred_order + sorted(set(by_goal) - set(preferred_order), key=str.casefold):
    values = [["Date", "Employee ID", "Employee", "Work / Ad name", "Status", "Output link"]]
    values.extend(by_goal.get(goal, []))
    tabs.append({
        "tab": goal,
        "title": f"{goal.upper()} · SECOND HALF OF SEPTEMBER 2026",
        "subtitle": "Completed work from 16–30 September · Sorted by date and employee",
        "rows": len(values) - 1,
        "tsv": "\n".join("\t".join(clean(cell) for cell in row) for row in values),
    })

payload = html.escape(json.dumps({"tabs": tabs}, ensure_ascii=False))
Path(sys.argv[2]).write_text(
    f'<!doctype html><meta charset="utf-8"><pre id="data">{payload}</pre>',
    encoding="utf-8",
)
print(", ".join(f"{tab['tab']}:{tab['rows']}" for tab in tabs))
