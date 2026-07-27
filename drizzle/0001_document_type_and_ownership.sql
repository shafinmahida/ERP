-- Migration 0001: DocumentType Master Table & Document Ownership Fix (Sprint 2)

CREATE TABLE IF NOT EXISTS `document_type` (
	`document_type_id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`name` text NOT NULL,
	`code` text NOT NULL UNIQUE,
	`owner_scope` text NOT NULL,
	`requires_expiry` integer DEFAULT 0 NOT NULL,
	`requires_number` integer DEFAULT 0 NOT NULL,
	`is_active` integer DEFAULT 1 NOT NULL,
	`sort_order` integer DEFAULT 0 NOT NULL
);

-- Recreate document table with nullable identity_id, registration_id, document_type_id, status
CREATE TABLE IF NOT EXISTS `document_new` (
	`document_id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`identity_id` integer REFERENCES `customer_identity`(`identity_id`),
	`registration_id` integer REFERENCES `registration`(`registration_id`),
	`document_type_id` integer NOT NULL REFERENCES `document_type`(`document_type_id`),
	`status` text DEFAULT 'ACTIVE' NOT NULL,
	`current_version_id` integer,
	`created_at` text NOT NULL
);

-- Add original_filename to document_version
ALTER TABLE `document_version` ADD COLUMN `original_filename` text NOT NULL DEFAULT '';
