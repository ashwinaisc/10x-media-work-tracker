import html
import json
import sqlite3
import sys
from pathlib import Path


if len(sys.argv) != 3:
    raise SystemExit("Usage: export-clickable-user-tabs.py <database.sqlite> <output.html>")

connection = sqlite3.connect(sys.argv[1])
connection.row_factory = sqlite3.Row

tabs = {
    "MHS392": "92 Haroon Basha — Senior Editor",
    "MHS281": "81 Michael — Junior Editor",
    "MHS316": "16 Rahul Ravichandran — Junior Editor",
    "MHS382": "82 Ragul B — Junior Editor",
    "MHS386": "86 Sasil Vikram — Junior Editor",
    "MHS171": "71 Varadharaj — Senior Editor",
    "MHS299": "99 Muthu Krishnan — Senior Editor",
    "MHS090": "90 Kamesh Kumar — Senior Editor",
    "MHS250": "50 Rahul — Junior Editor",
}


def clean(value):
    return str(value or "").replace("\t", " ").replace("\r", " ").replace("\n", " ").strip()


def status(value):
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
        url = clean(row["output_url"])
        link = f'=HYPERLINK("{url.replace(chr(34), chr(34) * 2)}","Open output")' if url else ""
        values.append([
            row["work_date"], clean(row["title"]), clean(row["category"]), row["due_date"],
            clean(row["priority"]).capitalize(), status(row["status"]),
            row["estimated_hours"] or 0, row["actual_hours"] or 0, link,
        ])
    result.append({
        "employee_id": employee_id,
        "tab": tab_name,
        "rows": len(values),
        "tsv": "\n".join("\t".join(clean(cell) for cell in row) for row in values),
    })

payload = html.escape(json.dumps(result, ensure_ascii=False))
Path(sys.argv[2]).write_text(
    f'<!doctype html><meta charset="utf-8"><pre id="data">{payload}</pre>', encoding="utf-8"
)
print(", ".join(f"{item['employee_id']}:{item['rows']}" for item in result))
