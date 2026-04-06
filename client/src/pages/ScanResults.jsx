import { useState, useEffect } from 'react'
import { getLatestVersion } from '../api/registry'
import { useLocation, useNavigate } from 'react-router-dom'
import { PieChart, Pie, Cell, Tooltip, Legend, ResponsiveContainer } from 'recharts'

function getRiskLevel(severities) {
  if (severities?.critical > 0) return { label: 'Critical Risk', color: 'text-red-400', border: 'border-red-800', bg: 'bg-red-950' }
  if (severities?.high > 0) return { label: 'High Risk', color: 'text-orange-400', border: 'border-orange-800', bg: 'bg-orange-950' }
  if (severities?.medium > 0) return { label: 'Medium Risk', color: 'text-yellow-400', border: 'border-yellow-800', bg: 'bg-yellow-950' }
  if (severities?.low > 0) return { label: 'Low Risk', color: 'text-green-400', border: 'border-green-800', bg: 'bg-green-950' }
  if (severities?.unknown > 0) return { label: 'Unknown Risk', color: 'text-gray-400', border: 'border-gray-700', bg: 'bg-gray-900' }
  return { label: 'No Risk Detected', color: 'text-slate-400', border: 'border-slate-700', bg: 'bg-slate-900' }
}

function getVersionGap(current, latest) {
  if (!current || !latest) return null
  const clean = v => v.replace(/[\^~>=<]/g, '').trim()
  const c = clean(current).split('.').map(Number)
  const l = clean(latest).split('.').map(Number)
  
  if (l[0] > c[0]) return { label: `${latest} available`, level: 'major', color: 'text-red-400' }
  if (l[1] > c[1]) return { label: `${latest} available`, level: 'minor', color: 'text-yellow-400' }
  if (l[2] > c[2]) return { label: `${latest} available`, level: 'patch', color: 'text-blue-400' }
  return { label: 'Up to date', level: 'current', color: 'text-green-400' }
}

const COLORS = {
  critical: '#f87171',
  high: '#fb923c',
  medium: '#facc15',
  low: '#4ade80',
  unknown: '#64748b',
}

export default function ScanResults() {
  const { state } = useLocation()
  const navigate = useNavigate()
  const scan = state?.scan
  const dependencies = scan?.dependencies || []  // ← move this up
  const [latestVersions, setLatestVersions] = useState({})

  useEffect(() => {
    if (!dependencies.length) return
    
    async function fetchVersions() {
      const versions = {}
      for (const dep of dependencies) {
        const latest = await getLatestVersion(dep.name, dep.ecosystem)
        if (latest) versions[dep.name] = latest
      }
      setLatestVersions(versions)
    }
    
    fetchVersions()
  }, [dependencies.length])

  if (!scan) {
    return (
      <div className="min-h-screen bg-slate-950 text-white flex items-center justify-center">
        <p className="text-slate-400">No scan data. <span className="text-orange-400 cursor-pointer" onClick={() => navigate('/')}>Go back</span></p>
      </div>
    )
  }

  const { repository, summary } = scan
  const risk = getRiskLevel(summary.severities)

  const chartData = Object.entries(summary.severities || {})
    .filter(([_, count]) => count > 0)
    .map(([severity, count]) => ({
      name: severity.charAt(0).toUpperCase() + severity.slice(1),
      value: count,
      color: COLORS[severity] || '#94a3b8'
    }))

  return (
    <div className="min-h-screen bg-slate-950 text-white p-8">
      {/* Header */}
      <div className="mb-8 flex items-center gap-4">
        <button onClick={() => navigate('/')} className="text-orange-400 text-sm hover:underline">← Back</button>
        <button
          onClick={() => navigate(`/scan/${scan.scan.id}/explanations`, { state: { scan } })}
          className="text-sm bg-orange-700 hover:bg-orange-600 px-3 py-1 rounded"
        >
          View AI Explanations
        </button>
      </div>

      <h1 className="text-2xl font-bold">{repository.owner}/{repository.name}</h1>
      <p className="text-slate-400 text-sm mt-1 mb-8">Scan complete</p>

      {/* Scorecard */}
      <div className={`rounded-xl border ${risk.border} ${risk.bg} p-6 mb-8 flex items-center justify-between`}>
        <div>
          <p className="text-slate-400 text-sm mb-1">Overall Risk Assessment</p>
          <p className={`text-3xl font-bold ${risk.color}`}>{risk.label}</p>
          <p className="text-slate-500 text-xs mt-1">{summary.dependencyCount} dependencies scanned · {summary.vulnerabilityCount} vulnerabilities found</p>
        </div>
        <div className={`text-6xl font-black ${risk.color} opacity-20`}>
          {summary.severities?.critical > 0 ? '!' : summary.vulnerabilityCount > 0 ? '⚠' : '✓'}
        </div>
      </div>

      {/* Summary cards + Chart */}
      <div className="grid grid-cols-2 gap-6 mb-8">
        {/* Severity cards */}
        <div className="grid grid-cols-3 gap-4">
          <div className="bg-slate-900 border border-slate-800 rounded-lg p-4">
            <p className="text-slate-400 text-sm">Dependencies</p>
            <p className="text-2xl font-bold">{summary.dependencyCount}</p>
          </div>
          <div className="bg-slate-900 border border-slate-800 rounded-lg p-4">
            <p className="text-slate-400 text-sm">Vulnerabilities</p>
            <p className="text-2xl font-bold text-red-400">{summary.vulnerabilityCount}</p>
          </div>
          <div className="bg-slate-900 border border-slate-800 rounded-lg p-4">
            <p className="text-slate-400 text-sm">Critical</p>
            <p className="text-2xl font-bold text-red-400">{summary.severities?.critical || 0}</p>
          </div>
          <div className="bg-slate-900 border border-slate-800 rounded-lg p-4">
            <p className="text-slate-400 text-sm">High</p>
            <p className="text-2xl font-bold text-orange-400">{summary.severities?.high || 0}</p>
          </div>
          <div className="bg-slate-900 border border-slate-800 rounded-lg p-4">
            <p className="text-slate-400 text-sm">Medium</p>
            <p className="text-2xl font-bold text-yellow-400">{summary.severities?.medium || 0}</p>
          </div>
          <div className="bg-slate-900 border border-slate-800 rounded-lg p-4">
            <p className="text-slate-400 text-sm">Low</p>
            <p className="text-2xl font-bold text-green-400">{summary.severities?.low || 0}</p>
          </div>
          <div className="bg-slate-900 border border-slate-800 rounded-lg p-4">
            <p className="text-slate-400 text-sm">Unknown</p>
            <p className="text-2xl font-bold text-gray-400">{summary.severities?.unknown || 0}</p>
          </div>
        </div>

        {/* Pie chart */}
        <div className="bg-slate-900 border border-slate-800 rounded-lg p-4 flex flex-col justify-center">
          <p className="text-slate-400 text-sm mb-4">Vulnerability Breakdown</p>
          {chartData.length > 0 ? (
            <ResponsiveContainer width="100%" height={220}>
              <PieChart>
                <Pie
                  data={chartData}
                  cx="50%"
                  cy="50%"
                  innerRadius={60}
                  outerRadius={90}
                  paddingAngle={3}
                  dataKey="value"
                >
                  {chartData.map((entry, index) => (
                    <Cell key={index} fill={entry.color} />
                  ))}
                </Pie>
                <Tooltip
                  contentStyle={{ backgroundColor: '#1e293b', border: '1px solid #334155', borderRadius: '8px' }}
                  labelStyle={{ color: '#94a3b8' }}
                />
                <Legend
                  formatter={(value) => <span style={{ color: '#94a3b8' }}>{value}</span>}
                />
              </PieChart>
            </ResponsiveContainer>
          ) : (
            <div className="flex items-center justify-center h-48 text-slate-500">
              No vulnerabilities to display
            </div>
          )}
        </div>
      </div>

      {/* Dependencies list */}
      <h2 className="text-lg font-semibold mb-4">Dependencies</h2>
      <div className="flex flex-col gap-4">
        {dependencies.map(dep => (
          <div key={dep.id} className="bg-slate-900 border border-orange-900 rounded-lg p-4">
            <div className="flex justify-between items-start mb-2">
              <div>
                <span className="font-semibold">{dep.name}</span>
                <span className="text-slate-400 text-sm ml-2">v{dep.version}</span>
                <span className="text-slate-500 text-xs ml-2">{dep.ecosystem}</span>
                {latestVersions[dep.name] && (() => {
                  const gap = getVersionGap(dep.version, latestVersions[dep.name])
                  return (
                  <span className={`text-xs ml-2 ${gap.color}`}>
                    {gap.level !== 'current' && '↑ '}{gap.label}
                  </span>
                  )
                  })()}
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
                  <div key={vuln.advisoryId} className="bg-slate-800 rounded p-3 border border-slate-700">
                    <div className="flex justify-between items-center mb-1">
                      <span className="text-sm font-mono text-orange-400">{vuln.advisoryId}</span>
                      <span className={`text-xs px-2 py-0.5 rounded ${
                        vuln.severity === 'critical' ? 'bg-red-900 text-red-300' :
                        vuln.severity === 'high' ? 'bg-orange-900 text-orange-300' :
                        vuln.severity === 'medium' ? 'bg-yellow-900 text-yellow-300' :
                        vuln.severity === 'low' ? 'bg-green-900 text-green-300' :
                        'bg-gray-700 text-gray-300'
                      }`}>
                        {vuln.severity}
                      </span>
                    </div>
                    <p className="text-slate-400 text-xs">{vuln.description}</p>
                    {vuln.aiExplanation && (
                      <div className="mt-2 text-xs text-slate-300 bg-slate-900 rounded p-2 border border-orange-900">
                        <span className="text-orange-400 font-semibold">AI: </span>
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