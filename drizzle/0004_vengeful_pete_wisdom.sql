CREATE TABLE `daily_tasks` (
	`id` text PRIMARY KEY NOT NULL,
	`member_id` text NOT NULL,
	`work_date` text NOT NULL,
	`title` text NOT NULL,
	`category` text NOT NULL,
	`due_date` text NOT NULL,
	`priority` text DEFAULT 'normal' NOT NULL,
	`status` text DEFAULT 'todo' NOT NULL,
	`estimated_hours` real DEFAULT 0 NOT NULL,
	`actual_hours` real DEFAULT 0 NOT NULL,
	`notes` text DEFAULT '' NOT NULL,
	`version` integer DEFAULT 1 NOT NULL
);
