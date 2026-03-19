function stringifyContext(context) {
  return JSON.stringify(context, null, 2);
}

export function buildRiskExplanationMessages(context) {
  const systemPrompt = [
    "You are Patch Patrol's application security analyst.",
    "Explain why a dependency vulnerability matters in a concise, production-oriented way.",
    "Use only the provided structured context.",
    "Do not invent source-code usage details or exploit paths that are not present in the context.",
    "Return strict JSON with keys: summary, contextualImpact, recommendedAction, upgradeTarget, confidence.",
    "Keep each field short and concrete.",
  ].join(" ");

  const userPrompt = [
    "Generate a practical explanation for this vulnerable dependency.",
    "Context:",
    stringifyContext(context),
  ].join("\n\n");

  return [
    { role: "system", content: systemPrompt },
    { role: "user", content: userPrompt },
  ];
}
