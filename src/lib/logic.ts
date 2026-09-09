/**
 * Core Logic for Inversiones JD & Asset Management
 */

// 1. Savings Drawers Distribution Logic
export interface SavingsDistribution {
  debt: number;          // 51% - Nequi payment
  soatTecno: number;     // Fixed $2,000
  maintenance: number;   // Fixed $3,000
  contingency: number;   // Fixed $5,000
  profit: number;        // Remainder
}

/**
 * Distributes daily rental income into specific "savings drawers".
 * @param amount Total amount received (default $35,000 COP)
 */
export function distributeAssetRevenue(amount: number): SavingsDistribution {
  const debt = amount * 0.511; // Closest to $17,885 for $35k
  const soatTecno = 2000;
  const maintenance = 3000;
  const contingency = 5000;
  
  const totalAllocated = debt + soatTecno + maintenance + contingency;
  const profit = Math.max(0, amount - totalAllocated);

  return {
    debt: Math.round(debt),
    soatTecno,
    maintenance,
    contingency,
    profit: Math.round(profit)
  };
}

// 2. Receipt Layout Constants
export const RECEIPT_LAYOUT = {
  columns: 2,
  rows: 4,
  perPage: 8,
  paperSize: 'LETTER',
  orientation: 'portrait'
};

export interface ReceiptData {
  clientName: string;
  documentId?: string;
  previousBalance: number;
  paymentAmount: number;
  newBalance: number;
  remainingInstallments: number;
  arrears: number;
  date: string;
  paymentMethod?: string;
  receiptNumber?: string | number;
}

export function chunkReceiptsForPrinting(receipts: ReceiptData[]): ReceiptData[][] {
  const chunks: ReceiptData[][] = [];
  for (let i = 0; i < receipts.length; i += RECEIPT_LAYOUT.perPage) {
    chunks.push(receipts.slice(i, i + RECEIPT_LAYOUT.perPage));
  }
  return chunks;
}
