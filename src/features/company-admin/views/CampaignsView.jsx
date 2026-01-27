import React, { useState, useEffect } from 'react';
import { useData } from '@/context/DataContext';
import { db, auth } from '@lib/firebase';
import {
    collection, query, where, getDocs,
    orderBy, limit, onSnapshot, doc, getDoc
} from 'firebase/firestore';
import { onAuthStateChanged } from 'firebase/auth';
import { useToast } from '@shared/components/feedback/ToastProvider';

// Hooks
import { useCampaignTargeting } from './campaigns/hooks/useCampaignTargeting';
import { useCampaignExecution } from './campaigns/hooks/useCampaignExecution';

// Components
import { TargetingWizard } from './campaigns/components/TargetingWizard';
import { AudiencePreview } from './campaigns/components/AudiencePreview';
import { MessageComposer } from './campaigns/components/MessageComposer';
import { ExecutionModal } from './campaigns/components/ExecutionModal';
import { CampaignHistory, CampaignReport } from './campaigns/components/ReportingComponents';
import { AudienceCommand } from './campaigns/components/AudienceCommand';
import { AutomationsView } from './campaigns/components/AutomationsView';

export function CampaignsView() {
    const { currentCompanyProfile } = useData();
    const { showError } = useToast();
    const companyId = currentCompanyProfile?.id;

    const [activeTab, setActiveTab] = useState('audience'); // 'audience', 'campaigns', 'automations'
    const [view, setView] = useState('draft'); // 'draft', 'report' (within campaigns)
    const [currentUser, setCurrentUser] = useState(null);
    const [isAuthLoading, setIsAuthLoading] = useState(true);
    const [teamMembers, setTeamMembers] = useState([]);

    // Global Session Monitoring
    const [pastSessions, setPastSessions] = useState([]);
    const [selectedSessionId, setSelectedSessionId] = useState(null);
    const [selectedSessionAttempts, setSelectedSessionAttempts] = useState([]);
    const [isConfirmOpen, setIsConfirmOpen] = useState(false);

    // Messaging Config
    const [messageConfig, setMessageConfig] = useState({
        method: 'sms',
        subject: '',
        message: "Hi [Driver Name], we haven't heard from you in a while! Are you still looking for a driving job? Reply YES to reactivate your application.",
        interval: 45 // Increased default for Carrier Compliance
    });

    // Track Auth
    useEffect(() => {
        return onAuthStateChanged(auth, (user) => {
            setCurrentUser(user);
            setIsAuthLoading(false);
        });
    }, []);

    // Fetch Team for Recruiter Filter
    useEffect(() => {
        if (!companyId) return;
        const fetchTeam = async () => {
            try {
                const q = query(collection(db, "memberships"), where("companyId", "==", companyId));
                const snap = await getDocs(q);
                const members = [];
                for (const m of snap.docs) {
                    try {
                        const uSnap = await getDoc(doc(db, "users", m.data().userId));
                        if (uSnap.exists()) {
                            members.push({ id: uSnap.id, name: uSnap.data().name || uSnap.data().email || "Unknown User" });
                        }
                    } catch (e) { console.error("Error fetching user doc:", e); }
                }
                members.sort((a, b) => (a.name || "").localeCompare(b.name || ""));
                setTeamMembers(members);
            } catch (err) { console.error("Error fetching team memberships:", err); }
        };
        fetchTeam();
    }, [companyId]);

    // Custom Hooks
    const { filters, setFilters, previewLeads, isPreviewLoading, matchCount, previewError } = useCampaignTargeting(companyId, currentUser, isAuthLoading);
    const { isExecuting, handleLaunch, pauseSession, resumeSession, cancelSession, retryFailed } = useCampaignExecution(companyId);

    // Global Session Listener
    useEffect(() => {
        if (!companyId || !currentUser) return;
        const q = query(collection(db, 'companies', companyId, 'bulk_sessions'), orderBy('createdAt', 'desc'), limit(15));
        return onSnapshot(q, (snapshot) => {
            setPastSessions(snapshot.docs.map(d => ({ id: d.id, ...d.data() })));
        });
    }, [companyId, currentUser]);

    // Report Detail Listener
    useEffect(() => {
        if (!selectedSessionId || view !== 'report' || !currentUser) return;
        const q = query(collection(db, 'companies', companyId, 'bulk_sessions', selectedSessionId, 'attempts'), orderBy('timestamp', 'desc'));
        return onSnapshot(q, (snapshot) => {
            setSelectedSessionAttempts(snapshot.docs.map(d => ({ id: d.id, ...d.data() })));
        });
    }, [selectedSessionId, view, companyId, currentUser]);

    // Handlers
    const onLaunchConfirm = async () => {
        const result = await handleLaunch(filters, messageConfig);
        if (result.success) {
            setIsConfirmOpen(false);
            if (!result.scheduled) {
                setSelectedSessionId(result.sessionId);
                setActiveTab('campaigns');
                setView('report');
            }
        }
    };

    const handleRetryFailed = async (sid) => {
        const result = await retryFailed(sid);
        if (result.success) {
            setSelectedSessionId(result.sessionId);
            setView('report');
        }
    };

    const handleSelectSegment = (segment) => {
        // Use the pre-calculated segment directly for "Zero loading time"
        const newFilters = {
            ...filters,
            segmentId: segment.id,
            status: [], // Clear other filters to prioritize segment
            leadType: 'applications' // Default but bypasses in hook
        };
        setFilters(newFilters);
        setView('draft');
        setActiveTab('campaigns');
    };

    const selectedSession = pastSessions.find(s => s.id === selectedSessionId);

    // --- SUB-VIEWS ---

    const renderCampaignsWorkpace = () => {
        if (view === 'report') {
            return (
                <CampaignReport
                    session={selectedSession}
                    attempts={selectedSessionAttempts}
                    setView={setView}
                    onRetryFailed={handleRetryFailed}
                />
            );
        }

        if (view === 'draft') {
            return (
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-12 animate-in fade-in slide-in-from-bottom-4 duration-500">
                    <div className="space-y-8">
                        <TargetingWizard filters={filters} setFilters={setFilters} teamMembers={teamMembers} matchCount={matchCount} />
                        <AudiencePreview previewLeads={previewLeads} isPreviewLoading={isPreviewLoading} previewError={previewError} />
                        <div className="pt-8 space-y-4">
                            <button
                                disabled={previewLeads.length === 0 || isExecuting}
                                onClick={() => setIsConfirmOpen(true)}
                                className="w-full py-6 bg-blue-600 text-white rounded-[2.5rem] text-sm font-black uppercase tracking-widest shadow-2xl shadow-blue-200 hover:bg-blue-700 hover:scale-[1.02] transition-all flex items-center justify-center gap-3 disabled:opacity-50 disabled:grayscale"
                            >
                                Establish Sequence Command
                            </button>
                        </div>
                    </div>
                    <MessageComposer companyId={companyId} messageConfig={messageConfig} setMessageConfig={setMessageConfig} />
                </div>
            );
        }

        return (
            <CampaignHistory
                sessions={pastSessions}
                selectedSessionId={selectedSessionId}
                setSelectedSessionId={setSelectedSessionId}
                setView={setView}
                onPause={pauseSession}
                onResume={resumeSession}
                onCancel={cancelSession}
            />
        );
    };

    return (
        <div className="p-8 max-w-[1700px] mx-auto w-full min-h-screen bg-slate-50/20">
            {/* Header / Nav */}
            <div className="flex flex-col md:flex-row items-center justify-between mb-12 gap-6 bg-white p-4 rounded-[2.5rem] shadow-sm border border-slate-100">
                <div className="flex items-center gap-3 px-6">
                    <div className="h-10 w-10 bg-blue-600 rounded-2xl flex items-center justify-center text-white font-black">EE</div>
                    <div>
                        <div className="text-xs font-black text-slate-400 uppercase tracking-widest leading-none">SafeHaul</div>
                        <div className="text-xl font-black text-slate-900 uppercase tracking-tighter">Engagement Engine</div>
                    </div>
                </div>

                <div className="flex items-center gap-1 bg-slate-100 p-1.5 rounded-full">
                    {[
                        { id: 'audience', label: 'Audience Command', icon: '🎯' },
                        { id: 'campaigns', label: 'Campaigns', icon: '🚀' },
                        { id: 'automations', label: 'Automations', icon: '⚡' }
                    ].map(tab => (
                        <button
                            key={tab.id}
                            onClick={() => { setActiveTab(tab.id); if (tab.id === 'campaigns') setView('history'); }}
                            className={`px-8 py-3 rounded-full text-[10px] font-black uppercase tracking-widest transition-all flex items-center gap-2 ${activeTab === tab.id ? 'bg-white text-blue-600 shadow-md ring-1 ring-slate-200' : 'text-slate-500 hover:text-slate-900'}`}
                        >
                            <span>{tab.icon}</span>
                            {tab.label}
                        </button>
                    ))}
                </div>

                <div className="px-6 flex items-center gap-4">
                    {activeTab === 'campaigns' && view !== 'draft' && (
                        <button
                            onClick={() => setView('draft')}
                            className="px-6 py-3 bg-blue-600 text-white rounded-full text-[10px] font-black uppercase tracking-widest hover:bg-blue-700 shadow-xl shadow-blue-100 transition-all"
                        >
                            New Campaign
                        </button>
                    )}
                </div>
            </div>

            {/* Content Area */}
            <div className="active-view-container">
                {activeTab === 'audience' && <AudienceCommand companyId={companyId} onSelectSegment={handleSelectSegment} />}
                {activeTab === 'campaigns' && renderCampaignsWorkpace()}
                {activeTab === 'automations' && <AutomationsView />}
            </div>

            {isConfirmOpen && (
                <ExecutionModal
                    count={Math.min(matchCount, filters.limit)}
                    method={messageConfig.method}
                    scheduledFor={filters.scheduledFor}
                    isExecuting={isExecuting}
                    onConfirm={onLaunchConfirm}
                    onCancel={() => setIsConfirmOpen(false)}
                />
            )}
        </div>
    );
}
export default CampaignsView;
