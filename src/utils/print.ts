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
