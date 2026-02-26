import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useLocation } from 'react-router-dom';
import { Lock, Unlock, Play, CheckCircle, Code, Server, Database, Globe, AlertTriangle, Monitor, Cpu, Coffee, Gem, Layers, Beaker, Terminal, ClipboardCheck, Microscope, ChevronLeft, ChevronRight, Triangle, X } from 'lucide-react';
import axios from 'axios';

// --- Mocks & Topics ---
const topics = [
    { name: 'JavaScript', icon: <Code size={24} />, description: 'ES6+, Async, DOM Manipulation', category: 'Frontend' },
    { name: 'React', icon: <Globe size={24} />, description: 'Hooks, State, Virtual DOM', category: 'Frontend' },
    { name: 'Node.js', icon: <Server size={24} />, description: 'Event Loop, Streams, Express', category: 'Backend' },
    { name: 'Python', icon: <Database size={24} />, description: 'Data Structures, OOP, PIP', category: 'Backend' },
    { name: 'AWS', icon: <Layers size={24} />, description: 'EC2, S3, Lambda, IAM', category: 'Cloud' },
    { name: 'Cybersecurity', icon: <Lock size={24} />, description: 'OWASP, Encryption, Networking', category: 'Security' },
    // New Languages
    { name: 'Java', icon: <Coffee size={24} />, description: 'JVM, Spring Boot, Concurrency', category: 'Backend' },
    { name: 'Ruby', icon: <Gem size={24} />, description: 'Rails, Metaprogramming, OOP', category: 'Backend' },
    { name: 'MongoDB', icon: <Database size={24} />, description: 'NoSQL, Aggregation, Indexing', category: 'Database' },
    // Testing Topics
    { name: 'Manual Testing', icon: <ClipboardCheck size={24} />, description: 'Test Plans, Bug Life Cycle, Agile', category: 'Testing' },
    { name: 'Selenium', icon: <Monitor size={24} />, description: 'WebDriver, Grid, Automation', category: 'Testing' },
    { name: 'Rest Assured', icon: <Beaker size={24} />, description: 'API Testing, Status Codes, JSON Path', category: 'Testing' },
    { name: 'TestNG', icon: <Microscope size={24} />, description: 'Annotations, Assertions, Parallel Exec', category: 'Testing' },
];

const SkillTest = ({ user }) => {
    const location = useLocation();
    // UI State
    const [selectedTopic, setSelectedTopic] = useState(null); // { name, icon, description }
    const [testState, setTestState] = useState('idle'); // idle, loading, testing, finished
    const [questions, setQuestions] = useState([]);
    const [currentQIdx, setCurrentQIdx] = useState(0);
    const [answers, setAnswers] = useState({}); // { [idx]: selectedOptionIndex }
    const [score, setScore] = useState(0);
    const [resultData, setResultData] = useState(null);
    const [consoleOutput, setConsoleOutput] = useState("");
    const [isRunningCode, setIsRunningCode] = useState(false);

    // Locks: { "Java": ["Intermediate", "Advanced"], ... }
    const [testHistory, setTestHistory] = useState({});
    const [allTopics, setAllTopics] = useState(topics);

    // Merge User Skills
    useEffect(() => {
        if (user?.skills && Array.isArray(user.skills)) {
            const newTopics = [...topics];
            user.skills.forEach(skill => {
                if (!newTopics.find(t => t.name.toLowerCase() === skill.toLowerCase())) {
                    newTopics.push({
                        name: skill,
                        icon: <Terminal size={24} />,
                        description: `Assess your ${skill} knowledge.`,
                        category: 'Custom'
                    });
                }
            });
            setAllTopics(newTopics);
        }
    }, [user]);

    const isCodingLanguage = (name) => {
        const codable = ['javascript', 'js', 'react', 'node', 'python', 'java', 'ruby', 'go', 'rust', 'c++', 'c#', 'php', 'sql', 'mongo', 'css', 'html', 'typescript', 'selenium', 'bash', 'shell', 'swift', 'kotlin'];
        const lower = name.toLowerCase();
        if (lower.includes('manual')) return false;
        return codable.some(c => lower.includes(c));
    };

    // Handle Direct Navigation with Topic
    useEffect(() => {
        if (location.state?.topic) {
            const incomingTopicName = location.state.topic;
            const existing = topics.find(t => t.name.toLowerCase() === incomingTopicName.toLowerCase());
            if (existing) {
                setSelectedTopic(existing);
            } else {
                // Create custom topic for dynamic resume skills
                setSelectedTopic({
                    name: incomingTopicName,
                    icon: <Terminal size={24} />,
                    description: `Assess your ${incomingTopicName} knowledge.`,
                    category: 'Custom'
                });
            }
        }
    }, [location.state]);

    // Pagination Logic
    const itemsPerPage = 6;
    const [currentPage, setCurrentPage] = useState(1);

    // Calculate total pages
    const totalPages = Math.ceil(allTopics.length / itemsPerPage);

    // Get current items
    const indexOfLastItem = currentPage * itemsPerPage;
    const indexOfFirstItem = indexOfLastItem - itemsPerPage;
    const paginatedTopics = allTopics.slice(indexOfFirstItem, indexOfLastItem);

    const nextPage = () => {
        if (currentPage < totalPages) setCurrentPage(prev => prev + 1);
    };

    const prevPage = () => {
        if (currentPage > 1) setCurrentPage(prev => prev - 1);
    };

    // --- State ---
    const [level, setLevel] = useState('Beginner');

    // Fetch history
    const fetchHistory = async () => {
        if (!user?.email) return;
        try {
            const res = await axios.get(`/api/tests/history?email=${encodeURIComponent(user.email)}`);
            // Format: [{ topic, level, passed, score }]
            // We want to know what is PASSED to unlock next.
            const history = {};
            res.data.forEach(r => {
                // Backend doesn't return 'passed', so we check score >= 70 manually
                if (r.score >= 70) {
                    if (!history[r.topic]) history[r.topic] = [];
                    if (!history[r.topic].includes(r.level)) history[r.topic].push(r.level);
                }
            });
            setTestHistory(history);
        } catch (err) {
            console.error("Failed to load history", err);
        }
    };

    useEffect(() => {
        fetchHistory();
    }, [user]);

    const isLevelUnlocked = (topicName, lvl) => {
        if (lvl === 'Beginner') return true;
        const passedLevels = testHistory[topicName] || [];
        if (lvl === 'Intermediate') return passedLevels.includes('Beginner');
        if (lvl === 'Advanced') return passedLevels.includes('Intermediate');
        if (lvl === 'Coding Challenge') return passedLevels.includes('Advanced');
        return false;
    };

    const initiateTest = async (topic, selectedLevel) => {
        if (!user) return alert("Please Login to take tests.");

        setLevel(selectedLevel);
        setTestState('loading');

        try {
            const res = await axios.post('/api/ai/skill_test', {
                topic: topic.name,
                level: selectedLevel
            });

            if (res.data && Array.isArray(res.data) && res.data.length > 0) {
                setQuestions(res.data);
                setTestState('testing');
                setCurrentQIdx(0);
                setAnswers({});
                enterFullscreen();
            } else {
                alert("Failed to generate questions. Try again.");
                setTestState('idle');
            }
        } catch (err) {
            console.error(err);
            alert("Error starting test");
            setTestState('idle');
        }
    };

    const enterFullscreen = () => {
        const elem = document.documentElement;
        if (elem.requestFullscreen) {
            elem.requestFullscreen().catch((err) => {
                console.error("Error attempting to enable full-screen mode:", err);
            });
        }
    };

    const exitFullscreen = () => {
        if (document.exitFullscreen && document.fullscreenElement) {
            document.exitFullscreen().catch(e => console.log(e));
        }
    };

    // --- Strict Examination Mode Enforcement ---
    useEffect(() => {
        if (testState !== 'testing') return;

        // 1. Prevent Copy/Paste/Context Menu
        const preventCopy = (e) => {
            e.preventDefault();
            alert("Copy/Paste is disabled during the assessment.");
        };
        const preventContext = (e) => e.preventDefault();

        document.addEventListener('copy', preventCopy);
        document.addEventListener('cut', preventCopy);
        document.addEventListener('paste', preventCopy);
        document.addEventListener('contextmenu', preventContext);

        // 2. Tab Switch / Blurred Window Detection
        const handleVisibilityChange = () => {
            if (document.hidden) {
                alert("Tab switching detected! Terminating test.");
                submitTest();
            }
        };

        const handleBlur = () => {
            // Some browsers fire blur when clicking inside an iframe or some elements, be careful.
            // Using visibilitychange is more reliable for tab switching.
            // But we can warn or strict check here.
            // For now, let's rely on Fullscreen change + Visibility.
        };

        document.addEventListener('visibilitychange', handleVisibilityChange);
        window.addEventListener('blur', handleBlur);

        // 3. Fullscreen Enforcement
        const handleFullscreenChange = () => {
            if (!document.fullscreenElement) {
                alert("Exiting fullscreen is strictly prohibited! Test terminated.");
                submitTest();
            }
        };

        document.addEventListener('fullscreenchange', handleFullscreenChange);
        document.addEventListener('mozfullscreenchange', handleFullscreenChange);
        document.addEventListener('webkitfullscreenchange', handleFullscreenChange);
        document.addEventListener('msfullscreenchange', handleFullscreenChange);

        // 4. Trap Keyboard (Prevent ESC as much as possible, though mostly browser controlled)
        // Note: Browsers consume ESC for exiting fullscreen. We catch the RESULT of that via fullscreenchange.

        return () => {
            document.removeEventListener('copy', preventCopy);
            document.removeEventListener('cut', preventCopy);
            document.removeEventListener('paste', preventCopy);
            document.removeEventListener('contextmenu', preventContext);
            document.removeEventListener('visibilitychange', handleVisibilityChange);
            document.removeEventListener('fullscreenchange', handleFullscreenChange);
            window.removeEventListener('blur', handleBlur);
            document.removeEventListener('mozfullscreenchange', handleFullscreenChange);
            document.removeEventListener('webkitfullscreenchange', handleFullscreenChange);
            document.removeEventListener('msfullscreenchange', handleFullscreenChange);
        };
    }, [testState]); // Re-binds when testState changes to/from 'testing'

    // 2. Handle Answer
    const handleAnswer = (optionIdx) => {
        setAnswers(prev => ({ ...prev, [currentQIdx]: optionIdx }));
    };

    const nextQuestion = () => {
        if (currentQIdx < questions.length - 1) {
            setCurrentQIdx(prev => prev + 1);
        } else {
            submitTest();
        }
    };

    const handleRunCode = async () => {
        const code = answers[currentQIdx];
        if (!code) return alert("Write some code first!");

        setIsRunningCode(true);
        setConsoleOutput("Running code simulation...");

        try {
            const res = await axios.post('/api/ai/run_code', {
                code,
                language: selectedTopic.name,
                task: questions[currentQIdx].q
            });

            setConsoleOutput(`> Output:\n${res.data.output || ""}\n\n> Result: ${res.data.error ? "Error ❌" : "passed_cases" in res.data && res.data.passed_cases ? "Success ✅ - Tests Passed" : "Executed (Review Output)"}\n${res.data.error || ""}`);
        } catch (err) {
            setConsoleOutput("Error communicating with execution server.");
        } finally {
            setIsRunningCode(false);
        }
    };

    // 3. Submit & Save
    const submitTest = async () => {
        exitFullscreen();
        setTestState('loading'); // Show loading while grading

        // Prepare payload for AI Grading
        const submissions = questions.map((q, idx) => ({
            question_idx: idx,
            question: q.q,
            type: q.type,
            user_answer: q.type === 'code' ? (answers[idx] || "") : null,
            user_answer_idx: q.type === 'mcq' ? (answers[idx] ?? -1) : null,
            correct_idx: q.correct_idx
        }));

        try {
            // 1. Get Grades from AI
            const gradeResponse = await axios.post('/api/ai/grade', {
                submissions,
                topic: selectedTopic.name,
                level: level
            });

            const { final_score, results } = gradeResponse.data;

            // 2. Map results back to detail format for UI
            const finalDetails = results.map(r => {
                const originalQ = questions[r.question_idx];
                return {
                    question: originalQ.q,
                    options: originalQ.options,
                    correct_answer: r.type === 'mcq'
                        ? originalQ.options[originalQ.correct_idx]
                        : "AI Evaluated Code",
                    is_correct: r.is_correct,
                    explanation: r.explanation,
                    user_answer_display: r.type === 'mcq'
                        ? (answers[r.question_idx] !== undefined ? originalQ.options[answers[r.question_idx]] : "Skipped")
                        : (answers[r.question_idx] || "No Code")
                };
            });

            setScore(final_score);
            setResultData(finalDetails);

            // 3. Save to DB
            await axios.post('/api/tests/save', {
                user_email: user.email,
                topic: selectedTopic.name,
                level: level,
                score: final_score,
                total_questions: questions.length,
                details: finalDetails
            });
            fetchHistory(); // Update locks
            setTestState('finished');

        } catch (err) {
            console.error("Grading Failed", err);
            // Fallback if AI fails? for now just log
            setTestState('finished');
            alert("Grading service failed. Please check console.");
        }
    };

    const reset = () => {
        setTestState('idle');
        setSelectedTopic(null);
        setQuestions([]);
        setResultData(null);
    };

    // --- RENDER MODES ---

    // --- RENDER MODES ---
    if (testState === 'loading') {
        return (
            <div className="fixed inset-0 bg-white/80 backdrop-blur-md z-50 flex flex-col items-center justify-center">
                <div className="relative">
                    <div className="w-20 h-20 border-4 border-blue-100 border-t-blue-600 rounded-full animate-spin"></div>
                    <div className="absolute inset-0 flex items-center justify-center">
                        <Triangle className="text-blue-600 animate-pulse" size={24} fill="currentColor" />
                    </div>
                </div>
                <h2 className="text-2xl font-bold text-slate-900 mt-8 mb-2">
                    Generating Assessment...
                </h2>
                <p className="text-slate-500 font-medium">Crafting 20 {level} questions for {selectedTopic?.name}</p>
            </div>
        );
    }

    if (testState === 'testing') {
        const q = questions[currentQIdx];
        const progress = ((currentQIdx + 1) / questions.length) * 100;

        return (
            <div className="fixed inset-0 bg-slate-50 z-50 flex flex-col overflow-hidden">
                {/* Header */}
                <div className="bg-white border-b border-slate-200 px-6 py-4 flex justify-between items-center shadow-sm z-10">
                    <div className="flex items-center gap-4">
                        <div className="w-10 h-10 rounded-lg bg-blue-50 flex items-center justify-center text-blue-600 border border-blue-100">
                            {selectedTopic?.icon}
                        </div>
                        <div>
                            <h2 className="text-lg font-bold text-slate-900 leading-tight">{selectedTopic?.name} Assessment</h2>
                            <span className="text-xs text-slate-500 font-bold uppercase tracking-wider">{level} Level</span>
                        </div>
                    </div>
                    <div className="flex items-center gap-4">
                        <div className="text-right hidden sm:block">
                            <div className="text-sm font-bold text-slate-900">Question {currentQIdx + 1} <span className="text-slate-400">/ {questions.length}</span></div>
                            <div className="text-xs text-slate-500">Keep passing!</div>
                        </div>
                        <button onClick={() => { if (confirm("Quit test? Progress will be lost.")) reset(); }} className="p-2 hover:bg-red-50 text-slate-400 hover:text-red-500 rounded-lg transition-colors">
                            <X size={20} />
                        </button>
                    </div>
                </div>

                {/* Progress Bar */}
                <div className="w-full h-1.5 bg-slate-200">
                    <motion.div
                        initial={{ width: 0 }}
                        animate={{ width: `${progress}%` }}
                        className="h-full bg-gradient-to-r from-blue-500 to-indigo-600 shadow-[0_0_10px_rgba(59,130,246,0.5)]"
                    />
                </div>

                {/* Question Area */}
                <div className="flex-1 overflow-y-auto p-4 md:p-8 flex justify-center">
                    <div className="max-w-4xl w-full">
                        <motion.div
                            key={currentQIdx}
                            initial={{ opacity: 0, y: 20 }}
                            animate={{ opacity: 1, y: 0 }}
                            className="bg-white p-8 md:p-10 rounded-3xl border border-slate-200 shadow-xl mb-24"
                        >
                            <div className="text-xl md:text-2xl font-medium mb-10 leading-relaxed text-slate-800">
                                <span className="inline-block w-8 h-8 rounded-lg bg-slate-100 text-slate-500 text-center text-base font-bold leading-8 mr-3 align-text-top shadow-inner">
                                    {currentQIdx + 1}
                                </span>
                                {(() => {
                                    const parts = q.q.split(/(`{3}[\s\S]*?`{3})/g);
                                    return parts.map((part, i) => {
                                        if (part.startsWith('```') && part.endsWith('```')) {
                                            const content = part.replace(/^```[a-z]*\n?|```$/g, '');
                                            return (
                                                <pre key={i} className="block my-6 bg-slate-900/95 text-slate-50 p-6 rounded-2xl text-sm font-mono overflow-x-auto shadow-2xl border border-slate-700 relative group">
                                                    <div className="absolute top-3 right-3 flex gap-1.5 ">
                                                        <div className="w-2.5 h-2.5 rounded-full bg-red-500/80"></div>
                                                        <div className="w-2.5 h-2.5 rounded-full bg-yellow-500/80"></div>
                                                        <div className="w-2.5 h-2.5 rounded-full bg-green-500/80"></div>
                                                    </div>
                                                    <code>{content}</code>
                                                </pre>
                                            );
                                        }
                                        return <span key={i} className="whitespace-pre-line">{part}</span>;
                                    });
                                })()}
                            </div>

                            <div className="space-y-4">
                                {(q.type === 'code' || q.type === 'coding_challenge') ? (
                                    <div className="space-y-4">
                                        <div className="flex justify-between items-center mb-2">
                                            <p className="text-sm text-slate-500 font-bold uppercase tracking-wider">Solution Editor</p>
                                            <button
                                                onClick={handleRunCode}
                                                disabled={isRunningCode}
                                                className={`px-5 py-2.5 text-white rounded-xl text-sm font-bold flex items-center gap-2 shadow-lg transition-all active:scale-95 ${isRunningCode ? 'bg-slate-400 cursor-not-allowed' : 'bg-green-600 hover:bg-green-700 hover:shadow-green-500/30'}`}
                                            >
                                                <Play size={16} fill="currentColor" /> {isRunningCode ? "Executing..." : "Run Code"}
                                            </button>
                                        </div>
                                        <div className="relative group">
                                            <div className="absolute -inset-0.5 bg-gradient-to-r from-blue-500 to-purple-600 rounded-xl opacity-20 group-focus-within:opacity-100 transition duration-500 blur"></div>
                                            <textarea
                                                value={answers[currentQIdx] || ''}
                                                onChange={(e) => handleAnswer(e.target.value)}
                                                placeholder={q.boilerplate || "// Write your code here..."}
                                                className="relative w-full h-96 p-6 font-mono text-sm bg-slate-900 text-slate-200 rounded-xl border border-slate-800 focus:outline-none resize-none leading-relaxed"
                                                spellCheck="false"
                                            />
                                        </div>

                                        {/* Console */}
                                        <div className="bg-black rounded-xl p-5 border border-slate-800 font-mono text-xs h-40 overflow-y-auto shadow-inner relative">
                                            <div className="sticky top-0 bg-black/80 backdrop-blur pb-2 mb-2 border-b border-slate-800 text-slate-500 uppercase tracking-wider font-bold text-[10px] flex justify-between">
                                                <span>Console Output</span>
                                                <Terminal size={12} />
                                            </div>
                                            <pre className={`${consoleOutput.includes('Error') ? 'text-red-400' : 'text-green-400'} whitespace-pre-wrap font-medium`}>{consoleOutput || "> Waiting for execution..."}</pre>
                                        </div>

                                        {answers[currentQIdx] && (
                                            <div className="flex items-center gap-2 text-green-600 text-sm font-bold bg-green-50 p-3 rounded-lg border border-green-200 animate-in fade-in slide-in-from-bottom-2">
                                                <CheckCircle size={18} /> Snapshot saved. Ready to submit.
                                            </div>
                                        )}
                                    </div>
                                ) : (
                                    <div className="grid grid-cols-1 gap-3">
                                        {q.options.map((opt, idx) => (
                                            <button
                                                key={idx}
                                                onClick={() => handleAnswer(idx)}
                                                className={`text-left p-5 rounded-xl border-2 transition-all flex items-center justify-between group relative overflow-hidden ${answers[currentQIdx] === idx
                                                    ? 'bg-blue-50 border-blue-500 shadow-md z-10'
                                                    : 'bg-white border-slate-100 hover:border-blue-200 hover:bg-slate-50'
                                                    }`}
                                            >
                                                {answers[currentQIdx] === idx && <div className="absolute left-0 top-0 bottom-0 w-1.5 bg-blue-500"></div>}
                                                <span className={`font-medium text-lg ${answers[currentQIdx] === idx ? 'text-blue-900' : 'text-slate-600 group-hover:text-slate-900'}`}>
                                                    {opt}
                                                </span>
                                                <div className={`w-6 h-6 rounded-full border-2 flex items-center justify-center transition-colors ${answers[currentQIdx] === idx ? 'border-blue-500 bg-blue-500 text-white' : 'border-slate-300 group-hover:border-blue-400'}`}>
                                                    {answers[currentQIdx] === idx && <CheckCircle size={14} strokeWidth={4} />}
                                                </div>
                                            </button>
                                        ))}
                                    </div>
                                )}
                            </div>
                        </motion.div>
                    </div>
                </div>

                {/* Footer Controls */}
                <div className="bg-white border-t border-slate-200 p-4 md:p-6 fixed bottom-0 left-0 right-0 z-40">
                    <div className="max-w-4xl mx-auto flex justify-between items-center">
                        <div className="text-sm font-medium text-slate-400 hidden md:block">
                            Step {currentQIdx + 1} of {questions.length}
                        </div>
                        <button
                            onClick={nextQuestion}
                            disabled={answers[currentQIdx] === undefined}
                            className={`px-10 py-4 rounded-xl font-bold text-lg transition-all shadow-xl flex items-center gap-3 active:scale-95 ${answers[currentQIdx] !== undefined
                                ? 'bg-blue-600 text-white hover:bg-blue-700 shadow-blue-500/30'
                                : 'bg-slate-100 text-slate-400 cursor-not-allowed shadow-none'
                                }`}
                        >
                            {currentQIdx === questions.length - 1 ? 'Finish Assessment' : 'Next Question'}
                            <ChevronRight size={20} />
                        </button>
                    </div>
                </div>
            </div>
        );
    }

    if (testState === 'finished') {
        return (
            <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-md z-50 flex items-center justify-center p-4">
                <motion.div
                    initial={{ scale: 0.9, opacity: 0 }}
                    animate={{ scale: 1, opacity: 1 }}
                    className="bg-white max-w-lg w-full p-10 rounded-[2.5rem] text-center border border-white/20 shadow-2xl relative overflow-hidden"
                >
                    <div className="absolute top-0 w-full h-3 bg-gradient-to-r from-blue-500 via-purple-500 to-indigo-500"></div>

                    <div className="w-28 h-28 mx-auto bg-slate-50 rounded-full flex items-center justify-center mb-8 shadow-inner border border-slate-100 relative">
                        {score >= 70 ? (
                            <div className="absolute inset-0 rounded-full border-4 border-green-500 border-t-transparent animate-spin duration-[3000ms]"></div>
                        ) : null}
                        <CheckCircle size={56} className={`${score >= 70 ? 'text-green-500' : 'text-slate-300'}`} />
                    </div>

                    <h2 className="text-4xl font-extrabold mb-2 text-slate-900 tracking-tight">Assessment Complete!</h2>
                    <p className="text-slate-500 mb-8 font-medium text-lg">{selectedTopic?.name} • <span className="text-slate-800">{level}</span></p>

                    <div className="bg-slate-50 rounded-3xl p-8 mb-8 border border-slate-100 relative overflow-hidden group">
                        <div className="absolute top-0 right-0 p-16 bg-blue-500/5 blur-[50px] rounded-full pointer-events-none group-hover:bg-blue-500/10 transition-colors"></div>

                        <div className="text-sm font-bold text-slate-400 uppercase tracking-widest mb-1">Total Score</div>
                        <div className={`text-7xl font-black mb-4 tracking-tighter ${score >= 70 ? 'text-transparent bg-clip-text bg-gradient-to-br from-green-500 to-emerald-700' : 'text-slate-700'}`}>
                            {score.toFixed(0)}%
                        </div>

                        {/* Unlock Animation */}
                        {score >= 70 && (
                            <motion.div
                                initial={{ y: 10, opacity: 0 }}
                                animate={{ y: 0, opacity: 1 }}
                                transition={{ delay: 0.5 }}
                                className="inline-flex items-center gap-2 px-4 py-2 bg-yellow-100 text-yellow-700 rounded-full text-sm font-bold border border-yellow-200 shadow-sm"
                            >
                                <Unlock size={16} /> Next Level Unlocked
                            </motion.div>
                        )}

                        {score < 70 && (
                            <div className="text-orange-600 font-bold text-sm bg-orange-50 inline-block px-4 py-1 rounded-full border border-orange-100">
                                Try again to unlock next level
                            </div>
                        )}
                    </div>

                    <div className="flex gap-4 justify-center">
                        <button onClick={reset} className="w-full px-8 py-4 rounded-xl bg-slate-900 hover:bg-black text-white transition-all font-bold shadow-xl shadow-slate-900/20 active:scale-[0.98]">
                            Back to Dashboard
                        </button>
                    </div>
                </motion.div>
            </div>
        );
    }

    // Default: Dashboard Grid
    return (
        <div className="max-w-7xl mx-auto pb-20 px-4">
            <header className="mb-12 text-center">
                <h1 className="text-5xl font-extrabold text-slate-900 mb-4 tracking-tight">
                    Skill Validation Center
                </h1>
                <p className="text-slate-500 max-w-2xl mx-auto text-lg leading-relaxed">
                    Select a technology stack to verify your expertise. Unlock simpler tiers first to access advanced challenges.
                </p>
            </header>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mb-12">
                {paginatedTopics.map((topic, idx) => (
                    <motion.div
                        key={idx}
                        whileHover={{ y: -5 }}
                        className="glass-card p-8 flex flex-col items-start cursor-pointer group relative overflow-hidden"
                        onClick={() => setSelectedTopic(topic)}
                    >
                        <div className="absolute top-0 right-0 p-16 bg-gradient-to-br from-blue-500/5 to-transparent rounded-bl-full pointer-events-none transition-transform duration-500 group-hover:scale-110"></div>

                        <div className="w-14 h-14 rounded-2xl bg-slate-50 flex items-center justify-center text-slate-400 mb-6 group-hover:bg-blue-600 group-hover:text-white transition-all duration-300 border border-slate-100 shadow-sm group-hover:shadow-blue-500/30">
                            {topic.icon}
                        </div>

                        <h3 className="text-2xl font-bold mb-2 text-slate-900 group-hover:text-blue-600 transition-colors">{topic.name}</h3>
                        <p className="text-slate-500 mb-6 line-clamp-2 leading-relaxed">{topic.description}</p>

                        <div className="mt-auto pt-6 border-t border-slate-100 w-full flex items-center justify-between">
                            <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">AI Adaptive</span>
                            <span className="w-8 h-8 rounded-full bg-slate-100 flex items-center justify-center text-slate-400 group-hover:bg-blue-100 group-hover:text-blue-600 transition-colors">
                                <ChevronRight size={16} />
                            </span>
                        </div>
                    </motion.div>
                ))}
            </div>

            {/* Pagination Controls */}
            {totalPages > 1 && (
                <div className="flex justify-center items-center gap-4 bg-white/50 backdrop-blur-sm p-2 rounded-2xl border border-slate-200 w-fit mx-auto shadow-sm">
                    <button
                        onClick={prevPage}
                        disabled={currentPage === 1}
                        className={`p-3 rounded-xl transition-all ${currentPage === 1 ? 'text-slate-300 cursor-not-allowed' : 'text-slate-600 hover:bg-white hover:shadow hover:text-blue-600'}`}
                    >
                        <ChevronLeft size={20} />
                    </button>
                    <span className="text-slate-900 font-bold px-2">Page {currentPage} of {totalPages}</span>
                    <button
                        onClick={nextPage}
                        disabled={currentPage === totalPages}
                        className={`p-3 rounded-xl transition-all ${currentPage === totalPages ? 'text-slate-300 cursor-not-allowed' : 'text-slate-600 hover:bg-white hover:shadow hover:text-blue-600'}`}
                    >
                        <ChevronRight size={20} />
                    </button>
                </div>
            )}

            {/* Level Selection Modal */}
            <AnimatePresence>
                {selectedTopic && (
                    <motion.div
                        initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
                        className="fixed inset-0 bg-slate-900/60 backdrop-blur-md z-40 flex items-center justify-center p-4"
                        onClick={() => setSelectedTopic(null)}
                    >
                        <motion.div
                            initial={{ scale: 0.95, y: 20 }} animate={{ scale: 1, y: 0 }} exit={{ scale: 0.95, y: 20 }}
                            className="bg-white border border-white/20 p-8 rounded-[2.5rem] max-w-md w-full shadow-2xl relative overflow-hidden"
                            onClick={e => e.stopPropagation()}
                        >
                            <div className="absolute top-0 w-full h-2 bg-gradient-to-r from-blue-500 to-cyan-500"></div>

                            <button onClick={() => setSelectedTopic(null)} className="absolute right-6 top-6 w-8 h-8 bg-slate-100 rounded-full flex items-center justify-center text-slate-400 hover:bg-slate-200 hover:text-slate-600 transition-colors">
                                <X size={16} />
                            </button>

                            <div className="text-center mb-8 pt-4">
                                <div className="w-20 h-20 mx-auto bg-blue-50 rounded-3xl flex items-center justify-center text-blue-600 mb-5 border border-blue-100 shadow-xl shadow-blue-500/10">
                                    <div className="scale-150">{selectedTopic.icon}</div>
                                </div>
                                <h2 className="text-3xl font-extrabold text-slate-900 mb-1">{selectedTopic.name}</h2>
                                <p className="text-slate-500 font-medium">Select Difficulty Level</p>
                            </div>

                            <div className="space-y-3">
                                {['Beginner', 'Intermediate', 'Advanced', 'Coding Challenge'].map(lvl => {
                                    if (lvl === 'Coding Challenge' && !isCodingLanguage(selectedTopic.name)) return null;
                                    const locked = !isLevelUnlocked(selectedTopic.name, lvl);
                                    return (
                                        <button
                                            key={lvl}
                                            onClick={() => !locked && initiateTest(selectedTopic, lvl)}
                                            disabled={locked}
                                            className={`w-full p-4 rounded-2xl border transition-all flex items-center justify-between group relative overflow-hidden text-left ${locked
                                                ? 'bg-slate-50 border-slate-100 text-slate-400 cursor-not-allowed opacity-80'
                                                : 'bg-white border-slate-200 hover:border-blue-500 hover:bg-blue-50/10 hover:shadow-lg cursor-pointer'
                                                }`}
                                        >
                                            <div className="flex items-center gap-4 relative z-10">
                                                <div className={`w-12 h-12 rounded-xl flex items-center justify-center transition-colors ${locked ? 'bg-slate-200 text-slate-400' : 'bg-blue-100 text-blue-600 group-hover:bg-blue-600 group-hover:text-white'}`}>
                                                    {locked ? <Lock size={20} /> : <div className="font-bold text-sm">{lvl[0]}</div>}
                                                </div>
                                                <div>
                                                    <span className={`font-bold block text-lg ${locked ? 'text-slate-400' : 'text-slate-900'}`}>{lvl}</span>
                                                    <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider">{locked ? "Locked" : "Available"}</span>
                                                </div>
                                            </div>

                                            {!locked && (
                                                <div className="w-8 h-8 rounded-full bg-slate-50 flex items-center justify-center text-slate-300 group-hover:bg-blue-600 group-hover:text-white transition-all">
                                                    <Play size={14} fill="currentColor" className="ml-0.5" />
                                                </div>
                                            )}
                                        </button>
                                    );
                                })}
                            </div>

                            {/* Rules Section */}
                            <div className="mt-8 p-5 bg-slate-50 rounded-2xl border border-slate-100 text-center">
                                <p className="text-xs text-slate-500 font-medium leading-relaxed">
                                    Pass with <strong className="text-slate-800">70% score</strong> to unlock the next difficulty tier.
                                </p>
                            </div>
                        </motion.div>
                    </motion.div>
                )}
            </AnimatePresence>
        </div>
    );
};

export default SkillTest;
