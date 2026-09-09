import jsPDF from 'jspdf';
import type { ReceiptData } from './logic';

/**
 * Renderiza el diseño de un recibo en coordenadas específicas de la página.
 */
function drawReceiptCard(
  doc: jsPDF, 
  receipt: ReceiptData, 
  startX: number, 
  startY: number, 
  width: number, 
  height: number,
  copyLabel: string = 'ORIGINAL - CLIENTE'
) {
  // Marco del Recibo
  doc.setDrawColor(180, 180, 180);
  doc.setLineWidth(0.3);
  doc.rect(startX + 4, startY + 4, width - 8, height - 8);

  const innerX = startX + 8;
  const contentWidth = width - 16;
  const rightX = startX + width - 8;

  // Encabezado Empresa
  doc.setFontSize(13);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(20, 30, 50);
  doc.text('INVERSIONES JD', innerX, startY + 12);

  // Etiqueta de Copia / Tipo de recibo
  doc.setFontSize(8);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(100, 100, 100);
  doc.text(`[ ${copyLabel} ]`, rightX, startY + 12, { align: 'right' });

  // Fecha y Recibo N°
  doc.setFontSize(9);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(60, 60, 60);
  doc.text(`Fecha: ${receipt.date}`, innerX, startY + 18);
  if (receipt.receiptNumber) {
    doc.text(`N°: ${receipt.receiptNumber}`, rightX, startY + 18, { align: 'right' });
  }

  // Datos del Cliente
  doc.setFontSize(10);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(30, 30, 30);
  doc.text(`Cliente: ${receipt.clientName}`, innerX, startY + 24);

  if (receipt.documentId) {
    doc.setFontSize(8);
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(90, 90, 90);
    doc.text(`Doc: ${receipt.documentId}`, rightX, startY + 24, { align: 'right' });
  }

  // Línea divisoria
  doc.setDrawColor(210, 210, 210);
  doc.line(innerX, startY + 27, rightX, startY + 27);

  // Detalle Financiero
  let currentY = startY + 33;
  
  // 1. Saldo Anterior
  doc.setFontSize(9);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(70, 70, 70);
  doc.text('Saldo Anterior:', innerX, currentY);
  doc.setFont('helvetica', 'bold');
  doc.text(`$${Number(receipt.previousBalance).toLocaleString()}`, rightX, currentY, { align: 'right' });

  // 2. ABONO (Destacado)
  currentY += 8;
  doc.setFillColor(240, 253, 244); // Fondo verde suave
  doc.rect(innerX - 2, currentY - 5, contentWidth + 4, 7, 'F');
  
  doc.setFontSize(11);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(16, 120, 50); // Verde esmeralda
  doc.text('ABONO:', innerX, currentY);
  doc.text(`$${Number(receipt.paymentAmount).toLocaleString()}`, rightX, currentY, { align: 'right' });

  // 3. Nuevo Saldo
  currentY += 7;
  doc.setFontSize(9);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(70, 70, 70);
  doc.text('Nuevo Saldo:', innerX, currentY);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(20, 30, 50);
  doc.text(`$${Number(receipt.newBalance).toLocaleString()}`, rightX, currentY, { align: 'right' });

  // 4. Cuotas Restantes y Atrasos
  currentY += 6;
  doc.setFontSize(8);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(80, 80, 80);
  doc.text(`Cuotas Restantes: ${receipt.remainingInstallments}`, innerX, currentY);

  if (receipt.arrears > 0) {
    doc.setTextColor(200, 30, 30); // Rojo si hay atraso
    doc.setFont('helvetica', 'bold');
    doc.text(`Atrasos: ${receipt.arrears}`, rightX, currentY, { align: 'right' });
  } else {
    doc.setTextColor(30, 150, 60);
    doc.text('Al día', rightX, currentY, { align: 'right' });
  }

  // Método de pago si existe
  if (receipt.paymentMethod) {
    currentY += 5;
    doc.setFontSize(8);
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(90, 90, 90);
    doc.text(`Método: ${receipt.paymentMethod}`, innerX, currentY);
  }

  // Línea divisoria previa a firmas
  doc.setDrawColor(230, 230, 230);
  doc.line(innerX, height - 16 + startY, rightX, height - 16 + startY);

  // Firmas
  const sigY = height - 10 + startY;
  doc.setFontSize(7);
  doc.setTextColor(120, 120, 120);
  doc.text('Firma Cliente', innerX + 8, sigY);
  doc.text('Firma Cobrador', rightX - 25, sigY);

  // Mensaje de pie
  doc.setFontSize(6.5);
  doc.setTextColor(140, 140, 140);
  doc.text('Gracias por su puntualidad - Inversiones JD', startX + width / 2, height - 5 + startY, { align: 'center' });
}

/**
 * Genera un PDF tamaño carta con DOS COLUMNAS (Recibo Original y Copia)
 * para un comprobante de pago individual.
 */
export function generateSingleDualReceiptPDF(receipt: ReceiptData) {
  const doc = new jsPDF('p', 'mm', 'letter');
  const pageWidth = 215.9; // Letter width en mm

  const halfWidth = pageWidth / 2;
  const receiptHeight = 90; // Alto adecuado para que quepa cómodamente en 1/3 de página o carta

  // Columna Izquierda: Original para el Cliente
  drawReceiptCard(doc, receipt, 0, 10, halfWidth, receiptHeight, 'ORIGINAL - CLIENTE');

  // Columna Derecha: Copia para Cobrador / Archivo
  drawReceiptCard(doc, receipt, halfWidth, 10, halfWidth, receiptHeight, 'COPIA - ADMINISTRACIÓN');

  // Línea de corte punteada en el medio
  doc.setDrawColor(190, 190, 190);
  doc.setLineDashPattern([2, 2], 0);
  doc.line(halfWidth, 5, halfWidth, receiptHeight + 15);
  doc.setLineDashPattern([], 0); // Reset

  const fileName = `Recibo_${receipt.clientName.replace(/\s+/g, '_')}_${receipt.date}.pdf`;
  doc.save(fileName);
}

/**
 * Genera un PDF con múltiples recibos en DOS COLUMNAS por página (carta vertical).
 * 2 columnas x 3 filas = 6 recibos por hoja o 2 columnas consecutivas.
 */
export function generateReceiptsPDF(receipts: ReceiptData[]) {
  const doc = new jsPDF('p', 'mm', 'letter');
  const pageWidth = 215.9;
  const pageHeight = 279.4;
  
  const cols = 2;
  const rows = 3;
  const perPage = cols * rows; // 6 recibos por hoja con excelente legibilidad
  
  const cellWidth = pageWidth / cols;
  const cellHeight = (pageHeight - 10) / rows;

  receipts.forEach((receipt, index) => {
    const posInPage = index % perPage;
    const col = posInPage % cols;
    const row = Math.floor(posInPage / cols);

    if (posInPage === 0 && index !== 0) {
      doc.addPage();
    }

    const startX = col * cellWidth;
    const startY = 5 + (row * cellHeight);

    drawReceiptCard(
      doc, 
      receipt, 
      startX, 
      startY, 
      cellWidth, 
      cellHeight, 
      `RECIBO #${index + 1}`
    );
  });

  doc.save('Ruta_Recibos_JD.pdf');
}

export interface ArqueoReportData {
  date: string;
  closedAt?: string;
  closedBy?: { name?: string; email?: string; role?: string };
  totalCollected: number;
  totalCash: number;
  totalDigital: number;
  operationalExpenses: number;
  expensesDescription?: string;
  netToDeliver: number;
  paymentsCount: number;
  notes?: string;
}

export function generateArqueoPDF(data: ArqueoReportData) {
  const doc = new jsPDF({
    orientation: 'portrait',
    unit: 'mm',
    format: [80, 160]
  });

  doc.setFontSize(13);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(20, 30, 50);
  doc.text('INVERSIONES JD', 40, 12, { align: 'center' });

  doc.setFontSize(8);
  doc.setFont('helvetica', 'bold');
  doc.text('COMPROBANTE DE ARQUEO Y CIERRE', 40, 17, { align: 'center' });

  doc.setFontSize(7.5);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(60, 60, 60);
  doc.text(`Fecha de Ruta: ${data.date}`, 8, 24);
  doc.text(`Cierre: ${data.closedAt ? new Date(data.closedAt).toLocaleString() : new Date().toLocaleString()}`, 8, 28);
  doc.text(`Responsable: ${data.closedBy?.name || 'Administrador'}`, 8, 32);
  doc.text(`Total Pagos: ${data.paymentsCount}`, 8, 36);

  doc.setDrawColor(200, 200, 200);
  doc.line(8, 39, 72, 39);

  doc.setFontSize(8);
  doc.setFont('helvetica', 'bold');
  doc.text('DESGLOSE DE CAJA:', 8, 44);
  
  doc.setFontSize(7.5);
  doc.setFont('helvetica', 'normal');
  doc.text('Efectivo en Mano:', 8, 50);
  doc.text(`$${Math.round(data.totalCash).toLocaleString()}`, 72, 50, { align: 'right' });

  doc.text('Nequi / Daviplata:', 8, 55);
  doc.text(`$${Math.round(data.totalDigital).toLocaleString()}`, 72, 55, { align: 'right' });

  doc.setFont('helvetica', 'bold');
  doc.text('Total Recaudado:', 8, 61);
  doc.text(`$${Math.round(data.totalCollected).toLocaleString()}`, 72, 61, { align: 'right' });

  doc.line(8, 64, 72, 64);

  doc.setFont('helvetica', 'normal');
  doc.text('(-) Gastos Operativos:', 8, 70);
  doc.text(`-$${Math.round(data.operationalExpenses).toLocaleString()}`, 72, 70, { align: 'right' });
  if (data.expensesDescription) {
    doc.setFontSize(6.5);
    doc.setTextColor(110, 110, 110);
    doc.text(`Detalle: ${data.expensesDescription}`, 8, 74, { maxWidth: 64 });
    doc.setTextColor(60, 60, 60);
  }

  doc.line(8, 80, 72, 80);

  doc.setFontSize(9);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(16, 120, 70);
  doc.text('SALDO NETO A ENTREGAR:', 8, 87);
  doc.text(`$${Math.round(data.netToDeliver).toLocaleString()}`, 72, 87, { align: 'right' });

  doc.setTextColor(70, 70, 70);
  doc.setFontSize(7);
  doc.setFont('helvetica', 'normal');
  if (data.notes) {
    doc.text(`Notas: ${data.notes}`, 8, 95, { maxWidth: 64 });
  }

  doc.setDrawColor(180, 180, 180);
  doc.line(8, 120, 36, 120);
  doc.text('Entrega (Cobrador)', 10, 124);

  doc.line(44, 120, 72, 120);
  doc.text('Recibe (Supervisor)', 46, 124);

  doc.setFontSize(6.5);
  doc.setTextColor(130, 130, 130);
  doc.text('JD Inversiones - Control de Operaciones', 40, 142, { align: 'center' });

  doc.save(`Arqueo_Caja_${data.date}.pdf`);
}
