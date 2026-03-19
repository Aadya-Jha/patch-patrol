import { queryVulnerabilitiesForDependencies } from "../services/vulnerabilityService.js";

export async function scanDependencies(dependencies, ecosystem) {
  const matches = await queryVulnerabilitiesForDependencies(dependencies, ecosystem);

  return matches.map((match) => ({
    dependencyKey: match.dependencyKey,
    vulnerabilities: match.vulnerabilities,
    highestRisk: match.vulnerabilities.reduce(
      (highest, vulnerability) => Math.max(highest, vulnerability.riskScore),
      0,
    ),
  }));
}
