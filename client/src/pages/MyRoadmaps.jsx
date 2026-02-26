import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import { motion } from 'framer-motion';
// Add Trash import
import { Layers, ArrowRight, BookOpen, Clock, Trash2 } from 'lucide-react';

const MyRoadmaps = ({ user }) => {
    const [roadmaps, setRoadmaps] = useState([]);
    const [loading, setLoading] = useState(true);
    const navigate = useNavigate();

    useEffect(() => {
        if (user?.email) {
            fetchRoadmaps();
        }
    }, [user]);

    const fetchRoadmaps = async () => {
        try {
            const res = await axios.get(`/api/roadmaps?email=${encodeURIComponent(user.email)}`);
            setRoadmaps(res.data);
        } catch (err) {
            console.error(err);
        }
        setLoading(false);
    };

    const handleDelete = async (id) => {
        if (window.confirm("Are you sure you want to delete this roadmap? This action cannot be undone.")) {
            try {
                await axios.delete(`/api/roadmaps/${id}`);
                setRoadmaps(roadmaps.filter(r => r.id !== id));
            } catch (err) {
                console.error("Failed to delete roadmap:", err);
                alert("Failed to delete roadmap.");
            }
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
            initial="hidden" animate="show"
            className="max-w-7xl mx-auto pb-20 px-4"
        >
            <header className="mb-12 text-center">
                <h1 className="text-4xl font-extrabold text-slate-900 mb-3 tracking-tight">My Roadmaps library</h1>
                <p className="text-slate-500 text-lg">Track your progress and master new skills with your personalized guides.</p>
            </header>

            {loading ? (
                <div className="flex flex-col items-center justify-center h-64 gap-4">
                    <div className="w-10 h-10 border-4 border-blue-100 border-t-blue-600 rounded-full animate-spin"></div>
                    <p className="text-slate-400 font-medium animate-pulse">Loading library...</p>
                </div>
            ) : roadmaps.length === 0 ? (
                <motion.div variants={item} className="text-center py-24 glass-card max-w-2xl mx-auto flex flex-col items-center">
                    <div className="p-6 bg-slate-50 rounded-full mb-6">
                        <Layers className="text-slate-400" size={48} />
                    </div>
                    <h3 className="text-2xl font-bold text-slate-900 mb-3">No Saved Roadmaps Yet</h3>
                    <p className="text-slate-500 mb-8 max-w-md mx-auto">
                        Ready to level up? Generate a custom AI roadmap tailored to your career goals in just a few seconds.
                    </p>
                    <button
                        onClick={() => navigate('/career-path')}
                        className="bg-blue-600 text-white px-8 py-3 rounded-xl hover:bg-blue-700 transition-all font-bold shadow-lg shadow-blue-500/30 hover:scale-105"
                    >
                        Create New Roadmap
                    </button>
                </motion.div>
            ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
                    {roadmaps.map((roadmap) => (
                        <motion.div
                            variants={item}
                            key={roadmap.id}
                            className="glass-card p-0 flex flex-col group h-full relative overflow-hidden"
                        >
                            <div className="absolute top-0 right-0 p-20 bg-gradient-to-br from-blue-500/10 to-transparent rounded-bl-full pointer-events-none transition-transform duration-500 group-hover:scale-110"></div>

                            <div className="p-6 border-b border-slate-100 flex justify-between items-start relative z-10">
                                <div>
                                    <h3 className="text-xl font-bold text-slate-900 mb-2 group-hover:text-blue-600 transition-colors line-clamp-1">
                                        {roadmap.role}
                                    </h3>
                                    <div className="flex items-center gap-3 text-sm text-slate-500 font-medium">
                                        <span className="flex items-center gap-1.5 bg-slate-100 px-2 py-1 rounded text-xs"><Clock size={12} /> {roadmap.duration}</span>
                                        <span className={`px-2 py-1 rounded text-xs font-bold uppercase tracking-wider ${roadmap.status === 'Completed'
                                            ? 'bg-green-100 text-green-700'
                                            : 'bg-blue-50 text-blue-600'
                                            }`}>
                                            {roadmap.status}
                                        </span>
                                    </div>
                                </div>

                                <button
                                    onClick={(e) => { e.stopPropagation(); handleDelete(roadmap.id); }}
                                    className="p-2 -mr-2 -mt-2 text-slate-300 hover:text-red-500 hover:bg-red-50 rounded-lg transition-all opacity-0 group-hover:opacity-100"
                                    title="Delete"
                                >
                                    <Trash2 size={18} />
                                </button>
                            </div>

                            <div className="p-6 flex-1 bg-gradient-to-b from-white to-slate-50/30">
                                <div className="space-y-4 mb-6">
                                    {roadmap.roadmap_data.roadmap.slice(0, 3).map((phase, i) => (
                                        <div key={i} className="flex items-start gap-3">
                                            <div className="mt-1.5 w-1.5 h-1.5 rounded-full bg-blue-500 ring-4 ring-blue-50 shrink-0"></div>
                                            <span className="text-sm text-slate-600 font-medium line-clamp-1">{phase.phase_name}</span>
                                        </div>
                                    ))}
                                    {roadmap.roadmap_data.roadmap.length > 3 && (
                                        <div className="pl-5 text-xs font-bold text-slate-400 uppercase tracking-widest">
                                            + {roadmap.roadmap_data.roadmap.length - 3} more phases
                                        </div>
                                    )}
                                </div>
                            </div>

                            <div className="p-4 bg-white border-t border-slate-100">
                                <button
                                    onClick={() => navigate('/roadmap-tracker', { state: { roadmap } })}
                                    className="w-full py-3 rounded-xl bg-slate-50 hover:bg-blue-600 hover:text-white border border-slate-200 hover:border-blue-600 transition-all font-bold text-slate-600 flex justify-center items-center gap-2 group/btn"
                                >
                                    Continue Learning <ArrowRight size={16} className="group-hover/btn:translate-x-1 transition-transform" />
                                </button>
                            </div>
                        </motion.div>
                    ))}
                </div>
            )}
        </motion.div>
    );
};


export default MyRoadmaps;
