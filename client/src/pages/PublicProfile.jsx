import { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Briefcase, GraduationCap, User, Activity, CheckCircle, MapPin, Mail, Phone, ExternalLink } from 'lucide-react';
import axios from 'axios';
import toast from 'react-hot-toast';

const PublicProfile = () => {
    const { id } = useParams();
    const [profileData, setProfileData] = useState(null);
    const [testHistory, setTestHistory] = useState([]);
    const [loading, setLoading] = useState(true);
    const [activeTab, setActiveTab] = useState('overview');

    useEffect(() => {
        const fetchProfile = async () => {
            try {
                const email = atob(id);
                // Parallel fetch
                const [profileRes, historyRes] = await Promise.all([
                    axios.get(`/api/profile?email=${encodeURIComponent(email)}`),
                    axios.get(`/api/tests/history?email=${encodeURIComponent(email)}`)
                ]);

                setProfileData(profileRes.data);
                setTestHistory(historyRes.data);
            } catch (err) {
                console.error("Failed to fetch public profile", err);
                toast.error("Profile not found or inaccessible.");
            } finally {
                setLoading(false);
            }
        };

        if (id) fetchProfile();
    }, [id]);

    if (loading) {
        return (
            <div className="min-h-screen flex items-center justify-center">
                <div className="w-16 h-16 border-4 border-blue-200 border-t-blue-600 rounded-full animate-spin"></div>
            </div>
        );
    }

    if (!profileData) {
        return (
            <div className="min-h-screen flex flex-col items-center justify-center text-slate-500">
                <User size={64} className="mb-4 text-slate-300" />
                <h2 className="text-2xl font-bold text-slate-700">Profile Not Found</h2>
                <p>The link might be invalid or the profile does not exist.</p>
            </div>
        );
    }

    const { personalDetails, skills, experience, education } = profileData;

    // Metrics
    const calculateMetrics = () => {
        if (!testHistory.length) return { totalTests: 0, avgScore: 0, topSkill: 'None' };
        const totalTests = testHistory.length;
        const avgScore = Math.round(testHistory.reduce((acc, curr) => acc + curr.score, 0) / totalTests);
        const topTest = [...testHistory].sort((a, b) => b.score - a.score)[0];
        return { totalTests, avgScore, topSkill: topTest?.topic || 'None' };
    };
    const metrics = calculateMetrics();

    const getSkillResult = (skillName) => {
        const tests = testHistory.filter(t => t.topic.toLowerCase() === skillName.toLowerCase());
        if (!tests.length) return null;
        return tests.sort((a, b) => b.score - a.score)[0];
    };

    return (
        <div className="min-h-screen bg-slate-50 pt-24 pb-20 px-4">
            <div className="max-w-5xl mx-auto space-y-8">

                {/* Header Card */}
                <div className="bg-white rounded-3xl shadow-xl overflow-hidden relative">
                    <div className="h-32 bg-gradient-to-r from-blue-600 to-indigo-700"></div>
                    <div className="px-8 pb-8 flex flex-col md:flex-row items-end -mt-12 gap-6 relative z-10">
                        <div className="w-32 h-32 bg-white rounded-3xl p-2 shadow-lg">
                            <div className="w-full h-full bg-slate-100 rounded-2xl flex items-center justify-center text-slate-400">
                                <User size={48} />
                            </div>
                        </div>
                        <div className="flex-1 pb-2 text-center md:text-left">
                            <h1 className="text-3xl font-extrabold text-slate-900">{personalDetails?.name || 'Candidate'}</h1>
                            <p className="text-slate-500 font-medium text-lg">{skills?.[0] ? `${skills[0]} Professional` : 'Software Professional'}</p>
                        </div>
                        <div className="flex gap-3 pb-4">
                            {personalDetails?.linkedin && (
                                <a href={personalDetails.linkedin} target="_blank" rel="noreferrer" className="bg-blue-50 text-blue-600 px-4 py-2 rounded-xl font-bold flex items-center gap-2 hover:bg-blue-100 transition">
                                    <ExternalLink size={18} /> Portfolio
                                </a>
                            )}
                        </div>
                    </div>
                </div>

                {/* Main Content Grid */}
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">

                    {/* Left Sidebar */}
                    <div className="space-y-6">
                        {/* Contact Info */}
                        <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-200">
                            <h3 className="font-bold text-slate-900 mb-4">Contact Details</h3>
                            <div className="space-y-3">
                                <div className="flex items-center gap-3 text-slate-600">
                                    <div className="w-8 h-8 rounded-lg bg-slate-50 flex items-center justify-center text-slate-400"><Mail size={16} /></div>
                                    <span className="text-sm font-medium break-all">{personalDetails?.email}</span>
                                </div>
                                {personalDetails?.phone && (
                                    <div className="flex items-center gap-3 text-slate-600">
                                        <div className="w-8 h-8 rounded-lg bg-slate-50 flex items-center justify-center text-slate-400"><Phone size={16} /></div>
                                        <span className="text-sm font-medium">{personalDetails.phone}</span>
                                    </div>
                                )}
                                {personalDetails?.location && (
                                    <div className="flex items-center gap-3 text-slate-600">
                                        <div className="w-8 h-8 rounded-lg bg-slate-50 flex items-center justify-center text-slate-400"><MapPin size={16} /></div>
                                        <span className="text-sm font-medium">{personalDetails.location}</span>
                                    </div>
                                )}
                            </div>
                        </div>

                        {/* Summary */}
                        {personalDetails?.summary && (
                            <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-200">
                                <h3 className="font-bold text-slate-900 mb-3">About</h3>
                                <p className="text-slate-600 text-sm leading-relaxed">{personalDetails.summary}</p>
                            </div>
                        )}

                        {/* Metrics */}
                        <div className="bg-gradient-to-br from-slate-900 to-slate-800 p-6 rounded-2xl shadow-lg text-white">
                            <h3 className="font-bold mb-4 flex items-center gap-2"><Activity size={18} className="text-blue-400" /> Key Metrics</h3>
                            <div className="grid grid-cols-2 gap-4">
                                <div className="bg-white/10 p-4 rounded-xl backdrop-blur-sm">
                                    <div className="text-2xl font-bold">{metrics.totalTests}</div>
                                    <div className="text-xs text-slate-400 uppercase font-bold tracking-wider">Verified Skills</div>
                                </div>
                                <div className="bg-white/10 p-4 rounded-xl backdrop-blur-sm">
                                    <div className="text-2xl font-bold">{metrics.avgScore}%</div>
                                    <div className="text-xs text-slate-400 uppercase font-bold tracking-wider">Avg. Score</div>
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* Right Content */}
                    <div className="lg:col-span-2 space-y-6">

                        {/* Tabs */}
                        <div className="flex gap-4 border-b border-slate-200 mb-2">
                            {['overview', 'experience', 'education'].map(tab => (
                                <button
                                    key={tab}
                                    onClick={() => setActiveTab(tab)}
                                    className={`pb-3 px-4 text-sm font-bold capitalize transition-colors ${activeTab === tab ? 'text-blue-600 border-b-2 border-blue-600' : 'text-slate-500 hover:text-slate-800'}`}
                                >
                                    {tab}
                                </button>
                            ))}
                        </div>

                        {activeTab === 'overview' && (
                            <div className="bg-white p-8 rounded-2xl shadow-sm border border-slate-200">
                                <h3 className="text-xl font-bold text-slate-900 mb-6 flex items-center gap-2">
                                    <CheckCircle className="text-green-500" size={24} /> Verified Skills
                                </h3>

                                {skills && skills.length > 0 ? (
                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                        {skills.map((skill) => {
                                            const result = getSkillResult(skill);
                                            const isVerified = !!result;
                                            const score = result ? Math.round(result.score) : 0;

                                            return (
                                                <div key={skill} className="flex items-center justify-between p-4 rounded-xl border border-slate-100 bg-slate-50">
                                                    <div>
                                                        <h4 className="font-bold text-slate-900">{skill}</h4>
                                                        <span className={`text-[10px] uppercase font-bold tracking-wider px-2 py-0.5 rounded-full mt-1 inline-block ${isVerified ? 'bg-green-100 text-green-700' : 'bg-slate-200 text-slate-500'}`}>
                                                            {isVerified ? result.level : 'Unverified'}
                                                        </span>
                                                    </div>
                                                    {isVerified && (
                                                        <div className="flex items-center gap-2">
                                                            <div className="text-2xl font-black text-slate-800">{score}%</div>
                                                            <div className="h-10 w-1 bg-slate-200 rounded-full overflow-hidden relative">
                                                                <div className={`absolute bottom-0 left-0 w-full ${score >= 80 ? 'bg-green-500' : score >= 60 ? 'bg-blue-500' : 'bg-orange-500'}`} style={{ height: `${score}%` }}></div>
                                                            </div>
                                                        </div>
                                                    )}
                                                </div>
                                            );
                                        })}
                                    </div>
                                ) : (
                                    <p className="text-slate-500 italic">No skills listed.</p>
                                )}
                            </div>
                        )}

                        {activeTab === 'experience' && (
                            <div className="space-y-4">
                                {experience && experience.length > 0 ? experience.map((exp, i) => (
                                    <div key={i} className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm">
                                        <div className="flex justify-between items-start mb-2">
                                            <div>
                                                <h3 className="text-lg font-bold text-slate-900">{exp.role}</h3>
                                                <div className="text-blue-600 font-medium flex items-center gap-1"><Briefcase size={16} /> {exp.company}</div>
                                            </div>
                                            <span className="bg-slate-100 px-3 py-1 rounded-lg text-xs font-bold text-slate-600">{exp.duration}</span>
                                        </div>
                                        <p className="text-slate-600 text-sm mt-4 leading-relaxed whitespace-pre-line">{exp.description}</p>
                                    </div>
                                )) : <div className="text-slate-500 bg-white p-8 rounded-2xl border border-slate-200 text-center">No experience listed.</div>}
                            </div>
                        )}

                        {activeTab === 'education' && (
                            <div className="space-y-4">
                                {education && education.length > 0 ? education.map((edu, i) => (
                                    <div key={i} className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm flex items-center gap-4">
                                        <div className="w-12 h-12 bg-blue-50 text-blue-600 rounded-xl flex items-center justify-center">
                                            <GraduationCap size={24} />
                                        </div>
                                        <div>
                                            <h3 className="text-lg font-bold text-slate-900">{edu.degree}</h3>
                                            <div className="text-slate-500 text-sm font-medium">{edu.institution} • {edu.year}</div>
                                        </div>
                                    </div>
                                )) : <div className="text-slate-500 bg-white p-8 rounded-2xl border border-slate-200 text-center">No education listed.</div>}
                            </div>
                        )}

                    </div>
                </div>
            </div>
        </div>
    );
};

export default PublicProfile;
