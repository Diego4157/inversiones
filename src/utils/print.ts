export const printHtml = (htmlContent: string) => {
  const printWindow = window.open('', '_blank');
  if (printWindow) {
    printWindow.document.write(`
      <html>
        <head>
          <title>Imprimir</title>
          <style>
            body { 
              font-family: 'Courier New', Courier, monospace; 
              padding: 10px; 
              color: #000; 
              background: #fff;
              font-size: 14px;
              line-height: 1.4;
            }
            .ticket { 
              max-width: 280px; 
              margin: 0 auto; 
            }
            .text-center { text-align: center; }
            .text-right { text-align: right; }
            .font-bold { font-weight: bold; }
            .divider { border-top: 1px dashed #000; margin: 8px 0; }
            .flex-between { display: flex; justify-content: space-between; }
            .my-2 { margin: 8px 0; }
            .my-4 { margin: 16px 0; }
            .signature { border-top: 1px solid #000; margin-top: 40px; text-align: center; font-size: 12px; }
          </style>
        </head>
        <body>
          <div class="ticket">
            ${htmlContent}
          </div>
          <script>
            window.onload = function() {
              window.print();
              setTimeout(function() { window.close(); }, 500);
            };
          </script>
        </body>
      </html>
    `);
    printWindow.document.close();
  }
};

export const printThermalReceipt = (receipt: any) => {
  const totalAmount = Number(receipt.loan?.totalAmount || 0);
  const balance = Number(receipt.loan?.balance || 0);
  const expectedAmount = Number(receipt.expectedAmount || 0);
  const clientName = receipt.loan?.client?.fullName || 'Cliente';
  const documentId = receipt.loan?.client?.documentId || '';
  const phone = receipt.loan?.client?.phone || '';
  
  // Último pago
  const latestPayment = receipt.loan?.payments?.[0];
  const ultimoValorPagado = latestPayment ? Number(latestPayment.amount) : expectedAmount;
  const saldoAnterior = latestPayment ? Number(latestPayment.previousBalance) : (balance + expectedAmount);
  const saldoActual = latestPayment ? Number(latestPayment.newBalance) : balance;
  const fechaPago = latestPayment 
    ? new Date(latestPayment.paymentDate || latestPayment.createdAt).toLocaleDateString()
    : new Date(receipt.date || new Date()).toLocaleDateString();
  const dominicales = receipt.loan?.scheduledReceipts?.filter((r: any) => r.status === 'DOMINICAL')?.length || 0;
  const atrasos = receipt.loan?.atrasosAcumulados || 0;
  const installmentsPaid = receipt.loan?.installmentsPaid || 0;
  const installmentsTotal = receipt.loan?.installmentsTotal || 20;
  const cuotasRestantes = Math.max(0, installmentsTotal - installmentsPaid);
  const paymentMethod = latestPayment?.paymentMethod || 'EFECTIVO';

  const html = `
    <h3 class="text-center font-bold" style="font-size: 16px; margin: 0;">INVERSIONES JD</h3>
    <p class="text-center" style="font-size: 12px; margin: 2px 0 6px 0;">322 508 67 31</p>
    <div class="divider"></div>

    <div class="flex-between"><span>Recibo N°:</span> <b>#${receipt.id}</b></div>
    <div class="flex-between"><span>Fecha:</span> <b>${fechaPago}</b></div>
    <div class="flex-between"><span>Cliente:</span> <b>${clientName}</b></div>
    ${documentId ? `<div class="flex-between"><span>Cédula:</span> <span>${documentId}</span></div>` : ''}
    ${phone ? `<div class="flex-between"><span>Teléfono:</span> <span>${phone}</span></div>` : ''}
    <div class="divider"></div>

    ${totalAmount > 0 ? `<div class="flex-between"><span>Total Crédito:</span> <b>$${totalAmount.toLocaleString()}</b></div>` : ''}
    <div class="flex-between"><span>Cuota Pactada:</span> <span>$${expectedAmount.toLocaleString()}</span></div>
    <div class="flex-between"><span>Progreso:</span> <b>Cuota ${installmentsPaid} de ${installmentsTotal}</b></div>
    <div class="flex-between"><span>Cuotas Faltantes:</span> <span>${cuotasRestantes}</span></div>
    <div class="divider"></div>

    <div class="flex-between"><span>Saldo Anterior:</span> <span>$${saldoAnterior.toLocaleString()}</span></div>
    <div class="flex-between font-bold" style="font-size: 15px; margin: 4px 0;">
      <span>ABONO RECIBIDO:</span>
      <span>$${ultimoValorPagado.toLocaleString()}</span>
    </div>
    <div class="flex-between font-bold" style="font-size: 13px;">
      <span>NUEVO SALDO:</span>
      <span>$${saldoActual.toLocaleString()}</span>
    </div>
    <div class="flex-between" style="font-size: 12px; margin-top: 2px;">
      <span>Método de Pago:</span>
      <span>${paymentMethod}</span>
    </div>
    <div class="divider"></div>

    <div class="flex-between"><span>Dominicales:</span> <b>${dominicales}</b></div>
    <div class="flex-between"><span>Atrasos Acumulados:</span> <b style="color: ${atrasos > 0 ? 'red' : 'green'};">${atrasos}</b></div>
    
    <div class="divider"></div>
    <p style="font-size: 11px; text-align: center; margin: 6px 0; font-weight: bold;">
      ¡Muchas gracias por su puntualidad!
    </p>
    <div class="signature">
      Firma del Cliente / Cobrador
    </div>
  `;

  printHtml(html);
};
