import { Briefcase, ExternalLink, MapPin, Loader, RefreshCw } from 'lucide-react';

const JobRecommendations = ({ jobs, loading, onRefresh }) => {
    return (
        <div className="bg-white p-8 rounded-3xl border border-slate-200 shadow-xl h-full">
            <div className="flex items-center justify-between mb-6">
                <h2 className="text-xl font-bold text-slate-800 flex items-center gap-2">
                    <Briefcase className="text-blue-600" /> Recommended for You
                </h2>
                <div className="flex items-center gap-2">
                    <button
                        onClick={onRefresh}
                        disabled={loading}
                        className="p-2 rounded-full hover:bg-slate-100 text-slate-500 hover:text-blue-600 transition-all disabled:opacity-50"
                        title="Refresh Recommendations"
                    >
                        <RefreshCw size={16} className={loading ? "animate-spin" : ""} />
                    </button>
                    <span className="text-xs text-blue-600 font-medium bg-blue-50 px-2 py-1 rounded border border-blue-100">
                        AI Curated
                    </span>
                </div>
            </div>

            <div className="space-y-4 max-h-[400px] overflow-y-auto pr-2 custom-scrollbar">
                {loading ? (
                    <div className="flex flex-col items-center justify-center py-12 text-slate-400">
                        <Loader className="animate-spin mb-2" />
                        <p>Analyzing your profile...</p>
                    </div>
                ) : jobs && jobs.length > 0 ? (
                    jobs.map((job, idx) => (
                        <div key={idx} className="bg-slate-50 hover:bg-blue-50 p-4 rounded-xl border border-slate-200 transition-colors group">
                            <div className="flex justify-between items-start">
                                <div>
                                    <h3 className="font-bold text-slate-900 group-hover:text-blue-700 transition-colors">{job.title}</h3>
                                    <div className="text-sm text-slate-500 flex items-center gap-2 mt-1">
                                        <span>{job.company}</span>
                                        <span className="w-1 h-1 bg-slate-300 rounded-full"></span>
                                        <span className="text-slate-400 flex items-center gap-1"><MapPin size={10} /> {job.location}</span>
                                    </div>
                                </div>
                                <span className={`text-xs px-2 py-1 rounded border ${job.type?.includes('Remote') ? 'bg-green-50 border-green-200 text-green-600' :
                                    'bg-white border-slate-200 text-slate-500'
                                    }`}>
                                    {job.type}
                                </span>
                            </div>
                            <div className="mt-3 flex flex-wrap justify-end gap-2">
                                {job.apply_links && job.apply_links.map((link, i) => (
                                    <a
                                        key={i}
                                        href={link.link || '#'}
                                        target="_blank"
                                        rel="noreferrer"
                                        className="text-xs bg-blue-50 text-blue-600 px-3 py-1.5 rounded-lg hover:bg-blue-600 hover:text-white transition-colors font-semibold flex items-center gap-1 border border-blue-100"
                                    >
                                        {link.source || link.title} <ExternalLink size={10} />
                                    </a>
                                ))}
                                {!job.apply_links && (
                                    <a
                                        href={job.url || '#'}
                                        target="_blank"
                                        rel="noreferrer"
                                        className="text-xs text-blue-600 hover:text-blue-800 flex items-center gap-1 transition-colors font-semibold"
                                    >
                                        Apply / Search <ExternalLink size={12} />
                                    </a>
                                )}
                            </div>
                        </div>
                    ))
                ) : (
                    <div className="text-center py-10 text-slate-400">
                        <p>No matches found yet. Keep updating your profile!</p>
                    </div>
                )}
            </div>
        </div>
    );
};

export default JobRecommendations;
