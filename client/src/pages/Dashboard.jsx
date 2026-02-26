import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Link, useNavigate } from 'react-router-dom';
import { ArrowRight, TrendingUp, Triangle, BookOpen, PenTool, Zap, Globe, Cpu, ShieldCheck, Loader2 } from 'lucide-react';
import axios from 'axios';
import JobRecommendations from '../components/JobRecommendations';

const Dashboard = ({ user }) => {
    const navigate = useNavigate();
    const [trends, setTrends] = useState(null);
    const [recJobs, setRecJobs] = useState([]);
    const [loading, setLoading] = useState(true);
    const [skills, setSkills] = useState([]);
    const [analyzingJobs, setAnalyzingJobs] = useState(false);

    // Fetch Data
    // Dedicated helper for fetching jobs with optional refresh
    const fetchJobs = async (userEmail, userSkills, userLoc, forceRefresh = false) => {
        if (!userEmail || !userSkills || userSkills.length === 0) return;

        setAnalyzingJobs(true);
        try {
            const jobRes = await axios.post('/api/ai/jobs', {
                skills: userSkills,
                email: userEmail,
                experience_summary: "General Developer", // Simplified for now, or fetch from profile if needed
                location: userLoc || "Remote",
                force_refresh: forceRefresh
            });
            setRecJobs(jobRes.data);
        } catch (e) {
            console.error("Job fetch failed", e);
        } finally {
            setAnalyzingJobs(false);
        }
    };

    // Main Refresh Handler passed to Child Component
    const handleJobRefresh = async () => {
        if (!user?.email) return;
        // Re-fetch profile to ensure we have latest skills/location before refreshing jobs
        try {
            const profileRes = await axios.get(`/api/profile?email=${encodeURIComponent(user.email)}`);
            const freshSkills = profileRes.data.skills || [];
            const freshLoc = profileRes.data.personalDetails?.location || "Remote";

            // Force Refresh
            await fetchJobs(user.email, freshSkills, freshLoc, true);
        } catch (e) {
            console.error("Refresh failed", e);
        }
    };

    useEffect(() => {
        const loadDashboard = async () => {
            setLoading(true);
            try {
                // 1. Fetch Market Trends
                const trendsRes = await axios.get(`/api/ai/trends?t=${new Date().getTime()}`);
                if (trendsRes.data) setTrends(trendsRes.data.trends);

                // 2. Fetch User Profile
                if (user?.email) {
                    const profileRes = await axios.get(`/api/profile?email=${encodeURIComponent(user.email)}`);
                    const userSkills = profileRes.data.skills || [];
                    const userLoc = profileRes.data.personalDetails?.location || "Remote";

                    setSkills(userSkills);

                    // 3. Fetch Jobs (Standard Load - Cache Enabled)
                    if (userSkills.length > 0) {
                        await fetchJobs(user.email, userSkills, userLoc, false);
                    }
                }
            } catch (err) {
                console.error("Dashboard Load Error:", err);
            }
            setLoading(false);
        };

        if (user) loadDashboard();
    }, [user]);

    // Dynamic Skill Tests based on Profile
    const displaySkills = skills.length > 0 ? skills : ["Python", "JavaScript", "Communication", "Leadership"];

    // Gradient Definitions for 3D Bars
    const gradients = [
        { main: 'bg-gradient-to-t from-rose-500 to-pink-500', top: 'bg-pink-400', side: 'bg-rose-700', text: 'text-rose-600' },
        { main: 'bg-gradient-to-t from-amber-500 to-orange-400', top: 'bg-orange-300', side: 'bg-amber-700', text: 'text-amber-600' },
        { main: 'bg-gradient-to-t from-blue-600 to-cyan-400', top: 'bg-cyan-300', side: 'bg-blue-800', text: 'text-blue-600' },
        { main: 'bg-gradient-to-t from-emerald-600 to-green-400', top: 'bg-green-300', side: 'bg-emerald-800', text: 'text-emerald-600' },
    ];

    const container = {
        hidden: { opacity: 0 },
        show: {
            opacity: 1,
            transition: {
                staggerChildren: 0.1
            }
        }
    };

    const item = {
        hidden: { opacity: 0, y: 20 },
        show: { opacity: 1, y: 0 }
    };

    return (
        <motion.div
            variants={container}
            initial="hidden"
            animate="show"
            className="space-y-8 pb-10"
        >
            <header className="flex flex-col md:flex-row justify-between items-end gap-4">
                <div>
                    <h1 className="text-4xl font-extrabold text-slate-900 tracking-tight">Market Pulse & Opportunities</h1>
                    <p className="text-slate-500 text-lg mt-1">Insights tailored for <span className="font-semibold text-blue-600">{user?.name || 'you'}</span></p>
                </div>
            </header>

            {loading ? (
                <div className="flex flex-col items-center justify-center min-h-[400px] gap-4">
                    <Loader2 className="animate-spin text-blue-600" size={48} />
                    <p className="text-slate-400 font-medium animate-pulse">Analyzing market trends...</p>
                </div>
            ) : (
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                    {/* 3D Infographic Trends Chart - Premium Card */}
                    <motion.div variants={item} className="glass-card p-8 h-full min-h-[500px] flex flex-col relative overflow-hidden group">
                        <div className="absolute top-0 right-0 p-32 bg-blue-500/5 blur-[100px] rounded-full pointer-events-none"></div>

                        <div className="flex items-center justify-between mb-8 relative z-20">
                            <h2 className="text-2xl font-bold text-slate-800 flex items-center gap-3">
                                <div className="p-2 bg-purple-100 rounded-xl text-purple-600">
                                    <TrendingUp size={24} />
                                </div>
                                2026 Tech Trends
                            </h2>
                            <span className="text-[10px] font-bold text-slate-400 bg-slate-100 px-3 py-1.5 rounded-full uppercase tracking-wider border border-slate-200">Live Data</span>
                        </div>

                        {/* Chart Area */}
                        <div className="flex-1 flex items-end justify-center gap-8 md:gap-12 pb-8 pl-6 relative z-10 w-full px-4">
                            {/* Grid Lines */}
                            <div className="absolute inset-x-8 top-0 bottom-8 flex flex-col justify-between pointer-events-none opacity-60 z-0">
                                <div className="w-full h-px bg-slate-300 relative group/line"><span className="absolute -left-8 -top-2 text-[10px] font-bold text-slate-400">100%</span></div>
                                <div className="w-full h-px bg-slate-300 relative group/line"><span className="absolute -left-8 -top-2 text-[10px] font-bold text-slate-400">75%</span></div>
                                <div className="w-full h-px bg-slate-300 relative group/line"><span className="absolute -left-8 -top-2 text-[10px] font-bold text-slate-400">50%</span></div>
                                <div className="w-full h-px bg-slate-300 relative group/line"><span className="absolute -left-8 -top-2 text-[10px] font-bold text-slate-400">25%</span></div>
                                <div className="w-full h-px bg-slate-300 relative group/line"><span className="absolute -left-8 -top-2 text-[10px] font-bold text-slate-400">0%</span></div>
                            </div>

                            {trends && trends.slice(0, 4).map((trend, i) => {
                                const style = gradients[i % gradients.length];
                                const heightPercent = trend.score || 50;
                                const delay = i * 0.15;

                                return (
                                    <div key={i} className="relative group/bar flex flex-col justify-end w-20 md:w-28 h-full z-10 flex-shrink-0">
                                        <motion.div
                                            initial={{ height: 0 }}
                                            animate={{ height: `${heightPercent}%` }}
                                            transition={{ duration: 1, delay: delay, ease: "easeOut" }}
                                            className="relative w-full transition-all duration-300 group-hover/bar:-translate-y-2 group-hover/bar:brightness-110"
                                        >
                                            <div className="absolute -top-16 left-1/2 -translate-x-1/2 z-50">
                                                <div className={`w-14 h-14 rounded-full bg-white shadow-2xl border-[4px] ${style.text.replace('text-', 'border-')} flex items-center justify-center transform scale-110 transition-transform hover:scale-125`}>
                                                    <span className={`text-sm md:text-base font-black ${style.text}`}>{trend.score}%</span>
                                                </div>
                                            </div>

                                            {/* Front Face - Main */}
                                            <div className={`absolute inset-0 ${style.main} z-20 flex flex-col justify-center items-center pb-2 rounded-sm shadow-inner px-1`}>
                                                <div className="flex flex-col items-center justify-center h-full w-full">
                                                    <span className="text-white font-bold text-[10px] md:text-xs uppercase tracking-wider text-center leading-tight drop-shadow-sm whitespace-normal break-words w-full">{trend.label}</span>
                                                </div>
                                            </div>

                                            {/* Top Face - Perspective */}
                                            <div
                                                className={`absolute top-0 left-[8px] w-full h-4 origin-bottom -translate-y-full -skew-x-[45deg] ${style.top} opacity-90`}
                                            ></div>

                                            {/* Side Face - Depth */}
                                            <div
                                                className={`absolute top-[-8px] -right-[16px] w-4 h-[calc(100%+8px)] origin-left -skew-y-[45deg] ${style.side} opacity-90`}
                                            ></div>
                                        </motion.div>
                                    </div>
                                );
                            })}
                        </div>
                    </motion.div>

                    {/* AI Job Recommendations */}
                    <motion.div variants={item} className="h-full">
                        <JobRecommendations jobs={recJobs} loading={analyzingJobs} onRefresh={handleJobRefresh} />
                    </motion.div>
                </div>
            )}

            {/* Resume-Based Skill Tests */}
            <motion.div variants={item} className="pt-8">
                <div className="flex items-center justify-between mb-6">
                    <h2 className="text-2xl font-bold text-slate-900 flex items-center gap-3">
                        <div className="p-2 bg-blue-100 rounded-xl text-blue-600">
                            <PenTool size={24} />
                        </div>
                        Recommended Assessments
                    </h2>
                    {skills.length === 0 && (
                        <Link to="/profile" className="text-sm font-semibold text-blue-600 hover:text-blue-700 flex items-center gap-1">
                            Add Skills to personalize <ArrowRight size={14} />
                        </Link>
                    )}
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                    {displaySkills.map((skill, i) => (
                        <motion.div
                            key={i}
                            whileHover={{ y: -5, scale: 1.02 }}
                            whileTap={{ scale: 0.98 }}
                            className="glass-card p-6 cursor-pointer group relative overflow-hidden"
                            onClick={() => navigate('/skill-test', { state: { topic: skill } })}
                        >
                            <div className="absolute top-0 right-0 p-16 bg-gradient-to-br from-blue-100/50 to-transparent rounded-bl-full transition-transform group-hover:scale-110"></div>

                            <div className="w-12 h-12 rounded-2xl bg-blue-50 text-blue-600 flex items-center justify-center mb-4 group-hover:bg-blue-600 group-hover:text-white transition-colors shadow-sm">
                                <BookOpen size={24} />
                            </div>

                            <h3 className="font-bold text-lg text-slate-900 mb-1 group-hover:text-blue-600 transition-colors">{skill}</h3>
                            <p className="text-xs text-slate-500 mb-4 font-medium uppercase tracking-wide">Skill Validation</p>

                            <div className="flex items-center justify-between mt-auto pt-4 border-t border-slate-100/50">
                                <span className="text-xs font-semibold text-slate-400">15 Questions</span>
                                <span className="text-sm font-bold text-blue-600 flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity translate-x-2 group-hover:translate-x-0">
                                    Start <ArrowRight size={14} />
                                </span>
                            </div>
                        </motion.div>
                    ))}
                </div>
            </motion.div>
        </motion.div>
    );
};

export default Dashboard;
