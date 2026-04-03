export function analyzeTransitiveDependencies(dependencyTree, vulnerabilities) {
  const results = [];

  function findPath(node, target, path = []) {
    const currentPath = [...path, node.name];

    if (node.name === target) {
      return currentPath;
    }

    if (!node.dependencies) return null;

    for (const dep of node.dependencies) {
      const found = findPath(dep, target, currentPath);
      if (found) return found;
    }

    return null;
  }

  for (const vuln of vulnerabilities) {
    let chain = null;

    for (const root of dependencyTree) {
      chain = findPath(root, vuln.dependencyKey);
      if (chain) break;
    }

    if (chain) {
      results.push({
        ...vuln,
        rootDependency: chain[0],
        dependencyChain: chain
      });
    } else {
      results.push(vuln);
    }
  }

  return results;
}