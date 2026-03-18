/**
 * Netlify Function: analyze
 * Proxies the Anthropic API call server-side so the API key
 * is never exposed in the browser.
 *
 * Set ANTHROPIC_API_KEY in Netlify → Site configuration → Environment variables
 */

exports.handler = async (event) => {
  const headers = {
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Headers": "Content-Type",
    "Access-Control-Allow-Methods": "POST, OPTIONS",
  };

  if (event.httpMethod === "OPTIONS") return { statusCode: 200, headers, body: "" };
  if (event.httpMethod !== "POST") return { statusCode: 405, headers, body: "Method Not Allowed" };

  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) {
    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({ error: "ANTHROPIC_API_KEY environment variable is not set in Netlify." }),
    };
  }

  try {
    const { url, device } = JSON.parse(event.body || "{}");

    if (!url) {
      return { statusCode: 400, headers, body: JSON.stringify({ error: "URL is required" }) };
    }

    const prompt = `You are a web performance expert. Analyse this URL for a ${device || "mobile"} device: "${url}"

Based on the domain and likely site type, provide a realistic Lighthouse-style performance analysis.

Respond ONLY with valid JSON (no markdown, no backticks):
{
  "scores": { "performance": <0-100>, "accessibility": <0-100>, "bestPractices": <0-100>, "seo": <0-100> },
  "metrics": {
    "fcp": "<e.g. 1.8s>", "fcpRating": "<good|ok|bad>",
    "lcp": "<e.g. 3.1s>", "lcpRating": "<good|ok|bad>",
    "tbt": "<e.g. 200ms>", "tbtRating": "<good|ok|bad>",
    "cls": "<e.g. 0.08>", "clsRating": "<good|ok|bad>",
    "si":  "<e.g. 2.9s>", "siRating":  "<good|ok|bad>",
    "tti": "<e.g. 4.2s>", "ttiRating": "<good|ok|bad>"
  },
  "opportunities": [
    { "title": "...", "description": "1-2 sentences.", "saving": "<e.g. 1.4s>", "severity": "<warn|error|info>" }
  ],
  "summary": "3-4 sentence expert analysis: performance strengths, weaknesses, and the single highest-priority fix."
}

Provide 4-6 opportunities. Make scores realistic for the site type. Device: ${device || "mobile"}.`;

    const res = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-api-key": apiKey,
        "anthropic-version": "2023-06-01",
      },
      body: JSON.stringify({
        model: "claude-sonnet-4-5",
        max_tokens: 1000,
        messages: [{ role: "user", content: prompt }],
      }),
    });

    const data = await res.json();

    if (!res.ok) {
      console.error("Anthropic API error:", data);
      return {
        statusCode: res.status,
        headers,
        body: JSON.stringify({ error: data.error?.message || "Anthropic API error" }),
      };
    }

    const raw = data.content?.find((b) => b.type === "text")?.text || "";
    const result = JSON.parse(raw.replace(/```json|```/g, "").trim());

    return {
      statusCode: 200,
      headers,
      body: JSON.stringify(result),
    };
  } catch (err) {
    console.error("analyze function error:", err.message);
    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({ error: err.message }),
    };
  }
};
