export async function getLatestVersion(packageName, ecosystem) {
  try {
    if (ecosystem === 'npm') {
      const res = await fetch(`https://registry.npmjs.org/${packageName}/latest`)
      const data = await res.json()
      return data.version
    }
    if (ecosystem === 'pypi') {
      const res = await fetch(`https://pypi.org/pypi/${packageName}/json`)
      const data = await res.json()
      return data.info.version
    }
    return null
  } catch {
    return null
  }
}