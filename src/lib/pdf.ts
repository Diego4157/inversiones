import jsPDF from 'jspdf';
import type { ReceiptData } from './logic';

/**
 * Generates a PDF with 8 receipts per page (2 columns, 4 rows).
 */
export function generateReceiptsPDF(receipts: ReceiptData[]) {
  const doc = new jsPDF('p', 'mm', 'letter');
  const pageWidth = 215.9; // Letter width in mm
  const pageHeight = 279.4; // Letter height in mm
  
  const cols = 2;
  const rows = 4;
  
  const cellWidth = pageWidth / cols;
  const cellHeight = pageHeight / rows;

  receipts.forEach((receipt, index) => {
    const posInPage = index % 8;
    const col = posInPage % 2;
    const row = Math.floor(posInPage / 2);

    if (posInPage === 0 && index !== 0) {
      doc.addPage();
    }

    const startX = col * cellWidth;
    const startY = row * cellHeight;

    // Draw Receipt Box
    doc.setDrawColor(200);
    doc.rect(startX + 5, startY + 5, cellWidth - 10, cellHeight - 10);

    // Content
    doc.setFontSize(14);
    doc.setTextColor(40);
    doc.text('INVERSIONES JD', startX + 10, startY + 15);
    
    doc.setFontSize(10);
    doc.text(`Fecha: ${receipt.date}`, startX + 10, startY + 22);
    doc.text(`Cliente: ${receipt.clientName}`, startX + 10, startY + 28);
    
    doc.line(startX + 10, startY + 32, startX + cellWidth - 10, startY + 32);

    doc.text(`Saldo Anterior:`, startX + 10, startY + 40);
    doc.text(`$${receipt.previousBalance.toLocaleString()}`, startX + cellWidth - 40, startY + 40, { align: 'right' });

    doc.setFontSize(12);
    doc.setTextColor(0, 150, 0); // Green for payment
    doc.text(`ABONO:`, startX + 10, startY + 48);
    doc.text(`$${receipt.paymentAmount.toLocaleString()}`, startX + cellWidth - 40, startY + 48, { align: 'right' });

    doc.setFontSize(10);
    doc.setTextColor(40);
    doc.text(`Nuevo Saldo:`, startX + 10, startY + 56);
    doc.text(`$${receipt.newBalance.toLocaleString()}`, startX + cellWidth - 40, startY + 56, { align: 'right' });

    doc.text(`Cuotas Restantes: ${receipt.remainingInstallments}`, startX + 10, startY + 64);
    
    if (receipt.arrears > 0) {
      doc.setTextColor(200, 0, 0);
      doc.text(`Atrazos: ${receipt.arrears}`, startX + 10, startY + 70);
    }
    
    doc.setTextColor(100);
    doc.setFontSize(8);
    doc.text('Gracias por su puntualidad', startX + 10, startY + cellHeight - 15);
  });

  doc.save('Recibos_JD.pdf');
}
