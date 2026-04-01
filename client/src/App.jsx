import { Routes, Route } from 'react-router-dom'
import Home from './pages/Home'
import ScanResults from './pages/ScanResults'
import Explanations from './pages/Explanations'

function App() {
  return (
    <Routes>
      <Route path="/" element={<Home />} />
      <Route path="/scan/:owner/:repo" element={<ScanResults />} />
      <Route path="/scan/:scanId/explanations" element={<Explanations />} />
    </Routes>
  )
}

export default App;