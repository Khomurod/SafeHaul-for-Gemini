import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { db, functions, auth } from '../../../lib/firebase'; // Adjust path as needed
import { httpsCallable } from 'firebase/functions';
import { collection, query, where, getDocs, limit, orderBy } from 'firebase/firestore';
import { Building2, MapPin, ArrowRight, Briefcase, Search, Check, Loader2 } from 'lucide-react';
import { submitApplication } from '../../applications/services/applicationService';

export default function JobBoard() {
    const [jobs, setJobs] = useState([]);
    const [loading, setLoading] = useState(true);
    const [applying, setApplying] = useState({}); // Map of jobId -> boolean
    const [applied, setApplied] = useState({}); // Map of jobId -> boolean
    const [filter, setFilter] = useState({
        type: 'all', // all, local, regional, otr
        freight: 'all', // dryVan, flatbed, reefer, tanker
        minPay: 0
    });

    useEffect(() => {
        const fetchJobs = async () => {
            try {
                // Fetch from new job_posts collection
                const q = query(
                    collection(db, 'job_posts'),
                    where('status', '==', 'active'),
                    orderBy('createdAt', 'desc')
                );

                const snapshot = await getDocs(q);
                const loadedJobs = snapshot.docs.map(doc => ({
                    id: doc.id,
                    ...doc.data()
                }));

                setJobs(loadedJobs);
            } catch (error) {
                console.error("Error fetching jobs:", error);
            } finally {
                setLoading(false);
            }
        };

        fetchJobs();
    }, []);

    // --- Filtering Logic ---
    const filteredJobs = jobs.filter(job => {
        // Route Type Filter
        if (filter.type !== 'all' && job.routeType !== filter.type) return false;

        // Freight Type Filter (Array check)
        if (filter.freight !== 'all' && !job.freightTypes?.includes(filter.freight)) return false;

        // Min Pay Filter (Weekly estimated)
        if (filter.minPay > 0 && (job.estimatedWeeklyPay || 0) < filter.minPay) return false;

        return true;
    });

    return (
        <div className="min-h-screen bg-gray-50 pb-10">
            {/* Header */}
            <div className="bg-white border-b border-gray-200 shadow-sm sticky top-0 z-10">
                <div className="max-w-6xl mx-auto px-6 py-4 flex justify-between items-center">
                    <div className="flex items-center gap-3">
                        <div className="bg-blue-100 p-2 rounded-lg text-blue-600">
                            <Briefcase size={24} />
                        </div>
                        <h1 className="text-xl font-bold text-gray-900">Job Board</h1>
                    </div>
                    <Link to="/driver/dashboard" className="text-sm font-medium text-gray-500 hover:text-gray-900">
                        Back to Dashboard
                    </Link>
                </div>
            </div>

            <main className="max-w-6xl mx-auto px-6 py-8">

                {/* Search / Filter (Proactive Placeholder) */}
                <div className="mb-8 relative">
                    <Search className="absolute left-4 top-3.5 text-gray-400" size={20} />
                    <input
                        type="text"
                        placeholder="Search companies or positions..."
                        className="w-full pl-12 pr-4 py-3 rounded-xl border border-gray-200 focus:ring-2 focus:ring-blue-500 outline-none shadow-sm"
                    />
                </div>

                {loading ? (
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                        {[1, 2, 3, 4, 5, 6].map(i => (
                            <div key={i} className="bg-white rounded-xl h-48 animate-pulse shadow-sm border border-gray-100"></div>
                        ))}
                    </div>
                ) : filteredJobs.length === 0 ? (
                    <div className="text-center py-20 bg-white rounded-xl shadow-sm border border-gray-200">
                        <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4 text-gray-400">
                            <Briefcase size={32} />
                        </div>
                        <h3 className="text-lg font-bold text-gray-900">No open positions found</h3>
                        <p className="text-gray-500">Check back later or try updating your search.</p>
                    </div>
                ) : (
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                        {filteredJobs.map(job => (
                            <div key={job.id} className="bg-white rounded-xl shadow-sm border border-gray-200 hover:shadow-md transition-shadow p-6 flex flex-col justify-between h-full">
                                <div>
                                    <div className="flex items-start justify-between mb-4">
                                        <div className="w-12 h-12 bg-gray-100 rounded-lg flex items-center justify-center text-gray-500 font-bold text-xl overflow-hidden">
                                            {job.logo ? (
                                                <img src={job.logo} alt={job.companyName} className="w-full h-full object-cover" />
                                            ) : (
                                                <Building2 size={24} />
                                            )}
                                        </div>
                                        <span className="bg-green-100 text-green-700 text-xs font-bold px-2 py-1 rounded-full uppercase tracking-wide">
                                            Hiring
                                        </span>
                                    </div>

                                    <h3 className="text-lg font-bold text-gray-900 mb-1 line-clamp-1">{company.companyName}</h3>
                                    <div className="flex items-center gap-1 text-sm text-gray-500 mb-4">
                                        <MapPin size={14} />
                                        <span>{company.contact?.city ? `${company.contact.city}, ${company.contact.state}` : 'Multiple Locations'}</span>
                                    </div>

                                    <p className="text-sm text-gray-600 line-clamp-3 mb-6">
                                        {company.description || "Join our team of professional drivers. We offer competitive pay and great benefits."}
                                    </p>
                                </div>

                                <div className="pt-4 border-t border-gray-100">
                                    <button
                                        disabled={applying[company.id] || applied[company.id]}
                                        className={`w-full py-2.5 font-bold rounded-lg transition-colors flex items-center justify-center gap-2 ${applied[company.id]
                                            ? 'bg-green-100 text-green-700 cursor-default'
                                            : 'bg-blue-50 text-blue-700 hover:bg-blue-100'
                                            }`}
                                        onClick={async () => {
                                            const currentUser = auth.currentUser;
                                            if (!currentUser) {
                                                alert("Please log in to apply.");
                                                return;
                                            }

                                            setApplying(prev => ({ ...prev, [job.id]: true }));
                                            try {
                                                await submitApplication(job.companyId, job, currentUser.uid);
                                                setApplied(prev => ({ ...prev, [job.id]: true }));
                                            } catch (err) {
                                                console.error(err);
                                                alert("Failed to apply: " + err.message);
                                            } finally {
                                                setApplying(prev => ({ ...prev, [job.id]: false }));
                                            }
                                        }}
                                    >
                                        {applying[company.id] ? (
                                            <><Loader2 className="animate-spin" size={16} /> Sending...</>
                                        ) : applied[company.id] ? (
                                            <><Check size={16} /> Applied</>
                                        ) : (
                                            <>Apply Now <ArrowRight size={16} /></>
                                        )}
                                    </button>
                                </div>
                            </div>
                        ))}
                    </div>
                )}
            </main>
        </div>
    );
}
