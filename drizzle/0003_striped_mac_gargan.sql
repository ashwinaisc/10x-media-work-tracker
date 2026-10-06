CREATE TABLE `goal_types` (
	`id` text PRIMARY KEY NOT NULL,
	`manager_id` text NOT NULL,
	`name` text NOT NULL,
	`unit` text NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX `goal_type_manager_name` ON `goal_types` (`manager_id`,`name`);--> statement-breakpoint
CREATE TABLE `people` (
	`id` text PRIMARY KEY NOT NULL,
	`user_id` text,
	`email` text NOT NULL,
	`name` text NOT NULL,
	`role` text NOT NULL,
	`job` text NOT NULL,
	`manager_id` text,
	`active` integer DEFAULT 1 NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX `people_email_unique` ON `people` (`email`);--> statement-breakpoint
CREATE TABLE `plans` (
	`id` text PRIMARY KEY NOT NULL,
	`member_id` text NOT NULL,
	`type_id` text NOT NULL,
	`month` text NOT NULL,
	`target` real NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX `plan_member_month_type` ON `plans` (`member_id`,`month`,`type_id`);--> statement-breakpoint
CREATE TABLE `submissions` (
	`id` text PRIMARY KEY NOT NULL,
	`plan_id` text NOT NULL,
	`title` text NOT NULL,
	`url` text NOT NULL,
	`completed` text NOT NULL,
	`quantity` real NOT NULL,
	`status` text DEFAULT 'review' NOT NULL,
	`feedback` text DEFAULT '' NOT NULL,
	`version` integer DEFAULT 1 NOT NULL
);
