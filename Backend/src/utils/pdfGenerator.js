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
 * Get image as base64
 * @param {string} mediaPath 
 * @returns {string}
 */
const getImageBase64 = (mediaPath) => {
  if (!mediaPath) return "";
  try {
    const fullPath = path.join(process.cwd(), "public", mediaPath);
    if (fs.existsSync(fullPath)) {
      return `data:image/jpeg;base64,${fs.readFileSync(fullPath).toString("base64")}`;
    }
  } catch (e) {
    console.error("Image read error:", e.message);
  }
  return "";
};

/**
 * Generate Google Maps Link
 * @param {number} lat 
 * @param {number} lng 
 * @returns {string}
 */
const getGoogleMapsLink = (lat, lng) => {
  if (lat && lng) {
    return `https://www.google.com/maps?q=${lat},${lng}`;
  }
  return "#";
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

    const isCombo = data.destination.type === "combo";
    const destinations = isCombo ? data.destination.subDestinations : [data.destination];

    let htmlContent = `
    <!DOCTYPE html>
    <html>
      <head>
        <meta charset="UTF-8">
        <style>
          * { box-sizing: border-box; margin: 0; padding: 0; }
          body { font-family: 'Segoe UI', Arial, sans-serif; background: #eef2f7; padding: 20px; }
          .ticket-page {
            width: 760px; margin: 0 auto 30px auto; background: #ffffff; border-radius: 12px;
            overflow: hidden; page-break-after: always; box-shadow: 0 5px 20px rgba(0,0,0,0.1);
          }
          .header { background: #0f3460; padding: 20px 30px; color: white; display: flex; justify-content: space-between; align-items: center; }
          .header .brand { font-size: 22px; font-weight: bold; }
          .header .booking-id { font-family: monospace; font-size: 18px; }
          
          .status-bar { background: #0d2d50; padding: 8px 30px; color: #8ab4d4; font-size: 11px; display: flex; gap: 15px; }
          .status-dot { width: 8px; height: 8px; background: #4ade80; border-radius: 50%; display: inline-block; }

          .body { display: flex; border-bottom: 1px solid #eee; }
          .info-section { flex: 1; padding: 25px 30px; border-right: 1px dashed #ccc; }
          .qr-section { width: 180px; padding: 25px 15px; display: flex; flex-direction: column; align-items: center; gap: 10px; }
          
          .grid { display: grid; grid-template-columns: 1fr 1fr; gap: 15px; margin-bottom: 20px; }
          .label { font-size: 9px; color: #8a9ab0; text-transform: uppercase; letter-spacing: 1px; }
          .value { font-size: 13px; font-weight: 600; color: #1a2b42; }
          .map-link { font-size: 11px; color: #1a73e8; text-decoration: none; font-weight: normal; }

          .photo-container { display: flex; gap: 10px; height: 120px; margin-top: 15px; }
          .photo-box { flex: 1; border-radius: 8px; overflow: hidden; background: #eee; }
          .photo-box img { width: 100%; height: 100%; object-fit: cover; }
          .photo-placeholder { height: 100%; display: flex; align-items: center; justify-content: center; font-size: 10px; color: #999; text-align: center; }

          .valid-box { margin-bottom: 15px; padding: 10px; background: #f0f5ff; border-left: 4px solid #0f3460; border-radius: 4px; }
          
          .qr-image { width: 130px; height: 130px; border: 1px solid #eee; padding: 5px; }
          .badge { background: #0f3460; color: white; padding: 4px 12px; border-radius: 15px; font-size: 10px; font-weight: bold; }
          
          .footer { padding: 15px 30px; background: #fcfcfc; }
          .chips { display: flex; gap: 10px; margin-bottom: 10px; flex-wrap: wrap; }
          .chip { background: #e4edfa; color: #1a5ab8; padding: 3px 10px; border-radius: 15px; font-size: 10px; font-weight: bold; }
          .policy-text { font-size: 10px; color: #666; line-height: 1.5; }
        </style>
      </head>
      <body>
    `;

    for (let i = 0; i < data.tickets.length; i++) {
      const ticket = data.tickets[i];
      const qrBase64 = await generateQRCode(ticket.ticketNumber);
      const isAdult = i < data.adults;
      const typeLabel = isAdult ? "ADULT" : "CHILD";

      const visitDateStr = new Date(data.visitDate).toDateString();
      const expiryDateStr = ticket.expiryDate ? new Date(ticket.expiryDate).toDateString() : "Same Day";

      // Find specific destination name for this ticket (especially for combos)
      const ticketDest = destinations.find(d => d._id.toString() === ticket.destinationId.toString());
      const ticketDestName = ticketDest ? ticketDest.name : data.destination.name;

      // Images logic
      let imagesHtml = '';
      if (isCombo && destinations.length >= 2) {
        const img1 = getImageBase64(destinations[0].media?.[0]);
        const img2 = getImageBase64(destinations[1].media?.[0]);
        imagesHtml = `
          <div class="photo-container">
            <div class="photo-box">${img1 ? `<img src="${img1}">` : '<div class="photo-placeholder">No Image</div>'}</div>
            <div class="photo-box">${img2 ? `<img src="${img2}">` : '<div class="photo-placeholder">No Image</div>'}</div>
          </div>
        `;
      } else {
        const img = getImageBase64(destinations[0].media?.[0]);
        imagesHtml = `
          <div class="photo-container">
            <div class="photo-box" style="flex: none; width: 100%;">${img ? `<img src="${img}">` : '<div class="photo-placeholder">No Image</div>'}</div>
          </div>
        `;
      }

      // Location logic
      let locationHtml = '';
      destinations.forEach((dest, idx) => {
        const mapLink = getGoogleMapsLink(dest.location?.latitude, dest.location?.longitude);
        locationHtml += `
          <div style="${idx > 0 ? 'margin-top: 8px;' : ''}">
            <div class="value">${dest.name}</div>
            <div style="font-size: 11px; color: #555;">${dest.location?.address || 'N/A'}</div>
            ${mapLink !== '#' ? `<a href="${mapLink}" class="map-link">View on Google Maps</a>` : ''}
          </div>
        `;
      });

      htmlContent += `
        <div class="ticket-page">
          <div class="header">
            <div class="brand">TRAVEL AGENCY</div>
            <div class="booking-id">#${data.bookingId}</div>
          </div>

          <div class="status-bar">
            <span><span class="status-dot"></span>CONFIRMED</span>
            <span>${typeLabel} TICKET</span>
            <span>Ticket ${i + 1} of ${data.tickets.length}</span>
          </div>

          <div class="body">
            <div class="info-section">
              <div class="grid">
                <div>
                  <div class="label">Guest Name</div>
                  <div class="value">${data.fullName}</div>
                </div>
                <div>
                  <div class="label">Visit Date</div>
                  <div class="value">${visitDateStr}</div>
                </div>
              </div>

              <div class="label" style="margin-bottom: 5px;">Location & Destination</div>
              ${locationHtml}

              <div class="valid-box" style="margin-top: 15px;">
                <div class="label">Valid Until</div>
                <div class="value" style="color: #0f3460;">${expiryDateStr}</div>
              </div>

              ${imagesHtml}
            </div>

            <div class="qr-section">
              <div class="label">Scan to Verify</div>
              <img class="qr-image" src="${qrBase64}">
              <div class="badge">${typeLabel}</div>
              <div class="value" style="font-family: monospace; font-size: 11px;">${ticket.ticketNumber}</div>
              <div style="font-size: 9px; font-weight: bold; color: #0f3460; text-align: center; margin-top: 2px;">${ticketDestName}</div>
            </div>
          </div>

          <div class="footer">
            <div class="chips">
              ${data.destination.timeSummaryBar ? data.destination.timeSummaryBar.split(',').map(c => `<span class="chip">${c.trim()}</span>`).join('') : ''}
            </div>
            <div class="label">Booking Policies</div>
            <div class="policy-text">${data.destination.bookingPolicies || 'N/A'}</div>
          </div>
        </div>
      `;
    }

    htmlContent += `</body></html>`;
    await page.setContent(htmlContent, { waitUntil: "domcontentloaded" });
    const pdfBuffer = await page.pdf({ format: "A4", printBackground: true, margin: { top: "10mm", bottom: "10mm" } });
    await browser.close();
    return pdfBuffer;
  } catch (error) {
    if (browser) await browser.close();
    console.error("PDF Error:", error);
    throw error;
  }
};

module.exports = { generateTicketsPDF };
