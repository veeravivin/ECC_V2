import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import {
    Users,
    Layers,
    CheckSquare,
    Zap,
    Activity,
    Clock,
    TrendingUp,
    ShieldCheck,
    LogOut,
    RefreshCcw,
    CircleDot,
    Database
} from 'lucide-react';
import axios from 'axios';
import toast from 'react-hot-toast';

const AdminDashboard = () => {
    const [stats, setStats] = useState(null);
    const [usage, setUsage] = useState(null);
    const [loading, setLoading] = useState(true);

    const fetchData = async () => {
        try {
            const [statsRes, usageRes] = await Promise.all([
                axios.get('/api/admin/stats'),
                axios.get('/api/admin/usage')
            ]);
            setStats(statsRes.data);
            setUsage(usageRes.data);
        } catch (err) {
            console.error(err);
            toast.error("Failed to fetch admin data");
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchData();
        const interval = setInterval(fetchData, 60000); // refresh every minute
        return () => clearInterval(interval);
    }, []);

    const logout = () => {
        localStorage.removeItem('admin_user');
        localStorage.removeItem('is_admin');
        window.location.href = '/admin/login';
    };

    if (loading) {
        return (
            <div className="min-h-screen bg-slate-950 flex flex-col items-center justify-center gap-4">
                <div className="w-12 h-12 border-4 border-blue-500/20 border-t-blue-500 rounded-full animate-spin"></div>
                <p className="text-slate-400 font-bold animate-pulse tracking-widest uppercase text-xs">Loading Admin Core...</p>
            </div>
        );
    }

    const usagePercent = Math.min(100, Math.round((usage?.current / usage?.limit) * 100));

    return (
        <div className="min-h-screen bg-slate-950 text-slate-200 p-6 md:p-10 font-sans selection:bg-blue-500/30">
            {/* Nav Header */}
            <div className="max-w-7xl mx-auto flex justify-between items-center mb-12">
                <div className="flex items-center gap-3">
                    <div className="p-2 bg-blue-600 rounded-lg text-white">
                        <ShieldCheck size={24} />
                    </div>
                    <div>
                        <h1 className="text-2xl font-black text-white tracking-tight italic">COMPASS<span className="text-blue-500">ADMIN</span></h1>
                        <p className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">System Monitoring Station</p>
                    </div>
                </div>
                <button
                    onClick={() => window.location.href = '/admin/db'}
                    className="flex items-center gap-2 px-4 py-2 bg-blue-600 rounded-xl hover:bg-blue-700 transition-all font-bold text-sm shadow-lg shadow-blue-500/20 mr-2"
                >
                    <Database size={16} /> DB Browser
                </button>
                <button
                    onClick={logout}
                    className="flex items-center gap-2 px-4 py-2 bg-slate-900 border border-slate-800 rounded-xl hover:bg-red-900/20 hover:border-red-600/50 hover:text-red-500 transition-all font-bold text-sm"
                >
                    <LogOut size={16} /> Logout
                </button>
            </div>

            <div className="max-w-7xl mx-auto space-y-8">
                {/* Stats Grid */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                    {[
                        { label: 'Total Users', value: stats?.users, icon: Users, color: 'text-blue-500', bg: 'bg-blue-500/10' },
                        { label: 'Active Roadmaps', value: stats?.roadmaps, icon: Layers, color: 'text-purple-500', bg: 'bg-purple-500/10' },
                        { label: 'Skill Tests Taken', value: stats?.tests, icon: CheckSquare, color: 'text-emerald-500', bg: 'bg-emerald-500/10' },
                    ].map((card, i) => (
                        <motion.div
                            key={i}
                            initial={{ opacity: 0, y: 20 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ delay: i * 0.1 }}
                            className="bg-slate-900/50 border border-slate-800 p-6 rounded-3xl relative overflow-hidden group hover:border-slate-700 transition-all"
                        >
                            <div className="relative z-10 flex items-center gap-4">
                                <div className={`p-4 ${card.bg} ${card.color} rounded-2xl group-hover:scale-110 transition-transform`}>
                                    <card.icon size={28} />
                                </div>
                                <div>
                                    <p className="text-xs font-bold text-slate-500 uppercase tracking-wider">{card.label}</p>
                                    <h3 className="text-3xl font-black text-white">{card.value || 0}</h3>
                                </div>
                            </div>
                            <div className="absolute -bottom-4 -right-4 text-white/5 opacity-0 group-hover:opacity-100 transition-opacity">
                                <card.icon size={120} />
                            </div>
                        </motion.div>
                    ))}
                </div>

                <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                    {/* AI USAGE DASHBOARD */}
                    <motion.div
                        initial={{ opacity: 0, x: -20 }}
                        animate={{ opacity: 1, x: 0 }}
                        className="lg:col-span-2 space-y-8"
                    >
                        <div className="bg-slate-900/80 border border-slate-800 rounded-[32px] p-8 relative overflow-hidden">
                            <div className="absolute top-0 right-0 p-32 bg-blue-600/5 blur-[80px] rounded-full"></div>

                            <div className="flex items-center justify-between mb-10 relative z-10">
                                <div>
                                    <h2 className="text-xl font-bold text-white flex items-center gap-2">
                                        <Zap className="text-amber-400" size={24} /> AI Processing Core
                                    </h2>
                                    <p className="text-slate-500 text-xs font-medium mt-1">Real-time LLM usage monitoring</p>
                                </div>
                                <div className="text-right">
                                    <div className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1 flex items-center justify-end gap-1">
                                        <Clock size={12} /> Reset In
                                    </div>
                                    <div className="text-lg font-black text-white">{usage?.resetInMinutes}m</div>
                                </div>
                            </div>

                            <div className="space-y-6 relative z-10">
                                <div className="flex justify-between items-end mb-2">
                                    <div>
                                        <div className="text-4xl font-black text-white mb-1">{usage?.current}<span className="text-slate-600 text-xl font-medium"> / {usage?.limit}</span></div>
                                        <p className="text-xs font-bold text-slate-500 uppercase tracking-wider">AI API Calls Today</p>
                                    </div>
                                    <div className={`px-3 py-1.5 rounded-full text-[10px] font-black uppercase tracking-tighter shadow-lg ${usagePercent > 80 ? 'bg-red-500 text-white shadow-red-500/20' : 'bg-blue-600 text-white shadow-blue-500/20'}`}>
                                        {usagePercent}% Load Capacity
                                    </div>
                                </div>
                                <div className="h-4 bg-slate-800 rounded-full overflow-hidden p-1 shadow-inner">
                                    <motion.div
                                        initial={{ width: 0 }}
                                        animate={{ width: `${usagePercent}%` }}
                                        className={`h-full rounded-full shadow-lg ${usagePercent > 80 ? 'bg-gradient-to-r from-red-500 to-rose-600' : 'bg-gradient-to-r from-blue-500 to-indigo-600'}`}
                                    ></motion.div>
                                </div>

                                <div className="grid grid-cols-2 gap-4 mt-8 pt-8 border-t border-slate-800/50">
                                    <div>
                                        <div className="text-xs font-bold text-slate-500 uppercase tracking-widest mb-2 flex items-center gap-1.5">
                                            <CircleDot size={12} className="text-emerald-500" /> Operational Status
                                        </div>
                                        <p className="text-sm font-bold text-white">All Systems Nominal</p>
                                    </div>
                                    <div>
                                        <div className="text-xs font-bold text-slate-500 uppercase tracking-widest mb-2 flex items-center gap-1.5">
                                            <TrendingUp size={12} className="text-blue-500" /> Peak Performance
                                        </div>
                                        <p className="text-sm font-bold text-white">Gemini 1.5 Flash High-Priority</p>
                                    </div>
                                </div>
                            </div>
                        </div>

                        {/* Recent Usage Table */}
                        <div className="bg-slate-900/50 border border-slate-800 rounded-[32px] p-8">
                            <h3 className="text-lg font-bold text-white mb-6 flex items-center gap-2">
                                <Activity size={20} className="text-slate-400" /> Endpoint Distribution
                            </h3>
                            <div className="space-y-4">
                                {usage?.endpointUsage?.map((item, idx) => (
                                    <div key={idx} className="flex items-center justify-between p-4 bg-slate-950/50 rounded-2xl border border-slate-900 hover:border-slate-800 transition-colors">
                                        <div className="flex items-center gap-3">
                                            <div className="w-2 h-2 rounded-full bg-blue-500 shadow-[0_0_8px_rgba(59,130,246,0.5)]"></div>
                                            <span className="text-sm font-mono text-slate-400">{item.endpoint}</span>
                                        </div>
                                        <span className="text-sm font-black text-white px-3 py-1 bg-slate-800 rounded-lg">{item.count} hits</span>
                                    </div>
                                ))}
                            </div>
                        </div>
                    </motion.div>

                    {/* SIDECAR: LATEST ENTITIES */}
                    <motion.div
                        initial={{ opacity: 0, x: 20 }}
                        animate={{ opacity: 1, x: 0 }}
                        className="space-y-8"
                    >
                        <div className="bg-slate-900/50 border border-slate-800 rounded-[32px] p-8 h-full">
                            <h3 className="text-lg font-bold text-white mb-8 flex items-center gap-2">
                                <Users size={20} className="text-blue-500" /> Recent Onboarding
                            </h3>
                            <div className="space-y-6">
                                {stats?.recentUsers?.map((u, i) => (
                                    <div key={i} className="flex items-start gap-4 group">
                                        <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-slate-800 to-slate-900 flex items-center justify-center text-slate-400 group-hover:from-blue-600 group-hover:to-indigo-600 group-hover:text-white transition-all">
                                            {u.name.charAt(0)}
                                        </div>
                                        <div className="flex-1 min-w-0">
                                            <div className="text-sm font-bold text-white truncate">{u.name}</div>
                                            <div className="text-xs text-slate-500 truncate mb-1">{u.email}</div>
                                            <div className="text-[10px] font-bold text-slate-600 uppercase tracking-tighter">Joined {new Date(u.created_at).toLocaleDateString()}</div>
                                        </div>
                                    </div>
                                ))}
                                {stats?.recentUsers?.length === 0 && <p className="text-center py-10 text-slate-600 italic">No users found</p>}
                            </div>

                            <div className="mt-12 pt-8 border-t border-slate-800">
                                <div className="p-6 bg-blue-600/5 border border-blue-500/20 rounded-2xl">
                                    <h4 className="text-xs font-black text-blue-500 uppercase tracking-[0.2em] mb-4">System Alerts</h4>
                                    <div className="flex items-center gap-3 text-slate-400">
                                        <div className="p-1 bg-emerald-500 rounded-full animate-pulse"></div>
                                        <span className="text-xs font-medium">Database connectivity: 100%</span>
                                    </div>
                                    <div className="flex items-center gap-3 text-slate-400 mt-3">
                                        <div className="p-1 bg-emerald-500 rounded-full animate-pulse"></div>
                                        <span className="text-xs font-medium">AI Webhook: Responsive</span>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </motion.div>
                </div>
            </div>
        </div>
    );
};

export default AdminDashboard;
