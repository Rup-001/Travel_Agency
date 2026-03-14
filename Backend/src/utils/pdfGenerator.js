// const puppeteer = require("puppeteer-core");
// const qrcode = require("qrcode");
// const path = require("path");
// const fs = require("fs");

// /**
//  * Find the browser executable path on Windows
//  * @returns {string}
//  */
// const findBrowserPath = () => {
//   const paths = [
//     "C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe",
//     "C:\\Program Files (x86)\\Google\\Chrome\\Application\\chrome.exe",
//     "C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe",
//     "C:\\Program Files\\Microsoft\\Edge\\Application\\msedge.exe",
//   ];

//   for (const p of paths) {
//     if (fs.existsSync(p)) return p;
//   }
//   throw new Error("No browser (Chrome or Edge) found for PDF generation.");
// };

// /**
//  * Generate QR Code as Base64 string
//  * @param {string} text 
//  * @returns {Promise<string>}
//  */
// const generateQRCode = async (text) => {
//   try {
//     return await qrcode.toDataURL(text);
//   } catch (err) {
//     console.error("QR Code Error:", err);
//     return "";
//   }
// };

// /**
//  * Generate PDF from HTML template for multiple tickets
//  * @param {Object} data - Booking and Ticket data
//  * @returns {Promise<Buffer>}
//  */
// const generateTicketsPDF = async (data) => {
//   let browser;
//   try {
//     const browserPath = findBrowserPath();
//     browser = await puppeteer.launch({
//       executablePath: browserPath,
//       args: ["--no-sandbox", "--disable-setuid-sandbox"],
//     });

//     const page = await browser.newPage();

//     // Create HTML Content
//     let htmlContent = `
//     <html>
//       <head>
//         <style>
//           body { font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; margin: 0; padding: 0; background: #f0f0f0; }
//           .ticket-page { 
//             width: 800px; margin: 20px auto; background: #fff; border: 1px solid #ddd; 
//             border-radius: 8px; overflow: hidden; page-break-after: always;
//             box-shadow: 0 4px 10px rgba(0,0,0,0.1);
//           }
//           .header { background: #1a73e8; color: white; padding: 20px; text-align: center; }
//           .header h1 { margin: 0; font-size: 24px; color: white; }
//           .content { padding: 30px; display: flex; flex-wrap: wrap; }
//           .info-section { flex: 2; }
//           .qr-section { flex: 1; text-align: center; border-left: 1px dashed #ccc; padding-left: 20px; }
//           .qr-image { width: 150px; height: 150px; }
//           .field { margin-bottom: 15px; }
//           .label { font-size: 12px; color: #777; text-transform: uppercase; font-weight: bold; }
//           .value { font-size: 16px; color: #333; font-weight: 600; }
//           .footer-section { padding: 20px 30px; background: #fafafa; border-top: 1px solid #eee; }
//           .time-bar { display: flex; gap: 10px; margin-top: 10px; }
//           .time-item { background: #e8f0fe; color: #1967d2; padding: 5px 12px; border-radius: 20px; font-size: 12px; }
//           .policies { margin-top: 15px; font-size: 11px; color: #666; }
//           .dest-image { width: 100%; height: 150px; object-fit: cover; border-radius: 4px; margin-bottom: 15px; background: #eee; }
//           .ticket-type { font-size: 18px; color: #d93025; font-weight: bold; margin-top: 5px; }
//         </style>
//       </head>
//       <body>
//     `;

//     for (let i = 0; i < data.tickets.length; i++) {
//       const ticket = data.tickets[i];
//       const qrBase64 = await generateQRCode(ticket.ticketNumber);
//       const isAdult = i < data.adults;
//       const typeLabel = isAdult ? "ADULT" : "CHILD";
      
//       // Safe image reading
//       let destImageBase64 = '';
//       if (data.destination.media && data.destination.media.length > 0) {
//         try {
//           const imagePath = path.join(process.cwd(), 'public', data.destination.media[0]);
//           if (fs.existsSync(imagePath)) {
//             destImageBase64 = `data:image/jpeg;base64,${fs.readFileSync(imagePath).toString('base64')}`;
//           }
//         } catch (e) {
//           console.error("Image read error:", e.message);
//         }
//       }

//       htmlContent += `
//         <div class="ticket-page">
//           <div class="header">
//             <h1>TRAVEL AGENCY E-TICKET</h1>
//           </div>
//           <div class="content">
//             <div class="info-section">
//               <div style="display: flex; gap: 20px;">
//                   <div style="flex: 1">
//                       <div class="field"><div class="label">Booking ID</div><div class="value">${data.bookingId}</div></div>
//                       <div class="field"><div class="label">Guest Name</div><div class="value">${data.fullName}</div></div>
//                       <div class="field"><div class="label">Tour Name</div><div class="value">${data.destination.name}</div></div>
//                   </div>
//                   <div style="flex: 1">
//                       <div class="field"><div class="label">Visit Date</div><div class="value">${new Date(data.visitDate).toDateString()}</div></div>
//                       <div class="field"><div class="label">Location</div><div class="value">${data.destination.location.address || 'N/A'}</div></div>
//                       <div class="field"><div class="label">Ticket Number</div><div class="value">${ticket.ticketNumber}</div></div>
//                   </div>
//               </div>
              
//               <div class="field">
//                   <div class="label">Destination Photo</div>
//                   ${destImageBase64 ? `<img class="dest-image" src="${destImageBase64}" alt="Destination">` : `<div class="dest-image" style="display:flex;align-items:center;justify-content:center;color:#999">No Photo Available</div>`}
//               </div>
//             </div>
            
//             <div class="qr-section">
//               <div class="label">Scan Here</div>
//               <img class="qr-image" src="${qrBase64}" alt="QR Code">
//               <div class="ticket-type">${typeLabel}</div>
//               <div style="margin-top: 10px; font-size: 14px; font-weight: bold;">#${ticket.ticketNumber}</div>
//             </div>
//           </div>

//           <div class="footer-section">
//             <div class="label">Time Summary</div>
//             <div class="time-bar">
//               ${data.destination.timeSummaryBar ? `<span class="time-item">${data.destination.timeSummaryBar}</span>` : ''}
//             </div>

//             <div class="policies">
//               <div class="label">Terms & Conditions</div>
//               <div style="margin-top: 5px;">${data.destination.bookingPolicies || 'N/A'}</div>
//             </div>
//             </div>
//         </div>
//       `;
//     }

//     htmlContent += `</body></html>`;

//     await page.setContent(htmlContent, { waitUntil: "networkidle0" });
    
//     const pdfBuffer = await page.pdf({
//       format: "A4",
//       printBackground: true,
//       margin: { top: "10mm", bottom: "10mm" }
//     });

//     await browser.close();
//     return pdfBuffer;
//   } catch (error) {
//     if (browser) await browser.close();
//     console.error("PDF Generation Final Error:", error);
//     throw error;
//   }
// };

// module.exports = {
//   generateTicketsPDF,
// };





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
    return await qrcode.toDataURL(text, {
      width: 160,
      margin: 1,
      color: { dark: "#0f3460", light: "#ffffff" },
    });
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
    await page.setDefaultNavigationTimeout(60000);

    let htmlContent = `
    <!DOCTYPE html>
    <html>
      <head>
        <meta charset="UTF-8">
        <style>
          * { box-sizing: border-box; margin: 0; padding: 0; }

          body {
            font-family: 'Segoe UI', 'Inter', 'Helvetica Neue', Arial, sans-serif;
            background: #eef2f7;
            padding: 24px;
          }

          .ticket-page {
            width: 760px;
            margin: 0 auto 32px auto;
            background: #ffffff;
            border-radius: 16px;
            overflow: hidden;
            page-break-after: always;
            box-shadow: 0 8px 32px rgba(15, 52, 96, 0.18);
          }

          /* ── Header ── */
          .header {
            background: #0f3460;
            padding: 26px 32px;
            display: flex;
            justify-content: space-between;
            align-items: center;
          }
          .header-left .eyebrow {
            font-size: 10px;
            letter-spacing: 3px;
            color: #6aaad4;
            text-transform: uppercase;
            margin-bottom: 4px;
          }
          .header-left .brand {
            font-family: 'Times New Roman', 'Playfair Display', Georgia, serif;
            font-size: 24px;
            font-weight: 700;
            color: #ffffff;
            letter-spacing: 0.5px;
          }
          .header-right {
            text-align: right;
          }
          .header-right .id-label {
            font-size: 10px;
            letter-spacing: 2px;
            color: #6aaad4;
            text-transform: uppercase;
            margin-bottom: 4px;
          }
          .header-right .booking-id {
            font-size: 20px;
            font-weight: 700;
            color: #ffffff;
            font-family: 'Courier New', monospace;
            letter-spacing: 1px;
          }

          /* ── Status Bar ── */
          .status-bar {
            background: #0d2d50;
            padding: 9px 32px;
            display: flex;
            gap: 20px;
            align-items: center;
          }
          .status-dot {
            width: 7px; height: 7px; border-radius: 50%;
            background: #4ade80; display: inline-block; margin-right: 6px;
          }
          .status-text {
            font-size: 11px;
            color: #8ab4d4;
            letter-spacing: 0.8px;
          }
          .status-sep {
            width: 1px; height: 14px;
            background: rgba(138,180,212,0.3);
          }

          /* ── Body ── */
          .body {
            display: flex;
          }

          /* Info Section */
          .info-section {
            flex: 1;
            padding: 28px 28px 24px 32px;
            border-right: 1px dashed #d0dae8;
          }
          .fields-grid {
            display: grid;
            grid-template-columns: 1fr 1fr;
            gap: 16px 24px;
            margin-bottom: 22px;
          }
          .field-label {
            font-size: 9px;
            letter-spacing: 2px;
            color: #8a9ab0;
            text-transform: uppercase;
            margin-bottom: 4px;
          }
          .field-value {
            font-size: 14px;
            font-weight: 600;
            color: #1a2b42;
          }

          /* Destination photo */
          .dest-photo-wrapper {
            border-radius: 10px;
            overflow: hidden;
            height: 130px;
          }
          .dest-photo {
            width: 100%; height: 100%;
            object-fit: cover;
            display: block;
          }
          .dest-photo-placeholder {
            width: 100%; height: 100%;
            background: linear-gradient(135deg, #0f3460 0%, #16213e 100%);
            display: flex; align-items: center; justify-content: center;
            color: #3a6a9a; font-size: 13px; letter-spacing: 1px;
          }

          /* QR Section */
          .qr-section {
            width: 176px;
            padding: 28px 18px 24px 18px;
            display: flex;
            flex-direction: column;
            align-items: center;
            gap: 10px;
          }
          .qr-scan-label {
            font-size: 9px;
            letter-spacing: 2px;
            color: #8a9ab0;
            text-transform: uppercase;
          }
          .qr-image {
            width: 128px; height: 128px;
            border-radius: 8px;
            border: 1px solid #e0e8f0;
            padding: 4px;
          }
          .ticket-type-badge {
            background: #0f3460;
            color: #ffffff;
            font-size: 11px;
            font-weight: 700;
            letter-spacing: 2.5px;
            padding: 5px 16px;
            border-radius: 20px;
            text-transform: uppercase;
          }
          .ticket-number {
            font-size: 11px;
            font-weight: 600;
            color: #6a7e95;
            font-family: 'Courier New', monospace;
            text-align: center;
            word-break: break-all;
          }

          /* ── Footer ── */
          .footer {
            border-top: 1px solid #eaf0f8;
            background: #f7f9fc;
            padding: 18px 32px;
          }
          .time-chips {
            display: flex;
            gap: 8px;
            flex-wrap: wrap;
            margin-bottom: 14px;
          }
          .chip {
            background: #e4edfa;
            color: #1a5ab8;
            font-size: 11px;
            font-weight: 600;
            padding: 4px 14px;
            border-radius: 20px;
            letter-spacing: 0.4px;
          }
          .policy-label {
            font-size: 9px;
            letter-spacing: 2px;
            color: #8a9ab0;
            text-transform: uppercase;
            margin-bottom: 5px;
          }
          .policy-text {
            font-size: 11px;
            color: #5a6e82;
            line-height: 1.65;
          }

          /* ── Bottom Bar ── */
          .bottom-bar {
            background: #0f3460;
            padding: 11px 32px;
            display: flex;
            justify-content: space-between;
            align-items: center;
          }
          .bottom-bar span {
            font-size: 11px;
            color: #4a7fa5;
            letter-spacing: 0.8px;
          }

          /* Divider dots on left/right of dashed border */
          .notch-left, .notch-right {
            display: none; /* decorative – skip for PDF */
          }
        </style>
      </head>
      <body>
    `;

    for (let i = 0; i < data.tickets.length; i++) {
      const ticket = data.tickets[i];
      const qrBase64 = await generateQRCode(ticket.ticketNumber);
      const isAdult = i < data.adults;
      const typeLabel = isAdult ? "ADULT" : "CHILD";

      // Read destination image safely
      let destImageTag = `<div class="dest-photo-placeholder">No Photo Available</div>`;
      if (data.destination.media && data.destination.media.length > 0) {
        try {
          const imagePath = path.join(process.cwd(), "public", data.destination.media[0]);
          if (fs.existsSync(imagePath)) {
            const base64 = fs.readFileSync(imagePath).toString("base64");
            destImageTag = `<img class="dest-photo" src="data:image/jpeg;base64,${base64}" alt="Destination">`;
          }
        } catch (e) {
          console.error("Image read error:", e.message);
        }
      }

      const visitDateStr = new Date(data.visitDate).toLocaleDateString("en-GB", {
        weekday: "short", year: "numeric", month: "short", day: "numeric",
      });

      const address = data.destination.location?.address || "N/A";

      const validUntilStr = data.validUntil
        ? new Date(data.validUntil).toLocaleDateString("en-GB", {
            weekday: "short", year: "numeric", month: "short", day: "numeric",
          })
        : "Same Day Only";

      htmlContent += `
        <div class="ticket-page">

          <!-- Header -->
          <div class="header">
            <div class="header-left">
              <div class="eyebrow">Electronic Travel Ticket</div>
              <div class="brand">TRAVEL AGENCY</div>
            </div>
            <div class="header-right">
              <div class="id-label">Booking ID</div>
              <div class="booking-id">#${data.bookingId}</div>
            </div>
          </div>

          <!-- Status Bar -->
          <div class="status-bar">
            <span class="status-text"><span class="status-dot"></span>CONFIRMED</span>
            <div class="status-sep"></div>
            <span class="status-text">${typeLabel} TICKET</span>
            <div class="status-sep"></div>
            <span class="status-text">Ticket ${i + 1} of ${data.tickets.length}</span>
          </div>

          <!-- Body -->
          <div class="body">

            <!-- Info -->
            <div class="info-section">
              <div class="fields-grid">
                <div>
                  <div class="field-label">Guest Name</div>
                  <div class="field-value">${data.fullName}</div>
                </div>
                <div>
                  <div class="field-label">Visit Date</div>
                  <div class="field-value">${visitDateStr}</div>
                </div>
                <div>
                  <div class="field-label">Tour Name</div>
                  <div class="field-value">${data.destination.name}</div>
                </div>
                <div>
                  <div class="field-label">Location</div>
                  <div class="field-value">${address}</div>
                </div>
              </div>

              <div style="margin-bottom: 18px; padding: 10px 14px; background: #f0f5ff; border-left: 3px solid #0f3460; border-radius: 0 8px 8px 0; display: flex; align-items: center; justify-content: space-between;">
                <div>
                  <div class="field-label" style="margin-bottom: 2px;">Valid Until</div>
                  <div class="field-value" style="color: #0f3460;">${validUntilStr}</div>
                </div>
                <div style="font-size: 20px; color: #0f3460; opacity: 0.25;">&#10003;</div>
              </div>

              <div class="dest-photo-wrapper">
                ${destImageTag}
              </div>
            </div>

            <!-- QR -->
            <div class="qr-section">
              <div class="qr-scan-label">Scan to Verify</div>
              <img class="qr-image" src="${qrBase64}" alt="QR Code">
              <div class="ticket-type-badge">${typeLabel}</div>
              <div class="ticket-number">${ticket.ticketNumber}</div>
            </div>
          </div>

          <!-- Footer -->
          <div class="footer">
            <div class="time-chips">
              ${data.destination.timeSummaryBar
                ? data.destination.timeSummaryBar
                    .split(",")
                    .map((t) => `<span class="chip">${t.trim()}</span>`)
                    .join("")
                : ""}
            </div>
            <div class="policy-label">Terms &amp; Conditions</div>
            <div class="policy-text">${data.destination.bookingPolicies || "N/A"}</div>
          </div>

          <!-- Bottom Bar -->
          <div class="bottom-bar">
            <span>travel-agency.com</span>
            <span>support@travelagency.com</span>
          </div>

        </div>
      `;
    }

    htmlContent += `</body></html>`;

    await page.setContent(htmlContent, { waitUntil: "domcontentloaded" });

    const pdfBuffer = await page.pdf({
      format: "A4",
      printBackground: true,
      margin: { top: "12mm", bottom: "12mm", left: "10mm", right: "10mm" },
    });

    await browser.close();
    return pdfBuffer;
  } catch (error) {
    if (browser) await browser.close();
    console.error("PDF Generation Final Error:", error);
    throw error;
  }
};

module.exports = { generateTicketsPDF };
