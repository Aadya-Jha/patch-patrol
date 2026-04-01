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
    await api.post('/repos', { 
      owner, 
      repo, 
      githubToken: import.meta.env.VITE_GITHUB_TOKEN 
    })
    
    const res = await api.post('/scans', { owner, repo })
    navigate(`/scan/${owner}/${repo}`, { state: { scan: res.data } })
  } catch (err) {
    setError(err.response?.data?.error || 'Scan failed.')
  } finally {
    setLoading(false)
  }
}

  return (
    <div className="min-h-screen bg-gray-950 text-white flex flex-col items-center justify-center gap-6">
      <h1 className="text-3xl font-bold">Patch Patrol</h1>
      <p className="text-gray-400">Scan your GitHub repo for vulnerabilities</p>

      <div className="flex flex-col gap-3 w-80">
        <input
          className="bg-gray-800 border border-gray-700 rounded px-4 py-2 focus:outline-none focus:border-purple-500"
          placeholder="GitHub owner"
          value={owner}
          onChange={e => setOwner(e.target.value)}
        />
        <input
          className="bg-gray-800 border border-gray-700 rounded px-4 py-2 focus:outline-none focus:border-purple-500"
          placeholder="Repository name"
          value={repo}
          onChange={e => setRepo(e.target.value)}
        />
        <button
          onClick={handleScan}
          disabled={loading || !owner || !repo}
          className="bg-purple-600 hover:bg-purple-700 disabled:opacity-50 rounded px-4 py-2 font-semibold transition"
        >
          {loading ? 'Scanning...' : 'Scan Repository'}
        </button>
        {error && <p className="text-red-400 text-sm">{error}</p>}
      </div>
    </div>
  )
}