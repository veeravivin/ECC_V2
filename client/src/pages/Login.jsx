import { useState } from 'react';
import { motion } from 'framer-motion';
import axios from 'axios';
import { Mail, Key, ArrowRight, Loader2, Sparkles } from 'lucide-react';

const Login = ({ onLogin }) => {
    const [email, setEmail] = useState('');
    const [otp, setOtp] = useState('');
    const [name, setName] = useState('');
    const [step, setStep] = useState(1);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');

    const handleSendOtp = async (e) => {
        e.preventDefault();
        setLoading(true);
        setError('');
        try {
            const res = await axios.post('/api/auth/login', { email });
            setStep(2);
        } catch (err) {
            setError('Failed to send OTP. Ensure backend is running.');
        }
        setLoading(false);
    };

    const handleVerifyOtp = async (e) => {
        e.preventDefault();
        setLoading(true);
        setError('');
        try {
            const res = await axios.post('/api/auth/verify', { email, otp, name });
            localStorage.setItem('user', JSON.stringify(res.data.user)); // Save session
            onLogin(res.data.user);
        } catch (err) {
            setError('Invalid or expired OTP');
        }
        setLoading(false);
    };

    return (
        <div className="min-h-screen relative flex items-center justify-center overflow-hidden bg-white font-sans selection:bg-blue-100">
            {/* Background Blobs */}
            <div className="absolute top-[-10%] left-[-10%] w-[50vw] h-[50vw] bg-purple-100/60 rounded-full blur-3xl opacity-60 animate-blob"></div>
            <div className="absolute bottom-[-10%] right-[-10%] w-[50vw] h-[50vw] bg-blue-100/60 rounded-full blur-3xl opacity-60 animate-blob animation-delay-2000"></div>

            <motion.div
                initial={{ opacity: 0, y: 30 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.6 }}
                className="z-10 w-full max-w-md p-8 mx-4"
            >
                <div className="glass-card p-10 rounded-[2.5rem] shadow-2xl shadow-blue-900/5 relative overflow-hidden text-center border-white/60">

                    {/* Decorative Header */}
                    <div className="absolute top-0 left-0 w-full h-2 bg-gradient-to-r from-blue-500 via-purple-500 to-indigo-500"></div>
                    <div className="w-20 h-20 bg-gradient-to-br from-blue-500 to-indigo-600 rounded-2xl mx-auto mb-6 flex items-center justify-center text-white shadow-lg shadow-blue-500/30 transform rotate-3">
                        <Sparkles size={32} />
                    </div>

                    <h1 className="text-3xl font-extrabold mb-2 text-slate-900 tracking-tight">
                        Welcome Back
                    </h1>
                    <p className="text-slate-500 mb-8 text-sm font-medium">Access your AI Career Intelligence Platform</p>

                    {error && (
                        <motion.div
                            initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }}
                            className="mb-6 p-3 bg-red-50 border border-red-100 rounded-xl text-red-600 text-sm font-bold flex items-center justify-center gap-2"
                        >
                            {error}
                        </motion.div>
                    )}

                    {step === 1 ? (
                        <form onSubmit={handleSendOtp} className="space-y-5 text-left">
                            <div className="space-y-1.5">
                                <label className="text-xs font-bold text-slate-400 uppercase tracking-wider ml-1">Full Name (Optional)</label>
                                <input
                                    type="text"
                                    placeholder="John Doe"
                                    className="w-full bg-slate-50 border border-slate-200 rounded-xl py-3.5 px-4 focus:ring-2 focus:ring-blue-500 focus:bg-white outline-none text-slate-800 placeholder-slate-400 font-medium transition-all"
                                    value={name}
                                    onChange={(e) => setName(e.target.value)}
                                />
                            </div>
                            <div className="space-y-1.5 relative">
                                <label className="text-xs font-bold text-slate-400 uppercase tracking-wider ml-1">Email Address</label>
                                <div className="relative">
                                    <Mail className="absolute left-4 top-3.5 text-slate-400" size={20} />
                                    <input
                                        type="email"
                                        placeholder="name@company.com"
                                        className="w-full bg-slate-50 border border-slate-200 rounded-xl py-3.5 pl-12 pr-4 focus:ring-2 focus:ring-blue-500 focus:bg-white outline-none text-slate-800 placeholder-slate-400 font-medium transition-all"
                                        value={email}
                                        onChange={(e) => setEmail(e.target.value)}
                                        required
                                    />
                                </div>
                            </div>
                            <button
                                type="submit"
                                disabled={loading}
                                className="w-full mt-4 bg-slate-900 hover:bg-black text-white font-bold py-4 rounded-xl transition-all shadow-xl shadow-slate-900/20 active:scale-[0.98] flex justify-center items-center gap-2 group"
                            >
                                {loading ? <Loader2 className="animate-spin" size={20} /> : <>Get Secure OTP <ArrowRight size={18} className="group-hover:translate-x-1 transition-transform" /></>}
                            </button>
                        </form>
                    ) : (
                        <form onSubmit={handleVerifyOtp} className="space-y-6">
                            <div className="text-sm font-medium text-slate-600 bg-blue-50 py-3 px-4 rounded-xl border border-blue-100">
                                Enter the 6-digit code sent to <br /><span className="text-blue-700 font-bold">{email}</span>
                            </div>
                            <div className="relative">
                                <Key className="absolute left-4 top-3.5 text-slate-400" size={20} />
                                <input
                                    type="text"
                                    placeholder="000000"
                                    maxLength={6}
                                    className="w-full bg-slate-50 border border-slate-200 rounded-xl py-3.5 pl-12 pr-4 focus:ring-2 focus:ring-blue-500 focus:bg-white outline-none text-slate-900 placeholder-slate-300 tracking-[0.5em] font-mono text-center text-xl transition-all font-bold"
                                    value={otp}
                                    onChange={(e) => setOtp(e.target.value)}
                                    required
                                />
                            </div>
                            <button
                                type="submit"
                                disabled={loading}
                                className="w-full mt-2 bg-blue-600 hover:bg-blue-700 text-white font-bold py-4 rounded-xl transition-all shadow-xl shadow-blue-600/20 active:scale-[0.98] flex justify-center items-center gap-2"
                            >
                                {loading ? <Loader2 className="animate-spin" size={20} /> : 'Verify & Launch'}
                            </button>
                            <button
                                type="button"
                                onClick={() => setStep(1)}
                                className="w-full text-slate-400 text-xs font-bold hover:text-blue-600 transition-colors uppercase tracking-wider"
                            >
                                Incorrect email? Go Back
                            </button>
                        </form>
                    )}
                </div>

                <p className="text-center text-slate-400 text-xs mt-8 font-medium">
                    &copy; 2024 Ethical Career Compass. All rights reserved.
                </p>
            </motion.div>
        </div>
    );
};

export default Login;
