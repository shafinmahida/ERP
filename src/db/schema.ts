import { sqliteTable, text, integer, real } from 'drizzle-orm/sqlite-core';

export const customer = sqliteTable('customer', {
  customer_id: integer('customer_id').primaryKey({ autoIncrement: true }),
  full_name: text('full_name').notNull(),
  father_name: text('father_name').notNull(),
  date_of_birth: text('date_of_birth').notNull(),
  gender: text('gender').notNull(),
  nationality: text('nationality').notNull(),
  mobile_number: text('mobile_number').notNull(),
  state: text('state').notNull().default('Maharashtra'),
  address_line1: text('address_line1'),
  address_line2: text('address_line2'),
  area_locality: text('area_locality'),
  city: text('city'),
  district: text('district'),
  pin_code: text('pin_code'),
  country: text('country').default('India'),
  email: text('email'),
  phone_landline: text('phone_landline'),
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
  is_active: integer('is_active').notNull().default(1),
  created_at: text('created_at'),
  updated_at: text('updated_at'),
});

export const packageTable = sqliteTable('package', {
  package_id: integer('package_id').primaryKey({ autoIncrement: true }),
  season_id: integer('season_id')
    .notNull()
    .references(() => season.season_id),
  name: text('name').notNull(),
  description: text('description').notNull(),
  base_price_paise: integer('base_price_paise').default(0),
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
  status: text('status').notNull().default('Draft'), // Workflow stage: Draft, Confirmed, Documents Pending, Visa Processing, Visa Approved, Ticketed, Travel Ready, Departed, Completed, Cancelled
  payment_status: text('payment_status').notNull().default('Pending'), // Payment stage: Pending, Advance Received, Partially Paid, Fully Paid, Overpaid, Refund Pending, Refunded
  
  // Immutability Snapshots
  package_name_snapshot: text('package_name_snapshot'),
  package_price_snapshot: integer('package_price_snapshot'),
  season_label_snapshot: text('season_label_snapshot'),
  season_type_code_snapshot: text('season_type_code_snapshot'),

  // Operational Fields
  representative: text('representative'),
  tour_name: text('tour_name'),
  booking_date: text('booking_date'),
  airline: text('airline'),
  sector: text('sector'),
  flight_number: text('flight_number'),
  pnr: text('pnr'),
  saudi_agent: text('saudi_agent'),
  departure_date: text('departure_date'),
  arrival_date: text('arrival_date'),
  room_preference: text('room_preference'),
  bus_number: text('bus_number'),
  remarks: text('remarks'),

  created_at: text('created_at').notNull(),
  updated_at: text('updated_at').notNull(),
});

export const registrationPax = sqliteTable('registration_pax', {
  pax_id: integer('pax_id').primaryKey({ autoIncrement: true }),
  registration_id: integer('registration_id')
    .notNull()
    .references(() => registration.registration_id),
  customer_id: integer('customer_id')
    .notNull()
    .references(() => customer.customer_id),
  is_primary: integer('is_primary').notNull().default(0), // 1 for primary pilgrim, 0 for additional
  pax_sequence: integer('pax_sequence').notNull().default(1),
  relationship: text('relationship').notNull().default('Primary'), // Primary, Spouse, Child, Parent, Friend, Relative, Other
  room_preference: text('room_preference'),
  bus_assignment: text('bus_assignment'),
  pax_status: text('pax_status').notNull().default('ACTIVE'),
  remarks: text('remarks'),
  created_at: text('created_at').notNull(),
  updated_at: text('updated_at').notNull(),
});

export const registrationCharge = sqliteTable('registration_charge', {
  charge_id: integer('charge_id').primaryKey({ autoIncrement: true }),
  registration_id: integer('registration_id')
    .notNull()
    .references(() => registration.registration_id),
  charge_type: text('charge_type').notNull(), // Adult, ChildWithBed, ChildWithoutBed, Infant, Visa, Miscellaneous, Discount, FareDifference, Cancellation
  rate_inr_paise: integer('rate_inr_paise').notNull().default(0), // Money precision: stored in integer paise
  rate_usd_cents: integer('rate_usd_cents'), // Optional USD rate in cents
  exchange_rate_used: real('exchange_rate_used'), // Exchange rate captured at the time charge was created (e.g. 85.50 INR per USD)
  quantity: real('quantity').notNull().default(1),
  amount_paise: integer('amount_paise').notNull(), // Money precision: stored in integer paise (rate_inr_paise * quantity)
  created_at: text('created_at').notNull(),
  updated_at: text('updated_at').notNull(),
});

export const registrationTax = sqliteTable('registration_tax', {
  tax_id: integer('tax_id').primaryKey({ autoIncrement: true }),
  registration_id: integer('registration_id')
    .notNull()
    .references(() => registration.registration_id),
  tax_type: text('tax_type').notNull(), // CGST, SGST, IGST, TCS
  rate_percent: real('rate_percent').notNull(),
  amount_paise: integer('amount_paise').notNull(), // Money precision: stored in integer paise
  created_at: text('created_at').notNull(),
});

export const payment = sqliteTable('payment', {
  payment_id: integer('payment_id').primaryKey({ autoIncrement: true }),
  registration_id: integer('registration_id')
    .notNull()
    .references(() => registration.registration_id),
  amount_paise: integer('amount_paise').notNull(), // Money precision: stored in integer paise
  payment_type: text('payment_type').notNull(), // Cash/Cheque/Bank Transfer
  cheque_number: text('cheque_number'),
  bank_name: text('bank_name'),
  reference_number: text('reference_number'), // UPI/NEFT/RTGS/IMPS/card
  payment_date: text('payment_date').notNull(),
  created_at: text('created_at').notNull(),
});

export const companySettings = sqliteTable('company_settings', {
  setting_id: integer('setting_id').primaryKey({ autoIncrement: true }),
  setting_key: text('setting_key').notNull().unique(),
  setting_value: text('setting_value').notNull(),
  updated_at: text('updated_at').notNull(),
});

export const documentType = sqliteTable('document_type', {
  document_type_id: integer('document_type_id').primaryKey({ autoIncrement: true }),
  name: text('name').notNull(),
  code: text('code').notNull().unique(),
  owner_scope: text('owner_scope').notNull(),
  requires_expiry: integer('requires_expiry').notNull().default(0),
  requires_number: integer('requires_number').notNull().default(0),
  is_active: integer('is_active').notNull().default(1),
  sort_order: integer('sort_order').notNull().default(0),
});

export const document = sqliteTable('document', {
  document_id: integer('document_id').primaryKey({ autoIncrement: true }),
  identity_id: integer('identity_id').references(() => customerIdentity.identity_id),
  registration_id: integer('registration_id').references(() => registration.registration_id),
  document_type_id: integer('document_type_id')
    .notNull()
    .references(() => documentType.document_type_id),
  document_number: text('document_number'),
  issue_date: text('issue_date'),
  expiry_date: text('expiry_date'),
  status: text('status').notNull().default('ACTIVE'),
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

export const documentSequence = sqliteTable('document_sequence', {
  sequence_id: integer('sequence_id').primaryKey({ autoIncrement: true }),
  document_type: text('document_type').notNull(), // Receipt, Voucher, Invoice, etc.
  year: integer('year').notNull(),
  last_number: integer('last_number').notNull().default(0),
});

export const visaOperation = sqliteTable('visa_operation', {
  visa_id: integer('visa_id').primaryKey({ autoIncrement: true }),
  registration_id: integer('registration_id')
    .notNull()
    .references(() => registration.registration_id),
  pax_id: integer('pax_id').references(() => registrationPax.pax_id),
  visa_status: text('visa_status').notNull().default('Pending'), // Pending, Submitted, Approved, Rejected
  embassy_reference: text('embassy_reference'),
  visa_number: text('visa_number'),
  submission_date: text('submission_date'),
  approval_date: text('approval_date'),
  rejection_reason: text('rejection_reason'),
  batch_number: text('batch_number'),
  notes: text('notes'),
  created_at: text('created_at').notNull(),
  updated_at: text('updated_at').notNull(),
});

export const flightOperation = sqliteTable('flight_operation', {
  flight_op_id: integer('flight_op_id').primaryKey({ autoIncrement: true }),
  registration_id: integer('registration_id')
    .notNull()
    .references(() => registration.registration_id),
  pax_id: integer('pax_id').references(() => registrationPax.pax_id),
  airline: text('airline'),
  flight_number: text('flight_number'),
  pnr: text('pnr'),
  departure_airport: text('departure_airport'),
  arrival_airport: text('arrival_airport'),
  departure_date: text('departure_date'),
  arrival_date: text('arrival_date'),
  ticket_number: text('ticket_number'),
  ticket_document_path: text('ticket_document_path'),
  created_at: text('created_at').notNull(),
  updated_at: text('updated_at').notNull(),
});

export const hotelOperation = sqliteTable('hotel_operation', {
  hotel_op_id: integer('hotel_op_id').primaryKey({ autoIncrement: true }),
  registration_id: integer('registration_id')
    .notNull()
    .references(() => registration.registration_id),
  city: text('city').notNull(), // Makkah / Madinah
  hotel_name: text('hotel_name').notNull(),
  room_type: text('room_type').notNull(), // Double, Triple, Quad, Sharing
  room_number: text('room_number'),
  occupancy_count: integer('occupancy_count').notNull().default(1),
  checkin_date: text('checkin_date'),
  checkout_date: text('checkout_date'),
  notes: text('notes'),
  created_at: text('created_at').notNull(),
  updated_at: text('updated_at').notNull(),
});

export type Customer = typeof customer.$inferSelect;
export type CustomerIdentity = typeof customerIdentity.$inferSelect;
export type SeasonType = typeof seasonType.$inferSelect;
export type Season = typeof season.$inferSelect;
export type Package = typeof packageTable.$inferSelect;
export type Registration = typeof registration.$inferSelect;
export type RegistrationPax = typeof registrationPax.$inferSelect;
export type RegistrationCharge = typeof registrationCharge.$inferSelect;
export type RegistrationTax = typeof registrationTax.$inferSelect;
export type Payment = typeof payment.$inferSelect;
export type CompanySettings = typeof companySettings.$inferSelect;
export type DocumentType = typeof documentType.$inferSelect;
export type Document = typeof document.$inferSelect;
export type DocumentVersion = typeof documentVersion.$inferSelect;
export type AuditLog = typeof auditLog.$inferSelect;
export type DocumentSequence = typeof documentSequence.$inferSelect;
export type VisaOperation = typeof visaOperation.$inferSelect;
export type FlightOperation = typeof flightOperation.$inferSelect;
export type HotelOperation = typeof hotelOperation.$inferSelect;

