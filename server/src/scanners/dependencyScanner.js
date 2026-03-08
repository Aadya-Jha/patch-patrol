import { queryOSVBatch } from "../services/vulnerabilityService.js"

function calculateRiskScore(vulns) {

  let maxScore = 0

  for (const vuln of vulns) {

    const cvss = vuln.severity?.[0]?.score

    if (!cvss) continue

    const score = parseFloat(cvss)

    if (score > maxScore) {
      maxScore = score
    }

  }

  if (maxScore >= 9) return "critical"
  if (maxScore >= 7) return "high"
  if (maxScore >= 4) return "medium"
  if (maxScore > 0) return "low"

  return "low"
}

export async function scanDependencies(dependencies, ecosystem) {

  const results = await queryOSVBatch(dependencies, ecosystem)

  const vulnerabilities = []

  results.forEach((result, index) => {

    const vulns = result.vulns || []

    if (vulns.length > 0) {

      const dep = dependencies[index]

      const risk = calculateRiskScore(vulns)

      vulnerabilities.push({
        dependency: dep.name,
        version: dep.version,
        risk,
        vulnerabilities: vulns.map(v => ({
          id: v.id,
          summary: v.summary
        }))
      })

    }

  })

  return vulnerabilities

}