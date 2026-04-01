import { useLocation, useNavigate } from 'react-router-dom'

export default function Explanations() {
  const { state } = useLocation()
  const navigate = useNavigate()
  const scan = state?.scan

  if (!scan) {
    return (
      <div className="min-h-screen bg-slate-950 text-white flex items-center justify-center">
        <p className="text-slate-400">No scan data. <span className="text-orange-400 cursor-pointer" onClick={() => navigate('/')}>Go back</span></p>
      </div>
    )
  }

  const vulnerableDeps = scan.dependencies.filter(d => d.vulnerabilities.length > 0)

  return (
    <div className="min-h-screen bg-slate-950 text-white p-8">
      <button onClick={() => navigate(-1)} className="text-orange-400 text-sm mb-6 hover:underline">← Back</button>

      <h1 className="text-2xl font-bold mb-2">AI Risk Explanations</h1>
      <p className="text-slate-400 text-sm mb-8">{scan.repository.owner}/{scan.repository.name}</p>

      {vulnerableDeps.length === 0 ? (
        <p className="text-slate-400">No vulnerabilities found for this scan.</p>
      ) : (
        <div className="flex flex-col gap-6">
          {vulnerableDeps.map(dep => (
            <div key={dep.id} className="bg-slate-900 border border-slate-800 rounded-lg p-6">
              <div className="mb-4">
                <span className="font-semibold text-lg">{dep.name}</span>
                <span className="text-slate-400 text-sm ml-2">v{dep.version}</span>
                <span className="text-slate-500 text-xs ml-2">{dep.ecosystem}</span>
              </div>

              <div className="flex flex-col gap-4">
                {dep.vulnerabilities.map(vuln => (
                  <div key={vuln.advisoryId} className="border border-orange-900 rounded-lg p-4 bg-slate-800">
                    <div className="flex justify-between items-center mb-3">
                      <span className="font-mono text-orange-400 text-sm">{vuln.advisoryId}</span>
                      <span className={`text-xs px-2 py-0.5 rounded ${
                        vuln.severity === 'critical' ? 'bg-red-900 text-red-300' :
                        vuln.severity === 'high' ? 'bg-orange-900 text-orange-300' :
                        vuln.severity === 'medium' ? 'bg-yellow-900 text-yellow-300' :
                        'bg-slate-700 text-slate-300'
                      }`}>
                        {vuln.severity}
                      </span>
                    </div>

                    {vuln.aiExplanation ? (
                      <div className="text-sm text-slate-300 leading-relaxed whitespace-pre-line">
                        {vuln.aiExplanation}
                      </div>
                    ) : (
                      <p className="text-slate-500 text-sm italic">No AI explanation available.</p>
                    )}

                    {vuln.suggestedFix && (
                      <div className="mt-3 text-xs text-orange-400 bg-orange-950 rounded p-2">
                        Fix: {vuln.suggestedFix}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}