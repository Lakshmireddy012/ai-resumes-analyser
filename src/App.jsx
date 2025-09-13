import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import Layout from './components/Layout';
import Home from './pages/Home';
import Settings from './pages/Settings';
import Analysis from './pages/Analysis';
import AnalysisDetails from './pages/AnalysisDetails';
import PdfReader from './pages/PdfReader';
import { useEffect, useState } from 'react';

function App() {
  const [savedConfigs, setSavedConfigs] = useState([]);

  const fetchLatestSettings = () => JSON.parse(localStorage.getItem('llmConfigurations') || '[]');
  useEffect(() => {
    setSavedConfigs(fetchLatestSettings());
  }, []);

  const handleSaveConfigs = () => {
    setSavedConfigs(fetchLatestSettings());
  };


  return (
    <Router>
      <Layout>
        <Routes>
          <Route 
            path="/" 
            element={savedConfigs.length > 0 ? <Home /> : <Navigate to="/settings" replace />} 
          />
          <Route 
            path="/test" 
            element={<PdfReader />} 
          />
          <Route path="/settings" element={<Settings  onSave={handleSaveConfigs}/>} />
          <Route path="/analysis" element={<Analysis />} />
          <Route path="/analysis-details/:analysisId" element={<AnalysisDetails />} />
        </Routes>
      </Layout>
    </Router>
  );
}

export default App;
