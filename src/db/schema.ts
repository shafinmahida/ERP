import { sqliteTable, text, integer, real } from 'drizzle-orm/sqlite-core';

export const customer = sqliteTable('customer', {
  customer_id: integer('customer_id').primaryKey({ autoIncrement: true }),
  full_name: text('full_name').notNull(),
  father_name: text('father_name').notNull(),
  date_of_birth: text('date_of_birth').notNull(),
  gender: text('gender').notNull(),
  nationality: text('nationality').notNull(),
  mobile_number: text('mobile_number').notNull(),
  created_at: text('created_at').notNull(),
  updated_at: text('updated_at').notNull(),
});

export const customerIdentity = sqliteTable('customer_identity', {
  identity_id: integer('identity_id').primaryKey({ autoIncrement: true }),
  customer_id: integer('customer_id')
    .notNull()
    .references(() => customer.customer_id),
  passport_number: text('passport_number').notNull(),
  issue_date: text('issue_date').notNull(),
  expiry_date: text('expiry_date').notNull(),
  place_of_issue: text('place_of_issue').notNull(),
  identity_status: text('identity_status').notNull(), // ACTIVE, EXPIRED, REPLACED
  created_at: text('created_at').notNull(),
});

export const seasonType = sqliteTable('season_type', {
  season_type_id: integer('season_type_id').primaryKey({ autoIncrement: true }),
  name: text('name').notNull(),
  code: text('code').notNull().unique(), // e.g. HAJJ, UMR, RMZN
  description: text('description').notNull(),
  is_active: integer('is_active').notNull(), // 1 or 0
});

export const season = sqliteTable('season', {
  season_id: integer('season_id').primaryKey({ autoIncrement: true }),
  season_type_id: integer('season_type_id')
    .notNull()
    .references(() => seasonType.season_type_id),
  year: integer('year').notNull(),
  label: text('label').notNull(),
});

export const packageTable = sqliteTable('package', {
  package_id: integer('package_id').primaryKey({ autoIncrement: true }),
  season_id: integer('season_id')
    .notNull()
    .references(() => season.season_id),
  name: text('name').notNull(),
  description: text('description').notNull(),
});

export const registration = sqliteTable('registration', {
  registration_id: integer('registration_id').primaryKey({ autoIncrement: true }),
  registration_number: text('registration_number').notNull().unique(),
  customer_id: integer('customer_id')
    .notNull()
    .references(() => customer.customer_id),
  season_id: integer('season_id')
    .notNull()
    .references(() => season.season_id),
  package_id: integer('package_id')
    .notNull()
    .references(() => packageTable.package_id),
  status: text('status').notNull(),
  created_at: text('created_at').notNull(),
  updated_at: text('updated_at').notNull(),
});

export const payment = sqliteTable('payment', {
  payment_id: integer('payment_id').primaryKey({ autoIncrement: true }),
  registration_id: integer('registration_id')
    .notNull()
    .references(() => registration.registration_id),
  amount: real('amount').notNull(),
  payment_type: text('payment_type').notNull(), // Cash/Cheque/Bank Transfer
  cheque_number: text('cheque_number'),
  bank_name: text('bank_name'),
  reference_number: text('reference_number'), // UPI/NEFT/RTGS/IMPS/card
  payment_date: text('payment_date').notNull(),
  created_at: text('created_at').notNull(),
});

export const documentType = sqliteTable('document_type', {
  document_type_id: integer('document_type_id').primaryKey({ autoIncrement: true }),
  name: text('name').notNull(),
  code: text('code').notNull().unique(), // e.g. PASSPORT, VISA, TICKET, HOTEL, MEDICAL, OTHER
  owner_scope: text('owner_scope').notNull(), // IDENTITY or REGISTRATION
  requires_expiry: integer('requires_expiry').notNull().default(0), // 1 or 0
  requires_number: integer('requires_number').notNull().default(0), // 1 or 0
  is_active: integer('is_active').notNull().default(1), // 1 or 0
  sort_order: integer('sort_order').notNull().default(0),
});

export const document = sqliteTable('document', {
  document_id: integer('document_id').primaryKey({ autoIncrement: true }),
  identity_id: integer('identity_id').references(() => customerIdentity.identity_id),
  registration_id: integer('registration_id').references(() => registration.registration_id),
  document_type_id: integer('document_type_id')
    .notNull()
    .references(() => documentType.document_type_id),
  document_number: text('document_number'), // Persisted document number when requires_number = true
  issue_date: text('issue_date'),
  expiry_date: text('expiry_date'), // Persisted expiry date when requires_expiry = true
  status: text('status').notNull().default('ACTIVE'), // ACTIVE, SUPERSEDED, ARCHIVED
  created_at: text('created_at').notNull(),
});

export const documentVersion = sqliteTable('document_version', {
  version_id: integer('version_id').primaryKey({ autoIncrement: true }),
  document_id: integer('document_id')
    .notNull()
    .references(() => document.document_id),
  version_number: integer('version_number').notNull(),
  stored_filename: text('stored_filename').notNull(),
  original_filename: text('original_filename').notNull(),
  relative_path: text('relative_path').notNull(),
  checksum: text('checksum').notNull(),
  file_size: integer('file_size').notNull(),
  mime_type: text('mime_type').notNull(),
  uploaded_at: text('uploaded_at').notNull(),
  created_at: text('created_at').notNull(),
  reason_for_replacement: text('reason_for_replacement'),
});

export const auditLog = sqliteTable('audit_log', {
  log_id: integer('log_id').primaryKey({ autoIncrement: true }),
  entity_type: text('entity_type').notNull(),
  entity_id: text('entity_id').notNull(),
  action: text('action').notNull(),
  field_changed: text('field_changed'),
  old_value: text('old_value'),
  new_value: text('new_value'),
  timestamp: text('timestamp').notNull(),
  notes: text('notes'),
});

export type Customer = typeof customer.$inferSelect;
export type CustomerIdentity = typeof customerIdentity.$inferSelect;
export type SeasonType = typeof seasonType.$inferSelect;
export type Season = typeof season.$inferSelect;
export type Package = typeof packageTable.$inferSelect;
export type Registration = typeof registration.$inferSelect;
export type Payment = typeof payment.$inferSelect;
export type DocumentTypeEntity = typeof documentType.$inferSelect;
export type Document = typeof document.$inferSelect;
export type DocumentVersion = typeof documentVersion.$inferSelect;
export type AuditLog = typeof auditLog.$inferSelect;
