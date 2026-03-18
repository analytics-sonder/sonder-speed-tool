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
    const { url, device, timestamp, scores, userAgent, referrer } = JSON.parse(event.body || "{}");
 
    // Write to Google Sheets — Analyses tab
    const sheetsRes = await fetch(SHEETS_WEBHOOK_URL, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        sheet: "Analyses",
        row: [
          timestamp ?? new Date().toISOString(),
          url ?? "",
          device ?? "",
          scores?.performance ?? "",
          scores?.accessibility ?? "",
          scores?.bestPractices ?? "",
          scores?.seo ?? "",
          referrer ?? "",
          userAgent ?? "",
        ],
      }),
    });
 
    const responseText = await sheetsRes.text();
    console.log(JSON.stringify({
      event: "url_analyzed",
      url, device, timestamp, scores,
      sheets_status: sheetsRes.status,
      sheets_response: responseText,
    }));
 
    return { statusCode: 200, headers, body: JSON.stringify({ success: true }) };
  } catch (err) {
    console.error("log-analysis error:", err.message);
    // Return 200 so the front-end UX is never blocked by a logging failure
    return { statusCode: 200, headers, body: JSON.stringify({ success: false, error: err.message }) };
  }
};
