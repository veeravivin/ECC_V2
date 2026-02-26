import { Link, useLocation } from 'react-router-dom';
import { motion } from 'framer-motion';
import { LayoutDashboard, Compass, User, GraduationCap, LogOut, Layers } from 'lucide-react';

const Navbar = ({ user, onLogout }) => {
    const location = useLocation();
    const isActive = (path) => location.pathname === path;

    const navItems = [
        { name: 'Dashboard', path: '/dashboard', icon: LayoutDashboard },
        { name: 'Career Match', path: '/career-match', icon: Compass },
        { name: 'Career Path', path: '/career-path', icon: Compass },
        { name: 'My Roadmaps', path: '/my-roadmaps', icon: Layers }, // Added
        { name: 'Skill Test', path: '/skill-test', icon: GraduationCap },
        { name: 'Profile', path: '/profile', icon: User },
    ];

    return (
        <motion.nav
            initial={{ y: -100 }}
            animate={{ y: 0 }}
            className="fixed top-0 left-0 right-0 z-50 bg-white/90 backdrop-blur-md border-b border-slate-200 px-6 py-5 flex justify-between items-center shadow-sm"
        >
            <div className="text-xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-blue-600 to-purple-600">
                EthicalCompass
            </div>

            <div className="flex gap-6">
                {navItems.map((item) => (
                    <Link key={item.path} to={item.path} className={`relative group flex items-center gap-2 transition-colors font-medium ${isActive(item.path) ? 'text-blue-600' : 'text-slate-500 hover:text-slate-800'}`}>
                        <item.icon size={18} />
                        <span className="hidden md:inline">{item.name}</span>
                        {isActive(item.path) && (
                            <motion.div
                                layoutId="underline"
                                className="absolute -bottom-4 left-0 right-0 h-0.5 bg-blue-600"
                            />
                        )}
                    </Link>
                ))}
                <button onClick={onLogout} className="flex items-center gap-2 text-red-500 hover:text-red-600 ml-4 font-medium">
                    <LogOut size={18} /> <span className="hidden md:inline">Logout</span>
                </button>
            </div>
        </motion.nav>
    );
};
export default Navbar;
