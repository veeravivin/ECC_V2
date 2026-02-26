import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Database, Search, Table, ArrowLeft, RefreshCw, Layers, Shield } from 'lucide-react';
import axios from 'axios';
import toast from 'react-hot-toast';
import { useNavigate } from 'react-router-dom';

const AdminDBBrowser = () => {
    const [tables, setTables] = useState([]);
    const [selectedTable, setSelectedTable] = useState('');
    const [tableData, setTableData] = useState([]);
    const [loading, setLoading] = useState(true);
    const [search, setSearch] = useState('');
    const navigate = useNavigate();

    useEffect(() => {
        fetchTables();
    }, []);

    const fetchTables = async () => {
        try {
            const res = await axios.get('/api/admin/db/tables');
            setTables(res.data);
            if (res.data.length > 0) {
                handleTableSelect(res.data[0]);
            }
        } catch (err) {
            toast.error("Failed to fetch tables");
        } finally {
            setLoading(false);
        }
    };

    const handleTableSelect = async (table) => {
        setSelectedTable(table);
        setLoading(true);
        try {
            const res = await axios.get(`/api/admin/db/data?table=${table}`);
            setTableData(res.data);
        } catch (err) {
            toast.error("Failed to fetch table data");
        } finally {
            setLoading(false);
        }
    };

    const handleSearch = async (e) => {
        e.preventDefault();
        setLoading(true);
        try {
            const res = await axios.get(`/api/admin/db/data?table=${selectedTable}&search=${search}`);
            setTableData(res.data);
        } catch (err) {
            toast.error("Search failed");
        } finally {
            setLoading(false);
        }
    };

    if (loading && tables.length === 0) {
        return (
            <div className="min-h-screen bg-slate-950 flex flex-col items-center justify-center">
                <RefreshCw className="text-blue-500 animate-spin mb-4" size={32} />
                <p className="text-slate-500 font-bold uppercase tracking-widest text-xs">Accessing Database...</p>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-slate-950 text-slate-200 p-6 md:p-10 font-sans">
            <div className="max-w-7xl mx-auto flex flex-col md:flex-row justify-between items-start md:items-center gap-6 mb-12">
                <div className="flex items-center gap-4">
                    <button
                        onClick={() => navigate('/admin/dashboard')}
                        className="p-2 hover:bg-slate-900 rounded-xl transition-colors text-slate-500 hover:text-white"
                    >
                        <ArrowLeft size={24} />
                    </button>
                    <div>
                        <h1 className="text-2xl font-black text-white flex items-center gap-2">
                            <Database className="text-blue-500" /> Database Browser
                        </h1>
                        <p className="text-slate-500 text-xs font-bold uppercase tracking-widest mt-1">Direct Table Inspection</p>
                    </div>
                </div>

                <form onSubmit={handleSearch} className="relative w-full md:w-96 group">
                    <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-500 group-focus-within:text-blue-500 transition-colors" size={20} />
                    <input
                        type="text"
                        placeholder={`Search in ${selectedTable}...`}
                        className="w-full bg-slate-900 border border-slate-800 rounded-2xl py-3.5 pl-12 pr-4 outline-none focus:border-blue-500 focus:ring-4 focus:ring-blue-500/10 transition-all font-medium text-sm"
                        value={search}
                        onChange={(e) => setSearch(e.target.value)}
                    />
                    <button type="submit" className="hidden"></button>
                </form>
            </div>

            <div className="max-w-7xl mx-auto grid grid-cols-1 lg:grid-cols-4 gap-8">
                {/* Sidebar: Table List */}
                <div className="lg:col-span-1 border-r border-slate-900 pr-0 md:pr-8">
                    <h3 className="text-[10px] font-black text-slate-500 uppercase tracking-[0.2em] mb-6 pl-4">All System Tables</h3>
                    <div className="space-y-1">
                        {tables.map((table) => (
                            <button
                                key={table}
                                onClick={() => handleTableSelect(table)}
                                className={`w-full flex items-center gap-3 px-4 py-3.5 rounded-xl transition-all font-bold text-sm ${selectedTable === table
                                        ? 'bg-blue-600 text-white shadow-lg shadow-blue-500/20'
                                        : 'text-slate-400 hover:bg-slate-900 hover:text-slate-200'
                                    }`}
                            >
                                <Table size={18} opacity={selectedTable === table ? 1 : 0.5} />
                                {table}
                            </button>
                        ))}
                    </div>

                    <div className="mt-8 p-6 bg-slate-900/30 border border-slate-900 rounded-2xl hidden md:block">
                        <div className="flex items-center gap-2 text-blue-500 mb-3">
                            <Shield size={16} />
                            <span className="text-[10px] font-black uppercase tracking-widest">Read Only Mode</span>
                        </div>
                        <p className="text-[10px] text-slate-500 leading-relaxed font-medium">
                            System tables are displayed in read-only mode for audit trailing. Write access is restricted to core service workers.
                        </p>
                    </div>
                </div>

                {/* Main: Data Grid */}
                <div className="lg:col-span-3 min-w-0">
                    <div className="bg-slate-900/40 border border-slate-800 rounded-[32px] overflow-hidden shadow-2xl">
                        <div className="p-6 border-b border-slate-800 flex justify-between items-center bg-slate-900/20">
                            <div className="flex items-center gap-3">
                                <div className="p-2 bg-slate-800 rounded-lg text-slate-400">
                                    <Layers size={16} />
                                </div>
                                <span className="font-bold text-white uppercase tracking-widest text-xs">{selectedTable}</span>
                            </div>
                            <span className="text-[10px] font-black text-slate-500 uppercase tracking-widest">{tableData.length} records found</span>
                        </div>

                        <div className="overflow-x-auto">
                            {loading ? (
                                <div className="p-20 text-center">
                                    <RefreshCw className="text-blue-500 animate-spin mx-auto mb-4" size={24} />
                                    <p className="text-slate-500 text-xs font-bold uppercase tracking-widest">Querying Table...</p>
                                </div>
                            ) : tableData.length === 0 ? (
                                <div className="p-20 text-center">
                                    <p className="text-slate-600 italic">No records found for this query</p>
                                </div>
                            ) : (
                                <table className="w-full text-left border-collapse">
                                    <thead>
                                        <tr>
                                            {Object.keys(tableData[0]).map((key) => (
                                                <th key={key} className="p-4 text-[10px] font-black text-slate-500 uppercase tracking-widest border-b border-slate-800 bg-slate-900/10">
                                                    {key}
                                                </th>
                                            ))}
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-slate-800/50">
                                        {tableData.map((row, i) => (
                                            <tr key={i} className="hover:bg-blue-500/5 transition-colors group">
                                                {Object.values(row).map((val, j) => (
                                                    <td key={j} className="p-4 text-sm font-medium text-slate-400 max-w-xs truncate group-hover:text-slate-200 transition-colors">
                                                        {typeof val === 'object' ? JSON.stringify(val).substring(0, 50) + '...' : String(val)}
                                                    </td>
                                                ))}
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            )}
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default AdminDBBrowser;
