import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import api from '../api/axios'

export default function Home() {
  const [owner, setOwner] = useState('')
  const [repo, setRepo] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(null)
  const navigate = useNavigate()

  const handleScan = async () => {
    setLoading(true)
    setError(null)
    try {
      await api.post('/repos', { owner, repo })
      const res = await api.post('/scans', { owner, repo })
      navigate(`/scan/${owner}/${repo}`, { state: { scan: res.data } })
    } catch (err) {
      setError(err.response?.data?.error || 'Scan failed.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-slate-950 text-white flex flex-col items-center justify-center gap-6">
      <div className="text-center">
        <h1 className="text-4xl font-bold text-orange-400">Patch Patrol</h1>
        <p className="text-slate-400 mt-2">Scan your GitHub repository for vulnerabilities</p>
      </div>

      <div className="bg-slate-900 border border-orange-900 rounded-xl p-8 w-96 flex flex-col gap-4 shadow-lg">
        <div className="flex flex-col gap-1">
          <label className="text-sm text-slate-400">GitHub Owner</label>
          <input
            className="bg-slate-800 border border-slate-700 rounded-lg px-4 py-2 focus:outline-none focus:border-orange-500 transition"
            placeholder="repoOwner"
            value={owner}
            onChange={e => setOwner(e.target.value)}
          />
        </div>

        <div className="flex flex-col gap-1">
          <label className="text-sm text-slate-400">Repository Name</label>
          <input
            className="bg-slate-800 border border-slate-700 rounded-lg px-4 py-2 focus:outline-none focus:border-orange-500 transition"
            placeholder="repoName"
            value={repo}
            onChange={e => setRepo(e.target.value)}
          />
        </div>

        <button
          onClick={handleScan}
          disabled={loading || !owner || !repo}
          className="bg-orange-600 hover:bg-orange-500 disabled:opacity-50 disabled:cursor-not-allowed rounded-lg px-4 py-2 font-semibold transition mt-2"
        >
          {loading ? 'Scanning...' : 'Scan Repository'}
        </button>

        {error && <p className="text-red-400 text-sm text-center">{error}</p>}
      </div>

      <p className="text-slate-600 text-xs">Powered by OSV · AI risk analysis included</p>
    </div>
  )
}