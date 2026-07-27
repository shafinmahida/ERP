-- Migration 0002: Document Metadata Model Completion & redundant current_version_id removal (Sprint 2 Architectural Refinement)

-- Add document_number, issue_date, and expiry_date persisted metadata columns to document
ALTER TABLE `document` ADD COLUMN `document_number` text;
ALTER TABLE `document` ADD COLUMN `issue_date` text;
ALTER TABLE `document` ADD COLUMN `expiry_date` text;
