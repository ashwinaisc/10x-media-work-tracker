import html
import json
import sqlite3
import sys
from pathlib import Path


if len(sys.argv) != 3:
    raise SystemExit("Usage: export-second-half-goal-report.py <database.sqlite> <output.html>")

connection = sqlite3.connect(sys.argv[1])
connection.row_factory = sqlite3.Row


def display(value):
    rounded = round(float(value), 2)
    return str(int(rounded)) if rounded.is_integer() else str(rounded)


rows = connection.execute(
    """
    SELECT pe.employee_id, pe.name AS employee, gt.name AS goal_type,
           p.target / 2.0 AS half_target, p.target AS monthly_target,
           COALESCE(SUM(CASE
             WHEN s.completed >= '2026-09-16' AND s.completed <= '2026-09-30'
              AND s.status != 'changes' THEN s.quantity ELSE 0 END), 0) AS completed
    FROM plans p
    JOIN people pe ON pe.id=p.member_id
    JOIN goal_types gt ON gt.id=p.type_id
    LEFT JOIN submissions s ON s.plan_id=p.id
    WHERE p.month='2026-09' AND pe.role='creator' AND pe.active=1 AND gt.unit='jobs'
    GROUP BY p.id, pe.employee_id, pe.name, gt.name, p.target
    ORDER BY pe.name COLLATE NOCASE, gt.name COLLATE NOCASE
    """
).fetchall()

preferred_order = [
    "Ads", "Reels", "Carousel", "Story", "Shoot", "Longform",
    "Video Carousel", "Schedule", "FFC", "Post", "Others",
]
goal_types = sorted(
    {row["goal_type"] for row in rows},
    key=lambda name: (
        preferred_order.index(name) if name in preferred_order else len(preferred_order),
        name.casefold(),
    ),
)

people = {}
for row in rows:
    key = (row["employee_id"] or "—", row["employee"])
    people.setdefault(key, {})[row["goal_type"]] = row

group_headers = ["Employee ID", "Employee"]
sub_headers = ["", ""]
for goal_type in goal_types:
    if goal_type == "Others":
        group_headers.append("Others")
        sub_headers.append("")
    else:
        group_headers.extend([goal_type, "", ""])
        sub_headers.extend(["Target", "Completed", "Pending"])

group_headers.append("Overall Performance")
sub_headers.append("")

values = [group_headers, sub_headers]
for (employee_id, employee), goals in sorted(people.items(), key=lambda item: item[0][1].casefold()):
    output_row = [employee_id, employee]
    overall_target = 0.0
    overall_completed = 0.0
    for goal_type in goal_types:
        row = goals.get(goal_type)
        if row is None:
            if goal_type == "Others":
                output_row.append(0)
            else:
                output_row.extend(["—", "—", "—"])
            continue

        completed = float(row["completed"])
        monthly_target = float(row["monthly_target"])
        if goal_type == "Others" or monthly_target == 0:
            output_row.append(display(completed))
        else:
            half_target = float(row["half_target"])
            pending = max(0, half_target - completed)
            overall_target += half_target
            overall_completed += completed
            output_row.extend([
                display(half_target),
                display(completed),
                display(pending),
            ])
    overall_percent = round(overall_completed / overall_target * 100) if overall_target else 0
    output_row.append(
        f"{display(overall_completed)} / {display(overall_target)} · {overall_percent}%"
    )
    values.append(output_row)

payload = {
    "tab": "2nd Half Goal Report",
    "title": "SECOND HALF GOAL REPORT · SEPTEMBER 2026",
    "subtitle": "One row per employee · Second-half target, completed and pending work",
    "columns": len(values[0]),
    "rows": len(values) - 2,
    "tsv": "\n".join("\t".join(map(str, row)) for row in values),
}
Path(sys.argv[2]).write_text(
    '<!doctype html><meta charset="utf-8"><pre id="data">'
    + html.escape(json.dumps(payload, ensure_ascii=False))
    + "</pre>",
    encoding="utf-8",
)
print(f"rows={payload['rows']}")
