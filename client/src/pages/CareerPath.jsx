import { useState, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import axios from 'axios';
import jsPDF from 'jspdf';
import html2canvas from 'html2canvas';
import { BookOpen, Calendar, Download, Target, Code, Layers, Check, Clock } from 'lucide-react';

const CareerPath = ({ user }) => {
    // Inputs
    const [targetRole, setTargetRole] = useState('');
    const [duration, setDuration] = useState('');
    const [currentLevel, setCurrentLevel] = useState('Beginner');

    // State
    const [loading, setLoading] = useState(false);
    const [roadmap, setRoadmap] = useState(null);
    const [displayedDuration, setDisplayedDuration] = useState('');
    const roadmapRef = useRef(null);
    const navigate = useNavigate();
    const [showSaveSuccess, setShowSaveSuccess] = useState(false);

    const generateRoadmap = async (e) => {
        e.preventDefault();
        setLoading(true);
        try {
            // Need to pass skills for context, assuming user has some locally or we just send empty
            const res = await axios.post('/api/ai/roadmap', {
                target_role: targetRole,
                current_skills: [], // We could fetch from profile if we lifted state, but for this specific feature focusing on "Input Skill Name"
                time_available: duration
            });
            setRoadmap(res.data);
            setDisplayedDuration(duration);
        } catch (err) {
            console.error(err);
        }
        setLoading(false);
    };

    const downloadPDF = async () => {
        if (!roadmapRef.current) return;

        const canvas = await html2canvas(roadmapRef.current, { scale: 2 });
        const imgData = canvas.toDataURL('image/png');
        const pdf = new jsPDF('p', 'mm', 'a4');
        const pdfWidth = pdf.internal.pageSize.getWidth();
        const pdfHeight = (canvas.height * pdfWidth) / canvas.width;

        pdf.addImage(imgData, 'PNG', 0, 0, pdfWidth, pdfHeight);
        pdf.save(`${targetRole.replace(' ', '_')}_Roadmap.pdf`);
    };

    const [saving, setSaving] = useState(false);
    const saveRoadmap = async () => {
        if (!roadmap || !user || !user.email) return alert("Please log in to save roadmaps.");
        setSaving(true);
        try {
            await axios.post('/api/roadmaps/save', {
                user_email: user.email,
                role: roadmap.role || targetRole, // Fallback if AI didn't return role
                duration: displayedDuration,
                roadmap: roadmap
            });
            setShowSaveSuccess(true);
        } catch (err) {
            console.error(err);
            const errMsg = err.response?.data?.error || err.message;
            if (errMsg === 'User not found') {
                alert("Sync Error: Your account record isn't in the database. Please Logout and Login again to restore it.");
            } else {
                alert(`Failed: ${errMsg}`);
            }
        }
        setSaving(false);
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
            <header className="mb-10 text-center">
                <h1 className="text-4xl font-extrabold text-slate-900 mb-4 tracking-tight">
                    AI Roadmap Generator
                </h1>
                <p className="text-slate-500 max-w-2xl mx-auto text-lg">
                    Enter a skill or role you want to master. Our AI will build a custom, step-by-step learning path tailored to your timeline.
                </p>
            </header>

            {/* Input Section */}
            <motion.div
                variants={item}
                className="glass-card p-10 mb-12 relative overflow-hidden"
            >
                <div className="absolute top-0 right-0 p-40 bg-blue-500/5 blur-[100px] rounded-full pointer-events-none"></div>

                <form onSubmit={generateRoadmap} className="grid grid-cols-1 md:grid-cols-3 gap-8 items-end relative z-10">
                    <div>
                        <label className="block text-slate-700 font-bold text-sm mb-3 ml-1">Target Skill / Role</label>
                        <div className="relative group">
                            <Target className="absolute left-4 top-4 text-blue-500 group-focus-within:text-blue-600 transition-colors" size={20} />
                            <input
                                type="text"
                                required
                                placeholder="e.g. Full Stack Developer"
                                className="w-full bg-white/50 border border-slate-200 rounded-xl py-4 pl-12 pr-4 text-slate-900 font-medium focus:ring-2 focus:ring-blue-500/50 focus:border-blue-500 outline-none placeholder-slate-400 transition-all shadow-sm"
                                value={targetRole}
                                onChange={(e) => setTargetRole(e.target.value)}
                            />
                        </div>
                    </div>
                    <div>
                        <label className="block text-slate-700 font-bold text-sm mb-3 ml-1">Available Time</label>
                        <div className="relative group">
                            <Calendar className="absolute left-4 top-4 text-blue-500 group-focus-within:text-blue-600 transition-colors" size={20} />
                            <input
                                type="text"
                                required
                                placeholder="e.g. 3 Months"
                                className="w-full bg-white/50 border border-slate-200 rounded-xl py-4 pl-12 pr-4 text-slate-900 font-medium focus:ring-2 focus:ring-blue-500/50 focus:border-blue-500 outline-none placeholder-slate-400 transition-all shadow-sm"
                                value={duration}
                                onChange={(e) => setDuration(e.target.value)}
                            />
                        </div>
                    </div>
                    <div>
                        <button
                            type="submit"
                            disabled={loading}
                            className="w-full bg-blue-600 hover:bg-blue-700 text-white font-bold py-4 rounded-xl transition-all shadow-lg shadow-blue-500/30 hover:shadow-blue-500/50 hover:scale-[1.02] flex justify-center items-center gap-2 active:scale-95 disabled:opacity-70 disabled:cursor-not-allowed"
                        >
                            {loading ? (
                                <>
                                    <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
                                    Building Path...
                                </>
                            ) : (
                                <>Generate Roadmap <Layers size={18} /></>
                            )}
                        </button>
                    </div>
                </form>
            </motion.div>

            {/* Roadmap Result */}
            {roadmap && (
                <motion.div
                    variants={container}
                    initial="hidden" animate="show"
                    className="space-y-8"
                >
                    <div className="flex flex-col md:flex-row justify-between items-center px-4 gap-4">
                        <h2 className="text-3xl font-bold flex items-center gap-3 text-slate-900">
                            <div className="p-2 bg-blue-100 rounded-xl text-blue-600 shadow-sm"><Code size={24} /></div>
                            Your Personalized Path
                        </h2>
                        <div className="flex gap-4 w-full md:w-auto">
                            <button
                                onClick={saveRoadmap}
                                disabled={saving}
                                className="flex-1 md:flex-none bg-white border border-slate-200 text-slate-700 hover:text-blue-600 hover:border-blue-200 hover:bg-blue-50 px-6 py-2.5 rounded-xl flex items-center justify-center gap-2 transition-all font-bold shadow-sm"
                            >
                                <Layers size={18} /> {saving ? 'Saving...' : 'Save to Library'}
                            </button>
                            <button
                                onClick={downloadPDF}
                                className="flex-1 md:flex-none bg-slate-900 hover:bg-slate-800 text-white px-6 py-2.5 rounded-xl flex items-center justify-center gap-2 transition-all shadow-lg shadow-slate-900/20 font-bold"
                            >
                                <Download size={18} /> Download PDF
                            </button>
                        </div>
                    </div>

                    {/* The Component to Print */}
                    <motion.div variants={item} ref={roadmapRef} className="bg-white p-10 rounded-[2.5rem] border border-slate-200 shadow-2xl relative overflow-hidden">
                        {/* Watermark / Brand */}
                        <div className="absolute top-0 right-0 p-8 opacity-5">
                            <span className="text-8xl font-black text-slate-900 select-none tracking-tighter block leading-none text-right">ETHICAL<br />COMPASS</span>
                        </div>

                        <div className="mb-12 relative z-10 border-b border-slate-100 pb-8.">
                            <span className="bg-blue-100 text-blue-700 px-4 py-1.5 rounded-full text-xs font-bold tracking-wider uppercase mb-4 inline-block">Career Strategy</span>
                            <h3 className="text-5xl font-black text-slate-900 mb-2 tracking-tight">
                                {roadmap.role}
                            </h3>
                            <p className="text-slate-500 font-medium text-lg flex items-center gap-2">
                                <Clock size={20} className="text-blue-500" />
                                Recommended Timeline: <span className="text-slate-900 font-bold">{displayedDuration}</span>
                            </p>
                        </div>

                        <div className="space-y-0 relative">
                            {/* Vertical Line */}
                            <div className="absolute left-8 top-4 bottom-4 w-1 bg-gradient-to-b from-blue-500 via-purple-500 to-indigo-500 rounded-full opacity-20"></div>

                            {roadmap.roadmap.map((phase, idx) => (
                                <div key={idx} className="relative pl-24 pb-12 last:pb-0 group">
                                    {/* Number / Status Indicator */}
                                    <div className="absolute left-0 top-0 w-16 h-16 rounded-2xl bg-white border border-slate-100 shadow-lg flex items-center justify-center z-10 group-hover:scale-110 transition-transform duration-300">
                                        <div className="text-2xl font-black text-slate-200 group-hover:text-blue-600 transition-colors">
                                            {String(idx + 1).padStart(2, '0')}
                                        </div>
                                    </div>

                                    {/* Connector Line to Box */}
                                    <div className="absolute left-16 top-8 w-8 h-0.5 bg-slate-200"></div>

                                    <div className="bg-slate-50 p-8 rounded-3xl border border-slate-200 hover:border-blue-200 hover:shadow-xl hover:bg-white transition-all duration-300 group-hover:-translate-y-1">
                                        <div className="flex flex-col md:flex-row md:justify-between mb-6 gap-2">
                                            <h4 className="text-xl font-bold text-slate-900">{phase.phase_name}</h4>
                                            <span className="text-xs bg-blue-100 text-blue-700 px-3 py-1 rounded-full font-bold self-start md:self-center shadow-sm whitespace-nowrap">
                                                {phase.duration}
                                            </span>
                                        </div>

                                        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                                            {phase.topics.map((topic, i) => (
                                                <div key={i} className="flex items-start gap-3 bg-white p-3 rounded-xl border border-slate-100 shadow-sm">
                                                    <div className="mt-1.5 w-2 h-2 rounded-full bg-blue-500 shrink-0"></div>
                                                    <span className="text-slate-700 font-medium text-sm leading-relaxed">{topic}</span>
                                                </div>
                                            ))}
                                        </div>
                                    </div>
                                </div>
                            ))}
                        </div>

                        {/* Resources Section (Strictly Required) */}
                        <div className="mt-16 pt-10 border-t border-slate-100">
                            <h4 className="text-xl font-bold mb-6 flex items-center gap-3 text-slate-900">
                                <div className="p-2 bg-green-100 text-green-600 rounded-lg"><BookOpen size={20} /></div>
                                Curated Learning Resources
                            </h4>
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                {roadmap.resources.map((res, idx) => (
                                    <a
                                        key={idx}
                                        href={res.url}
                                        target="_blank"
                                        rel="noreferrer"
                                        className="flex items-center gap-5 p-5 rounded-2xl bg-white hover:bg-blue-50/50 border border-slate-200 hover:border-blue-200 transition-all group shadow-sm hover:shadow-lg hover:-translate-y-1"
                                    >
                                        <div className="w-12 h-12 rounded-xl bg-slate-100 text-slate-500 group-hover:bg-blue-600 group-hover:text-white flex items-center justify-center font-bold text-xl transition-colors">
                                            {res.name[0]}
                                        </div>
                                        <div className="min-w-0">
                                            <div className="font-bold text-slate-900 group-hover:text-blue-700 transition-colors text-lg truncate">{res.name}</div>
                                            <div className="text-xs text-slate-400 truncate flex items-center gap-1 group-hover:text-blue-400">
                                                Visit Resource <span className="opacity-0 group-hover:opacity-100 transition-opacity">→</span>
                                            </div>
                                        </div>
                                    </a>
                                ))}
                            </div>
                        </div>
                    </motion.div>
                </motion.div>
            )}

            <AnimatePresence>
                {showSaveSuccess && (
                    <motion.div
                        initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
                        className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-50 flex items-center justify-center p-4"
                        onClick={() => setShowSaveSuccess(false)}
                    >
                        <motion.div
                            initial={{ scale: 0.9, y: 20 }} animate={{ scale: 1, y: 0 }} exit={{ scale: 0.9, y: 20 }}
                            className="bg-white w-full max-w-md rounded-3xl border border-white/20 shadow-2xl p-8 flex flex-col items-center text-center relative overflow-hidden"
                            onClick={e => e.stopPropagation()}
                        >
                            <div className="absolute top-0 w-full h-2 bg-green-500"></div>
                            <div className="bg-green-100 text-green-600 w-20 h-20 rounded-full flex items-center justify-center mb-6 shadow-sm ring-8 ring-green-50">
                                <Check size={40} strokeWidth={4} />
                            </div>
                            <h2 className="text-2xl font-black text-slate-900 mb-2">Roadmap Saved!</h2>
                            <p className="text-slate-500 mb-8 leading-relaxed px-4">
                                This career path has been added to your library. You can track your progress in "My Roadmaps".
                            </p>
                            <div className="flex gap-4 w-full">
                                <button
                                    onClick={() => setShowSaveSuccess(false)}
                                    className="flex-1 bg-slate-100 text-slate-700 py-3.5 rounded-xl font-bold hover:bg-slate-200 transition-colors"
                                >
                                    Done
                                </button>
                                <button
                                    onClick={() => navigate('/my-roadmaps')}
                                    className="flex-1 bg-slate-900 text-white py-3.5 rounded-xl font-bold hover:bg-black shadow-lg hover:shadow-xl transition-all"
                                >
                                    View Library
                                </button>
                            </div>
                        </motion.div>
                    </motion.div>
                )}
            </AnimatePresence>
        </motion.div>
    );
};

export default CareerPath;
