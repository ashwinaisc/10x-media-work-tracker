CREATE TABLE `channels` (
	`id` text PRIMARY KEY NOT NULL,
	`name` text NOT NULL,
	`folder` text DEFAULT '' NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX `channels_name_unique` ON `channels` (`name`);--> statement-breakpoint
CREATE TABLE `members` (
	`id` text PRIMARY KEY NOT NULL,
	`user_id` text,
	`email` text NOT NULL,
	`name` text NOT NULL,
	`role` text NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX `members_email_unique` ON `members` (`email`);--> statement-breakpoint
CREATE TABLE `targets` (
	`id` text PRIMARY KEY NOT NULL,
	`channel_id` text NOT NULL,
	`month` text NOT NULL,
	`kind` text NOT NULL,
	`quantity` integer NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX `target_month_channel_kind` ON `targets` (`month`,`channel_id`,`kind`);--> statement-breakpoint
CREATE TABLE `tasks` (
	`id` text PRIMARY KEY NOT NULL,
	`title` text NOT NULL,
	`channel_id` text NOT NULL,
	`kind` text NOT NULL,
	`due` text NOT NULL,
	`assignee` text NOT NULL,
	`status` text DEFAULT 'planned' NOT NULL,
	`drive_url` text DEFAULT '' NOT NULL,
	`completed` text DEFAULT '' NOT NULL,
	`notes` text DEFAULT '' NOT NULL,
	`feedback` text DEFAULT '' NOT NULL,
	`scheduled` text DEFAULT '' NOT NULL,
	`version` integer DEFAULT 1 NOT NULL
);
--> statement-breakpoint
CREATE TABLE `workspace` (
	`id` integer PRIMARY KEY NOT NULL,
	`owner_id` text NOT NULL
);
