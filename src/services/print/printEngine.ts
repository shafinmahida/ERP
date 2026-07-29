import { jsPDF } from 'jspdf';
import { getRawDb } from '../../db';
import { convertRupeesToWords } from './amountToWords';
import { getNextDocumentNumber } from '../documentSequenceService';
import { recordAudit } from '../auditService';
import { paiseToRupees, getRegistrationFinancialSummary } from '../financialService';
import { getDataDirectory } from '../../db';
import { getRegistrationWithDetails } from '../registrationService';

export interface ReceiptData {
  receiptNumber: string;
  receiptDate: string;
  agencyName: string;
  agencyAddress: string;
  agencyPhone: string;
  agencyGstin: string;
  registrationNumber: string;
  pilgrimName: string;
  fatherName: string;
  passportNumber: string;
  packageName: string;
  seasonLabel: string;
  paymentType: string;
  chequeNumber?: string;
  bankName?: string;
  referenceNumber?: string;
  amountRupees: number;
  amountInWords: string;
  termsAndConditions: string[];
}

export const DEFAULT_RECEIPT_TERMS = [
  "Any subject jurisdiction at Mumbai only.",
  "No room choice will be entertained.",
  "We are not responsible for any luggage lost or damage.",
  "Hotels, Flight Schedule and itinerary are subject to change without prior notice.",
  "We are not liable to pay any charges or claim for excess or restricted baggage.",
  "After booking on any cancellation 10% of package amount will be deducted.",
  "Any cancellation after visa and ticketing balance amount will be refundable after deducting all applied charges."
];

/**
 * Retrieves agency letterhead details and terms from company_settings table
 */
export function getAgencyLetterhead() {
  const db = getRawDb();
  const getSetting = (key: string, defaultVal: string) => {
    try {
      const res = db.prepare(`SELECT * FROM company_settings WHERE setting_key = ?`).get(key) as any;
      return res?.setting_value || defaultVal;
    } catch {
      return defaultVal;
    }
  };

  let terms = DEFAULT_RECEIPT_TERMS;
  try {
    const termsRes = db.prepare(`SELECT * FROM company_settings WHERE setting_key = 'receipt_terms_conditions'`).get() as any;
    if (termsRes?.setting_value) {
      const parsed = JSON.parse(termsRes.setting_value);
      if (Array.isArray(parsed) && parsed.length === 7) {
        terms = parsed;
      } else {
        db.prepare(`UPDATE company_settings SET setting_value = ?, updated_at = ? WHERE setting_key = 'receipt_terms_conditions'`).run(JSON.stringify(DEFAULT_RECEIPT_TERMS), new Date().toISOString());
      }
    } else {
      db.prepare(`INSERT INTO company_settings (setting_key, setting_value, updated_at) VALUES ('receipt_terms_conditions', ?, ?)`).run(JSON.stringify(DEFAULT_RECEIPT_TERMS), new Date().toISOString());
    }
  } catch {}

  return {
    agencyName: getSetting('agency_name', 'DAYAR-E-HABIB HAJJ & UMRAH SERVICES'),
    agencyAddress: getSetting('agency_address', '53, Zakaria Masjid Street, 1st Floor, Room No. 04, Mumbai, Maharashtra 400009'),
    agencyPhone: getSetting('agency_phone', '+91 98200 12345 / +91 99300 67890'),
    agencyGstin: getSetting('agency_gstin', '27ABCDE1234F1ZH'),
    termsAndConditions: terms,
  };
}

/**
 * Generates a genuine A4 binary PDF Document using jsPDF
 */
export function createReceiptPdfDocument(data: ReceiptData): jsPDF {
  const doc = new jsPDF({
    orientation: 'portrait',
    unit: 'mm',
    format: 'a4',
  });

  // Green Accent Top Bar
  doc.setFillColor(4, 120, 87); // Emerald 700 (#047857)
  doc.rect(0, 0, 210, 10, 'F');

  // Header Letterhead
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(16);
  doc.setTextColor(4, 120, 87);
  doc.text(data.agencyName, 15, 20);

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8.5);
  doc.setTextColor(71, 85, 105);
  doc.text(data.agencyAddress, 15, 25);
  doc.text(`Phone: ${data.agencyPhone}  |  GSTIN: ${data.agencyGstin}`, 15, 29.5);

  // Divider Line
  doc.setDrawColor(4, 120, 87);
  doc.setLineWidth(0.4);
  doc.line(15, 33, 195, 33);

  // Document Title Badge
  doc.setFillColor(4, 120, 87);
  doc.roundedRect(135, 14, 60, 8.5, 2, 2, 'F');
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(10.5);
  doc.setTextColor(255, 255, 255);
  doc.text('PAYMENT RECEIPT', 165, 19.8, { align: 'center' });

  // Receipt Number & Date
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(10.5);
  doc.setTextColor(180, 83, 9);
  doc.text(`No: ${data.receiptNumber}`, 195, 27, { align: 'right' });

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8.5);
  doc.setTextColor(100, 116, 139);
  doc.text(`Date: ${data.receiptDate}`, 195, 31.5, { align: 'right' });

  // Details Table Frame
  let y = 37;

  const drawRow = (label1: string, val1: string, label2: string, val2: string) => {
    doc.setFillColor(248, 250, 252);
    doc.rect(15, y, 38, 7.5, 'F');
    doc.rect(105, y, 38, 7.5, 'F');

    doc.setDrawColor(226, 232, 240);
    doc.setLineWidth(0.2);
    doc.rect(15, y, 180, 7.5, 'S');
    doc.line(53, y, 53, y + 7.5);
    doc.line(105, y, 105, y + 7.5);
    doc.line(143, y, 143, y + 7.5);

    doc.setFont('helvetica', 'bold');
    doc.setFontSize(8.5);
    doc.setTextColor(51, 65, 85);
    doc.text(label1, 17, y + 5);
    doc.text(label2, 107, y + 5);

    doc.setFont('helvetica', 'normal');
    doc.setFontSize(8.5);
    doc.setTextColor(15, 23, 42);
    doc.text(val1, 55, y + 5);
    doc.text(val2, 145, y + 5);

    y += 7.5;
  };

  drawRow('Registration No', data.registrationNumber, 'Package / Season', `${data.packageName} (${data.seasonLabel})`);
  drawRow('Pilgrim Name', data.pilgrimName, "Father's Name", data.fatherName || '-');
  drawRow('Passport Number', data.passportNumber || 'N/A', 'Payment Mode', data.paymentType);

  if (data.paymentType === 'Cheque') {
    drawRow('Cheque Number', data.chequeNumber || '-', 'Bank Name', data.bankName || '-');
  } else if (data.paymentType === 'Bank Transfer') {
    drawRow('Reference No', data.referenceNumber || '-', 'Bank / Mode', data.bankName || 'Online Transfer');
  }

  y += 5;

  // Amount Box
  doc.setFillColor(236, 253, 245);
  doc.setDrawColor(5, 150, 105);
  doc.setLineWidth(0.4);
  doc.roundedRect(15, y, 180, 15, 3, 3, 'FD');

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(9.5);
  doc.setTextColor(6, 95, 70);
  doc.text('AMOUNT RECEIVED', 20, y + 9.5);

  // Use "INR " as clean, reliable standard text instead of Unicode symbol to avoid character corruption
  const formattedAmountStr = `INR ${data.amountRupees.toLocaleString('en-IN', { minimumFractionDigits: 2 })}`;
  
  // Dynamic font sizing to guarantee ZERO truncation regardless of amount length (e.g. ₹15,50,000 or ₹1,50,00,000)
  let amountFontSize = 14;
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(amountFontSize);
  
  const availableWidthMm = 95; // Right half of amount box
  let measuredWidth = doc.getTextWidth(formattedAmountStr);
  if (measuredWidth > availableWidthMm) {
    amountFontSize = Math.floor(amountFontSize * (availableWidthMm / measuredWidth));
    doc.setFontSize(amountFontSize);
  }

  doc.setTextColor(4, 120, 87);
  doc.text(formattedAmountStr, 190, y + 10, { align: 'right' });

  y += 20;

  // Amount in Words Box
  doc.setFillColor(241, 245, 249);
  doc.roundedRect(15, y, 180, 11, 2, 2, 'F');
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(8.5);
  doc.setTextColor(30, 41, 59);
  doc.text('Amount in Words:', 19, y + 7);

  doc.setFont('helvetica', 'italic');
  doc.setFontSize(8.5);
  const wrappedWords = doc.splitTextToSize(data.amountInWords, 138);
  doc.text(wrappedWords, 48, y + 7);

  y += 16;

  // Conditions of Travel (7 Terms Section)
  doc.setFillColor(248, 250, 252);
  doc.setDrawColor(203, 213, 225);
  doc.setLineWidth(0.3);
  doc.roundedRect(15, y, 180, 52, 2, 2, 'FD');

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(8.5);
  doc.setTextColor(15, 23, 42);
  doc.text('CONDITIONS OF TRAVEL & BOOKING TERMS:', 19, y + 6);

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(7.5);
  doc.setTextColor(71, 85, 105);

  let termY = y + 11;
  data.termsAndConditions.forEach((term, idx) => {
    const wrappedText = doc.splitTextToSize(`${idx + 1}. ${term}`, 172);
    doc.text(wrappedText, 19, termY);
    termY += wrappedText.length * 4 + 1.2;
  });

  y += 62;

  // Signatures Section
  doc.setDrawColor(148, 163, 184);
  doc.setLineWidth(0.3);
  doc.line(25, y, 75, y);
  doc.line(135, y, 185, y);

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8.5);
  doc.setTextColor(100, 116, 139);
  doc.text('Pilgrim / Payee Signature', 50, y + 4.5, { align: 'center' });
  doc.text(`Authorized Signatory (${data.agencyName})`, 160, y + 4.5, { align: 'center' });

  return doc;
}

/**
 * Builds HTML template string for a Payment Receipt (for browser print preview)
 */
export function renderReceiptHtml(data: ReceiptData): string {
  const termsListHtml = data.termsAndConditions
    .map((t) => `<li>${t}</li>`)
    .join('');

  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <title>Receipt ${data.receiptNumber}</title>
  <style>
    @media print {
      body { margin: 0; padding: 0; background: #fff; color: #000; }
      .no-print { display: none !important; }
      @page { size: A4 portrait; margin: 10mm; }
    }
    body {
      font-family: 'Segoe UI', Arial, sans-serif;
      color: #1e293b;
      background: #f8fafc;
      margin: 0;
      padding: 20px;
    }
    .receipt-card {
      max-width: 800px;
      margin: 0 auto;
      background: #ffffff;
      border: 1px solid #cbd5e1;
      border-radius: 12px;
      padding: 28px;
      box-shadow: 0 10px 25px -5px rgba(0, 0, 0, 0.05);
    }
    .header-table { width: 100%; border-collapse: collapse; margin-bottom: 20px; border-bottom: 2px solid #047857; padding-bottom: 14px; }
    .agency-title { font-size: 20px; font-weight: 800; color: #047857; letter-spacing: -0.5px; margin: 0; }
    .agency-sub { font-size: 11px; color: #475569; margin-top: 4px; line-height: 1.4; }
    .doc-badge { text-align: right; }
    .receipt-title { display: inline-block; background: #047857; color: #ffffff; padding: 5px 14px; font-weight: 700; font-size: 13px; border-radius: 6px; letter-spacing: 1px; text-transform: uppercase; }
    .receipt-no { font-family: monospace; font-size: 13px; font-weight: 700; color: #b45309; margin-top: 6px; }

    .details-table { width: 100%; border-collapse: collapse; margin-bottom: 16px; }
    .details-table td { padding: 7px 10px; font-size: 11.5px; border-bottom: 1px solid #e2e8f0; }
    .label-col { font-weight: 700; color: #334155; width: 22%; background: #f8fafc; }
    .val-col { color: #0f172a; }

    .amount-box {
      background: #ecfdf5;
      border: 1.5px dashed #059669;
      border-radius: 8px;
      padding: 14px;
      margin: 18px 0;
      display: flex;
      justify-content: space-between;
      align-items: center;
    }
    .amount-num { font-family: monospace; font-size: 24px; font-weight: 800; color: #047857; }
    .amount-words-box { background: #f1f5f9; padding: 10px 14px; border-radius: 6px; font-size: 11.5px; font-weight: 600; color: #1e293b; font-style: italic; margin-bottom: 20px; }

    .terms-box {
      background: #f8fafc;
      border: 1px solid #cbd5e1;
      border-radius: 8px;
      padding: 12px 16px;
      margin-bottom: 32px;
    }
    .terms-title { font-size: 11px; font-weight: 700; color: #0f172a; text-transform: uppercase; margin-bottom: 6px; }
    .terms-list { margin: 0; padding-left: 18px; font-size: 10px; color: #475569; line-height: 1.5; }
    .terms-list li { margin-bottom: 3px; }

    .signatures { width: 100%; margin-top: 36px; border-collapse: collapse; }
    .sig-col { width: 50%; text-align: center; font-size: 11px; color: #64748b; }
    .sig-line { width: 180px; margin: 0 auto 8px auto; border-top: 1px solid #94a3b8; }
  </style>
</head>
<body>

<div class="receipt-card">
  <!-- Header / Agency Letterhead -->
  <table class="header-table">
    <tr>
      <td style="vertical-align: top;">
        <h1 class="agency-title">${data.agencyName}</h1>
        <p class="agency-sub">
          ${data.agencyAddress}<br>
          Phone: ${data.agencyPhone} | GSTIN: ${data.agencyGstin}
        </p>
      </td>
      <td class="doc-badge" style="vertical-align: top;">
        <div class="receipt-title">Payment Receipt</div>
        <div class="receipt-no">No: ${data.receiptNumber}</div>
        <div style="font-size: 11px; color: #64748b; margin-top: 4px;">Date: ${data.receiptDate}</div>
      </td>
    </tr>
  </table>

  <!-- Receipt Details Grid -->
  <table class="details-table">
    <tr>
      <td class="label-col">Registration No</td>
      <td class="val-col" style="font-family: monospace; font-weight: 700; color: #b45309;">${data.registrationNumber}</td>
      <td class="label-col">Package / Season</td>
      <td class="val-col">${data.packageName} (${data.seasonLabel})</td>
    </tr>
    <tr>
      <td class="label-col">Pilgrim Name</td>
      <td class="val-col" style="font-weight: 700;">${data.pilgrimName}</td>
      <td class="label-col">Father's Name</td>
      <td class="val-col">${data.fatherName || '-'}</td>
    </tr>
    <tr>
      <td class="label-col">Passport Number</td>
      <td class="val-col" style="font-family: monospace; font-weight: 700;">${data.passportNumber || 'N/A'}</td>
      <td class="label-col">Payment Method</td>
      <td class="val-col" style="font-weight: 600;">${data.paymentType}</td>
    </tr>
    ${
      data.paymentType === 'Cheque'
        ? `<tr>
            <td class="label-col">Cheque Number</td>
            <td class="val-col" style="font-family: monospace;">${data.chequeNumber || '-'}</td>
            <td class="label-col">Bank Name</td>
            <td class="val-col">${data.bankName || '-'}</td>
          </tr>`
        : data.paymentType === 'Bank Transfer'
        ? `<tr>
            <td class="label-col">Reference No</td>
            <td class="val-col" style="font-family: monospace;">${data.referenceNumber || '-'}</td>
            <td class="label-col">Bank / Mode</td>
            <td class="val-col">${data.bankName || 'Online Transfer'}</td>
          </tr>`
        : ''
    }
  </table>

  <!-- Amount Display Box -->
  <div class="amount-box">
    <div style="font-size: 11.5px; font-weight: 700; color: #065f46; text-transform: uppercase; tracking: 1px;">
      Amount Received
    </div>
    <div class="amount-num">
      ₹${data.amountRupees.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
    </div>
  </div>

  <!-- Amount in Words Box -->
  <div class="amount-words-box">
    <strong>Amount in Words:</strong> ${data.amountInWords}
  </div>

  <!-- Conditions of Travel (7 Terms Section) -->
  <div class="terms-box">
    <div class="terms-title">Conditions of Travel & Booking Terms:</div>
    <ol class="terms-list">
      ${termsListHtml}
    </ol>
  </div>

  <!-- Signatures Footer -->
  <table class="signatures">
    <tr>
      <td class="sig-col">
        <div class="sig-line"></div>
        Pilgrim / Payee Signature
      </td>
      <td class="sig-col">
        <div class="sig-line"></div>
        Authorized Signatory (${data.agencyName})
      </td>
    </tr>
  </table>
</div>

</body>
</html>`;
}

/**
 * Generates and fetches data for a Payment Receipt by Payment ID
 */
export function generateReceiptForPayment(paymentId: number): {
  html: string;
  receiptData: ReceiptData;
  pdfDoc: jsPDF;
} {
  const db = getRawDb();
  const payment = db.prepare(`SELECT * FROM payment WHERE payment_id = ?`).get(paymentId) as any;
  if (!payment) throw new Error(`Payment #${paymentId} not found`);

  const reg = db.prepare(`SELECT * FROM registration WHERE registration_id = ?`).get(payment.registration_id) as any;
  const cust = db.prepare(`SELECT * FROM customer WHERE customer_id = ?`).get(reg.customer_id) as any;

  // Passport Number lookup: customer_identity or document vault
  let passportNumber = 'N/A';
  const identity = db
    .prepare(`SELECT * FROM customer_identity WHERE customer_id = ? ORDER BY identity_id DESC`)
    .get(reg.customer_id) as any;

  if (identity?.passport_number) {
    passportNumber = identity.passport_number;
  } else if (identity?.identity_number) {
    passportNumber = identity.identity_number;
  }

  if (passportNumber === 'N/A') {
    try {
      const docPass = db.prepare(`
        SELECT d.document_number 
        FROM document d 
        JOIN document_type dt ON d.document_type_id = dt.document_type_id 
        WHERE (d.identity_id IN (SELECT identity_id FROM customer_identity WHERE customer_id = ?) 
               OR d.registration_id = ?) 
          AND dt.code = 'PASSPORT' AND d.status = 'ACTIVE'
      `).get(reg.customer_id, reg.registration_id) as any;
      if (docPass?.document_number) {
        passportNumber = docPass.document_number;
      }
    } catch {}
  }

  const pkg = db.prepare(`SELECT * FROM package WHERE package_id = ?`).get(reg.package_id) as any;
  const season = db.prepare(`SELECT * FROM season WHERE season_id = ?`).get(reg.season_id) as any;

  // Generate Receipt Number via DocumentSequence engine
  const docSeq = getNextDocumentNumber('Receipt');
  const amountRupees = paiseToRupees(payment.amount_paise || Math.round(payment.amount * 100));
  const amountWords = convertRupeesToWords(amountRupees);
  const letterhead = getAgencyLetterhead();

  const receiptData: ReceiptData = {
    receiptNumber: docSeq.fullNumber,
    receiptDate: payment.payment_date,
    agencyName: letterhead.agencyName,
    agencyAddress: letterhead.agencyAddress,
    agencyPhone: letterhead.agencyPhone,
    agencyGstin: letterhead.agencyGstin,
    registrationNumber: reg.registration_number,
    pilgrimName: cust?.full_name || 'Pilgrim',
    fatherName: cust?.father_name || '',
    passportNumber,
    packageName: pkg?.name || 'Package',
    seasonLabel: season?.label || '',
    paymentType: payment.payment_type,
    chequeNumber: payment.cheque_number || undefined,
    bankName: payment.bank_name || undefined,
    referenceNumber: payment.reference_number || undefined,
    amountRupees,
    amountInWords: amountWords,
    termsAndConditions: letterhead.termsAndConditions,
  };

  const html = renderReceiptHtml(receiptData);
  const pdfDoc = createReceiptPdfDocument(receiptData);

  // Automatically record AuditLog entry on receipt generation
  recordAudit({
    entityType: 'Payment',
    entityId: paymentId,
    action: 'Printed',
    notes: `Generated and Printed Receipt #${docSeq.fullNumber} (PDF) for ₹${amountRupees} against Registration ${reg.registration_number}`,
  });

  return { html, receiptData, pdfDoc };
}

/**
 * Triggers Browser Print Dialog for HTML Document
 */
export function printDocumentHtml(htmlContent: string): void {
  if (typeof window === 'undefined') return;

  const printFrame = document.createElement('iframe');
  printFrame.style.position = 'fixed';
  printFrame.style.right = '0';
  printFrame.style.bottom = '0';
  printFrame.style.width = '0';
  printFrame.style.height = '0';
  printFrame.style.border = '0';

  document.body.appendChild(printFrame);

  const frameDoc = printFrame.contentWindow?.document;
  if (frameDoc) {
    frameDoc.open();
    frameDoc.write(htmlContent);
    frameDoc.close();

    setTimeout(() => {
      printFrame.contentWindow?.focus();
      printFrame.contentWindow?.print();
      setTimeout(() => {
        document.body.removeChild(printFrame);
      }, 1000);
    }, 250);
  }
}

/**
 * Saves genuine binary PDF file to disk under Documents/{registration_number}/Receipts/{receiptNumber}.pdf
 */
export async function saveReceiptToDisk(
  registrationNumber: string,
  receiptNumber: string,
  htmlContent: string,
  pdfDoc?: jsPDF
): Promise<{ filePath: string; filename: string }> {
  const dataDir = getDataDirectory();
  const pdfFilename = `${receiptNumber}.pdf`;

  // Always write genuine PDF using Node FS if available
  try {
    const fsMod = await import('fs');
    const pathMod = await import('path');

    if (fsMod && fsMod.mkdirSync && pathMod && pathMod.join) {
      const receiptsDir = pathMod.join(dataDir, 'Documents', registrationNumber, 'Receipts');
      if (!fsMod.existsSync(receiptsDir)) {
        fsMod.mkdirSync(receiptsDir, { recursive: true });
      }

      const pdfPath = pathMod.join(receiptsDir, pdfFilename);

      if (pdfDoc) {
        const pdfArrayBuffer = pdfDoc.output('arraybuffer');
        const pdfBuffer = Buffer.from(pdfArrayBuffer);
        fsMod.writeFileSync(pdfPath, pdfBuffer);
      }

      // Remove any legacy .html file to eliminate stale/confusing files
      const legacyHtmlPath = pathMod.join(receiptsDir, `${receiptNumber}.html`);
      if (fsMod.existsSync(legacyHtmlPath)) {
        try { fsMod.unlinkSync(legacyHtmlPath); } catch {}
      }

      return { filePath: pdfPath, filename: pdfFilename };
    }
  } catch (err) {
    console.warn('Node FS save notice:', err);
  }

  // Browser fallback for web UI
  if (pdfDoc && typeof window !== 'undefined' && window.document) {
    pdfDoc.save(pdfFilename);
  }

  return { filePath: pdfFilename, filename: pdfFilename };
}

/**
 * Generates printable HTML for Booking Form (Combined or Individual)
 */
export function generateBookingFormDocument(
  registrationId: number,
  mode: 'combined' | 'individual' = 'combined',
  paxIndex: number = 0
): string {
  const db = getRawDb();
  const regRes = db.prepare(`SELECT registration_id FROM registration WHERE registration_id = ?`).get(registrationId);
  if (!regRes) throw new Error(`Registration #${registrationId} not found`);

  const reg = getRegistrationWithDetails(registrationId);
  if (!reg) throw new Error(`Registration #${registrationId} details not found`);

  const letterhead = getAgencyLetterhead();
  const isCombined = mode === 'combined';
  const targetPaxList = isCombined ? reg.paxList : [reg.paxList[paxIndex] || reg.paxList[0]];

  const paxRowsHtml = targetPaxList
    .map(
      (pax: any, i: number) => `
    <tr style="border-bottom: 1px solid #e2e8f0; font-size: 11px;">
      <td style="padding: 8px; text-align: center; font-weight: bold; font-family: monospace;">#${isCombined ? i + 1 : paxIndex + 1}</td>
      <td style="padding: 8px; font-weight: bold;">${pax.fullName || pax.full_name || 'Pilgrim'}</td>
      <td style="padding: 8px; color: #475569;">${pax.fatherName || pax.father_name || '-'}</td>
      <td style="padding: 8px; font-family: monospace; font-weight: bold; color: #047857;">${pax.passportNumber || pax.passport_number || 'N/A'}</td>
      <td style="padding: 8px;">${pax.dob || pax.date_of_birth || '-'} (${pax.gender || 'Male'})</td>
      <td style="padding: 8px;">${pax.relationship || 'Primary'}</td>
      <td style="padding: 8px;">${pax.room_preference || reg.room_preference || 'Standard'}</td>
    </tr>
  `
    )
    .join('');

  return `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="utf-8" />
      <title>Booking Form — ${reg.registration_number}</title>
      <style>
        @page { size: A4; margin: 15mm; }
        body { font-family: 'Helvetica Neue', Helvetica, Arial, sans-serif; color: #0f172a; margin: 0; padding: 20px; font-size: 12px; }
        .header-bar { height: 8px; background-color: #047857; margin-bottom: 15px; }
        .title { font-size: 20px; font-weight: bold; color: #047857; margin-bottom: 4px; }
        .subtitle { font-size: 10px; color: #475569; margin-bottom: 20px; }
        .meta-box { background: #f8fafc; border: 1px solid #cbd5e1; border-radius: 8px; padding: 12px; margin-bottom: 20px; }
        .meta-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 8px; font-size: 11px; }
        .meta-label { color: #64748b; font-weight: bold; }
        .meta-value { color: #0f172a; font-weight: 600; }
        table { width: 100%; border-collapse: collapse; margin-bottom: 25px; }
        th { background: #f1f5f9; color: #334155; padding: 8px; font-size: 10px; text-transform: uppercase; font-weight: bold; border-bottom: 2px solid #cbd5e1; text-align: left; }
        .terms-box { background: #f8fafc; border: 1px solid #e2e8f0; border-radius: 8px; padding: 12px; font-size: 10px; color: #475569; margin-bottom: 30px; }
        .terms-title { font-weight: bold; color: #0f172a; margin-bottom: 6px; }
        .sig-section { display: flex; justify-content: space-between; margin-top: 50px; }
        .sig-line { width: 200px; border-top: 1px solid #94a3b8; text-align: center; padding-top: 4px; font-size: 10px; color: #64748b; }
      </style>
    </head>
    <body>
      <div class="header-bar"></div>
      <div style="display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 15px;">
        <div>
          <div class="title">${letterhead.agencyName}</div>
          <div class="subtitle">${letterhead.agencyAddress} | Tel: ${letterhead.agencyPhone}</div>
        </div>
        <div style="text-align: right;">
          <div style="font-size: 16px; font-weight: bold; color: #d97706; font-family: monospace;">${reg.registration_number}</div>
          <div style="font-size: 10px; color: #64748b; margin-top: 2px;">MODE: ${isCombined ? 'COMBINED ALL PILGRIMS' : `INDIVIDUAL PILGRIM (#${paxIndex + 1})`}</div>
        </div>
      </div>

      <div class="meta-box">
        <div class="meta-grid">
          <div><span class="meta-label">Season:</span> <span class="meta-value">${reg.seasonLabel}</span></div>
          <div><span class="meta-label">Package:</span> <span class="meta-value">${reg.packageName}</span></div>
          <div><span class="meta-label">Tour Name / Code:</span> <span class="meta-value">${reg.tour_name || 'Standard Tour'}</span></div>
          <div><span class="meta-label">Representative:</span> <span class="meta-value">${reg.representative || 'Direct Booking'}</span></div>
          <div><span class="meta-label">Airline / Sector:</span> <span class="meta-value">${reg.airline || 'Saudia'} (${reg.sector || 'Mumbai - Jeddah'})</span></div>
          <div><span class="meta-label">PNR / Flight:</span> <span class="meta-value" style="font-family: monospace; color: #d97706;">${reg.pnr || 'PNR Pending'} / ${reg.flight_number || '-'}</span></div>
          <div style="grid-column: span 2;"><span class="meta-label">Primary Pilgrim Address:</span> <span class="meta-value">${reg.paxList[0]?.addressLine1 || 'As Recorded'}</span></div>
        </div>
      </div>

      <h3 style="font-size: 13px; font-weight: bold; color: #0f172a; margin-bottom: 8px;">PILGRIM REGISTRATION DETAILS (${targetPaxList.length} PAX)</h3>
      <table>
        <thead>
          <tr>
            <th style="text-align: center;">No</th>
            <th>Pilgrim Full Name</th>
            <th>Father / Husband Name</th>
            <th>Passport Number</th>
            <th>DOB & Gender</th>
            <th>Relationship</th>
            <th>Room Preference</th>
          </tr>
        </thead>
        <tbody>
          ${paxRowsHtml}
        </tbody>
      </table>

      <div class="terms-box">
        <div class="terms-title">TERMS & CONDITIONS:</div>
        <ol style="margin: 0; padding-left: 16px;">
          ${letterhead.termsAndConditions.map((t) => `<li>${t}</li>`).join('')}
        </ol>
      </div>

      <div class="sig-section">
        <div class="sig-line">Pilgrim / Customer Signature</div>
        <div class="sig-line">Authorized Agency Representative</div>
      </div>
    </body>
    </html>
  `;
}

/**
 * Generates printable HTML for Tax Invoice (Combined or Individual)
 */
export function generateInvoiceDocument(
  registrationId: number,
  mode: 'combined' | 'individual' = 'combined',
  paxIndex: number = 0
): string {
  const db = getRawDb();
  const reg = getRegistrationWithDetails(registrationId);
  if (!reg) throw new Error(`Registration #${registrationId} details not found`);

  const summary = getRegistrationFinancialSummary(registrationId);
  const letterhead = getAgencyLetterhead();
  const isCombined = mode === 'combined';
  const targetPax = isCombined ? reg.paxList[0] : (reg.paxList[paxIndex] || reg.paxList[0]);

  const invoiceNumber = `INV-${reg.registration_number.replace('DH-', '')}`;
  const totalAmount = isCombined ? reg.netTotal : Math.round(reg.netTotal / Math.max(1, reg.paxCount));
  const paidAmount = isCombined ? reg.totalPaid : Math.round(reg.totalPaid / Math.max(1, reg.paxCount));
  const balanceAmount = totalAmount - paidAmount;

  return `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="utf-8" />
      <title>Tax Invoice — ${invoiceNumber}</title>
      <style>
        @page { size: A4; margin: 15mm; }
        body { font-family: 'Helvetica Neue', Helvetica, Arial, sans-serif; color: #0f172a; margin: 0; padding: 20px; font-size: 12px; }
        .header-bar { height: 8px; background-color: #d97706; margin-bottom: 15px; }
        .title { font-size: 20px; font-weight: bold; color: #0f172a; margin-bottom: 4px; }
        .subtitle { font-size: 10px; color: #475569; margin-bottom: 20px; }
        .invoice-box { border: 1px solid #cbd5e1; border-radius: 8px; padding: 15px; margin-bottom: 20px; background: #f8fafc; }
        table { width: 100%; border-collapse: collapse; margin-bottom: 20px; }
        th { background: #f1f5f9; color: #334155; padding: 8px; font-size: 10px; text-transform: uppercase; font-weight: bold; border-bottom: 2px solid #cbd5e1; text-align: left; }
        td { padding: 8px; border-bottom: 1px solid #e2e8f0; font-size: 11px; }
        .total-box { margin-left: auto; width: 250px; background: #ecfdf5; border: 1px solid #059669; border-radius: 8px; padding: 12px; margin-bottom: 30px; }
        .total-row { display: flex; justify-content: space-between; font-size: 12px; margin-bottom: 4px; }
      </style>
    </head>
    <body>
      <div class="header-bar"></div>
      <div style="display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 15px;">
        <div>
          <div class="title">${letterhead.agencyName}</div>
          <div class="subtitle">${letterhead.agencyAddress} | GSTIN: ${letterhead.agencyGstin}</div>
        </div>
        <div style="text-align: right;">
          <div style="font-size: 18px; font-weight: bold; color: #d97706; font-family: monospace;">${invoiceNumber}</div>
          <div style="font-size: 10px; color: #64748b; margin-top: 2px;">DATE: ${new Date().toISOString().split('T')[0]}</div>
          <div style="font-size: 10px; color: #047857; font-weight: bold; margin-top: 2px;">MODE: ${isCombined ? 'COMBINED FULL INVOICE' : `INDIVIDUAL INVOICE (${targetPax?.fullName || 'Pilgrim'})`}</div>
        </div>
      </div>

      <div class="invoice-box">
        <div style="font-size: 11px; color: #475569; margin-bottom: 4px;"><strong>Billed To:</strong> ${targetPax?.fullName || reg.customerName}</div>
        <div style="font-size: 11px; color: #475569; margin-bottom: 4px;"><strong>Registration No:</strong> ${reg.registration_number}</div>
        <div style="font-size: 11px; color: #475569;"><strong>Package / Season:</strong> ${reg.packageName} (${reg.seasonLabel})</div>
      </div>

      <table>
        <thead>
          <tr>
            <th>Description</th>
            <th style="text-align: center;">Qty</th>
            <th style="text-align: right;">Rate (INR)</th>
            <th style="text-align: right;">Amount (INR)</th>
          </tr>
        </thead>
        <tbody>
          ${summary.charges
            .map(
              (c: any) => `
            <tr>
              <td>${c.charge_type} Charge (${reg.packageName})</td>
              <td style="text-align: center;">${isCombined ? c.quantity : 1}</td>
              <td style="text-align: right;">₹${c.rate_inr.toLocaleString('en-IN')}</td>
              <td style="text-align: right; font-weight: bold;">₹${(isCombined ? c.amount_inr : c.rate_inr).toLocaleString('en-IN')}</td>
            </tr>
          `
            )
            .join('')}
        </tbody>
      </table>

      <div class="total-box">
        <div class="total-row"><span>Total Charges:</span> <strong>₹${totalAmount.toLocaleString('en-IN')}</strong></div>
        <div class="total-row" style="color: #047857;"><span>Amount Paid:</span> <strong>₹${paidAmount.toLocaleString('en-IN')}</strong></div>
        <div class="total-row" style="color: #d97706; font-size: 14px; font-weight: bold; border-top: 1px solid #059669; padding-top: 4px; margin-top: 4px;">
          <span>Balance Due:</span> <span>₹${balanceAmount.toLocaleString('en-IN')}</span>
        </div>
      </div>

      <div style="display: flex; justify-content: space-between; margin-top: 40px;">
        <div style="width: 200px; border-top: 1px solid #94a3b8; text-align: center; padding-top: 4px; font-size: 10px; color: #64748b;">Customer Signature</div>
        <div style="width: 200px; border-top: 1px solid #94a3b8; text-align: center; padding-top: 4px; font-size: 10px; color: #64748b;">For ${letterhead.agencyName}</div>
      </div>
    </body>
    </html>
  `;
}
