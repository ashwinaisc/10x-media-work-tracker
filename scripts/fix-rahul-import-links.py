import shutil
import sqlite3
import sys
import uuid
from datetime import datetime
from pathlib import Path


if len(sys.argv) != 2:
    raise SystemExit("Usage: fix-rahul-import-links.py <database.sqlite>")

database_path = Path(sys.argv[1])
backup_path = database_path.with_name(
    f"{database_path.stem}.pre-rahul-link-fix-{datetime.now():%Y%m%d-%H%M%S}.sqlite"
)
shutil.copy2(database_path, backup_path)

links = {
    "7f7389bb-ae71-4105-9f79-d9205d0cc382": "https://drive.google.com/file/d/1gNOOZ6_i04an2Tw62KVXNYApel0cU4vn/view?usp=drive_link",
    "dbf5d240-640d-408a-848e-3e0747b63628": "https://drive.google.com/drive/folders/1G_WIUx8i997ZihuLqA_tGk4WgbggltQA?usp=drive_link",
    "d7579a2f-e547-486b-944e-104dcef0fe82": "https://drive.google.com/file/d/1ixkbBZ0wCthdfc3SD1q68Uwvzbe8adgY/view?usp=drive_link",
    "d2eb00cc-9f02-4a87-a0a9-3f3938a3d462": "https://drive.google.com/drive/folders/1glY6tAIHEEy6QrLXnJm_J4h0W-08U9mE?usp=drive_link",
    "882369f9-e05f-41d4-8284-12d3a7710cd2": "https://drive.google.com/drive/folders/16CVHHrsppBRyFNehP6BsLXB_LEuCTxiS?usp=drive_link",
    "ca3d45fe-0ba1-49ba-87de-f37958d91172": "https://drive.google.com/drive/folders/1QBka0zDPDpcl-21pFhKiY1jQjveED1gg?usp=drive_link",
    "92521091-d506-4892-8f11-895e68273342": "https://drive.google.com/drive/folders/1Oq1ujatETcssm2CBbTywvka76CQiiktw?usp=drive_link",
}

first_submission_id = "e101ab4e-9c70-457f-98ec-d107d590c366"
first_task_id = "b6fa72a9-f9ad-487f-a3ac-0ef1cd6bf07f"
second_task_id = str(uuid.uuid4())
second_submission_id = str(uuid.uuid4())

connection = sqlite3.connect(database_path)
try:
    with connection:
        for submission_id, link in links.items():
            connection.execute(
                "UPDATE submissions SET url=?, version=version+1 WHERE id=?",
                (link, submission_id),
            )

        connection.execute(
            """
            UPDATE submissions
            SET title=?, url=?, quantity=1, version=version+1
            WHERE id=?
            """,
            (
                "vsl cta.mp4",
                "https://drive.google.com/file/d/1CsIDSnhIRHwR7JPW-PI0nQlhjo-lwN37/view?usp=drive_link",
                first_submission_id,
            ),
        )
        connection.execute(
            "UPDATE daily_tasks SET title=?, estimated_hours=4, version=version+1 WHERE id=?",
            ("vsl cta.mp4", first_task_id),
        )
        connection.execute(
            """
            INSERT INTO daily_tasks(
                id,member_id,work_date,title,category,due_date,priority,status,
                estimated_hours,actual_hours,notes,version,started_at,
                elapsed_seconds,submitted_at,original_work_date
            )
            SELECT ?,member_id,work_date,?,category,due_date,priority,status,
                   4,actual_hours,notes,1,started_at,elapsed_seconds,submitted_at,
                   original_work_date
            FROM daily_tasks WHERE id=?
            """,
            (second_task_id, "Wellness centre CTA.mp4", first_task_id),
        )
        connection.execute(
            """
            INSERT INTO submissions(
                id,plan_id,title,url,completed,quantity,status,feedback,version,daily_task_id
            )
            SELECT ?,plan_id,?,?,completed,1,status,feedback,1,?
            FROM submissions WHERE id=?
            """,
            (
                second_submission_id,
                "Wellness centre CTA.mp4",
                "https://drive.google.com/file/d/1goSmq-rVbEbbxo67ohbqGMBEzJjnqRXd/view?usp=drive_link",
                second_task_id,
                first_submission_id,
            ),
        )
finally:
    connection.close()

print(f"backup={backup_path}")
print(f"new_task={second_task_id}")
print(f"new_submission={second_submission_id}")
