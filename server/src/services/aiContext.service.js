function summarizeSiblingVulnerabilities(siblingVulnerabilities, currentAdvisoryId) {
  return siblingVulnerabilities
    .filter((vulnerability) => vulnerability.advisoryId !== currentAdvisoryId)
    .slice(0, 3)
    .map((vulnerability) => ({
      advisoryId: vulnerability.advisoryId,
      severity: vulnerability.severity,
      riskScore: vulnerability.riskScore,
      description: vulnerability.description,
    }));
}

export function buildRiskExplanationContext({
  repository,
  dependency,
  vulnerability,
  repositorySummary,
}) {
  return {
    repository: {
      owner: repository.owner,
      name: repository.name,
      defaultBranch: repository.defaultBranch || null,
    },
    dependency: {
      name: dependency.name,
      version: dependency.version,
      normalizedVersion: dependency.normalizedVersion,
      ecosystem: dependency.ecosystem,
      manifestPath: dependency.manifestPath,
      dependencyType: dependency.dependencyType,
      vulnerabilityCount: dependency.vulnerabilities.length,
    },
    vulnerability: {
      advisoryId: vulnerability.advisoryId,
      severity: vulnerability.severity,
      riskLevel: vulnerability.riskLevel,
      riskScore: vulnerability.riskScore,
      description: vulnerability.description,
      referenceUrl: vulnerability.referenceUrl,
      suggestedFix: vulnerability.suggestedFix,
      publishedAt: vulnerability.publishedAt,
    },
    repositorySummary: {
      dependencyCount: repositorySummary.dependencyCount,
      vulnerabilityCount: repositorySummary.vulnerabilityCount,
      severities: repositorySummary.severities,
    },
    relatedContext: {
      siblingVulnerabilities: summarizeSiblingVulnerabilities(
        dependency.vulnerabilities,
        vulnerability.advisoryId,
      ),
    },
  };
}
