import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import Navbar from './components/Navbar';
import Home from './pages/Home';
import ChatbotPage from './pages/ChatbotPage';
import DoctorConsultPage from './pages/DoctorConsultPage';
import NearbyStoresPage from './pages/NearbyStoresPage';
import DoctorDashboard from './pages/DoctorDashboard';
import LoginPortal from './pages/LoginPortal';
import ProfilePage from './pages/ProfilePage';
import AuthCallback from './pages/AuthCallback';

function App() {
  return (
    <Router>
      <Routes>
        <Route path="/login"         element={<LoginPortal />} />
        <Route path="/auth/callback" element={<AuthCallback />} />
        <Route path="/*" element={
          <>
            <Navbar />
            <main className="container" style={{ marginTop: '100px' }}>
              <Routes>
                <Route path="/" element={<Home />} />
                <Route path="/chatbot" element={<ChatbotPage />} />
                <Route path="/consult" element={<DoctorConsultPage />} />
                <Route path="/pharmacy" element={<NearbyStoresPage />} />
                <Route path="/doctor-dashboard" element={<DoctorDashboard />} />
                <Route path="/profile" element={<ProfilePage />} />
              </Routes>
            </main>
          </>
        } />
      </Routes>
    </Router>
  );
}

export default App;
