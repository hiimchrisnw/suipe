CREATE TABLE `swipes` (
	`id` text PRIMARY KEY NOT NULL,
	`image_url` text NOT NULL,
	`source_url` text,
	`description` text,
	`tags` text DEFAULT '[]' NOT NULL,
	`created_at` text DEFAULT (current_timestamp) NOT NULL,
	`updated_at` text DEFAULT (current_timestamp) NOT NULL
);
