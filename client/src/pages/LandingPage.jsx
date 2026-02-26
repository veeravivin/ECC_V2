import React from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { ArrowRight, Compass, Shield, Zap, Brain } from 'lucide-react';

const LandingPage = () => {
    const navigate = useNavigate();

    return (
        <div className="min-h-screen text-slate-900 bg-white selection:bg-blue-100 font-sans">
            {/* Background Gradient - Light & Airy matching app theme */}
            <div className="fixed inset-0 z-0 pointer-events-none overflow-hidden">
                <div className="absolute -top-[30%] -right-[10%] w-[70vw] h-[70vw] rounded-full bg-blue-100/50 blur-3xl opacity-60"></div>
                <div className="absolute top-[20%] -left-[10%] w-[50vw] h-[50vw] rounded-full bg-purple-100/40 blur-3xl opacity-50"></div>
            </div>

            {/* Navbar */}
            <nav className="fixed top-0 left-0 right-0 z-50 backdrop-blur-md bg-white/80 border-b border-slate-200 shadow-sm">
                <div className="container mx-auto px-6 py-4 flex justify-between items-center">
                    <div className="flex items-center gap-2 font-bold text-xl tracking-tighter cursor-pointer" onClick={() => navigate('/')}>
                        <Compass className="text-blue-600" size={24} />
                        <span className="bg-clip-text text-transparent bg-gradient-to-r from-blue-600 to-purple-600">
                            EthicalCompass
                        </span>
                    </div>
                    <div className="hidden md:flex items-center gap-8 text-sm font-medium text-slate-600">
                        <a href="#about" className="hover:text-blue-600 transition-colors">About</a>
                        <a href="#features" className="hover:text-blue-600 transition-colors">Features</a>
                        <a href="#how-it-works" className="hover:text-blue-600 transition-colors">How it Works</a>
                        <a href="#contact" className="hover:text-blue-600 transition-colors">Contact</a>
                    </div>
                    <button
                        onClick={() => navigate('/login')}
                        className="px-6 py-2 bg-slate-900 text-white rounded-full font-semibold text-sm hover:bg-slate-800 transition-all transform hover:scale-105 active:scale-95 shadow-md hover:shadow-lg"
                    >
                        Sign In
                    </button>
                </div>
            </nav>

            {/* Hero Section */}
            <section id="about" className="relative z-10 pt-48 pb-32 px-6">
                <div className="container mx-auto max-w-5xl text-center">
                    <motion.div
                        initial={{ opacity: 0, y: 30 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ duration: 0.8 }}
                    >
                        <div className="inline-block mb-4 px-4 py-1.5 rounded-full border border-blue-200 bg-blue-50 text-blue-600 text-xs font-semibold uppercase tracking-wider">
                            AI-Powered Career Guidance
                        </div>
                        <h1 className="text-5xl md:text-7xl font-extrabold tracking-tight mb-8 leading-tight text-slate-900">
                            Navigate Your Career with <br />
                            <span className="bg-clip-text text-transparent bg-gradient-to-r from-blue-600 via-purple-600 to-blue-600 animate-gradient-x">
                                Intelligence & Ethics
                            </span>
                        </h1>
                        <p className="text-xl text-slate-600 mb-12 max-w-2xl mx-auto leading-relaxed">
                            Discover career paths that align with your values. Our AI analyzes your skills and aspirations to build a personalized roadmap for success.
                        </p>
                        <div className="flex flex-col sm:flex-row gap-4 justify-center">
                            <button
                                onClick={() => navigate('/login')}
                                className="group px-8 py-4 bg-gradient-to-r from-blue-600 to-purple-600 rounded-full font-bold text-lg text-white hover:from-blue-700 hover:to-purple-700 transition-all flex items-center justify-center gap-2 shadow-xl shadow-blue-200 ring-2 ring-white hover:ring-blue-100"
                            >
                                Get Started Free
                                <ArrowRight className="group-hover:translate-x-1 transition-transform" />
                            </button>
                            <a href="#features" className="px-8 py-4 bg-white border border-slate-200 rounded-full font-bold text-lg hover:bg-slate-50 transition-all text-slate-700 shadow-sm hover:shadow-md">
                                Learn More
                            </a>
                        </div>
                    </motion.div>
                </div>
            </section>

            {/* Features Grid */}
            <section id="features" className="relative z-10 py-24 bg-slate-50/80">
                <div className="container mx-auto px-6">
                    <div className="text-center mb-20">
                        <h2 className="text-3xl md:text-5xl font-bold mb-6 text-slate-900">Why Ethical Compass?</h2>
                        <p className="text-slate-600 max-w-xl mx-auto text-lg">We combine advanced AI with ethical principles to ensure your career growth is sustainable and fulfilling.</p>
                    </div>

                    <div className="grid md:grid-cols-3 gap-8">
                        <FeatureCard
                            icon={<Brain className="text-purple-600" size={32} />}
                            title="AI-Powered Intelligence"
                            desc="Advanced algorithms analyze your skills and market trends to recommend the perfect career path tailored just for you."
                        />
                        <FeatureCard
                            icon={<Shield className="text-emerald-600" size={32} />}
                            title="Ethically Aligned"
                            desc="We prioritize roles that match your values, ensuring mental well-being, work-life balance, and long-term job satisfaction."
                        />
                        <FeatureCard
                            icon={<Zap className="text-amber-500" size={32} />}
                            title="Skill Acceleration"
                            desc="Get personalized roadmaps, learning resources, and real-time feedback to bridge the gap to your dream job."
                        />
                    </div>
                </div>
            </section>

            {/* How It Works */}
            <section id="how-it-works" className="relative z-10 py-24 bg-white">
                <div className="container mx-auto px-6">
                    <h2 className="text-3xl md:text-5xl font-bold mb-20 text-center text-slate-900">How It Works</h2>

                    <div className="grid md:grid-cols-4 gap-8 relative">
                        {/* Connecting Line (Desktop) */}
                        <div className="hidden md:block absolute top-12 left-0 right-0 h-0.5 bg-gradient-to-r from-blue-100 via-blue-200 to-blue-100" />

                        <Step number="01" title="Sign Up" desc="Create your account securely using email verification." delay={0.1} />
                        <Step number="02" title="Analyze" desc="Our AI assesses your current profile, skills, and ethical score." delay={0.2} />
                        <Step number="03" title="Plan" desc="Receive a custom step-by-step roadmap to your goal." delay={0.3} />
                        <Step number="04" title="Thrive" desc="Follow the path, upskill, and land your ideal role." delay={0.4} />
                    </div>
                </div>
            </section>

            {/* CTA Section */}
            <section className="relative z-10 py-24 px-6">
                <div className="container mx-auto max-w-4xl">
                    <div className="bg-gradient-to-r from-blue-600 to-purple-600 rounded-3xl p-12 text-center relative overflow-hidden shadow-2xl shadow-blue-200">
                        <div className="absolute inset-0 bg-[url('https://grainy-gradients.vercel.app/noise.svg')] opacity-20 brightness-100 contrast-150 mix-blend-overlay"></div>
                        <h2 className="text-3xl md:text-4xl font-bold mb-6 text-white">Ready to Shape Your Future?</h2>
                        <p className="text-blue-100 mb-8 max-w-2xl mx-auto text-lg">Join thousands of professionals who are finding meaningful careers with Ethical Compass.</p>
                        <button
                            onClick={() => navigate('/login')}
                            className="px-10 py-4 bg-white text-blue-900 rounded-full font-bold text-lg hover:bg-blue-50 transition-all shadow-xl hover:shadow-2xl hover:-translate-y-1"
                        >
                            Start Your Journey Now
                        </button>
                    </div>
                </div>
            </section>

            {/* Footer */}
            <footer id="contact" className="relative z-10 py-12 border-t border-slate-200 bg-slate-50">
                <div className="container mx-auto px-6 flex flex-col md:flex-row justify-between items-center gap-6">
                    <div className="flex items-center gap-2 font-bold text-lg text-slate-700">
                        <Compass className="text-slate-500" size={20} />
                        Ethical Compass
                    </div>
                    <div className="text-slate-500 text-sm">
                        © 2024 Ethical Career Compass. All rights reserved.
                    </div>
                    <div className="flex gap-6">
                        <a href="#" className="text-slate-500 hover:text-blue-600 transition-colors text-sm">Privacy Policy</a>
                        <a href="#" className="text-slate-500 hover:text-blue-600 transition-colors text-sm">Terms of Service</a>
                        <a href="mailto:contact@ethicalcompass.ai" className="text-slate-500 hover:text-blue-600 transition-colors text-sm">contact@ethicalcompass.ai</a>
                    </div>
                </div>
            </footer>
        </div>
    );
};

const FeatureCard = ({ icon, title, desc }) => (
    <motion.div
        whileHover={{ y: -10 }}
        className="p-8 rounded-3xl bg-white border border-slate-200 shadow-lg hover:shadow-xl hover:border-blue-200 transition-all cursor-default group relative overflow-hidden"
    >
        <div className="mb-6 p-4 bg-slate-50 rounded-2xl w-fit group-hover:scale-110 transition-transform relative z-10 border border-slate-100">
            {icon}
        </div>
        <h3 className="text-xl font-bold mb-3 text-slate-900 relative z-10">{title}</h3>
        <p className="text-slate-500 leading-relaxed relative z-10">{desc}</p>
    </motion.div>
);

const Step = ({ number, title, desc, delay }) => (
    <motion.div
        initial={{ opacity: 0, y: 20 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: true }}
        transition={{ delay, duration: 0.5 }}
        className="p-6 relative text-center md:text-left"
    >
        <div className="inline-flex items-center justify-center w-12 h-12 rounded-full bg-white border border-blue-200 text-blue-600 font-bold mb-6 relative z-10 shadow-sm">
            {number}
        </div>
        <h3 className="text-xl font-bold mb-2 text-slate-900 relative z-10">{title}</h3>
        <p className="text-slate-500 text-sm relative z-10 leading-relaxed">{desc}</p>
    </motion.div>
);

export default LandingPage;
