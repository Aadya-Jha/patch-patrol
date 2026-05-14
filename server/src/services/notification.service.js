export async function sendScanNotifications({ owner, repo, scanId, vulnerabilities }) {
  const SLACK_WEBHOOK_URL = process.env.SLACK_WEBHOOK_URL;

  if (!SLACK_WEBHOOK_URL) {
    console.warn("[notifications] SLACK_WEBHOOK_URL not set, skipping");
    return;
  }

  const summary = buildSummary(vulnerabilities);

  try {
    await sendSlackAlert({ owner, repo, scanId, summary, webhook: SLACK_WEBHOOK_URL });
  } catch (err) {
    console.error("[notifications] slack failed:", err.message);
  }
}

async function sendSlackAlert({ owner, repo, scanId, summary, webhook }) {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), 10000);

  try {
    const res = await fetch(webhook, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        text: `*PatchPatrol Scan Complete — ${owner}/${repo}*`,
        blocks: [
          {
            type: "section",
            text: {
              type: "mrkdwn",
              text: `*PatchPatrol Scan Complete*\nRepo: \`${owner}/${repo}\``,
            },
          },
          {
            type: "section",
            fields: [
              { type: "mrkdwn", text: `*Total Vulns:*\n${summary.total}` },
              { type: "mrkdwn", text: `*Critical:*\n${summary.critical}` },
              { type: "mrkdwn", text: `*High:*\n${summary.high}` },
              { type: "mrkdwn", text: `*Scan ID:*\n${scanId}` },
            ],
          },
        ],
      }),
      signal: controller.signal,
    });

    if (!res.ok) throw new Error(`Slack webhook failed: ${res.status}`);
  } finally {
    clearTimeout(timeoutId);
  }
}

function buildSummary(vulnerabilities) {
  return vulnerabilities.reduce(
    (acc, v) => {
      const s = (v.severity || v.risk_level)?.toUpperCase();
      acc.total++;
      if (s === "CRITICAL") acc.critical++;
      if (s === "HIGH") acc.high++;
      return acc;
    },
    { total: 0, critical: 0, high: 0 }
  );
}