import axios from "axios";
import { buildRiskExplanationMessages } from "./aiPrompt.service.js";

function parseBoolean(value, defaultValue = false) {
  if (value === undefined) {
    return defaultValue;
  }

  return ["1", "true", "yes", "on"].includes(String(value).toLowerCase());
}

export function getAiPrototypeSettings() {
  const provider = process.env.AI_PROVIDER || "openrouter";
  const model = provider === "openrouter"
    ? process.env.OPENROUTER_MODEL || "openai/gpt-4o-mini"
    : process.env.OPENAI_MODEL || "gpt-4o-mini";
  const embeddingModel = provider === "openrouter"
    ? process.env.OPENROUTER_EMBEDDING_MODEL || "openai/text-embedding-3-small"
    : process.env.OPENAI_EMBEDDING_MODEL || "text-embedding-3-small";
  const vectorStore = process.env.AI_VECTOR_STORE || "pgvector-planned";
  const maxModelExplanationsPerScan = Number(process.env.AI_MAX_MODEL_EXPLANATIONS_PER_SCAN || 10);
  const enabled = parseBoolean(process.env.AI_ENABLED, true);
  const hasProviderKey = provider === "openrouter"
    ? Boolean(process.env.OPENROUTER_API_KEY)
    : Boolean(process.env.OPENAI_API_KEY);

  return {
    enabled,
    provider,
    model,
    embeddingModel,
    vectorStore,
    hasProviderKey,
    maxModelExplanationsPerScan,
  };
}

function safeParseJson(text) {
  try {
    return JSON.parse(text);
  } catch {
    const match = text.match(/\{[\s\S]*\}/);
    if (!match) {
      return null;
    }

    try {
      return JSON.parse(match[0]);
    } catch {
      return null;
    }
  }
}

function normalizeExplanationPayload(payload, fallbackText) {
  if (!payload || typeof payload !== "object") {
    return null;
  }

  return {
    summary: String(payload.summary || "").trim(),
    contextualImpact: String(payload.contextualImpact || "").trim(),
    recommendedAction: String(payload.recommendedAction || "").trim(),
    upgradeTarget: String(payload.upgradeTarget || "").trim(),
    confidence: String(payload.confidence || "").trim() || fallbackText,
  };
}

export function formatRiskExplanation(payload) {
  const parts = [];

  if (payload.summary) {
    parts.push(`Summary: ${payload.summary}`);
  }

  if (payload.contextualImpact) {
    parts.push(`Impact: ${payload.contextualImpact}`);
  }

  if (payload.recommendedAction) {
    parts.push(`Recommended action: ${payload.recommendedAction}`);
  }

  if (payload.upgradeTarget) {
    parts.push(`Upgrade target: ${payload.upgradeTarget}`);
  }

  if (payload.confidence) {
    parts.push(`Confidence: ${payload.confidence}`);
  }

  return parts.join("\n");
}

export function generateFallbackRiskExplanation(context) {
  const fix = context.vulnerability.suggestedFix
    ? `Upgrade to ${context.vulnerability.suggestedFix} or later.`
    : "Review the advisory and move to the first patched release available for this package.";

  const siblingCount = context.relatedContext.siblingVulnerabilities.length;
  const siblingNote =
    siblingCount > 0
      ? `The same dependency also has ${siblingCount} additional vulnerability signal(s), which raises triage priority.`
      : "This appears to be the primary known issue on the dependency in the current scan.";

  return {
    provider: "prototype-fallback",
    model: "heuristic-v1",
    explanation: formatRiskExplanation({
      summary: `${context.dependency.name} ${context.dependency.version || ""}`.trim()
        + ` is affected by ${context.vulnerability.advisoryId} with ${context.vulnerability.severity} severity.`,
      contextualImpact: `The package is declared in ${context.dependency.manifestPath} as a ${context.dependency.dependencyType} dependency. ${siblingNote}`,
      recommendedAction: fix,
      upgradeTarget: context.vulnerability.suggestedFix || "Patch release required",
      confidence: "prototype heuristic",
    }),
  };
}

function getProviderRequestConfig(settings) {
  if (settings.provider === "openrouter") {
    const headers = {
      Authorization: `Bearer ${process.env.OPENROUTER_API_KEY}`,
      "Content-Type": "application/json",
    };

    if (process.env.OPENROUTER_SITE_URL) {
      headers["HTTP-Referer"] = process.env.OPENROUTER_SITE_URL;
    }

    if (process.env.OPENROUTER_APP_NAME) {
      headers["X-Title"] = process.env.OPENROUTER_APP_NAME;
    }

    return {
      url: process.env.OPENROUTER_BASE_URL || "https://openrouter.ai/api/v1/chat/completions",
      headers,
    };
  }

  return {
    url: "https://api.openai.com/v1/chat/completions",
    headers: {
      Authorization: `Bearer ${process.env.OPENAI_API_KEY}`,
      "Content-Type": "application/json",
    },
  };
}

async function requestModelRiskExplanation(context, settings) {
  const requestConfig = getProviderRequestConfig(settings);
  const response = await axios.post(
    requestConfig.url,
    {
      model: settings.model,
      temperature: 0.2,
      response_format: { type: "json_object" },
      messages: buildRiskExplanationMessages(context),
    },
    {
      timeout: 30000,
      headers: requestConfig.headers,
    },
  );

  const content = response.data?.choices?.[0]?.message?.content;
  const parsed = safeParseJson(content || "");
  const normalized = normalizeExplanationPayload(parsed, "model-estimated");

  if (!normalized) {
    throw new Error("Model response did not contain valid JSON");
  }

  return {
    provider: settings.provider,
    model: settings.model,
    explanation: formatRiskExplanation(normalized),
  };
}

export async function generateRiskExplanation(context, options = {}) {
  const settings = getAiPrototypeSettings();
  const useModel = options.useModel !== false
    && settings.enabled
    && ["openrouter", "openai"].includes(settings.provider)
    && settings.hasProviderKey;

  if (!useModel) {
    return generateFallbackRiskExplanation(context);
  }

  try {
    return await requestModelRiskExplanation(context, settings);
  } catch {
    return generateFallbackRiskExplanation(context);
  }
}
