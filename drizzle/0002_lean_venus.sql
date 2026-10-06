CREATE TABLE `personal_goals` (
	`id` text PRIMARY KEY NOT NULL,
	`member_id` text NOT NULL,
	`month` text NOT NULL,
	`kind` text NOT NULL,
	`quantity` real NOT NULL,
	`hours_per_job` real
);
--> statement-breakpoint
CREATE UNIQUE INDEX `personal_goal_member_month_kind` ON `personal_goals` (`member_id`,`month`,`kind`);