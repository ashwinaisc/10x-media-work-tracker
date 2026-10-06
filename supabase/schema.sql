CREATE SCHEMA studio_tracker;
SET search_path TO studio_tracker;
REVOKE ALL ON SCHEMA studio_tracker FROM PUBLIC, anon, authenticated;
CREATE TABLE "workspace" (
	"id" integer PRIMARY KEY NOT NULL,
	"owner_id" text NOT NULL
);
ALTER TABLE "workspace" ENABLE ROW LEVEL SECURITY;
CREATE TABLE "people" (
	"id" text PRIMARY KEY NOT NULL,
	"user_id" text,
	"email" text NOT NULL,
	"name" text NOT NULL,
	"role" text NOT NULL,
	"job" text NOT NULL,
	"manager_id" text,
	"active" integer DEFAULT 1 NOT NULL
, "employee_id" text);
ALTER TABLE "people" ENABLE ROW LEVEL SECURITY;
CREATE TABLE "goal_types" (
	"id" text PRIMARY KEY NOT NULL,
	"manager_id" text NOT NULL,
	"name" text NOT NULL,
	"unit" text NOT NULL
);
ALTER TABLE "goal_types" ENABLE ROW LEVEL SECURITY;
CREATE TABLE "plans" (
	"id" text PRIMARY KEY NOT NULL,
	"member_id" text NOT NULL,
	"type_id" text NOT NULL,
	"month" text NOT NULL,
	"target" double precision NOT NULL
, "hours_per_job" double precision);
ALTER TABLE "plans" ENABLE ROW LEVEL SECURITY;
CREATE TABLE "daily_tasks" (
	"id" text PRIMARY KEY NOT NULL,
	"member_id" text NOT NULL,
	"work_date" text NOT NULL,
	"title" text NOT NULL,
	"category" text NOT NULL,
	"due_date" text NOT NULL,
	"priority" text DEFAULT 'normal' NOT NULL,
	"status" text DEFAULT 'todo' NOT NULL,
	"estimated_hours" double precision DEFAULT 0 NOT NULL,
	"actual_hours" double precision DEFAULT 0 NOT NULL,
	"notes" text DEFAULT '' NOT NULL,
	"version" integer DEFAULT 1 NOT NULL
, "started_at" text, "elapsed_seconds" integer DEFAULT 0 NOT NULL, "submitted_at" text, original_work_date text, "quantity" double precision DEFAULT 1 NOT NULL);
ALTER TABLE "daily_tasks" ENABLE ROW LEVEL SECURITY;
CREATE TABLE "submissions" (
	"id" text PRIMARY KEY NOT NULL,
	"plan_id" text NOT NULL,
	"title" text NOT NULL,
	"url" text NOT NULL,
	"completed" text NOT NULL,
	"quantity" double precision NOT NULL,
	"status" text DEFAULT 'review' NOT NULL,
	"feedback" text DEFAULT '' NOT NULL,
	"version" integer DEFAULT 1 NOT NULL
, "daily_task_id" text);
ALTER TABLE "submissions" ENABLE ROW LEVEL SECURITY;
CREATE TABLE special_tasks (
 id TEXT PRIMARY KEY, member_id TEXT NOT NULL REFERENCES people(id),
 assigned_by TEXT NOT NULL REFERENCES people(id), title TEXT NOT NULL,
 instructions TEXT NOT NULL, due_date TEXT NOT NULL, priority TEXT NOT NULL,
 status TEXT NOT NULL DEFAULT 'todo', output_url TEXT NOT NULL DEFAULT '',
 feedback TEXT NOT NULL DEFAULT '', version INTEGER NOT NULL DEFAULT 0,
 created_at TEXT NOT NULL DEFAULT (CURRENT_TIMESTAMP::text)
);
ALTER TABLE "special_tasks" ENABLE ROW LEVEL SECURITY;
CREATE TABLE local_credentials (person_id TEXT PRIMARY KEY, salt TEXT NOT NULL, password_hash TEXT NOT NULL);
ALTER TABLE "local_credentials" ENABLE ROW LEVEL SECURITY;
CREATE UNIQUE INDEX "goal_type_manager_name" ON "goal_types" ("manager_id","name");
CREATE UNIQUE INDEX "people_email_unique" ON "people" ("email");
CREATE UNIQUE INDEX "plan_member_month_type" ON "plans" ("member_id","month","type_id");
CREATE UNIQUE INDEX "submission_daily_task" ON "submissions" ("daily_task_id");
REVOKE ALL ON ALL TABLES IN SCHEMA studio_tracker FROM PUBLIC, anon, authenticated;
