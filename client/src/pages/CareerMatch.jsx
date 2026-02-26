import { useState, useEffect } from 'react';
import axios from 'axios';
import { motion } from 'framer-motion';
import { Briefcase, AlertTriangle, CheckCircle, Heart, Zap, Brain, Shield, RefreshCw } from 'lucide-react';
import toast from 'react-hot-toast';

const VALUE_OPTIONS = ["Social Impact", "Work-Life Balance", "High Income", "Creativity", "Growth", "Stability"];
const STRESS_OPTIONS = [
    { label: "Low (I prefer peace)", value: 3, icon: Heart },
    { label: "Medium (I can handle pressure)", value: 6, icon: Brain },
    { label: "High (I thrive in chaos)", value: 9, icon: Zap }
];

const CareerMatch = ({ user }) => {
    const [matches, setMatches] = useState([]);
    const [loading, setLoading] = useState(false);
    const [analyzed, setAnalyzed] = useState(false);

    // Form State
    const [profileData, setProfileData] = useState({ name: user?.name || "User", skills: [] });
    const [selectedValues, setSelectedValues] = useState([]);
    const [stressTolerance, setStressTolerance] = useState(6); // Default Medium

    // 1. Fetch Profile Data on Mount
    useEffect(() => {
        const fetchProfile = async () => {
            if (user?.email) {
                try {
                    const res = await axios.get(`/api/profile?email=${encodeURIComponent(user.email)}`);
                    if (res.data) {
                        setProfileData({
                            name: res.data.personalDetails.name || user.name,
                            skills: res.data.skills || []
                        });
                    }
                } catch (err) {
                    console.error("Failed to load profile for matching", err);
                }
            }
        };
        fetchProfile();
    }, [user]);

    const toggleValue = (val) => {
        if (selectedValues.includes(val)) {
            setSelectedValues(selectedValues.filter(v => v !== val));
        } else {
            if (selectedValues.length >= 3) {
                toast.error("Select up to 3 core values");
                return;
            }
            setSelectedValues([...selectedValues, val]);
        }
    };

    const runAnalysis = async () => {
        if (profileData.skills.length === 0) {
            toast.error("No skills found in profile! Please add skills in the Profile page first.");
            return;
        }
        if (selectedValues.length === 0) {
            toast.error("Please select at least one value.");
            return;
        }

        setLoading(true);
        setMatches([]);

        try {
            // New Single-Shot Generative AI Call
            const res = await axios.post('/api/ai/recommend', {
                user_skills: profileData.skills,
                user_values: selectedValues,
                stress_tolerance: stressTolerance,
                name: profileData.name
            });

            if (res.data && res.data.recommendations) {
                setMatches(res.data.recommendations);
                setAnalyzed(true);
            } else {
                toast.error("AI returned no results.");
            }
        } catch (err) {
            console.error("AI Error", err);
            toast.error("Analysis Engine Failed. Please try again.");
        } finally {
            setLoading(false);
        }
    };

    const container = {
        hidden: { opacity: 0 },
        show: {
            opacity: 1,
            transition: { staggerChildren: 0.1 }
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
            className="max-w-5xl mx-auto pb-20"
        >
            <header className="mb-12 text-center">
                <h1 className="text-5xl font-extrabold mb-4 bg-clip-text text-transparent bg-gradient-to-r from-blue-600 to-purple-600 tracking-tight">
                    AI Career Match
                </h1>
                <p className="text-lg text-slate-500 max-w-xl mx-auto leading-relaxed">
                    Discover your ideal career path tailored to your unique psychological profile and technical capabilities.
                </p>
            </header>

            {!analyzed && (
                <motion.div
                    variants={item}
                    className="glass-card p-10 relative overflow-hidden"
                >
                    <div className="absolute top-0 right-0 p-40 bg-purple-500/5 blur-[120px] rounded-full pointer-events-none"></div>

                    {/* 1. Profile Context */}
                    <div className="flex items-center gap-6 mb-10 pb-8 border-b border-slate-100">
                        <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center text-white font-bold text-2xl shadow-lg shadow-blue-500/30">
                            {profileData.name.charAt(0)}
                        </div>
                        <div>
                            <h2 className="font-bold text-slate-900 text-xl">Analyzing Context for {profileData.name}</h2>
                            <p className="text-slate-500 flex flex-wrap gap-2 mt-2">
                                <span className="font-semibold text-xs uppercase tracking-wider text-slate-400">Detected Skills:</span>
                                {profileData.skills.length > 0 ? (
                                    profileData.skills.slice(0, 5).map(s => (
                                        <span key={s} className="bg-white/50 border border-slate-200 px-2.5 py-1 rounded-md text-xs font-semibold text-slate-700 shadow-sm">{s}</span>
                                    ))
                                ) : (
                                    <span className="text-red-500 text-xs italic font-semibold bg-red-50 px-2 py-1 rounded">No skills found. Please update Profile.</span>
                                )}
                                {profileData.skills.length > 5 && <span className="text-xs text-slate-400 font-medium self-center">+{profileData.skills.length - 5} more</span>}
                            </p>
                        </div>
                    </div>

                    <div className="space-y-10">
                        {/* 2. Values Question */}
                        <div>
                            <h3 className="text-xl font-bold text-slate-900 mb-6 flex items-center gap-3">
                                <div className="p-2 bg-blue-100 rounded-lg text-blue-600"><Shield size={20} /></div>
                                Core Career Values <span className="text-sm font-normal text-slate-400 ml-auto">(Select up to 3)</span>
                            </h3>
                            <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                                {VALUE_OPTIONS.map(val => (
                                    <motion.button
                                        whileHover={{ scale: 1.02 }}
                                        whileTap={{ scale: 0.98 }}
                                        key={val}
                                        onClick={() => toggleValue(val)}
                                        className={`p-4 rounded-xl border text-sm font-bold transition-all relative overflow-hidden ${selectedValues.includes(val)
                                            ? 'border-blue-500 bg-blue-50 text-blue-700 shadow-md ring-1 ring-blue-500/20'
                                            : 'border-slate-200 bg-white/50 text-slate-600 hover:border-blue-300 hover:bg-white hover:shadow-sm'
                                            }`}
                                    >
                                        {val}
                                        {selectedValues.includes(val) && (
                                            <motion.div layoutId="check" className="absolute top-2 right-2 text-blue-600">
                                                <CheckCircle size={14} />
                                            </motion.div>
                                        )}
                                    </motion.button>
                                ))}
                            </div>
                        </div>

                        {/* 3. Stress Question */}
                        <div>
                            <h3 className="text-xl font-bold text-slate-900 mb-6 flex items-center gap-3">
                                <div className="p-2 bg-red-100 rounded-lg text-red-600"><Heart size={20} /></div>
                                Work Environment Preference
                            </h3>
                            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                                {STRESS_OPTIONS.map((opt) => {
                                    const Icon = opt.icon;
                                    const isSelected = stressTolerance === opt.value;
                                    return (
                                        <motion.button
                                            whileHover={{ y: -2 }}
                                            key={opt.value}
                                            onClick={() => setStressTolerance(opt.value)}
                                            className={`p-5 rounded-2xl border text-left transition-all flex flex-col items-center justify-center gap-3 h-full ${isSelected
                                                ? 'border-purple-500 bg-purple-50 text-purple-900 shadow-md ring-1 ring-purple-500/20'
                                                : 'border-slate-200 bg-white/50 text-slate-500 hover:border-purple-300 hover:bg-white hover:shadow-sm'
                                                }`}
                                        >
                                            <div className={`p-3 rounded-full ${isSelected ? 'bg-purple-200 text-purple-700' : 'bg-slate-100 text-slate-400'}`}>
                                                <Icon size={24} />
                                            </div>
                                            <div className="text-center">
                                                <div className={`font-bold text-base ${isSelected ? 'text-purple-900' : 'text-slate-800'}`}>{opt.label.split('(')[0]}</div>
                                                <div className="text-xs font-medium opacity-70 mt-1">{opt.label.split('(')[1].replace(')', '')}</div>
                                            </div>
                                        </motion.button>
                                    )
                                })}
                            </div>
                        </div>

                        {/* Action */}
                        <div className="pt-4">
                            <button
                                onClick={runAnalysis}
                                disabled={loading || profileData.skills.length === 0}
                                className="w-full py-5 text-lg font-bold rounded-2xl bg-gradient-to-r from-blue-600 to-purple-600 text-white shadow-xl shadow-blue-500/20 hover:shadow-blue-500/40 hover:scale-[1.01] transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-3 relative overflow-hidden group"
                            >
                                <div className="absolute inset-0 bg-white/20 translate-y-full group-hover:translate-y-0 transition-transform duration-300"></div>
                                {loading ? <RefreshCw className="animate-spin" /> : <Brain size={24} />}
                                {loading ? "Analyzing Career DNA..." : "Reveal My Perfect Match"}
                            </button>
                        </div>
                    </div>
                </motion.div>
            )}

            {/* RESULTS VIEW */}
            {analyzed && (
                <motion.div initial="hidden" animate="show" variants={container} className="space-y-8">
                    <motion.button
                        variants={item}
                        onClick={() => setAnalyzed(false)}
                        className="text-sm font-bold text-slate-500 hover:text-blue-600 flex items-center gap-2 px-4 py-2 rounded-lg hover:bg-blue-50 transition-colors w-fit"
                    >
                        ← Adjust Preferences
                    </motion.button>

                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                        {matches.map((item, idx) => {
                            const score = item.match_score;
                            return (
                                <motion.div
                                    variants={item}
                                    key={idx}
                                    className="glass-card overflow-hidden group flex flex-col h-full"
                                >
                                    <div className="p-8 border-b border-slate-100 bg-gradient-to-r from-white to-slate-50/50 flex justify-between items-start relative">
                                        <div className="absolute top-0 left-0 w-1 h-full bg-gradient-to-b from-blue-500 to-purple-600"></div>
                                        <div>
                                            <h2 className="text-2xl font-bold text-slate-900 mb-1 group-hover:text-blue-600 transition-colors">{item.title}</h2>
                                            <p className="text-slate-500 font-medium flex items-center gap-2">
                                                <Briefcase size={14} /> {item.company}
                                            </p>
                                        </div>
                                        <div className="text-right">
                                            <div className="relative inline-flex items-center justify-center">
                                                <svg className="w-16 h-16 transform -rotate-90">
                                                    <circle cx="32" cy="32" r="28" stroke="#e2e8f0" strokeWidth="4" fill="transparent" />
                                                    <circle cx="32" cy="32" r="28" stroke={score > 80 ? '#22c55e' : score > 60 ? '#3b82f6' : '#f97316'} strokeWidth="4" fill="transparent" strokeDasharray={175} strokeDashoffset={175 - (score / 100) * 175} strokeLinecap="round" />
                                                </svg>
                                                <span className="absolute text-sm font-black text-slate-700">{score}%</span>
                                            </div>
                                        </div>
                                    </div>

                                    <div className="p-8 flex-1 flex flex-col">
                                        <div className="mb-6">
                                            <h3 className="font-bold flex items-center gap-2 mb-3 text-slate-900 text-sm uppercase tracking-wider">
                                                <Zap size={16} className="text-amber-500" /> AI Alignment Analysis
                                            </h3>
                                            <p className="text-slate-600 leading-relaxed">
                                                {item.explanation}
                                            </p>
                                        </div>

                                        <div className="mt-auto pt-6 border-t border-slate-100">
                                            <div className="flex flex-wrap gap-2">
                                                {item.tags && item.tags.map(tag => (
                                                    <span key={tag} className="px-3 py-1 bg-slate-50 border border-slate-200 text-slate-600 rounded-full text-xs font-bold hover:bg-blue-50 hover:text-blue-600 transition-colors cursor-default">
                                                        #{tag}
                                                    </span>
                                                ))}
                                            </div>
                                        </div>
                                    </div>
                                </motion.div>
                            );
                        })}
                    </div>
                </motion.div>
            )}
        </motion.div>
    );
};

export default CareerMatch;
