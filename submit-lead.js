/**
 * Netlify Function: submit-lead
 * Fires when someone submits the SEO/AEO consultation form.
 * Writes directly to Google Sheets via the Apps Script webhook.
 */

const SHEETS_WEBHOOK_URL =
  "https://script.google.com/macros/s/AKfycbzgJh5CdMcz71Qolje08ouyr3T-X8_k5giKdTXFDR8hzlS2u9VLaKQbufWiZFCB0dJA/exec";

exports.handler = async (event) => {
  const headers = {
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Headers": "Content-Type",
    "Access-Control-Allow-Methods": "POST, OPTIONS",
  };

  if (event.httpMethod === "OPTIONS") return { statusCode: 200, headers, body: "" };
  if (event.httpMethod !== "POST") return { statusCode: 405, headers, body: "Method Not Allowed" };

  try {
    const { name, company, title, email, phone, analyzedUrl, timestamp } = JSON.parse(event.body || "{}");

    if (!name || !email) {
      return { statusCode: 400, headers, body: JSON.stringify({ error: "Name and email are required" }) };
    }

    // Write to Google Sheets — Leads tab
    const sheetsRes = await fetch(SHEETS_WEBHOOK_URL, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        sheet: "Leads",
        row: [
          timestamp ?? new Date().toISOString(),
          name,
          company ?? "",
          title ?? "",
          email,
          phone ?? "",
          analyzedUrl ?? "",
        ],
      }),
    });

    const responseText = await sheetsRes.text();
    console.log(JSON.stringify({
      event: "lead_captured",
      name, company, title, email, phone, analyzedUrl, timestamp,
      sheets_status: sheetsRes.status,
      sheets_response: responseText,
    }));

    return { statusCode: 200, headers, body: JSON.stringify({ success: true }) };
  } catch (err) {
    console.error("submit-lead error:", err.message);
    // Return 200 so the thank-you screen still shows
    return { statusCode: 200, headers, body: JSON.stringify({ success: false, error: err.message }) };
  }
};
