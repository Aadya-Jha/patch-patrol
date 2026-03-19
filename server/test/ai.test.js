import test from "node:test";
import assert from "node:assert/strict";
import { buildRiskExplanationContext } from "../src/services/aiContext.service.js";
import { buildRiskExplanationMessages } from "../src/services/aiPrompt.service.js";
import {
  formatRiskExplanation,
  generateFallbackRiskExplanation,
  getAiPrototypeSettings,
} from "../src/services/aiRisk.service.js";

function buildFixtureContext() {
  return buildRiskExplanationContext({
    repository: {
      owner: "octocat",
      name: "hello-world",
      defaultBranch: "main",
    },
    dependency: {
      id: 10,
      name: "lodash",
      version: "^4.17.15",
      normalizedVersion: "4.17.15",
      ecosystem: "npm",
      manifestPath: "package.json",
      dependencyType: "production",
      vulnerabilities: [
        {
          advisoryId: "GHSA-1",
          severity: "critical",
          riskLevel: "critical",
          riskScore: 9.8,
          description: "Prototype vulnerability description",
          suggestedFix: "4.17.21",
        },
        {
          advisoryId: "GHSA-2",
          severity: "medium",
          riskLevel: "medium",
          riskScore: 5.0,
          description: "Sibling advisory",
        },
      ],
    },
    vulnerability: {
      advisoryId: "GHSA-1",
      severity: "critical",
      riskLevel: "critical",
      riskScore: 9.8,
      description: "Prototype vulnerability description",
      referenceUrl: "https://example.com/advisory",
      suggestedFix: "4.17.21",
      publishedAt: "2024-01-01T00:00:00Z",
    },
    repositorySummary: {
      dependencyCount: 12,
      vulnerabilityCount: 3,
      severities: { critical: 1, high: 1, medium: 1, low: 0, unknown: 0 },
    },
  });
}

test("buildRiskExplanationMessages includes the dependency context", () => {
  const messages = buildRiskExplanationMessages(buildFixtureContext());

  assert.equal(messages.length, 2);
  assert.match(messages[1].content, /lodash/);
  assert.match(messages[1].content, /GHSA-1/);
});

test("generateFallbackRiskExplanation returns a formatted prototype explanation", () => {
  const result = generateFallbackRiskExplanation(buildFixtureContext());

  assert.equal(result.provider, "prototype-fallback");
  assert.equal(result.model, "heuristic-v1");
  assert.match(result.explanation, /Summary:/);
  assert.match(result.explanation, /Recommended action:/);
  assert.match(result.explanation, /4.17.21/);
});

test("formatRiskExplanation composes a stable text payload", () => {
  const text = formatRiskExplanation({
    summary: "A",
    contextualImpact: "B",
    recommendedAction: "C",
    upgradeTarget: "D",
    confidence: "E",
  });

  assert.equal(
    text,
    "Summary: A\nImpact: B\nRecommended action: C\nUpgrade target: D\nConfidence: E",
  );
});

test("getAiPrototypeSettings returns the configured provider shape", () => {
  process.env.AI_ENABLED = "true";
  process.env.AI_PROVIDER = "openrouter";
  process.env.OPENROUTER_MODEL = "openai/gpt-4o-mini";
  process.env.OPENROUTER_EMBEDDING_MODEL = "openai/text-embedding-3-small";
  process.env.AI_VECTOR_STORE = "pgvector-planned";
  process.env.AI_MAX_MODEL_EXPLANATIONS_PER_SCAN = "6";

  const settings = getAiPrototypeSettings();

  assert.equal(settings.enabled, true);
  assert.equal(settings.provider, "openrouter");
  assert.equal(settings.model, "openai/gpt-4o-mini");
  assert.equal(settings.embeddingModel, "openai/text-embedding-3-small");
  assert.equal(settings.vectorStore, "pgvector-planned");
  assert.equal(settings.maxModelExplanationsPerScan, 6);
});
