import shutil
import sqlite3
import sys
from datetime import datetime
from pathlib import Path


if len(sys.argv) != 2:
    raise SystemExit("Usage: correct-rahul-september-19.py <database.sqlite>")

database_path = Path(sys.argv[1])
backup_path = database_path.with_name(
    f"{database_path.stem}.pre-rahul-september-19-{datetime.now():%Y%m%d-%H%M%S}.sqlite"
)
shutil.copy2(database_path, backup_path)

task_id = "51333ce7-1c01-4965-8004-500cb606d421"
submission_id = "e18a6fd0-5e94-4417-854b-d8919e7d14e6"
others_plan_id = "plan_others_MHS250"
title = "Others Task — OTHERS"
url = "https://drive.google.com/drive/folders/1ZFlyXmfMebwklZdSnkR56baXdqyfHhsV?usp=drive_link"

connection = sqlite3.connect(database_path)
try:
    with connection:
        connection.execute(
            """
            UPDATE daily_tasks
            SET title=?, category='Others', estimated_hours=0, version=version+1
            WHERE id=? AND member_id='member_mhs250' AND work_date='2026-09-19'
            """,
            (title, task_id),
        )
        connection.execute(
            """
            UPDATE submissions
            SET plan_id=?, title=?, url=?, quantity=1, version=version+1
            WHERE id=? AND daily_task_id=?
            """,
            (others_plan_id, title, url, submission_id, task_id),
        )
finally:
    connection.close()

print(f"backup={backup_path}")
