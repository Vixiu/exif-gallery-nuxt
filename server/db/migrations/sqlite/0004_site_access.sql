CREATE TABLE `site_settings` (
  `key` text PRIMARY KEY NOT NULL,
  `value` text NOT NULL,
  `updated_at` integer DEFAULT CURRENT_TIMESTAMP
);
