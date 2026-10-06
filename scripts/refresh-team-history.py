import shutil
import sqlite3
import subprocess
import sys
from datetime import datetime
from pathlib import Path


if len(sys.argv) != 3:
    raise SystemExit("Usage: refresh-team-history.py <database.sqlite> <source.xlsx>")

database_path = Path(sys.argv[1])
source_path = Path(sys.argv[2])
backup_path = database_path.with_name(
    f"{database_path.stem}.pre-source-refresh-{datetime.now():%Y%m%d-%H%M%S}.sqlite"
)
shutil.copy2(database_path, backup_path)

# Ashwin is maintained by the live tracker. Rahul's historical import is kept
# because its multi-output rows were curated into output-specific records.
employee_ids = (
    "MHS299", "MHS316", "MHS382", "MHS090", "MHS386",
    "MHS171", "MHS392", "MHS281", "MHS278",
)

connection = sqlite3.connect(database_path)
try:
    placeholders = ",".join("?" for _ in employee_ids)
    task_rows = connection.execute(
        f"""
        SELECT d.id
        FROM daily_tasks d
        JOIN people p ON p.id=d.member_id
        WHERE upper(p.employee_id) IN ({placeholders})
          AND d.work_date >= '2026-09-15'
          AND d.notes LIKE 'Historical work entry%'
        """,
        employee_ids,
    ).fetchall()
    task_ids = [row[0] for row in task_rows]
    with connection:
        if task_ids:
            task_placeholders = ",".join("?" for _ in task_ids)
            deleted_submissions = connection.execute(
                f"DELETE FROM submissions WHERE daily_task_id IN ({task_placeholders})",
                task_ids,
            ).rowcount
            deleted_tasks = connection.execute(
                f"DELETE FROM daily_tasks WHERE id IN ({task_placeholders})",
                task_ids,
            ).rowcount
        else:
            deleted_submissions = 0
            deleted_tasks = 0
finally:
    connection.close()

print(f"backup={backup_path}")
print(f"removed_tasks={deleted_tasks} removed_submissions={deleted_submissions}")

importer = Path(__file__).with_name("import-team-history.py")
subprocess.run(
    [sys.executable, str(importer), str(database_path), str(source_path)],
    check=True,
)
