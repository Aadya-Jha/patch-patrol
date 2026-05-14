import axios from 'axios'

const api = axios.create({
  baseURL: (import.meta.env.VITE_BACKEND_URL ? `${import.meta.env.VITE_BACKEND_URL.replace(/\/$/, '')}/api` : '/api'),
  withCredentials: true,
})

// Add CSRF token to all mutating requests
api.interceptors.request.use((config) => {
  const csrfToken = document.cookie.split('; ').find(row => row.startsWith('csrfToken='))?.split('=')[1]
  if (csrfToken && ['post', 'put', 'delete', 'patch'].includes(config.method)) {
    config.headers['X-CSRF-Token'] = csrfToken
  }
  return config
})

export default api