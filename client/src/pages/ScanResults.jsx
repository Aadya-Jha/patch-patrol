import { useLocation, useNavigate } from 'react-router-dom'

export default function ScanResults() {
  const { state } = useLocation()
  const navigate = useNavigate()
  const scan = state?.scan

  if (!scan) {
    return (
      <div className="min-h-screen bg-gray-950 text-white flex items-center justify-center">
        <p className="text-gray-400">No scan data found. <span className="text-purple-400 cursor-pointer" onClick={() => navigate('/')}>Go back</span></p>
      </div>
    )
  }

  const { repository, summary, dependencies } = scan

  return (
    <div className="min-h-screen bg-gray-950 text-white p-8">
      {/* Header */}
      <div className="mb-8">
        <button onClick={() => navigate('/')} className="text-purple-400 text-sm mb-4 hover:underline">← Back</button>
        <h1 className="text-2xl font-bold">{repository.owner}/{repository.name}</h1>
        <p className="text-gray-400 text-sm mt-1">Scan complete</p>
      </div>

      {/* Summary cards */}
      <div className="grid grid-cols-3 gap-4 mb-8">
        <div className="bg-gray-900 border border-gray-800 rounded-lg p-4">
          <p className="text-gray-400 text-sm">Dependencies</p>
          <p className="text-2xl font-bold">{summary.dependencyCount}</p>
        </div>
        <div className="bg-gray-900 border border-gray-800 rounded-lg p-4">
          <p className="text-gray-400 text-sm">Vulnerabilities</p>
          <p className="text-2xl font-bold text-red-400">{summary.vulnerabilityCount}</p>
        </div>
        <div className="bg-gray-900 border border-gray-800 rounded-lg p-4">
          <p className="text-gray-400 text-sm">Critical</p>
          <p className="text-2xl font-bold text-orange-400">{summary.severities?.critical || 0}</p>
        </div>
      </div>

      {/* Dependencies list */}
      <div className="flex flex-col gap-4">
        {dependencies.map(dep => (
          <div key={dep.id} className="bg-gray-900 border border-gray-800 rounded-lg p-4">
            <div className="flex justify-between items-start mb-2">
              <div>
                <span className="font-semibold">{dep.name}</span>
                <span className="text-gray-400 text-sm ml-2">v{dep.version}</span>
                <span className="text-gray-500 text-xs ml-2">{dep.ecosystem}</span>
              </div>
              {dep.vulnerabilities.length > 0 && (
                <span className="text-xs bg-red-900 text-red-300 px-2 py-1 rounded">
                  {dep.vulnerabilities.length} vuln{dep.vulnerabilities.length > 1 ? 's' : ''}
                </span>
              )}
            </div>

            {dep.vulnerabilities.length > 0 && (
              <div className="flex flex-col gap-2 mt-3">
                {dep.vulnerabilities.map(vuln => (
                  <div key={vuln.advisoryId} className="bg-gray-800 rounded p-3 border border-gray-700">
                    <div className="flex justify-between items-center mb-1">
                      <span className="text-sm font-mono text-purple-400">{vuln.advisoryId}</span>
                      <span className={`text-xs px-2 py-0.5 rounded ${
                        vuln.severity === 'critical' ? 'bg-red-900 text-red-300' :
                        vuln.severity === 'high' ? 'bg-orange-900 text-orange-300' :
                        vuln.severity === 'medium' ? 'bg-yellow-900 text-yellow-300' :
                        'bg-gray-700 text-gray-300'
                      }`}>
                        {vuln.severity}
                      </span>
                    </div>
                    <p className="text-gray-400 text-xs">{vuln.description}</p>
                    {vuln.aiExplanation && (
                      <div className="mt-2 text-xs text-gray-300 bg-gray-900 rounded p-2 border border-purple-900">
                        <span className="text-purple-400 font-semibold">AI: </span>
                        {vuln.aiExplanation}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  )
}