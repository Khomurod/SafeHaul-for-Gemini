import React, { useState, useEffect, useRef, useCallback } from 'react';
import { Virtuoso } from 'react-virtuoso';
import { httpsCallable } from 'firebase/functions';
import { functions } from '@/lib/firebase/config';
import { Loader2, AlertCircle } from 'lucide-react';

export default function VirtualLeadList({ companyId, filters }) {
    const [leads, setLeads] = useState([]);
    const [loading, setLoading] = useState(false);
    const [lastDocId, setLastDocId] = useState(null);
    const [hasMore, setHasMore] = useState(true);
    const [error, setError] = useState(null);

    // Prevent double-fetching
    const fetchingRef = useRef(false);

    const loadMore = useCallback(async (reset = false) => {
        if (fetchingRef.current) return;
        if (!reset && !hasMore) return;

        fetchingRef.current = true;
        setLoading(true);
        if (reset) setError(null);

        try {
            const getLeadsFn = httpsCallable(functions, 'getFilteredLeadsPage');
            const result = await getLeadsFn({
                companyId,
                filters,
                pageSize: 50,
                lastDocId: reset ? null : lastDocId
            });

            const newLeads = result.data.leads || [];
            const newLastId = result.data.lastDocId;

            setLeads(prev => reset ? newLeads : [...prev, ...newLeads]);
            setLastDocId(newLastId);
            setHasMore(!!newLastId && newLeads.length === 50); // If < 50, we reached end
        } catch (err) {
            console.error("Failed to load leads:", err);
            setError(err.message);
        } finally {
            setLoading(false);
            fetchingRef.current = false;
        }
    }, [companyId, filters, lastDocId, hasMore]);

    // Initial load when filters change
    useEffect(() => {
        setLeads([]);
        setLastDocId(null);
        setHasMore(true);
        fetchingRef.current = false;
        loadMore(true);
    }, [filters, companyId]); // eslint-disable-line react-hooks/exhaustive-deps

    // Item Render
    const rowContent = (index, user) => {
        return (
            <div className="flex items-center p-3 border-b border-white/5 hover:bg-white/5 transition-colors">
                <div className="w-12 h-12 rounded-full bg-slate-700 flex items-center justify-center text-sm font-bold text-slate-300 mr-4">
                    {user.firstName ? user.firstName[0] : 'U'}
                </div>
                <div className="flex-1 min-w-0">
                    <div className="text-white font-medium truncate">
                        {user.firstName} {user.lastName}
                    </div>
                    <div className="text-slate-400 text-sm truncate">
                        {user.phone || 'No Phone'}
                    </div>
                </div>
                <div>
                    <span className={`
                        px-2 py-1 rounded text-xs font-bold uppercase
                        ${user.status === 'new' ? 'bg-blue-500/20 text-blue-300' :
                            user.status === 'hired' ? 'bg-emerald-500/20 text-emerald-300' :
                                'bg-slate-700 text-slate-400'}
                    `}>
                        {user.status || 'Unknown'}
                    </span>
                </div>
            </div>
        );
    };

    if (error) {
        return (
            <div className="h-64 flex flex-col items-center justify-center text-red-400 p-4 text-center">
                <AlertCircle className="mb-2" />
                <p>Failed to load preview: {error}</p>
                <button
                    onClick={() => loadMore(true)}
                    className="mt-4 px-4 py-2 bg-white/10 rounded hover:bg-white/20 text-white text-sm"
                >
                    Retry
                </button>
            </div>
        );
    }

    return (
        <div className="h-[400px] w-full bg-slate-900/50 rounded-xl border border-white/10 overflow-hidden">
            {leads.length === 0 && loading ? (
                <div className="h-full flex items-center justify-center text-slate-400">
                    <Loader2 className="animate-spin mr-2" /> Loading preview...
                </div>
            ) : leads.length === 0 ? (
                <div className="h-full flex items-center justify-center text-slate-500">
                    No leads found matching criteria.
                </div>
            ) : (
                <Virtuoso
                    style={{ height: '400px' }}
                    data={leads}
                    endReached={() => hasMore && loadMore(false)}
                    itemContent={rowContent}
                    components={{
                        Footer: () => (
                            loading ? (
                                <div className="p-4 flex justify-center text-slate-400 text-xs">
                                    <Loader2 className="w-4 h-4 animate-spin mr-2" /> Loading more...
                                </div>
                            ) : null
                        )
                    }}
                />
            )}
        </div>
    );
}
