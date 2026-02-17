import React from 'react';
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import { Toaster } from 'react-hot-toast';
import Game from './pages/Game';
import LegalNotices from './pages/LegalNotices';
import TermsOfService from './pages/TermsOfService';
import PWAInstallPrompt from './components/PWAInstallPrompt';


const App = () => {
  return (
    <Router>
      <Toaster
        position="top-center"
        toastOptions={{
          style: {
            background: '#1e293b',
            color: '#fff',
            border: '1px solid rgba(255,255,255,0.1)',
          },
        }}
      />
      <Routes>
        <Route path="/" element={<Game />} />
        <Route path="/privacy" element={<LegalNotices />} />
        <Route path="/terms" element={<TermsOfService />} />
      </Routes>
      <PWAInstallPrompt />
    </Router>

  );
};

export default App;
