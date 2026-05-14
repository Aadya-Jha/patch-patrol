import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import api from '../api/axios'

export default function Home() {
  const [repos, setRepos] = useState([])
  const [loading, setLoading] = useState(false)
  const [scanLoading, setScanLoading] = useState({})
  const [error, setError] = useState(null)
  const [user, setUser] = useState(null)
  const [authLoading, setAuthLoading] = useState(true)
  const navigate = useNavigate()

  useEffect(() => {
    checkAuth()
    const params = new URLSearchParams(window.location.search)
    const errorParam = params.get('error')
    if (errorParam) {
      setError(errorParam === 'auth_denied' ? 'Authorization denied by GitHub' : errorParam)
      // Clean up URL
      window.history.replaceState({}, document.title, window.location.pathname)
    }
  }, [])

  useEffect(() => {
    if (user) {
      fetchUserRepos()
    }
  }, [user])

  // Redirect authenticated users to dashboard
  useEffect(() => {
    if (!authLoading && user) {
      navigate('/dashboard')
    }
  }, [authLoading, user, navigate])

  const checkAuth = async () => {
    try {
      const res = await api.get('/auth/me')
      setUser(res.data.user)
    } catch {
      setUser(null)
    } finally {
      setAuthLoading(false)
    }
  }

  const fetchUserRepos = async () => {
    try {
      setLoading(true)
      const res = await api.get('/my-repos')
      setRepos(res.data.repositories)
      setError(null)
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to load repositories')
    } finally {
      setLoading(false)
    }
  }

  const handleLogin = () => {
    window.location.href = `/api/auth/github`;
  }

  const handleLogout = async () => {
    try {
      await api.post('/auth/logout')
      setUser(null)
      setRepos([])
    } catch (err) {
      console.error('Logout failed:', err)
    }
  }

  const handleScan = async (owner, repo) => {
    setScanLoading(prev => ({ ...prev, [`${owner}/${repo}`]: true }))
    try {
      await api.post('/repos', { owner, repo })
      const res = await api.post('/scans', { owner, repo })
      navigate(`/scan/${owner}/${repo}`, { state: { scan: res.data } })
    } catch (err) {
      setError(err.response?.data?.error || 'Scan failed.')
    } finally {
      setScanLoading(prev => ({ ...prev, [`${owner}/${repo}`]: false }))
    }
  }

  if (authLoading) {
    return (
      <div className="min-h-screen bg-slate-950 text-white flex items-center justify-center">
        <p className="text-slate-400">Loading...</p>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-slate-950 text-white flex flex-col items-center p-8">
      <div className="w-full max-w-4xl">
        {/* Header */}
        <div className="flex justify-between items-center mb-8">
          <div>
            <h1 className="text-4xl font-bold text-orange-400">Patch Patrol</h1>
            <p className="text-slate-400 mt-1">Scan your GitHub repositories for vulnerabilities</p>
          </div>
          {user && (
            <div className="flex items-center gap-3">
              {user.avatarUrl && (
                <img src={user.avatarUrl} alt="" className="w-10 h-10 rounded-full border border-slate-700" />
              )}
              <div className="text-right">
                <p className="text-sm font-medium">@{user.username}</p>
                <button
                  onClick={handleLogout}
                  className="text-xs text-slate-400 hover:text-white"
                >
                  Logout
                </button>
              </div>
            </div>
          )}
        </div>

        {!user ? (
          // Login prompt
          <div className="bg-slate-900 border border-orange-900 rounded-xl p-12 text-center">
            <p className="text-slate-300 mb-6">
              Connect your GitHub account to view and scan your repositories.
            </p>
            <button
              onClick={handleLogin}
              className="bg-[#24292e] hover:bg-[#2f363d] text-white font-semibold py-3 px-6 rounded-lg transition flex items-center justify-center gap-3 mx-auto text-lg"
            >
              <svg height="24" viewBox="0 0 16 16" width="24" fill="currentColor">
                <path d="M8 0C3.58 0 0 3.58 0 8c0 3.54 2.29 6.53 5.47 7.59.4.07.55-.17.55-.38 0-.19-.01-.82-.01-1.49-2.01.37-2.53-.49-2.69-.94-.09-.23-.48-.94-.82-1.13-.28-.15-.68-.52-.01-.53.63-.01 1.08.58 1.23.82.72 1.21 1.87.87 2.33.66.07-.52.28-.87.51-1.07-1.78-.2-3.64-.89-3.64-3.95 0-.87.31-1.59.82-2.15-.08-.2-.36-1.02.08-2.12 0 0 .67-.21 2.2.82.64-.18 1.32-.27 2-.27.68 0 1.36.09 2 .27 1.53-1.04 2.2-.82 2.2-.82.44 1.1.16 1.92.08 2.12.51.56.82 1.27.82 2.15 0 3.07-1.87 3.75-3.65 3.95.29.25.54.73.54 1.48 0 1.07-.01 1.93-.01 2.2 0 .21.15.46.55.38A8.013 8.013 0 0016 8c0-4.42-3.58-8-8-8z"/>
              </svg>
              Connect with GitHub
            </button>
          </div>
        ) : (
          // Repository list
          <div>
            <div className="mb-6">
              <h2 className="text-2xl font-semibold mb-2">Your Repositories</h2>
              <p className="text-slate-400">
                Select a repository to scan for vulnerabilities
              </p>
            </div>

            {loading ? (
              <div className="text-center py-12">
                <p className="text-slate-400">Loading repositories...</p>
              </div>
            ) : repos.length === 0 ? (
              <div className="bg-slate-900 border border-slate-700 rounded-xl p-8 text-center">
                <p className="text-slate-400 mb-2">No repositories found</p>
                <p className="text-sm text-slate-500">
                  Make sure you have at least one repository you own or collaborate on.
                </p>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {repos.map((repo) => (
                  <div
                    key={`${repo.owner}/${repo.name}`}
                    className="bg-slate-900 border border-slate-700 rounded-lg p-5 hover:border-orange-600 transition group"
                  >
                    <div className="flex justify-between items-start mb-3">
                      <div className="min-w-0">
                        <h3 className="font-semibold text-lg truncate">
                          {repo.name}
                        </h3>
                        <p className="text-sm text-slate-400">{repo.owner}</p>
                      </div>
                      {repo.isRegistered && (
                        <span className="text-xs bg-green-900 text-green-300 px-2 py-1 rounded">
                          Scanned
                        </span>
                      )}
                    </div>

                    {repo.description && (
                      <p className="text-sm text-slate-300 mb-4 line-clamp-2">
                        {repo.description}
                      </p>
                    )}

                    <div className="flex flex-wrap gap-2 mb-4 text-xs text-slate-500">
                      {repo.language && (
                        <span className="px-2 py-1 bg-slate-800 rounded">{repo.language}</span>
                      )}
                      <span className="px-2 py-1 bg-slate-800 rounded capitalize">
                        {repo.visibility}
                      </span>
                      {repo.private && (
                        <span className="px-2 py-1 bg-slate-800 rounded">Private</span>
                      )}
                    </div>

                    <button
                      onClick={() => handleScan(repo.owner, repo.name)}
                      disabled={scanLoading[`${repo.owner}/${repo.name}`]}
                      className="w-full bg-orange-600 hover:bg-orange-500 disabled:opacity-50 disabled:cursor-not-allowed text-white font-medium py-2 px-4 rounded transition"
                    >
                      {scanLoading[`${repo.owner}/${repo.name}`] ? 'Scanning...' : 'Scan Repository'}
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {error && (
          <div className="mt-6 p-4 bg-red-900/30 border border-red-800 rounded-lg text-red-300">
            {error}
            {repos.length === 0 && user && (
              <button
                onClick={fetchUserRepos}
                className="ml-2 text-sm underline hover:no-underline"
              >
                Retry
              </button>
            )}
          </div>
        )}

        <p className="text-slate-600 text-xs mt-12 text-center">
          Powered by OSV · AI risk analysis included
        </p>
      </div>
    </div>
  )
}
