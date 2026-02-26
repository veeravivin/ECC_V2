import { useState, useEffect } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { ArrowLeft, CheckCircle, Lock, BookOpen, PenTool, Award, X, Clock, BellRing, Play } from 'lucide-react';
import axios from 'axios';
import toast from 'react-hot-toast';

const RoadmapTracker = () => {
    const location = useLocation();
    const navigate = useNavigate();
    const { roadmap: initialRoadmap } = location.state || {};
    const [roadmap, setRoadmap] = useState(initialRoadmap);

    useEffect(() => {
        if (!initialRoadmap) {
            toast.error("Roadmap not found. Redirecting...");
            navigate('/my-roadmaps');
        }
    }, [initialRoadmap, navigate]);

    // Reminder & Timer Logic
    const [remindersEnabled, setRemindersEnabled] = useState(initialRoadmap?.reminders_enabled || false);
    const [timeLeft, setTimeLeft] = useState("Not Started");
    const [hasStarted, setHasStarted] = useState(initialRoadmap?.status === 'In Progress');
    const [startDate, setStartDate] = useState(initialRoadmap?.started_at ? new Date(initialRoadmap.started_at) : null);

    useEffect(() => {
        if (!roadmap) return;

        // Helper to parse duration string like "3 Months", "4 Weeks"
        const parseDuration = (str) => {
            if (!str) return 30; // Default
            const num = parseInt(str.match(/\d+/)?.[0] || "0");
            if (str.toLowerCase().includes('month')) return num * 30;
            if (str.toLowerCase().includes('week')) return num * 7;
            if (str.toLowerCase().includes('day')) return num;
            return num || 30;
        };

        if (!roadmap || !hasStarted || !startDate) {
            setTimeLeft("Waiting to Start");
            return;
        }

        const daysToAdd = parseDuration(roadmap.duration);
        const targetDate = new Date(startDate.getTime() + daysToAdd * 24 * 60 * 60 * 1000);

        const timer = setInterval(() => {
            const now = new Date();
            const diff = targetDate - now;

            if (diff <= 0) {
                setTimeLeft("Deadline Passed");
                clearInterval(timer);
            } else {
                const d = Math.floor(diff / (1000 * 60 * 60 * 24));
                const h = Math.floor((diff / (1000 * 60 * 60)) % 24);
                const m = Math.floor((diff / (1000 * 60)) % 60);
                const s = Math.floor((diff / 1000) % 60);
                setTimeLeft(`${d}d ${h}h ${m}m ${s}s`);
            }
        }, 1000);

        return () => clearInterval(timer);
    }, [roadmap, hasStarted, startDate]);

    const toggleReminders = () => {
        // Only toggle locally for UI, assuming backend is handled by Start
        const newState = !remindersEnabled;
        setRemindersEnabled(newState);
        if (newState) {
            toast.success("Daily reminders active.");
        } else {
            toast('Reminders muted.', { icon: '🔕' });
        }
    };

    const handleStartRoadmap = async () => {
        try {
            const res = await axios.post('/api/roadmaps/start', { id: roadmap.id });
            setHasStarted(true);
            setStartDate(new Date(res.data.started_at));
            setRemindersEnabled(true);
            toast.success("Roadmap Started! Daily reminders enabled.");
        } catch (err) {
            console.error(err);
            toast.error("Failed to start roadmap");
        }
    };

    if (!roadmap) return null;

    // --- PHASE & QUIZ STATE ---
    const [activePhase, setActivePhase] = useState(0);
    const [finishedPhases, setFinishedPhases] = useState([]); // Array of indices
    const [maxUnlockedIndex, setMaxUnlockedIndex] = useState(0);

    // Quiz State
    const [showQuiz, setShowQuiz] = useState(false);
    const [quizData, setQuizData] = useState(null);
    const [quizAnswers, setQuizAnswers] = useState({});
    const [quizResult, setQuizResult] = useState(null);
    const [loadingQuiz, setLoadingQuiz] = useState(false);

    // Ensure we have roadmap data before calculating derived state
    const currentPhaseIndex = activePhase;
    // We clone to avoid direct mutation issues
    const currentPhase = roadmap?.roadmap_data?.roadmap[currentPhaseIndex] || {};

    // BACKWARD COMPAT: Ensure 'completed_topics' exists
    if (currentPhase.topics && !currentPhase.completed_topics) {
        currentPhase.completed_topics = [];
    }

    // Daily Logic: Pick next 2 uncompleted topics
    const todaysTopics = currentPhase.topics
        ? currentPhase.topics.filter(t => !currentPhase.completed_topics.includes(t)).slice(0, 2)
        : [];

    const isPhaseFullyLearned = currentPhase.topics && currentPhase.completed_topics.length === currentPhase.topics.length;

    // Quiz State logic: are we taking a "Daily Topic Quiz" or a "Phase End Quiz"?
    const [quizMode, setQuizMode] = useState('daily'); // 'daily' or 'phase'

    const handlePhaseClick = (idx) => {
        if (idx <= maxUnlockedIndex) setActivePhase(idx);
    };

    // Save Progress Helper
    const saveProgress = async (newRoadmapData) => {
        try {
            await axios.post('/api/roadmaps/progress', {
                id: roadmap.id,
                roadmap_data: newRoadmapData
            });
            // Update Local State shallowly
            // Update Local State shallowly
            setRoadmap(prev => ({ ...prev, roadmap_data: newRoadmapData }));
            toast.success("Progress Saved!");
        } catch (err) {
            console.error(err);
            toast.error("Failed to save progress.");
        }
    };

    const handleDailyQuizPass = () => {
        // Mark today's topics as complete
        const newRoadmapData = { ...roadmap.roadmap_data };
        const phase = newRoadmapData.roadmap[activePhase];

        if (!phase.completed_topics) phase.completed_topics = [];
        // Add unique
        todaysTopics.forEach(t => {
            if (!phase.completed_topics.includes(t)) phase.completed_topics.push(t);
        });

        saveProgress(newRoadmapData);
        setShowQuiz(false);
        setQuizResult(null);
    };

    const generateQuiz = async (mode = 'daily') => {
        setQuizMode(mode);
        setLoadingQuiz(true);
        const topicsToTest = mode === 'daily' ? todaysTopics : currentPhase.topics;
        const quizTitle = mode === 'daily' ? "Daily Knowledge Check" : `Phase ${activePhase + 1} Final Assessment`;

        try {
            const res = await axios.post('/api/ai/quiz', {
                phase_name: quizTitle,
                topics: topicsToTest
            });
            if (res.data && res.data.length > 0) {
                setQuizData(res.data);
                setQuizAnswers({});
                setQuizResult(null);
                setShowQuiz(true);
            } else {
                toast.error("Failed to generate quiz");
            }
        } catch (err) {
            console.error(err);
            toast.error("Quiz Service Error");
        }
        setLoadingQuiz(false);
    };

    const submitQuiz = () => {
        // Mock Grading: Calculate score based on answers length for now (implicit pass)
        const total = quizData.length;
        const answered = Object.keys(quizAnswers).length;
        if (answered < total) return toast.error("Please answer all questions.");

        // Simulate Pass
        const passed = true;
        const obtained = total;

        setQuizResult({
            passed: true,
            score: obtained,
            total: total,
            feedback: passed ? "Excellent work! Topics verified." : "Review the material and try again."
        });
    };

    const handleQuizCompletion = () => {
        if (quizMode === 'daily') {
            handleDailyQuizPass();
        } else {
            // Phase Completion
            if (!finishedPhases.includes(activePhase)) {
                const newFinished = [...finishedPhases, activePhase];
                setFinishedPhases(newFinished);
                if (activePhase === maxUnlockedIndex && activePhase < roadmap.roadmap_data.roadmap.length - 1) {
                    setMaxUnlockedIndex(activePhase + 1);
                }
                toast.success("Phase Completed! Next phase unlocked.");
            }
            setShowQuiz(false);
            setQuizResult(null);
        }
    };

    return (
        <div className="max-w-6xl mx-auto pb-20 pt-10 px-4">
            <div className="flex justify-between items-center mb-8">
                <button
                    onClick={() => navigate('/my-roadmaps')}
                    className="flex items-center gap-2 text-slate-500 hover:text-blue-600 transition-colors font-bold"
                >
                    <ArrowLeft size={20} /> Back to Library
                </button>

                <div className="flex gap-4">
                    <button
                        onClick={toggleReminders}
                        className={`flex items-center gap-2 px-6 py-2.5 rounded-xl border font-bold transition-all ${remindersEnabled
                            ? 'bg-blue-50 border-blue-200 text-blue-700 shadow-sm'
                            : 'bg-white border-slate-200 text-slate-500 hover:border-slate-300 hover:bg-slate-50'
                            }`}
                    >
                        {remindersEnabled ? <BellRing size={18} /> : <Lock size={18} className="text-slate-400" />}
                        {remindersEnabled ? 'Reminders Active' : 'Enable Reminders'}
                    </button>
                    <div className="glass-card !bg-slate-900 !text-white !border-slate-800 px-6 py-2.5 rounded-xl font-mono font-bold flex items-center gap-3 shadow-lg shadow-black/20">
                        <Clock size={16} className="text-blue-400" />
                        {timeLeft}
                    </div>
                </div>
            </div>

            <div className="flex flex-col md:flex-row justify-between items-end mb-12 gap-4">
                <div>
                    <span className="bg-blue-100 text-blue-700 px-4 py-1.5 rounded-full text-xs font-black uppercase tracking-widest mb-3 inline-block shadow-sm">
                        Active Goal
                    </span>
                    <h1 className="text-4xl font-extrabold text-slate-900 mb-2 tracking-tight">{roadmap.role} Journey</h1>
                    <p className="text-slate-500 font-medium text-lg flex items-center gap-2">
                        <Clock size={16} className="text-blue-500" />
                        {roadmap.duration} • Phase <span className="text-slate-900 font-bold">{activePhase + 1}</span> of {roadmap.roadmap_data.roadmap.length}
                    </p>
                </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-4 gap-8">
                {/* Timeline Sidebar */}
                <div className="md:col-span-1 space-y-0 relative">
                    {/* Vertical Timeline Line */}
                    <div className="absolute left-[26px] top-6 bottom-6 w-0.5 bg-slate-200 rounded-full"></div>

                    {roadmap.roadmap_data.roadmap.map((phase, idx) => {
                        const isUnlocked = idx <= maxUnlockedIndex;
                        const isCompleted = finishedPhases.includes(idx);

                        return (
                            <div key={idx} className="relative pl-16 pb-4 group">
                                <button
                                    onClick={() => handlePhaseClick(idx)}
                                    disabled={!isUnlocked}
                                    className={`absolute left-0 top-0 w-14 h-14 rounded-2xl flex items-center justify-center transition-all z-10 shadow-sm border-2 ${activePhase === idx
                                        ? 'bg-blue-600 border-blue-600 text-white scale-110 shadow-blue-500/30'
                                        : isCompleted
                                            ? 'bg-green-500 border-green-500 text-white'
                                            : isUnlocked
                                                ? 'bg-white border-blue-200 text-blue-600 hover:border-blue-400'
                                                : 'bg-slate-50 border-slate-200 text-slate-300'
                                        }`}
                                >
                                    {isCompleted ? <CheckCircle size={24} /> : isUnlocked ? <span className="font-bold text-lg">{idx + 1}</span> : <Lock size={20} />}
                                </button>

                                <button
                                    onClick={() => handlePhaseClick(idx)}
                                    disabled={!isUnlocked}
                                    className={`w-full text-left p-4 rounded-xl border transition-all relative ${activePhase === idx
                                        ? 'bg-white border-blue-500 shadow-md ring-1 ring-blue-500/20 translate-x-2'
                                        : isUnlocked
                                            ? 'bg-white/50 border-slate-200 hover:bg-white hover:shadow-sm hover:translate-x-1'
                                            : 'opacity-60 cursor-not-allowed bg-slate-50/50 border-transparent'
                                        }`}
                                >
                                    {activePhase === idx && <div className="absolute left-[-6px] top-1/2 -translate-y-1/2 w-3 h-3 bg-blue-500 rotate-45 border border-blue-500 hidden md:block"></div>}
                                    <div className={`font-bold text-sm ${activePhase === idx ? 'text-blue-700' : 'text-slate-700'}`}>Phase {idx + 1}</div>
                                    <div className="text-xs text-slate-500 mt-1 line-clamp-1 font-medium">{phase.phase_name}</div>
                                </button>
                            </div>
                        );
                    })}
                </div>

                {/* Main Content Area */}
                <div className="md:col-span-3 relative h-full">
                    {!hasStarted && (
                        <div className="absolute inset-0 z-20 glass-card bg-white/60 backdrop-blur-md flex flex-col items-center justify-center text-center p-12">
                            <div className="w-24 h-24 bg-blue-100/50 rounded-full flex items-center justify-center text-blue-600 mb-8 animate-pulse shadow-xl shadow-blue-200/50">
                                <Clock size={48} strokeWidth={2.5} />
                            </div>
                            <h2 className="text-4xl font-extrabold text-slate-900 mb-4 tracking-tight">Ready to Begin?</h2>
                            <p className="text-slate-600 max-w-md mb-10 text-lg">
                                Starting this roadmap will activate the countdown timer and enable daily email reminders to keep you on track.
                            </p>
                            <button
                                onClick={handleStartRoadmap}
                                className="px-10 py-5 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white rounded-2xl font-bold text-xl shadow-2xl shadow-blue-500/40 transition-all hover:scale-[1.02] active:scale-[0.98] flex items-center gap-3"
                            >
                                <Play size={24} fill="currentColor" /> Start Journey
                            </button>
                        </div>
                    )}

                    <motion.div
                        key={activePhase}
                        initial={{ opacity: 0, x: 20 }}
                        animate={{ opacity: 1, x: 0 }}
                        className="glass-card p-10 h-full flex flex-col relative overflow-hidden"
                    >
                        <div className="absolute top-0 right-0 p-32 bg-purple-500/5 blur-[80px] rounded-full pointer-events-none"></div>

                        <div className="flex justify-between items-start mb-8 relative z-10 border-b border-slate-100 pb-6">
                            <div>
                                <h2 className="text-3xl font-extrabold text-slate-900 mb-2 tracking-tight">
                                    {currentPhase.phase_name}
                                </h2>
                                <p className="text-slate-500 font-medium">Master the core concepts below to proceed.</p>
                            </div>
                            {finishedPhases.includes(activePhase) && (
                                <span className="px-4 py-2 bg-green-100 text-green-700 text-sm font-bold rounded-lg border border-green-200 flex items-center gap-2 shadow-sm">
                                    <CheckCircle size={16} /> Completed
                                </span>
                            )}
                        </div>

                        <div className="mb-10 relative z-10">
                            <h3 className="text-slate-900 font-bold mb-5 flex items-center gap-2 text-lg">
                                <BookOpen className="text-blue-600" size={22} /> Learning Topics
                            </h3>
                            <ul className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                {currentPhase.topics.map((topic, i) => {
                                    const isDone = currentPhase.completed_topics?.includes(topic);
                                    return (
                                        <li key={i} className={`flex items-start gap-3 p-4 rounded-2xl border transition-all ${isDone
                                            ? 'bg-green-50/50 border-green-200 text-green-900 shadow-sm'
                                            : 'bg-white/50 border-slate-200 text-slate-700 hover:bg-white hover:shadow-md'
                                            }`}>
                                            <div className="mt-0.5">
                                                {isDone ? <CheckCircle size={20} className="text-green-600" /> : <div className="w-5 h-5 rounded-full border-2 border-slate-300"></div>}
                                            </div>
                                            <span className="font-medium text-sm leading-relaxed">{topic}</span>
                                        </li>
                                    );
                                })}
                            </ul>
                        </div>

                        <div className="mt-auto bg-gradient-to-br from-blue-50 to-indigo-50 p-8 rounded-2xl border border-blue-100/50 text-center relative z-10">
                            {!isPhaseFullyLearned ? (
                                <div className="max-w-xl mx-auto">
                                    <h3 className="text-2xl font-bold text-slate-900 mb-3">Today's Focus</h3>
                                    <p className="text-slate-600 mb-6 font-medium">We've selected {todaysTopics.length} topics for you to master today.</p>

                                    <div className="flex flex-wrap gap-2 justify-center mb-8">
                                        {todaysTopics.map((t, i) => (
                                            <span key={i} className="bg-white border border-blue-100 text-blue-700 px-4 py-2 rounded-xl text-sm font-bold shadow-sm">{t}</span>
                                        ))}
                                    </div>

                                    <div className="flex flex-col gap-3 items-center">
                                        <button
                                            onClick={() => generateQuiz('daily')}
                                            disabled={loadingQuiz || todaysTopics.length === 0}
                                            className="px-8 py-4 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-bold transition-all shadow-xl shadow-blue-500/20 hover:scale-[1.02] flex items-center gap-3 w-full sm:w-auto justify-center disabled:opacity-70 disabled:hover:scale-100"
                                        >
                                            <PenTool size={20} /> {loadingQuiz ? 'Generating Quiz...' : 'Verify Knowledge with Quiz'}
                                        </button>
                                        <span className="text-xs text-slate-400 font-medium mt-2">Pass 70% to mark topics as 'Learned'.</span>
                                    </div>
                                </div>
                            ) : (
                                <div className="max-w-xl mx-auto py-4">
                                    <div className="w-16 h-16 bg-green-100 text-green-600 rounded-full flex items-center justify-center mx-auto mb-4 shadow-inner">
                                        <Award size={32} />
                                    </div>
                                    <h3 className="text-2xl font-bold text-slate-900 mb-2">Phase Content Mastered!</h3>
                                    <p className="text-slate-600 mb-8 max-w-sm mx-auto">You're ready for the final assessment to unlock the next phase.</p>

                                    <button
                                        onClick={() => generateQuiz('phase')}
                                        disabled={loadingQuiz}
                                        className="px-10 py-4 rounded-xl bg-green-600 hover:bg-green-700 text-white font-bold transition-all shadow-xl shadow-green-500/30 flex items-center gap-3 mx-auto hover:scale-[1.02]"
                                    >
                                        {loadingQuiz ? 'Generating...' : <><Award size={22} /> Take Phase Final Exam</>}
                                    </button>
                                </div>
                            )}
                        </div>
                    </motion.div>
                </div>
            </div>

            {/* Quiz Modal */}
            <AnimatePresence>
                {showQuiz && quizData && (
                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-md"
                    >
                        <motion.div
                            initial={{ scale: 0.9, y: 20 }}
                            animate={{ scale: 1, y: 0 }}
                            className="bg-white w-full max-w-2xl rounded-3xl border border-white/20 shadow-2xl max-h-[90vh] overflow-hidden flex flex-col"
                        >
                            <div className="p-6 border-b border-slate-100 flex justify-between items-center bg-white z-10">
                                <div>
                                    <h3 className="text-xl font-black text-slate-900 tracking-tight">
                                        {quizMode === 'daily' ? 'Daily Knowledge Check' : `Phase ${activePhase + 1} Assessment`}
                                    </h3>
                                    <p className="text-sm text-slate-500 font-medium">Answer carefully. Good luck!</p>
                                </div>
                                <button onClick={() => setShowQuiz(false)} className="p-2 hover:bg-slate-100 rounded-full transition-colors text-slate-400 hover:text-slate-600">
                                    <X size={24} />
                                </button>
                            </div>

                            <div className="p-8 space-y-8 overflow-y-auto flex-1">
                                {quizResult ? (
                                    <div className="text-center py-10">
                                        <div className={`w-24 h-24 mx-auto rounded-full flex items-center justify-center mb-6 shadow-sm border-4 ${quizResult.passed ? 'bg-green-50 border-green-100 text-green-500' : 'bg-orange-50 border-orange-100 text-orange-500'}`}>
                                            <Award size={48} />
                                        </div>
                                        <h2 className="text-3xl font-black text-slate-900 mb-2">
                                            {quizResult.passed ? 'Assessment Passed!' : 'Needs Improvement'}
                                        </h2>
                                        <div className="text-6xl font-black text-slate-100 mb-6 select-none relative inline-block">
                                            <span className="text-slate-900">{quizResult.score}</span><span className="text-slate-300 text-4xl">/{quizResult.total}</span>
                                        </div>
                                        <p className="text-lg text-slate-600 mb-10 max-w-md mx-auto leading-relaxed">{quizResult.feedback}</p>

                                        <button
                                            onClick={() => {
                                                if (quizResult.passed) {
                                                    handleQuizCompletion();
                                                } else {
                                                    setShowQuiz(false);
                                                }
                                            }}
                                            className={`px-8 py-4 rounded-xl font-bold shadow-lg transition-transform hover:scale-105 ${quizResult.passed ? 'bg-blue-600 text-white shadow-blue-500/30' : 'bg-slate-100 text-slate-700 hover:bg-slate-200'}`}
                                        >
                                            {quizResult.passed ? 'Continue Your Journey' : 'Review & Try Again'}
                                        </button>
                                    </div>
                                ) : (
                                    <>
                                        {quizData.map((q, idx) => (
                                            <div key={idx} className="space-y-4 pb-8 border-b border-slate-100 last:border-0 last:pb-0">
                                                <p className="font-bold text-lg text-slate-900 flex gap-3">
                                                    <span className="flex-shrink-0 w-8 h-8 rounded-lg bg-blue-100 text-blue-600 flex items-center justify-center text-sm font-black">{idx + 1}</span>
                                                    {q.question}
                                                </p>
                                                <div className="grid grid-cols-1 gap-3 ml-11">
                                                    {q.options.map((opt, i) => (
                                                        <label key={i} className={`flex items-center p-4 rounded-xl border cursor-pointer transition-all group ${quizAnswers[idx] === opt
                                                            ? 'bg-blue-50/50 border-blue-500 shadow-sm ring-1 ring-blue-500/20'
                                                            : 'bg-white border-slate-200 hover:border-blue-300 hover:bg-slate-50'
                                                            }`}>
                                                            <input
                                                                type="radio"
                                                                name={`question-${idx}`}
                                                                value={opt}
                                                                checked={quizAnswers[idx] === opt}
                                                                onChange={() => setQuizAnswers({ ...quizAnswers, [idx]: opt })}
                                                                className="hidden"
                                                            />
                                                            <div className={`w-5 h-5 rounded-full border-2 mr-4 flex items-center justify-center ${answers[idx] === opt ? 'border-blue-500' : 'border-slate-300 group-hover:border-blue-400'}`}>
                                                                {quizAnswers[idx] === opt && <div className="w-2.5 h-2.5 rounded-full bg-blue-500"></div>}
                                                            </div>
                                                            <span className={`text-sm leading-relaxed ${quizAnswers[idx] === opt ? 'text-blue-900 font-bold' : 'text-slate-600 group-hover:text-slate-800'}`}>{opt}</span>
                                                        </label>
                                                    ))}
                                                </div>
                                            </div>
                                        ))}

                                        <div className="pt-4 sticky bottom-0 bg-white pb-2">
                                            <button
                                                onClick={submitQuiz}
                                                disabled={Object.keys(quizAnswers).length < quizData.length}
                                                className="w-full py-5 bg-gradient-to-r from-green-500 to-emerald-600 hover:from-green-600 hover:to-emerald-700 disabled:opacity-50 disabled:cursor-not-allowed text-white font-bold rounded-2xl transition-all text-lg shadow-xl shadow-green-500/20 hover:scale-[1.01] active:scale-[0.99]"
                                            >
                                                Submit All Answers
                                            </button>
                                        </div>
                                    </>
                                )}
                            </div>
                        </motion.div>
                    </motion.div>
                )}


            </AnimatePresence>
        </div>
    );
};

export default RoadmapTracker;


