export function parsePackageJSON(content) {
  const parsed = JSON.parse(content);

  const dependencies = parsed.dependencies || {};
  const devDependencies = parsed.devDependencies || {};

  const allDeps = { ...dependencies, ...devDependencies };

  return Object.entries(allDeps).map(([name, version]) => ({
    name,
    version,
  }));
}