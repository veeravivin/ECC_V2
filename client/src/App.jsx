import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import Login from './pages/Login';
import Dashboard from './pages/Dashboard';
import Profile from './pages/Profile';
import CareerMatch from './pages/CareerMatch';
import SkillTest from './pages/SkillTest';
import CareerPath from './pages/CareerPath';
import MyRoadmaps from './pages/MyRoadmaps';
import RoadmapTracker from './pages/RoadmapTracker';
import LandingPage from './pages/LandingPage';
import PublicProfile from './pages/PublicProfile';
import Navbar from './components/Navbar';
import AdminLogin from './pages/AdminLogin';
import AdminDashboard from './pages/AdminDashboard';
import AdminDBBrowser from './pages/AdminDBBrowser';
import { useState, useEffect } from 'react';

function App() {
    const [user, setUser] = useState(null);
    const [adminUser, setAdminUser] = useState(() => {
        const saved = localStorage.getItem('admin_user');
        return saved ? JSON.parse(saved) : null;
    });

    useEffect(() => {
        const savedUser = localStorage.getItem('user');
        if (savedUser) {
            setUser(JSON.parse(savedUser));
        }
    }, []);

    return (
        <Router>
            {user && <Navbar user={user} onLogout={() => {
                localStorage.removeItem('user');
                setUser(null);
            }} />}
            <div className={user ? "pt-24 container mx-auto px-4" : "w-full"}>
                <Routes>
                    <Route path="/" element={!user ? <LandingPage /> : <Navigate to="/dashboard" />} />
                    <Route path="/login" element={!user ? <Login onLogin={setUser} /> : <Navigate to="/dashboard" />} />
                    <Route path="/dashboard" element={user ? <Dashboard user={user} /> : <Navigate to="/" />} />
                    <Route path="/profile" element={user ? <Profile user={user} setUser={setUser} /> : <Navigate to="/" />} />
                    <Route path="/career-match" element={user ? <CareerMatch user={user} /> : <Navigate to="/" />} />
                    <Route path="/career-path" element={user ? <CareerPath user={user} /> : <Navigate to="/" />} />
                    <Route path="/my-roadmaps" element={user ? <MyRoadmaps user={user} /> : <Navigate to="/" />} />
                    <Route path="/roadmap-tracker" element={user ? <RoadmapTracker user={user} /> : <Navigate to="/" />} />
                    <Route path="/skill-test" element={user ? <SkillTest user={user} /> : <Navigate to="/" />} />
                    <Route path="/public/profile/:id" element={<PublicProfile />} />

                    {/* Admin Routes */}
                    <Route path="/admin/login" element={<AdminLogin onLogin={setAdminUser} />} />
                    <Route path="/admin/dashboard" element={adminUser ? <AdminDashboard /> : <Navigate to="/admin/login" />} />
                    <Route path="/admin/db" element={adminUser ? <AdminDBBrowser /> : <Navigate to="/admin/login" />} />
                </Routes>
            </div>
        </Router>
    );
}

export default App;
