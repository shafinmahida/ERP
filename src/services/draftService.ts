const DRAFT_STORAGE_KEY_PREFIX = 'dayar_e_habib_reg_draft_';

export interface RegistrationDraftData {
  registrationId?: number;
  draftKey: string;
  seasonId?: number;
  packageId?: number;
  status?: string;
  representative?: string;
  tourName?: string;
  bookingDate?: string;
  airline?: string;
  sector?: string;
  flightNumber?: string;
  pnr?: string;
  saudiAgent?: string;
  departureDate?: string;
  arrivalDate?: string;
  roomPreference?: string;
  busNumber?: string;
  remarks?: string;
  paxList?: Array<{
    customerId?: number;
    fullName: string;
    fatherName: string;
    dob: string;
    gender: string;
    nationality: string;
    mobile: string;
    passportNumber: string;
    issueDate: string;
    expiryDate: string;
    placeOfIssue: string;
    relationship: string;
    isPrimary: boolean;
    addressLine1?: string;
    addressLine2?: string;
    city?: string;
    state?: string;
    pinCode?: string;
  }>;
  lastSavedAt: string;
}

export function saveRegistrationDraft(draftKey: string, data: Partial<RegistrationDraftData>): void {
  if (typeof window === 'undefined') return;
  try {
    const fullData: RegistrationDraftData = {
      ...data,
      draftKey,
      lastSavedAt: new Date().toISOString(),
    };
    localStorage.setItem(DRAFT_STORAGE_KEY_PREFIX + draftKey, JSON.stringify(fullData));
  } catch (err) {
    console.warn('Failed to save registration draft:', err);
  }
}

export function loadRegistrationDraft(draftKey: string): RegistrationDraftData | null {
  if (typeof window === 'undefined') return null;
  try {
    const raw = localStorage.getItem(DRAFT_STORAGE_KEY_PREFIX + draftKey);
    if (!raw) return null;
    return JSON.parse(raw);
  } catch (err) {
    return null;
  }
}

export function clearRegistrationDraft(draftKey: string): void {
  if (typeof window === 'undefined') return;
  try {
    localStorage.removeItem(DRAFT_STORAGE_KEY_PREFIX + draftKey);
  } catch (err) {}
}

export function getAllAvailableDrafts(): RegistrationDraftData[] {
  if (typeof window === 'undefined') return [];
  const drafts: RegistrationDraftData[] = [];
  try {
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i);
      if (key && key.startsWith(DRAFT_STORAGE_KEY_PREFIX)) {
        const val = localStorage.getItem(key);
        if (val) drafts.push(JSON.parse(val));
      }
    }
  } catch (err) {}
  return drafts.sort((a, b) => new Date(b.lastSavedAt).getTime() - new Date(a.lastSavedAt).getTime());
}
