import { Routes, Route } from 'react-router-dom'
import Home from './pages/Home'
import ScanResults from './pages/ScanResults'
import Explanations from './pages/Explanations'
import Dashboard from './pages/Dashboard'

function App() {
  return (
    <Routes>
      <Route path="/" element={<Home />} />
      <Route path="/scan/:owner/:repo" element={<ScanResults />} />
      <Route path="/scan/:scanId/explanations" element={<Explanations />} />
      <Route path="/dashboard" element={<Dashboard />} />
    </Routes>
  )
}

export default App;