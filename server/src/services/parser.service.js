import { XMLParser } from "fast-xml-parser";

export function parsePackageJSON(content) {
  try {
    const parsed = JSON.parse(content);
    if (!parsed || typeof parsed !== 'object') return [];

    const dependencies = parsed.dependencies || {};
    const devDependencies = parsed.devDependencies || {};

    const allDeps = { ...dependencies, ...devDependencies };

    return Object.entries(allDeps).map(([name, version]) => ({
      name,
      version: String(version),
    }));
  } catch (err) {
    return [];
  }
}

export function parseRequirementsTxt(content) {
  if (!content || typeof content !== 'string') return [];

  const deps = [];
  const lines = content.split('\n');

  for (let line of lines) {
    line = line.split('#')[0].trim();
    if (!line) continue;

    const tokens = line.split(/[=<>~:]+/);
    if (tokens.length > 0 && tokens[0].trim()) {
      const match = line.match(/^[a-zA-Z0-9_.-]+/);
      if (match) {
        const name = match[0];
        const versionRaw = line.slice(name.length).trim();
        const version = versionRaw || 'latest';

        deps.push({ name, version });
      }
    }
  }
  return deps;
}

export function parsePomXml(content) {
  if (!content || typeof content !== 'string') return [];

  try {
    const parser = new XMLParser({ ignoreAttributes: true });
    const parsed = parser.parse(content);

    const deps = [];
    const extractDeps = (obj) => {
      if (!obj) return;
      if (Array.isArray(obj)) {
        obj.forEach(extractDeps);
      } else if (typeof obj === 'object') {
        if (obj.groupId && obj.artifactId) {
          deps.push({
            name: `${obj.groupId}:${obj.artifactId}`,
            version: obj.version ? String(obj.version) : 'latest',
          });
        }
        Object.values(obj).forEach(extractDeps);
      }
    };

    extractDeps(parsed);
    return deps;
  } catch (err) {
    return [];
  }
}
