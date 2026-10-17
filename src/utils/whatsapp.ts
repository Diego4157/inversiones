/**
 * Utilidades para Compartir y Enviar Comprobantes de Pago por WhatsApp
 * Formato oficial INVERSIONES JD
 */

export interface WhatsAppReceiptPayload {
  clientName: string;
  phone?: string;
  documentId?: string;
  totalCredit?: number;       // Valor total financiado / a pagar
  cuotaAmount?: number;       // Cuota pactada individual
  paidInstallments: number;   // Cuotas pagadas acumuladas (ej. 5)
  totalInstallments: number;  // Cuotas totales pactadas (ej. 20)
  previousBalance: number;    // Saldo antes del abono
  paymentAmount: number;      // Abono recibido hoy
  newBalance: number;         // Saldo restante
  remainingInstallments: number; // Cuotas faltantes
  arrears: number;            // Atrasos
  dominicales?: number;       // Dominicales
  paymentMethod?: string;     // Efectivo / Nequi / Daviplata / Mixto
  nextPaymentDate?: string;   // Próxima fecha programada
  receiptNumber?: string | number;
  date?: string;
}

/**
 * Genera el texto formateado para el mensaje de WhatsApp
 */
export function formatWhatsAppReceipt(data: WhatsAppReceiptPayload): string {
  const dateStr = data.date || new Date().toISOString().split('T')[0];
  const creditTotal = data.totalCredit ? `$${Number(data.totalCredit).toLocaleString()}` : null;
  const cuota = data.cuotaAmount ? `$${Number(data.cuotaAmount).toLocaleString()}` : null;
  const prevBal = `$${Number(data.previousBalance).toLocaleString()}`;
  const abono = `$${Number(data.paymentAmount).toLocaleString()}`;
  const newBal = `$${Number(data.newBalance).toLocaleString()}`;
  const cuotaProgress = `${data.paidInstallments} de ${data.totalInstallments}`;

  const lines = [
    `🧾 *COMPROBANTE DE PAGO - INVERSIONES JD*`,
    `📅 *Fecha:* ${dateStr}`,
    data.receiptNumber ? `🔢 *Recibo N°:* #${data.receiptNumber}` : '',
    `━━━━━━━━━━━━━━━━━━`,
    `👤 *Cliente:* ${data.clientName}`,
    data.documentId ? `🆔 *Cédula:* ${data.documentId}` : '',
    `━━━━━━━━━━━━━━━━━━`,
    creditTotal ? `💰 *Valor del Crédito:* ${creditTotal}` : '',
    cuota ? `📌 *Cuota Pactada:* ${cuota}` : '',
    `📊 *Progreso:* Cuota ${cuotaProgress}`,
    `━━━━━━━━━━━━━━━━━━`,
    `💵 *Saldo Anterior:* ${prevBal}`,
    `🟢 *ABONO RECIBIDO:* ${abono}`,
    `💳 *Método de Pago:* ${data.paymentMethod || 'EFECTIVO'}`,
    `📉 *NUEVO SALDO:* ${newBal}`,
    `⏳ *Cuotas Restantes:* ${data.remainingInstallments}`,
    data.dominicales !== undefined && data.dominicales > 0 ? `☕ *Dominicales:* ${data.dominicales}` : '',
    data.arrears > 0 ? `⚠️ *Atrasos Acumulados:* ${data.arrears}` : `✅ *Estado:* Al día`,
    data.nextPaymentDate ? `🗓️ *Próximo Cobro:* ${data.nextPaymentDate}` : '',
    `━━━━━━━━━━━━━━━━━━`,
    `¡Muchas gracias por su puntualidad!`,
    `📞 *Contacto:* 322 508 67 31`
  ];

  return lines.filter(line => line !== '').join('\n');
}

/**
 * Abre la app de WhatsApp (web o móvil) con el mensaje precargado
 */
export function openWhatsAppShare(phone: string | undefined, message: string) {
  let cleanPhone = (phone || '').replace(/[^0-9]/g, '');
  if (cleanPhone.length === 10) {
    cleanPhone = '57' + cleanPhone; // Código de país Colombia
  }
  const encoded = encodeURIComponent(message);
  const url = cleanPhone.length >= 10
    ? `https://api.whatsapp.com/send?phone=${cleanPhone}&text=${encoded}`
    : `https://api.whatsapp.com/send?text=${encoded}`;
  window.open(url, '_blank');
}
