import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Upload, X, Plus, Save, FileText, Briefcase, GraduationCap, User, Loader2, Check, Activity, CheckCircle, Link as LinkIcon, Copy } from 'lucide-react';
import axios from 'axios';
import toast from 'react-hot-toast';

const Profile = ({ user, setUser }) => {
    // Test History State
    const [testHistory, setTestHistory] = useState([]);
    const [selectedTest, setSelectedTest] = useState(null);
    const [skills, setSkills] = useState([]);
    const [inputValue, setInputValue] = useState('');
    const [resume, setResume] = useState(null);
    const [analyzing, setAnalyzing] = useState(false);
    const [saving, setSaving] = useState(false);
    const [showUploadSuccess, setShowUploadSuccess] = useState(false); // Success Popup State
    const [showSaveSuccess, setShowSaveSuccess] = useState(false); // New: Save Success Popup State
    const [showLinkModal, setShowLinkModal] = useState(false);
    const [generatedLink, setGeneratedLink] = useState('');

    // New States for Profile Sections
    const [activeTab, setActiveTab] = useState('overview'); // overview, experience, education
    const [personalDetails, setPersonalDetails] = useState({
        name: user?.name || '',
        email: user?.email || '',
        phone: '',
        linkedin: '',
        summary: '',
        location: ''
    });
    const [experienceList, setExperienceList] = useState([]);
    const [educationList, setEducationList] = useState([]);

    // Skill Handling
    const handleSkillInput = (e) => {
        setInputValue(e.target.value);
    };

    const addSkill = () => {
        if (inputValue.trim() && !skills.includes(inputValue.trim())) {
            setSkills([...skills, inputValue.trim()]);
            setInputValue('');
        }
    };

    const removeSkill = (skillToRemove) => {
        setSkills(skills.filter(s => s !== skillToRemove));
    };

    const handleKeyDown = (e) => {
        if (e.key === 'Enter') {
            e.preventDefault();
            addSkill();
        }
    };

    // Load initial data
    useEffect(() => {
        if (user?.email) {
            // Load History
            axios.get(`/api/tests/history?email=${encodeURIComponent(user.email)}`)
                .then(res => setTestHistory(res.data))
                .catch(err => console.error("History fetch error", err));

            // Load Profile Data
            axios.get(`/api/profile?email=${encodeURIComponent(user.email)}`)
                .then(res => {
                    const data = res.data;
                    if (data) {
                        setPersonalDetails(prev => ({ ...prev, ...data.personalDetails }));
                        setSkills(data.skills || []);
                        setExperienceList(data.experience || []);
                        setEducationList(data.education || []);
                    }
                })
                .catch(err => console.error("Profile fetch error", err));
        }
    }, [user]);

    // Save Profile
    const handleSave = async () => {
        if (!user?.email) {
            toast.error("User not found!");
            return;
        }
        setSaving(true);
        try {
            await axios.post('/api/profile/save', {
                email: user.email,
                personalDetails,
                skills,
                experience: experienceList,
                education: educationList
            });
            // toast.success("Profile saved successfully!");
            // Update global user context if needed (name might have changed)
            if (setUser && personalDetails.name) {
                const updatedUser = { ...user, name: personalDetails.name };
                setUser(updatedUser);
                localStorage.setItem('user', JSON.stringify(updatedUser));
            }
            setShowUploadSuccess(false);
            setShowSaveSuccess(true); // Trigger Success Modal
        } catch (err) {
            console.error("Save Error:", err);
            toast.error("Failed to save profile.");
        } finally {
            setSaving(false);
        }
    };

    const handleCreateLink = () => {
        const encodedEmail = user?.email ? btoa(user.email) : 'u123';
        const link = `${window.location.origin}/public/profile/${encodedEmail}`;
        setGeneratedLink(link);
        setShowLinkModal(true);
    };

    const handleCopyLink = () => {
        navigator.clipboard.writeText(generatedLink);
        toast.success("Link copied to clipboard!", { icon: '🔗' });
        setShowLinkModal(false);
    };

    // Resume Upload (Real Implementation)
    const handleResumeUpload = async (e) => {
        const file = e.target.files[0];
        if (!file) return;
        setResume(file);
        setAnalyzing(true);
        const formData = new FormData();
        formData.append('resume', file);

        try {
            const res = await axios.post('/api/ai/resume-parse', formData, {
                headers: { 'Content-Type': 'multipart/form-data' }
            });

            const data = res.data;
            console.log("Resume Parse Data:", data);

            if (data) {
                // Auto-fill Data
                if (data.personal_info) {
                    setPersonalDetails(prev => ({
                        ...prev,
                        ...data.personal_info,
                        email: prev.email // STRICTLY preserve login email, ignore resume email
                    }));
                }
                if (data.skills && Array.isArray(data.skills)) {
                    setSkills(prev => [...new Set([...prev, ...data.skills])]);
                }
                if (data.experience && Array.isArray(data.experience)) {
                    setExperienceList(data.experience);
                }
                if (data.education && Array.isArray(data.education)) {
                    setEducationList(data.education);
                }
                // toast.success("Resume parsed successfully!"); // Replaced by Modal
                setShowUploadSuccess(true);
            }
        } catch (err) {
            console.error("Resume Parse Error:", err);
            toast.error("Failed to parse resume. Please try again.");
        } finally {
            setAnalyzing(false);
        }
    };

    // Manual Entry Handlers
    const addExperience = () => {
        setExperienceList([...experienceList, { role: '', company: '', duration: '', description: '' }]);
    };
    const updateExperience = (index, field, value) => {
        const updated = [...experienceList];
        updated[index][field] = value;
        setExperienceList(updated);
    };
    const removeExperience = (index) => {
        setExperienceList(experienceList.filter((_, i) => i !== index));
    };

    const addEducation = () => {
        setEducationList([...educationList, { degree: '', institution: '', year: '' }]);
    };
    const updateEducation = (index, field, value) => {
        const updated = [...educationList];
        updated[index][field] = value;
        setEducationList(updated);
    };
    const removeEducation = (index) => {
        setEducationList(educationList.filter((_, i) => i !== index));
    };

    // --- Metrics Calculation ---
    const calculateMetrics = () => {
        if (!testHistory.length) return { totalTests: 0, avgScore: 0, topSkill: 'None' };
        const totalTests = testHistory.length;
        const avgScore = Math.round(testHistory.reduce((acc, curr) => acc + curr.score, 0) / totalTests);
        const topTest = [...testHistory].sort((a, b) => b.score - a.score)[0];
        return { totalTests, avgScore, topSkill: topTest?.topic || 'None' };
    };
    const metrics = calculateMetrics();

    // Helper to get best result for a skill
    const getSkillResult = (skillName) => {
        // Find all tests for this skill
        const tests = testHistory.filter(t => t.topic.toLowerCase() === skillName.toLowerCase());
        if (!tests.length) return null;
        // Return best score
        return tests.sort((a, b) => b.score - a.score)[0];
    };

    return (
        <div className="max-w-6xl mx-auto space-y-8 pb-10">
            <header className="flex justify-between items-center">
                <div>
                    <h1 className="text-3xl font-bold text-slate-900">My Profile</h1>
                    <p className="text-slate-500">Manage your skills, experience, and view assessment history.</p>
                </div>
                <div className="flex gap-3">
                    <button
                        onClick={handleCreateLink}
                        className="bg-white border border-slate-200 text-slate-600 px-5 py-2 rounded-xl hover:bg-slate-50 hover:text-blue-600 hover:border-blue-200 transition-all flex items-center gap-2 font-bold shadow-sm"
                    >
                        <LinkIcon size={18} />
                        Create Link
                    </button>
                    <button
                        onClick={handleSave}
                        className="bg-blue-600 text-white px-6 py-2 rounded-xl hover:bg-blue-700 transition flex items-center gap-2 font-semibold shadow-lg shadow-blue-200 disabled:opacity-50"
                        disabled={saving}
                    >
                        {saving ? <Loader2 className="animate-spin" size={18} /> : <Save size={18} />}
                        {saving ? 'Saving...' : 'Save Changes'}
                    </button>
                </div>
            </header>

            {/* Profile Metrics Section */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm flex items-center gap-4">
                    <div className="p-4 bg-blue-50 text-blue-600 rounded-full">
                        <CheckCircle size={28} />
                    </div>
                    <div>
                        <p className="text-slate-500 text-sm font-medium">Skills Verified</p>
                        <h3 className="text-2xl font-bold text-slate-900">{metrics.totalTests}</h3>
                    </div>
                </div>
                <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm flex items-center gap-4">
                    <div className="p-4 bg-purple-50 text-purple-600 rounded-full">
                        <Activity size={28} />
                    </div>
                    <div>
                        <p className="text-slate-500 text-sm font-medium">Average Score</p>
                        <h3 className="text-2xl font-bold text-slate-900">{metrics.avgScore}%</h3>
                    </div>
                </div>
                <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm flex items-center gap-4">
                    <div className="p-4 bg-amber-50 text-amber-600 rounded-full">
                        <GraduationCap size={28} />
                    </div>
                    <div>
                        <p className="text-slate-500 text-sm font-medium">Top Skill</p>
                        <h3 className="text-xl font-bold text-slate-900 truncate max-w-[150px]">{metrics.topSkill}</h3>
                    </div>
                </div>
            </div>

            {/* Navigation Tabs */}
            <div className="flex gap-4 border-b border-slate-200">
                <button onClick={() => setActiveTab('overview')} className={`pb-3 px-4 text-sm font-semibold transition-colors ${activeTab === 'overview' ? 'text-blue-600 border-b-2 border-blue-600' : 'text-slate-500 hover:text-slate-800'}`}>Overview & Skills</button>
                <button onClick={() => setActiveTab('experience')} className={`pb-3 px-4 text-sm font-semibold transition-colors ${activeTab === 'experience' ? 'text-blue-600 border-b-2 border-blue-600' : 'text-slate-500 hover:text-slate-800'}`}>Professional Experience</button>
                <button onClick={() => setActiveTab('education')} className={`pb-3 px-4 text-sm font-semibold transition-colors ${activeTab === 'education' ? 'text-blue-600 border-b-2 border-blue-600' : 'text-slate-500 hover:text-slate-800'}`}>Education</button>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">

                {/* Left Column: Dynamic Content based on Tab */}
                <div className="lg:col-span-2 space-y-6">

                    {activeTab === 'overview' && (
                        <div className="space-y-6">
                            {/* Personal Details */}
                            <div className="glass-card p-8 rounded-3xl relative overflow-hidden group">
                                <div className="absolute top-0 right-0 p-24 bg-blue-500/5 blur-[60px] rounded-full pointer-events-none group-hover:bg-blue-500/10 transition-colors"></div>
                                <h2 className="text-xl font-bold mb-6 flex items-center gap-3 text-slate-800 border-b border-slate-100 pb-4 relative z-10">
                                    <div className="p-2 bg-blue-50 text-blue-600 rounded-lg"><User size={20} /></div>
                                    Personal Details
                                </h2>
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-6 relative z-10">
                                    <div className="space-y-1.5">
                                        <label className="text-xs font-bold text-slate-400 uppercase tracking-wider">Full Name</label>
                                        <input value={personalDetails.name} onChange={(e) => setPersonalDetails({ ...personalDetails, name: e.target.value })} className="w-full bg-slate-50/50 border border-slate-200 rounded-xl p-3 text-sm focus:ring-2 focus:ring-blue-500 focus:bg-white outline-none font-semibold transition-all" placeholder="Enter your name" />
                                    </div>
                                    <div className="space-y-1.5">
                                        <label className="text-xs font-bold text-slate-400 uppercase tracking-wider">Email</label>
                                        <input value={personalDetails.email} readOnly className="w-full bg-slate-100/50 border border-slate-200 rounded-xl p-3 text-sm outline-none cursor-not-allowed text-slate-500 font-medium" placeholder="Enter email" />
                                    </div>
                                    <div className="space-y-1.5">
                                        <label className="text-xs font-bold text-slate-400 uppercase tracking-wider">Phone</label>
                                        <input value={personalDetails.phone} onChange={(e) => setPersonalDetails({ ...personalDetails, phone: e.target.value })} className="w-full bg-slate-50/50 border border-slate-200 rounded-xl p-3 text-sm focus:ring-2 focus:ring-blue-500 focus:bg-white outline-none transition-all" placeholder="+1 234 567 8900" />
                                    </div>
                                    <div className="space-y-1.5">
                                        <label className="text-xs font-bold text-slate-400 uppercase tracking-wider">Location</label>
                                        <input value={personalDetails.location} onChange={(e) => setPersonalDetails({ ...personalDetails, location: e.target.value })} className="w-full bg-slate-50/50 border border-slate-200 rounded-xl p-3 text-sm focus:ring-2 focus:ring-blue-500 focus:bg-white outline-none transition-all" placeholder="City, Country" />
                                    </div>
                                    <div className="space-y-1.5 col-span-1 md:col-span-2">
                                        <label className="text-xs font-bold text-slate-400 uppercase tracking-wider">LinkedIn / Portfolio</label>
                                        <input value={personalDetails.linkedin} onChange={(e) => setPersonalDetails({ ...personalDetails, linkedin: e.target.value })} className="w-full bg-slate-50/50 border border-slate-200 rounded-xl p-3 text-sm focus:ring-2 focus:ring-blue-500 focus:bg-white outline-none transition-all" placeholder="https://linkedin.com/in/..." />
                                    </div>
                                    <div className="col-span-1 md:col-span-2 space-y-1.5">
                                        <label className="text-xs font-bold text-slate-400 uppercase tracking-wider">Professional Summary</label>
                                        <textarea value={personalDetails.summary} onChange={(e) => setPersonalDetails({ ...personalDetails, summary: e.target.value })} className="w-full bg-slate-50/50 border border-slate-200 rounded-xl p-3 text-sm focus:ring-2 focus:ring-blue-500 focus:bg-white outline-none h-28 resize-none transition-all" placeholder="Briefly describe your career goals and expertise..." />
                                    </div>
                                </div>
                            </div>

                            {/* Skills Section - Management */}
                            <div className="glass-card p-8 rounded-3xl">
                                <h2 className="text-xl font-bold mb-6 flex items-center gap-3 text-slate-800 border-b border-slate-100 pb-4">
                                    <div className="p-2 bg-purple-50 text-purple-600 rounded-lg"><Briefcase size={20} /></div>
                                    Skills
                                </h2>
                                <div className="relative mb-6">
                                    <input
                                        type="text"
                                        className="w-full bg-white border border-slate-200 rounded-2xl py-4 px-5 focus:ring-2 focus:ring-blue-500 outline-none text-slate-900 placeholder-slate-400 pl-12 shadow-sm"
                                        placeholder="Add skill (e.g. React, Python, Project Management)..."
                                        value={inputValue}
                                        onChange={handleSkillInput}
                                        onKeyDown={handleKeyDown}
                                    />
                                    <Plus size={20} className="absolute left-4 top-4.5 text-slate-400" />
                                    <button onClick={addSkill} className="absolute right-2.5 top-2.5 p-2 bg-slate-900 rounded-xl text-white hover:bg-black transition shadow-lg shadow-slate-900/20">
                                        <Plus size={18} />
                                    </button>
                                </div>
                                <div className="flex flex-wrap gap-2.5">
                                    <AnimatePresence>
                                        {skills.map((skill) => (
                                            <motion.span
                                                key={skill}
                                                initial={{ scale: 0 }} animate={{ scale: 1 }} exit={{ scale: 0 }}
                                                className="px-4 py-2 rounded-xl bg-slate-50 text-slate-700 text-sm font-bold border border-slate-200 flex items-center gap-3 group hover:border-red-300 hover:bg-red-50 transition-colors"
                                            >
                                                {skill}
                                                <button onClick={() => removeSkill(skill)} className="text-slate-400 group-hover:text-red-500"><X size={14} strokeWidth={3} /></button>
                                            </motion.span>
                                        ))}
                                    </AnimatePresence>
                                    {skills.length === 0 && <span className="text-slate-400 text-sm font-medium italic p-2">No skills added yet. Type above to add.</span>}
                                </div>
                            </div>

                            {/* Performance Section - Visualization */}
                            <div className="glass-card p-8 rounded-3xl">
                                <h2 className="text-xl font-bold mb-8 flex items-center gap-3 text-slate-800 border-b border-slate-100 pb-4">
                                    <div className="p-2 bg-green-50 text-green-600 rounded-lg"><CheckCircle size={20} /></div>
                                    Performance Analysis
                                </h2>

                                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
                                    {skills.length === 0 ? (
                                        <div className="col-span-full text-center py-12 text-slate-400 bg-slate-50/50 rounded-2xl border-2 border-dashed border-slate-100">
                                            <p className="font-medium">Add skills above to see performance tracking.</p>
                                        </div>
                                    ) : (
                                        skills.map((skill) => {
                                            const result = getSkillResult(skill);
                                            const isVerified = !!result;
                                            const score = result ? Math.round(result.score) : 0;

                                            // Circular Progress Logic
                                            const radius = 24;
                                            const circumference = 2 * Math.PI * radius;
                                            const strokeDashoffset = circumference - (score / 100) * circumference;

                                            return (
                                                <div key={skill} className="bg-white rounded-2xl border border-slate-100 p-5 flex items-center justify-between hover:shadow-lg hover:border-blue-200 hover:translate-y-[-2px] transition-all group">
                                                    <div>
                                                        <h3 className="font-bold text-slate-800 text-lg">{skill}</h3>
                                                        <span className={`text-[10px] font-bold px-2.5 py-1 rounded-full mt-2 inline-block uppercase tracking-wider ${!isVerified ? 'bg-slate-100 text-slate-500' :
                                                            result.level === 'Advanced' ? 'bg-purple-100 text-purple-700' :
                                                                result.level === 'Intermediate' ? 'bg-blue-100 text-blue-700' :
                                                                    'bg-green-100 text-green-700'
                                                            }`}>
                                                            {isVerified ? result.level : 'Not Tested'}
                                                        </span>
                                                    </div>
                                                    <div className="relative w-16 h-16 flex items-center justify-center">
                                                        {isVerified ? (
                                                            <>
                                                                <svg className="transform -rotate-90 w-16 h-16">
                                                                    <circle cx="32" cy="32" r={radius} stroke="#f1f5f9" strokeWidth="6" fill="transparent" />
                                                                    <circle cx="32" cy="32" r={radius} stroke={score >= 80 ? '#22c55e' : score >= 60 ? '#3b82f6' : '#f97316'} strokeWidth="6" fill="transparent" strokeDasharray={circumference} strokeDashoffset={strokeDashoffset} strokeLinecap="round" />
                                                                </svg>
                                                                <span className="absolute text-xs font-black text-slate-700">{score}%</span>
                                                            </>
                                                        ) : (
                                                            <div className="w-12 h-12 rounded-full bg-slate-50 flex items-center justify-center border-2 border-slate-100 group-hover:bg-blue-50 group-hover:border-blue-100 text-slate-300 group-hover:text-blue-400 transition-colors">
                                                                <Activity size={20} />
                                                            </div>
                                                        )}
                                                    </div>
                                                </div>
                                            );
                                        })
                                    )}
                                </div>
                            </div>

                        </div>
                    )}

                    {activeTab === 'experience' && (
                        <div className="space-y-4">
                            {experienceList.map((exp, idx) => (
                                <div key={idx} className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm relative group">
                                    <button onClick={() => removeExperience(idx)} className="absolute top-4 right-4 text-slate-400 hover:text-red-500 opacity-0 group-hover:opacity-100 transition-opacity">
                                        <X size={20} />
                                    </button>
                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                        <div className="space-y-1">
                                            <label className="text-xs font-semibold text-slate-500 uppercase">Role / Job Title</label>
                                            <input value={exp.role} onChange={(e) => updateExperience(idx, 'role', e.target.value)} className="w-full bg-slate-50 border border-slate-200 rounded-lg p-2.5 text-sm focus:ring-2 focus:ring-blue-500 outline-none font-semibold" />
                                        </div>
                                        <div className="space-y-1">
                                            <label className="text-xs font-semibold text-slate-500 uppercase">Company</label>
                                            <input value={exp.company} onChange={(e) => updateExperience(idx, 'company', e.target.value)} className="w-full bg-slate-50 border border-slate-200 rounded-lg p-2.5 text-sm focus:ring-2 focus:ring-blue-500 outline-none" />
                                        </div>
                                        <div className="col-span-1 md:col-span-2 space-y-1">
                                            <label className="text-xs font-semibold text-slate-500 uppercase">Duration</label>
                                            <input value={exp.duration} onChange={(e) => updateExperience(idx, 'duration', e.target.value)} className="w-full bg-slate-50 border border-slate-200 rounded-lg p-2.5 text-sm focus:ring-2 focus:ring-blue-500 outline-none" placeholder="e.g. Jan 2020 - Jan 2022" />
                                        </div>
                                        <div className="col-span-1 md:col-span-2 space-y-1">
                                            <label className="text-xs font-semibold text-slate-500 uppercase">Description</label>
                                            <textarea value={exp.description} onChange={(e) => updateExperience(idx, 'description', e.target.value)} className="w-full bg-slate-50 border border-slate-200 rounded-lg p-2.5 text-sm focus:ring-2 focus:ring-blue-500 outline-none h-20 resize-none" />
                                        </div>
                                    </div>
                                </div>
                            ))}
                            <button onClick={addExperience} className="w-full py-4 rounded-2xl border-2 border-dashed border-slate-200 text-slate-500 font-semibold hover:border-blue-400 hover:text-blue-600 transition-colors flex justify-center items-center gap-2">
                                <Plus size={20} /> Add Experience
                            </button>
                        </div>
                    )}

                    {activeTab === 'education' && (
                        <div className="space-y-4">
                            {educationList.map((edu, idx) => (
                                <div key={idx} className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm relative group">
                                    <button onClick={() => removeEducation(idx)} className="absolute top-4 right-4 text-slate-400 hover:text-red-500 opacity-0 group-hover:opacity-100 transition-opacity">
                                        <X size={20} />
                                    </button>
                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                        <div className="space-y-1">
                                            <label className="text-xs font-semibold text-slate-500 uppercase">Degree</label>
                                            <input value={edu.degree} onChange={(e) => updateEducation(idx, 'degree', e.target.value)} className="w-full bg-slate-50 border border-slate-200 rounded-lg p-2.5 text-sm focus:ring-2 focus:ring-blue-500 outline-none font-semibold" placeholder="e.g. B.S. in Computer Science" />
                                        </div>
                                        <div className="space-y-1">
                                            <label className="text-xs font-semibold text-slate-500 uppercase">Institution</label>
                                            <input value={edu.institution} onChange={(e) => updateEducation(idx, 'institution', e.target.value)} className="w-full bg-slate-50 border border-slate-200 rounded-lg p-2.5 text-sm focus:ring-2 focus:ring-blue-500 outline-none" placeholder="e.g. Stanford University" />
                                        </div>
                                        <div className="col-span-1 md:col-span-2 space-y-1">
                                            <label className="text-xs font-semibold text-slate-500 uppercase">Year of Graduation</label>
                                            <input value={edu.year} onChange={(e) => updateEducation(idx, 'year', e.target.value)} className="w-full bg-slate-50 border border-slate-200 rounded-lg p-2.5 text-sm focus:ring-2 focus:ring-blue-500 outline-none" placeholder="e.g. 2024" />
                                        </div>
                                    </div>
                                </div>
                            ))}
                            <button onClick={addEducation} className="w-full py-4 rounded-2xl border-2 border-dashed border-slate-200 text-slate-500 font-semibold hover:border-blue-400 hover:text-blue-600 transition-colors flex justify-center items-center gap-2">
                                <Plus size={20} /> Add Education
                            </button>
                        </div>
                    )}
                </div>

                {/* Right Column: Resume Upload & Assessment History */}
                <div className="lg:col-span-1 space-y-6">
                    {/* Resume Section */}
                    <div className="bg-gradient-to-br from-blue-600 to-blue-800 p-6 rounded-2xl text-white shadow-xl relative overflow-hidden">
                        <div className="relative z-10">
                            <h2 className="text-xl font-bold mb-2 flex items-center gap-2"><FileText size={20} /> Quick Import</h2>
                            <p className="text-blue-100 text-sm mb-6">Upload your resume to automatically fill your profile details.</p>

                            <label className={`block border-2 border-dashed border-blue-400 rounded-xl p-6 text-center hover:bg-white/10 transition-colors cursor-pointer relative ${analyzing ? 'opacity-50 pointer-events-none' : ''}`}>
                                <input type="file" onChange={handleResumeUpload} className="absolute inset-0 opacity-0 cursor-pointer" accept=".pdf" disabled={analyzing} />
                                {analyzing ? (
                                    <div className="flex flex-col items-center">
                                        <Loader2 className="animate-spin mb-2" size={24} />
                                        <span className="text-sm">Analyzing Resume...</span>
                                    </div>
                                ) : (
                                    <>
                                        <Upload className="mx-auto mb-2 text-blue-200" />
                                        <p className="text-sm font-semibold">{resume ? resume.name : "Upload Resume (PDF)"}</p>
                                    </>
                                )}
                            </label>

                            <div className="mt-4 p-3 bg-blue-800/50 rounded-lg text-xs text-blue-200 border border-blue-500/30">
                                <p className="font-bold mb-1">💡 Optimization Tip:</p>
                                <p className="mb-2">For best results, ensure your resume contains standard headings like <b>"Career Aspiration"</b>, <b>"Summary"</b>, <b>"Objective"</b>, or <b>"Technical Skills"</b>.</p>
                                <a href="/Sample_Resume_Template.txt" download className="inline-flex items-center gap-1 text-white bg-blue-500 hover:bg-blue-600 px-3 py-1 rounded text-xs font-bold transition-colors">
                                    <FileText size={12} /> Download Sample Format
                                </a>
                            </div>
                        </div>
                    </div>

                    {/* Assessment History */}
                    <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-lg">
                        <h2 className="text-xl font-bold mb-4 flex items-center gap-2 text-slate-800"><GraduationCap size={20} className="text-blue-600" /> Assessment History</h2>

                        {testHistory.length === 0 ? (
                            <div className="text-center py-10 text-slate-400 border-2 border-dashed border-slate-100 rounded-xl">
                                <p className="text-sm">No assessments taken yet.</p>
                            </div>
                        ) : (
                            <div className="space-y-4 max-h-[400px] overflow-y-auto custom-scrollbar pr-2">
                                {testHistory.map((test, idx) => (
                                    <div key={idx} className="bg-slate-50 p-4 rounded-xl border border-slate-200 hover:bg-white hover:shadow-md transition-all cursor-pointer" onClick={() => setSelectedTest(test)}>
                                        <div className="flex justify-between items-start mb-2">
                                            <h3 className="font-bold text-slate-900 line-clamp-1">{test.topic}</h3>
                                            <span className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase ${test.level === 'Beginner' ? 'bg-green-100 text-green-700' :
                                                test.level === 'Intermediate' ? 'bg-blue-100 text-blue-700' :
                                                    'bg-purple-100 text-purple-700'
                                                }`}>{test.level}</span>
                                        </div>
                                        <div className="flex justify-between items-end">
                                            <p className="text-xs text-slate-500">{new Date(test.created_at).toLocaleDateString()}</p>
                                            <p className="text-xl font-bold text-slate-700">{Math.round(test.score)}%</p>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>
                </div>
            </div>

            {/* Analysis Modal */}
            <AnimatePresence>
                {selectedTest && (
                    <motion.div
                        initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
                        className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm z-50 flex items-center justify-center p-4"
                        onClick={() => setSelectedTest(null)}
                    >
                        <motion.div
                            initial={{ scale: 0.9, y: 20 }} animate={{ scale: 1, y: 0 }} exit={{ scale: 0.9, y: 20 }}
                            className="bg-white w-full max-w-2xl max-h-[80vh] overflow-hidden rounded-2xl border border-slate-200 shadow-2xl flex flex-col"
                            onClick={e => e.stopPropagation()}
                        >
                            <div className="p-6 border-b border-slate-100 flex justify-between items-center bg-slate-50">
                                <div>
                                    <h2 className="text-xl font-bold text-slate-900">{selectedTest.topic} Analysis</h2>
                                    <p className="text-sm text-slate-500">{selectedTest.level} • Score: {Math.round(selectedTest.score)}%</p>
                                </div>
                                <button onClick={() => setSelectedTest(null)} className="p-2 hover:bg-slate-200 rounded-full text-slate-500 transition-colors">
                                    <X size={20} />
                                </button>
                            </div>

                            <div className="p-6 overflow-y-auto custom-scrollbar space-y-6 bg-white">
                                <div className="p-6 overflow-y-auto custom-scrollbar space-y-6 bg-white">
                                    {(() => {
                                        let details = [];
                                        try {
                                            details = typeof selectedTest.details_json === 'string'
                                                ? JSON.parse(selectedTest.details_json)
                                                : selectedTest.details_json;
                                        } catch (e) {
                                            console.error("JSON Parse error", e);
                                            details = [];
                                        }

                                        return details.map((q, idx) => (
                                            <div key={idx} className="border border-slate-200 rounded-xl p-5 hover:border-blue-200 transition-colors">
                                                <h3 className="font-semibold text-slate-800 mb-3">{idx + 1}. {q.question || q.q}</h3>

                                                {/* Options Display (if available) */}
                                                {q.options && (
                                                    <div className="space-y-2 mb-4 pl-4">
                                                        {q.options.map((opt, optIdx) => (
                                                            <div key={optIdx} className={`flex items-center gap-2 text-sm ${opt === q.correct_answer ? 'text-blue-700 font-bold' :
                                                                opt === (q.user_answer_display || q.user_answer) ? 'text-red-500 font-bold' : 'text-slate-500'
                                                                }`}>
                                                                {opt === q.correct_answer ? <CheckCircle size={14} /> : <div className="w-3.5 h-3.5" />}
                                                                {opt}
                                                            </div>
                                                        ))}
                                                    </div>
                                                )}

                                                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm bg-slate-50 p-4 rounded-xl">
                                                    <div className={`p-2 rounded border-l-4 ${q.is_correct ? 'border-green-500 bg-green-50/50' : 'border-red-500 bg-red-50/50'}`}>
                                                        <span className="block text-xs uppercase font-bold text-slate-500 mb-1">Your Answer</span>
                                                        <span className={`font-semibold ${q.is_correct ? 'text-green-700' : 'text-red-700'}`}>
                                                            {q.user_answer_display || q.user_answer || "Skipped"}
                                                        </span>
                                                    </div>
                                                    <div className="p-2 rounded border-l-4 border-blue-500 bg-blue-50/50">
                                                        <span className="block text-xs uppercase font-bold text-slate-500 mb-1">Correct Answer</span>
                                                        <span className="font-semibold text-blue-700">
                                                            {q.correct_answer || "N/A"}
                                                        </span>
                                                    </div>
                                                </div>

                                                {q.explanation && (
                                                    <div className="mt-4 text-sm text-slate-600 border-t border-slate-100 pt-3">
                                                        <span className="font-bold text-blue-600 block mb-1">Explanation:</span>
                                                        {q.explanation}
                                                    </div>
                                                )}
                                            </div>
                                        ));
                                    })()}
                                </div>
                            </div>
                        </motion.div>
                    </motion.div>
                )}

                {/* SUCCESS POPUP MODAL - RESUME */}
                {showUploadSuccess && (
                    <motion.div
                        initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
                        className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm z-50 flex items-center justify-center p-4"
                        onClick={() => setShowUploadSuccess(false)}
                    >
                        <motion.div
                            initial={{ scale: 0.9, y: 20 }} animate={{ scale: 1, y: 0 }} exit={{ scale: 0.9, y: 20 }}
                            className="bg-white w-full max-w-md rounded-2xl border border-slate-200 shadow-2xl p-8 flex flex-col items-center text-center"
                            onClick={e => e.stopPropagation()}
                        >
                            <div className="bg-green-100 text-green-600 w-20 h-20 rounded-full flex items-center justify-center mb-6 shadow-sm">
                                <Check size={40} strokeWidth={3} />
                            </div>
                            <h2 className="text-2xl font-bold text-slate-900 mb-3">Resume Analyzed!</h2>
                            <p className="text-slate-500 mb-8 leading-relaxed">
                                We've successfully extracted your skills, experience, and education. We've populated the form with this data.
                                <br /><br />
                                Please <b>review the fields</b> and click <b>"Save Changes"</b> to confirm.
                            </p>
                            <div className="flex gap-4 w-full">
                                <button
                                    onClick={() => setShowUploadSuccess(false)}
                                    className="flex-1 bg-slate-100 text-slate-600 py-3 rounded-xl font-bold hover:bg-slate-200 transition-colors"
                                >
                                    Review
                                </button>
                                <button
                                    onClick={handleSave}
                                    className="flex-1 bg-blue-600 text-white py-3 rounded-xl font-bold hover:bg-blue-700 shadow-lg shadow-blue-200 transition-colors"
                                >
                                    Save Profile
                                </button>
                            </div>
                        </motion.div>
                    </motion.div>
                )}

                {/* SUCCESS POPUP MODAL - SAVE */}
                {showSaveSuccess && (
                    <motion.div
                        initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
                        className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm z-50 flex items-center justify-center p-4"
                        onClick={() => setShowSaveSuccess(false)}
                    >
                        <motion.div
                            initial={{ scale: 0.9, y: 20 }} animate={{ scale: 1, y: 0 }} exit={{ scale: 0.9, y: 20 }}
                            className="bg-white w-full max-w-md rounded-2xl border border-slate-200 shadow-2xl p-8 flex flex-col items-center text-center"
                            onClick={e => e.stopPropagation()}
                        >
                            <div className="bg-blue-100 text-blue-600 w-20 h-20 rounded-full flex items-center justify-center mb-6 shadow-sm">
                                <Check size={40} strokeWidth={3} />
                            </div>
                            <h2 className="text-2xl font-bold text-slate-900 mb-3">Profile Saved!</h2>
                            <p className="text-slate-500 mb-8 leading-relaxed">
                                Your profile has been updated successfully. Your new skills and preferences will now influence your <b>Job Recommendations</b> and <b>Career Path</b> analysis.
                            </p>
                            <div className="flex gap-4 w-full">
                                <button
                                    onClick={() => setShowSaveSuccess(false)}
                                    className="flex-1 bg-slate-100 text-slate-600 py-3 rounded-xl font-bold hover:bg-slate-200 transition-colors"
                                >
                                    Stay Here
                                </button>
                                <a
                                    href="/"
                                    className="flex-1 bg-blue-600 text-white py-3 rounded-xl font-bold hover:bg-blue-700 shadow-lg shadow-blue-200 transition-colors flex items-center justify-center"
                                >
                                    Go to Dashboard
                                </a>
                            </div>
                        </motion.div>
                    </motion.div>
                )}
                {/* CREATE LINK MODAL */}
                {showLinkModal && (
                    <motion.div
                        initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
                        className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm z-50 flex items-center justify-center p-4"
                        onClick={() => setShowLinkModal(false)}
                    >
                        <motion.div
                            initial={{ scale: 0.9, y: 20 }} animate={{ scale: 1, y: 0 }} exit={{ scale: 0.9, y: 20 }}
                            className="bg-white w-full max-w-md rounded-2xl border border-slate-200 shadow-2xl p-8 flex flex-col items-center text-center relative overflow-hidden"
                            onClick={e => e.stopPropagation()}
                        >
                            <div className="absolute top-0 w-full h-2 bg-gradient-to-r from-blue-500 to-indigo-500"></div>

                            <div className="bg-blue-50 text-blue-600 w-16 h-16 rounded-full flex items-center justify-center mb-6 shadow-sm border border-blue-100">
                                <LinkIcon size={32} />
                            </div>
                            <h2 className="text-2xl font-bold text-slate-900 mb-2">Share Profile</h2>
                            <p className="text-slate-500 mb-6 text-sm">
                                Share this link with recruiters or teachers to showcase your skills and assessments.
                            </p>

                            <div className="w-full bg-slate-50 border border-slate-200 rounded-xl p-3 mb-6 break-all text-xs text-slate-600 font-mono shadow-inner select-all flex items-center justify-center min-h-[48px]">
                                {generatedLink}
                            </div>

                            <button
                                onClick={handleCopyLink}
                                className="w-full bg-slate-900 hover:bg-black text-white py-3.5 rounded-xl font-bold transition-all shadow-lg shadow-slate-900/20 flex items-center justify-center gap-2"
                            >
                                <Copy size={18} /> Copy Link
                            </button>
                        </motion.div>
                    </motion.div>
                )}
            </AnimatePresence>
        </div>
    );
};

export default Profile;
