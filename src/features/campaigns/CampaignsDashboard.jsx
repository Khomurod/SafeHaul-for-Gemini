import React, { useState, useEffect } from 'react';
import { useData } from '@/context/DataContext';
import { db } from '@lib/firebase';
import { collection, query, orderBy, onSnapshot, limit } from 'firebase/firestore';
import { Plus, Search, Filter } from 'lucide-react';
import { CampaignCard } from './components/CampaignCard';
import { CampaignEditor } from './CampaignEditor'; // We will create this next

export function CampaignsDashboard() {
    const { currentCompanyProfile } = useData();
    const companyId = currentCompanyProfile?.id;

    // View State: 'dashboard' | 'editor'
    const [view, setView] = useState('dashboard');
    const [selectedCampaignId, setSelectedCampaignId] = useState(null);
    const [activeSessions, setActiveSessions] = useState([]);
    const [drafts, setDrafts] = useState([]);
    const [loading, setLoading] = useState(true);

    // Fetch Data
    useEffect(() => {
        if (!companyId) return;

        // 1. Fetch Active/Completed Sessions
        const sessionsQ = query(
            collection(db, 'companies', companyId, 'bulk_sessions'),
            orderBy('createdAt', 'desc'),
            limit(20)
        );

        const unsubSessions = onSnapshot(sessionsQ, (snap) => {
            setActiveSessions(snap.docs.map(d => ({ id: d.id, type: 'session', ...d.data() })));
        });

        // 2. Fetch Drafts
        const draftsQ = query(
            collection(db, 'companies', companyId, 'campaign_drafts'),
            orderBy('updatedAt', 'desc'),
            limit(20)
        );

        const unsubDrafts = onSnapshot(draftsQ, (snap) => {
            setDrafts(snap.docs.map(d => ({ id: d.id, status: 'draft', type: 'draft', ...d.data() })));
            setLoading(false);
        });

        return () => {
            unsubSessions();
            unsubDrafts();
        };
    }, [companyId]);

    const handleCreateNew = () => {
        // Generate a new ID for the draft immediately
        const newId = `draft_${Date.now()}`;
        setSelectedCampaignId(newId);
        setView('editor');
    };

    const handleEditDraft = (draft) => {
        setSelectedCampaignId(draft.id);
        setView('editor');
    };

    // Combine & Sort
    const allCampaigns = [...drafts, ...activeSessions].sort((a, b) => {
        const dateA = a.createdAt?.toMillis ? a.createdAt.toMillis() : (a.updatedAt?.toMillis ? a.updatedAt.toMillis() : 0);
        const dateB = b.createdAt?.toMillis ? b.createdAt.toMillis() : (b.updatedAt?.toMillis ? b.updatedAt.toMillis() : 0);
        return dateB - dateA;
    });

    if (view === 'editor') {
        return (
            <CampaignEditor
                companyId={companyId}
                campaignId={selectedCampaignId}
                onClose={() => setView('dashboard')}
            />
        );
    }

    return (
        <div className="p-8 max-w-[1600px] mx-auto min-h-screen">
            <header className="flex justify-between items-end mb-10">
                <div>
                    <h1 className="text-4xl font-black text-slate-900 tracking-tight mb-2">Campaign Hub</h1>
                    <p className="text-slate-500 font-medium">Manage your outreach intelligence.</p>
                </div>

                <button
                    onClick={handleCreateNew}
                    className="flex items-center gap-2 px-8 py-4 bg-blue-600 hover:bg-blue-700 text-white rounded-2xl font-bold shadow-lg shadow-blue-200 transition-all active:scale-95"
                >
                    <Plus size={20} /> New Campaign
                </button>
            </header>

            {/* Filters & Search (Visual Only for now) */}
            <div className="flex gap-4 mb-8">
                <div className="relative flex-1 max-w-md">
                    <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
                    <input
                        type="text"
                        placeholder="Search campaigns..."
                        className="w-full pl-12 pr-4 py-3 bg-white border border-slate-200 rounded-xl font-medium focus:ring-2 focus:ring-blue-100 outline-none"
                    />
                </div>
                <button className="px-4 py-3 bg-white border border-slate-200 rounded-xl text-slate-600 font-bold flex items-center gap-2 hover:bg-slate-50">
                    <Filter size={18} /> Filter
                </button>
            </div>

            {loading ? (
                <div className="text-center py-20 text-slate-400">Loading Intelligence...</div>
            ) : allCampaigns.length === 0 ? (
                <div className="text-center py-20 bg-slate-50 rounded-3xl border border-dashed border-slate-200">
                    <div className="text-4xl mb-4">🚀</div>
                    <h3 className="text-lg font-bold text-slate-900">No Campaigns Yet</h3>
                    <p className="text-slate-500 mb-6">Start your first engagement sequence today.</p>
                    <button onClick={handleCreateNew} className="text-blue-600 font-bold hover:underline">Create Now</button>
                </div>
            ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
                    {allCampaigns.map(campaign => (
                        <CampaignCard
                            key={campaign.id}
                            campaign={campaign}
                            onClick={() => campaign.type === 'draft' ? handleEditDraft(campaign) : null}
                            onAction={(action) => console.log(action, campaign.id)}
                        />
                    ))}
                </div>
            )}
        </div>
    );
}
