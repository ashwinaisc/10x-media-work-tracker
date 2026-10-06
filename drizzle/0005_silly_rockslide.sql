ALTER TABLE `daily_tasks` ADD `started_at` text;--> statement-breakpoint
ALTER TABLE `daily_tasks` ADD `elapsed_seconds` integer DEFAULT 0 NOT NULL;--> statement-breakpoint
ALTER TABLE `daily_tasks` ADD `submitted_at` text;--> statement-breakpoint
ALTER TABLE `submissions` ADD `daily_task_id` text;