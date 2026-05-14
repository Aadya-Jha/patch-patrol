const GITHUB_API = "https://api.github.com";

async function issueExistsForCVE(owner, repo, token, cveId) {
  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 30000);

    try {
      const res = await fetch(
        `${GITHUB_API}/repos/${owner}/${repo}/issues?state=open&labels=security,patch-patrol`,
        {
          headers: {
            Authorization: `Bearer ${token}`,
            Accept: "application/vnd.github+json",
            "X-GitHub-Api-Version": "2022-11-28",
          },
          signal: controller.signal,
        },
      );

      if (!res.ok) {
        console.warn(`Failed to check existing issues: ${res.status}`);
        return false; // Assume no issue exists if we can't check
      }

      const issues = await res.json();
      return issues.some((issue) => issue.title.includes(cveId));
    } finally {
      clearTimeout(timeoutId);
    }
  } catch (err) {
    console.error(
      `Error checking for existing CVE issue ${cveId}:`,
      err.message,
    );
    return false; // Assume no issue exists if check fails
  }
}

export async function createIssuesForScan({
  owner,
  repo,
  token,
  vulnerabilities,
}) {
  if (!token) throw new Error("GITHUB_TOKEN not set");

  if (!vulnerabilities.length) return [];

  const created = [];

  for (const vuln of vulnerabilities) {
    try {
      const exists = await issueExistsForCVE(owner, repo, token, vuln.cve_id);
      if (exists) {
        console.log(`Issue already exists for CVE ${vuln.cve_id}, skipping`);
        continue;
      }

      const issue = await openIssue({ owner, repo, token, vuln });
      created.push(issue);
    } catch (err) {
      console.error(`failed to create issue for ${vuln.cve_id}:`, err.message);
    }
  }
  return created;
}

async function openIssue({ owner, repo, token, vuln }) {
  const { cve_id, package_name, severity, cvss_score, ai_explanation } = vuln;

  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), 30000);

  try {
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
        body: buildBody({
          cve_id,
          package_name,
          severity,
          cvss_score,
          ai_explanation,
        }),
        labels: ["security", "patch-patrol"],
      }),
      signal: controller.signal,
    });

    if (!res.ok) {
      const err = await res.json();
      throw new Error(err.message);
    }

    const data = await res.json();
    return { cve_id, issue_url: data.html_url };
  } finally {
    clearTimeout(timeoutId);
  }
}

function buildBody({
  cve_id,
  package_name,
  severity,
  cvss_score,
  ai_explanation,
}) {
  return `**Package:** ${package_name}
**CVE:** ${cve_id} (https://osv.dev/vulnerability/${cve_id})
**Severity:** ${severity} — CVSS ${cvss_score ?? "N/A"}

${ai_explanation ?? "No AI explanation available."}

Bump ${package_name} to a non-affected version and close this once patched.`;
}
