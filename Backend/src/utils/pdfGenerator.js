const puppeteer = require("puppeteer-core");
const qrcode = require("qrcode");
const path = require("path");
const fs = require("fs");

/**
 * Find the browser executable path on Windows
 * @returns {string}
 */
const findBrowserPath = () => {
  const paths = [
    "C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe",
    "C:\\Program Files (x86)\\Google\\Chrome\\Application\\chrome.exe",
    "C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe",
    "C:\\Program Files\\Microsoft\\Edge\\Application\\msedge.exe",
  ];

  for (const p of paths) {
    if (fs.existsSync(p)) return p;
  }
  throw new Error("No browser (Chrome or Edge) found for PDF generation.");
};

/**
 * Generate QR Code as Base64 string
 * @param {string} text 
 * @returns {Promise<string>}
 */
const generateQRCode = async (text) => {
  try {
    return await qrcode.toDataURL(text);
  } catch (err) {
    console.error("QR Code Error:", err);
    return "";
  }
};

/**
 * Generate PDF from HTML template for multiple tickets
 * @param {Object} data - Booking and Ticket data
 * @returns {Promise<Buffer>}
 */
const generateTicketsPDF = async (data) => {
  let browser;
  try {
    const browserPath = findBrowserPath();
    browser = await puppeteer.launch({
      executablePath: browserPath,
      args: ["--no-sandbox", "--disable-setuid-sandbox"],
    });

    const page = await browser.newPage();

    // Create HTML Content
    let htmlContent = `
    <html>
      <head>
        <style>
          body { font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; margin: 0; padding: 0; background: #f0f0f0; }
          .ticket-page { 
            width: 800px; margin: 20px auto; background: #fff; border: 1px solid #ddd; 
            border-radius: 8px; overflow: hidden; page-break-after: always;
            box-shadow: 0 4px 10px rgba(0,0,0,0.1);
          }
          .header { background: #1a73e8; color: white; padding: 20px; text-align: center; }
          .header h1 { margin: 0; font-size: 24px; color: white; }
          .content { padding: 30px; display: flex; flex-wrap: wrap; }
          .info-section { flex: 2; }
          .qr-section { flex: 1; text-align: center; border-left: 1px dashed #ccc; padding-left: 20px; }
          .qr-image { width: 150px; height: 150px; }
          .field { margin-bottom: 15px; }
          .label { font-size: 12px; color: #777; text-transform: uppercase; font-weight: bold; }
          .value { font-size: 16px; color: #333; font-weight: 600; }
          .footer-section { padding: 20px 30px; background: #fafafa; border-top: 1px solid #eee; }
          .time-bar { display: flex; gap: 10px; margin-top: 10px; }
          .time-item { background: #e8f0fe; color: #1967d2; padding: 5px 12px; border-radius: 20px; font-size: 12px; }
          .policies { margin-top: 15px; font-size: 11px; color: #666; }
          .dest-image { width: 100%; height: 150px; object-fit: cover; border-radius: 4px; margin-bottom: 15px; background: #eee; }
          .ticket-type { font-size: 18px; color: #d93025; font-weight: bold; margin-top: 5px; }
        </style>
      </head>
      <body>
    `;

    for (let i = 0; i < data.tickets.length; i++) {
      const ticket = data.tickets[i];
      const qrBase64 = await generateQRCode(ticket.ticketNumber);
      const isAdult = i < data.adults;
      const typeLabel = isAdult ? "ADULT" : "CHILD";
      
      // Safe image reading
      let destImageBase64 = '';
      if (data.destination.media && data.destination.media.length > 0) {
        try {
          const imagePath = path.join(process.cwd(), 'public', data.destination.media[0]);
          if (fs.existsSync(imagePath)) {
            destImageBase64 = `data:image/jpeg;base64,${fs.readFileSync(imagePath).toString('base64')}`;
          }
        } catch (e) {
          console.error("Image read error:", e.message);
        }
      }

      htmlContent += `
        <div class="ticket-page">
          <div class="header">
            <h1>TRAVEL AGENCY E-TICKET</h1>
          </div>
          <div class="content">
            <div class="info-section">
              <div style="display: flex; gap: 20px;">
                  <div style="flex: 1">
                      <div class="field"><div class="label">Booking ID</div><div class="value">${data.bookingId}</div></div>
                      <div class="field"><div class="label">Guest Name</div><div class="value">${data.fullName}</div></div>
                      <div class="field"><div class="label">Tour Name</div><div class="value">${data.destination.name}</div></div>
                  </div>
                  <div style="flex: 1">
                      <div class="field"><div class="label">Visit Date</div><div class="value">${new Date(data.visitDate).toDateString()}</div></div>
                      <div class="field"><div class="label">Location</div><div class="value">${data.destination.location.address || 'N/A'}</div></div>
                      <div class="field"><div class="label">Ticket Number</div><div class="value">${ticket.ticketNumber}</div></div>
                  </div>
              </div>
              
              <div class="field">
                  <div class="label">Destination Photo</div>
                  ${destImageBase64 ? `<img class="dest-image" src="${destImageBase64}" alt="Destination">` : `<div class="dest-image" style="display:flex;align-items:center;justify-content:center;color:#999">No Photo Available</div>`}
              </div>
            </div>
            
            <div class="qr-section">
              <div class="label">Scan Here</div>
              <img class="qr-image" src="${qrBase64}" alt="QR Code">
              <div class="ticket-type">${typeLabel}</div>
              <div style="margin-top: 10px; font-size: 14px; font-weight: bold;">#${ticket.ticketNumber}</div>
            </div>
          </div>

          <div class="footer-section">
            <div class="label">Time Summary</div>
            <div class="time-bar">
              ${data.destination.timeSummaryBar ? `<span class="time-item">${data.destination.timeSummaryBar}</span>` : ''}
            </div>

            <div class="policies">
              <div class="label">Terms & Conditions</div>
              <div style="margin-top: 5px;">${data.destination.bookingPolicies || 'N/A'}</div>
            </div>
            </div>
        </div>
      `;
    }

    htmlContent += `</body></html>`;

    await page.setContent(htmlContent, { waitUntil: "networkidle0" });
    
    const pdfBuffer = await page.pdf({
      format: "A4",
      printBackground: true,
      margin: { top: "10mm", bottom: "10mm" }
    });

    await browser.close();
    return pdfBuffer;
  } catch (error) {
    if (browser) await browser.close();
    console.error("PDF Generation Final Error:", error);
    throw error;
  }
};

module.exports = {
  generateTicketsPDF,
};
