import { XMLParser } from "fast-xml-parser";

function normalizeVersion(version) {
  if (!version) {
    return null;
  }

  const raw = String(version).trim().replace(/^['"`]|['"`]$/g, "");

  if (
    !raw ||
    raw === "*" ||
    raw.toLowerCase() === "latest" ||
    raw.startsWith("file:") ||
    raw.startsWith("link:") ||
    raw.startsWith("workspace:") ||
    raw.startsWith("git+") ||
    raw.startsWith("${")
  ) {
    return null;
  }

  const stripped = raw.replace(/^[\^~<>=\s]+/, "");
  const match = stripped.match(/v?\d+(?:\.\d+){0,3}(?:[-+._][0-9A-Za-z.-]+)?/);

  return match ? match[0].replace(/^v/, "") : null;
}

function createDependency(name, version, dependencyType = "direct") {
  return {
    name,
    version: version ? String(version).trim() : null,
    normalizedVersion: normalizeVersion(version),
    dependencyType,
  };
}

export function parsePackageJSON(content) {
  try {
    const parsed = JSON.parse(content);
    if (!parsed || typeof parsed !== "object") {
      return [];
    }

    const sections = [
      { values: parsed.dependencies, dependencyType: "production" },
      { values: parsed.devDependencies, dependencyType: "development" },
      { values: parsed.peerDependencies, dependencyType: "peer" },
      { values: parsed.optionalDependencies, dependencyType: "optional" },
    ];

    const dependencies = [];

    for (const section of sections) {
      if (!section.values || typeof section.values !== "object") {
        continue;
      }

      for (const [name, version] of Object.entries(section.values)) {
        dependencies.push(createDependency(name, version, section.dependencyType));
      }
    }

    return dependencies;
  } catch {
    return [];
  }
}

export function parseRequirementsTxt(content) {
  if (!content || typeof content !== "string") {
    return [];
  }

  return content
    .split("\n")
    .map((line) => line.split("#")[0].split(";")[0].trim())
    .filter(Boolean)
    .filter((line) => !line.startsWith("-"))
    .map((line) => {
      const match = line.match(/^([A-Za-z0-9_.-]+)(?:\[[^\]]+\])?\s*(.*)$/);
      if (!match) {
        return null;
      }

      const [, name, remainder] = match;
      const version = remainder.trim() || null;
      return createDependency(name, version, "production");
    })
    .filter(Boolean);
}

function toArray(value) {
  if (!value) {
    return [];
  }

  return Array.isArray(value) ? value : [value];
}

export function parsePomXml(content) {
  if (!content || typeof content !== "string") {
    return [];
  }

  try {
    const parser = new XMLParser({ ignoreAttributes: false });
    const parsed = parser.parse(content);
    const project = parsed.project || parsed;
    const directDependencies = toArray(project.dependencies?.dependency);
    const managedDependencies = toArray(project.dependencyManagement?.dependencies?.dependency);

    return [...directDependencies, ...managedDependencies]
      .map((dependency) => {
        if (!dependency?.groupId || !dependency?.artifactId) {
          return null;
        }

        return createDependency(
          `${dependency.groupId}:${dependency.artifactId}`,
          dependency.version || null,
          "production",
        );
      })
      .filter(Boolean);
  } catch {
    return [];
  }
}
