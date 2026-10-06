import json
import sqlite3
import sys


if len(sys.argv) != 3:
    raise SystemExit("Usage: export-visible-user-tabs.py <database.sqlite> <output.json>")

connection = sqlite3.connect(sys.argv[1])
connection.row_factory = sqlite3.Row

tabs = {
    "MHS392": "92 Haroon Basha — Senior Editor",
    "MHS281": "81 Michael — Junior Editor",
    "MHS278": "78 P. Karthikeyan — Junior Editor",
    "MHS316": "16 Rahul Ravichandran — Junior Editor",
    "MHS382": "82 Ragul B — Junior Editor",
    "MHS386": "86 Sasil Vikram — Junior Editor",
    "MHS171": "71 Varadharaj — Senior Editor",
    "MHS299": "99 Muthu Krishnan — Senior Editor",
    "MHS090": "90 Kamesh Kumar — Senior Editor",
}


def clean(value):
    return str(value or "").replace("\t", " ").replace("\r", " ").replace("\n", " ").strip()


def display_status(value):
    return {"progress": "In Progress", "hold": "On Hold", "ready": "Done", "done": "Done"}.get(value, "To Do")


result = []
for employee_id, tab_name in tabs.items():
    person = connection.execute(
        "SELECT * FROM people WHERE upper(employee_id)=?", (employee_id,)
    ).fetchone()
    rows = connection.execute(
        """
        SELECT d.*,s.url AS output_url
        FROM daily_tasks d LEFT JOIN submissions s ON s.daily_task_id=d.id
        WHERE d.member_id=? ORDER BY d.work_date,d.title,d.id
        """,
        (person["id"],),
    ).fetchall()
    values = []
    for row in rows:
        notes = " ".join(filter(None, (clean(row["notes"]), clean(row["output_url"]))))
        values.append([
            row["work_date"], clean(row["title"]), clean(row["category"]), row["due_date"],
            clean(row["priority"]).capitalize(), display_status(row["status"]),
            row["estimated_hours"] or 0, row["actual_hours"] or 0, notes,
        ])
    result.append({
        "employee_id": employee_id,
        "tab": tab_name,
        "rows": len(values),
        "tsv": "\n".join("\t".join(clean(cell) for cell in row) for row in values),
    })

with open(sys.argv[2], "w", encoding="utf-8") as output:
    json.dump(result, output, ensure_ascii=False)

print(", ".join(f"{item['employee_id']}:{item['rows']}" for item in result))
