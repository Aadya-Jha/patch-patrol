import fetch from "node-fetch";

const GITHUB_API = "https://api.github.com";

export async function createIssuesForScan({ owner, repo, token, vulnerabilities }) {
  if (!token) throw new Error("GITHUB_TOKEN not set");

  console.log(`[githubAutomation] raw vulns:`, vulnerabilities.map(
    v => ({ cve_id: v.cve_id, severity: v.severity, risk_score: v.risk_score })
  ));

  const highOrCritical = vulnerabilities.filter((v) => {
    const s = (v.severity || v.risk_level)?.toUpperCase();
    return s === "CRITICAL" || s === "HIGH";
  });
  console.log(`[githubAutomation] creating issues for ${highOrCritical.length} vulns`);


  if (!highOrCritical.length) return [];

  const created = [];

  for (const vuln of highOrCritical) {
    try {
      const issue = await openIssue({ owner, repo, token, vuln });
      created.push(issue);
    } catch (err) {
      console.error(`failed to create issue for ${vuln.cve_id}:`, err.message);
    }
  }
  console.log(`[githubAutomation] done, created:`, created);
  return created;
}

async function openIssue({ owner, repo, token, vuln }) {
  const { cve_id, package_name, severity, cvss_score, ai_explanation } = vuln;

  const res = await fetch(`${GITHUB_API}/repos/${owner}/${repo}/issues`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${token}`,
      Accept: "application/vnd.github+json",
      "X-GitHub-Api-Version": "2022-11-28",
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      title: `[PatchPatrol] ${severity}: ${cve_id} in ${package_name}`,
      body: buildBody({ cve_id, package_name, severity, cvss_score, ai_explanation }),
      labels: ["security", "patch-patrol"],
    }),
  });

  if (!res.ok) {
    const err = await res.json();
    throw new Error(err.message);
  }

  const data = await res.json();
  return { cve_id, issue_url: data.html_url };
}

function buildBody({ cve_id, package_name, severity, cvss_score, ai_explanation }) {
  return `**Package:** ${package_name}
**CVE:** ${cve_id} (https://osv.dev/vulnerability/${cve_id})
**Severity:** ${severity} — CVSS ${cvss_score ?? "N/A"}

${ai_explanation ?? "No AI explanation available."}

Bump ${package_name} to a non-affected version and close this once patched.`;
}