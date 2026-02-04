import React, { useEffect, useId, useRef } from 'react';
import { X, Download, FileSignature, Edit2, Save, Trash2, ArrowRight, MessageSquare, Clock, Folder, UserCheck, Mail, Briefcase } from 'lucide-react';
import { useApplicationView } from '@features/company-admin/hooks/useApplicationView';

// Components
import { CandidateHero } from './CandidateHero';
import { ApplicationOverview } from './ApplicationOverview';

// Tabs (Lazy)
const DQFileTab = React.lazy(() => import('../tabs').then(m => ({ default: m.DQFileTab })));
const GeneralDocumentsTab = React.lazy(() => import('../tabs').then(m => ({ default: m.GeneralDocumentsTab })));
const NotesTab = React.lazy(() => import('../tabs').then(m => ({ default: m.NotesTab })));
const ActivityHistoryTab = React.lazy(() => import('../tabs').then(m => ({ default: m.ActivityHistoryTab })));
const PEVTab = React.lazy(() => import('../tabs').then(m => ({ default: m.PEVTab })));

import { SendOfferModal } from '../modals';
import { MoveApplicationModal, DeleteConfirmModal } from '@shared/components/modals/ApplicationModals.jsx';
import { ContactTab } from '@features/companies';

export function ApplicationDetailViewV2({
    companyId,
    applicationId,
    onClosePanel,
    onStatusUpdate,
    isCompanyAdmin,
    onPhoneClick
}) {
    const dialogTitleId = useId();
    const panelRef = useRef(null);
    const closeButtonRef = useRef(null);
    const {
        // From useApplicationDetails
        loading, error, appData, collectionName, fileUrls, currentStatus,
        isEditing, setIsEditing, isSaving, canEdit,
        teamMembers, assignedTo, handleAssignChange,
        loadApplication, handleDataChange, handleSaveEdit, handleStatusUpdate,

        // From useApplicationView
        showDeleteConfirm, setShowDeleteConfirm,
        showMoveModal, setShowMoveModal,
        showOfferModal, setShowOfferModal,
        activeSection, setActiveSection,
        dqFiles, dqStatus,
        isSuperAdmin, canEditAllFields, currentAppName, driverId,
        handleDownloadPdf, handleManagementComplete, handleWorkflowAction
    } = useApplicationView(companyId, applicationId, onStatusUpdate, onClosePanel, onPhoneClick);

    // Tab Navigation
    const navItems = [
        { id: 'overview', label: 'Overview', icon: Briefcase },
        { id: 'contact', label: 'Contact', icon: Mail },
        { id: 'notes', label: 'Notes', icon: MessageSquare },
        { id: 'dq', label: 'DQ File', icon: UserCheck },
        { id: 'pev', label: 'PEV', icon: Briefcase },
        { id: 'docs', label: 'Documents', icon: Folder },
        { id: 'activity', label: 'Activity', icon: Clock }
    ];

    const renderContent = () => {
        if (loading) {
            return (
                <div className="space-y-4" aria-hidden="true">
                    <div className="h-40 rounded-xl bg-gray-200 animate-pulse" />
                    <div className="h-16 rounded-xl bg-gray-200 animate-pulse" />
                    <div className="space-y-3">
                        <div className="h-6 w-2/3 bg-gray-200 rounded animate-pulse" />
                        <div className="h-24 bg-gray-200 rounded animate-pulse" />
                        <div className="h-24 bg-gray-200 rounded animate-pulse" />
                    </div>
                </div>
            );
        }
        if (error) return <div className="flex items-center justify-center h-64"><p className="text-red-500">{error}</p></div>;
        if (!appData) return <div className="flex items-center justify-center h-64"><p className="text-gray-500">No data available</p></div>;

        switch (activeSection) {
            case 'contact':
                return <React.Suspense fallback={<div className="h-64 flex center text-gray-400">Loading...</div>}>
                    <ContactTab companyId={companyId} recordId={applicationId} collectionName={collectionName} email={appData.email} phone={appData.phone} applicantData={appData} />
                </React.Suspense>;
            case 'notes':
                return <React.Suspense fallback={<div className="h-64 flex center text-gray-400">Loading...</div>}>
                    <NotesTab companyId={companyId} applicationId={applicationId} collectionName={collectionName} />
                </React.Suspense>;
            case 'dq':
                return <React.Suspense fallback={<div className="h-64 flex center text-gray-400">Loading...</div>}>
                    <DQFileTab companyId={companyId} applicationId={applicationId} collectionName={collectionName} />
                </React.Suspense>;
            case 'pev':
                return <React.Suspense fallback={<div className="h-64 flex center text-gray-400">Loading...</div>}>
                    <PEVTab companyId={companyId} applicationId={applicationId} appData={appData} />
                </React.Suspense>;
            case 'docs':
                return <React.Suspense fallback={<div className="h-64 flex center text-gray-400">Loading...</div>}>
                    <GeneralDocumentsTab companyId={companyId} applicationId={applicationId} appData={appData} fileUrls={fileUrls} collectionName={collectionName} />
                </React.Suspense>;
            case 'activity':
                return <React.Suspense fallback={<div className="h-64 flex center text-gray-400">Loading...</div>}>
                    <ActivityHistoryTab companyId={companyId} applicationId={applicationId} collectionName={collectionName} />
                </React.Suspense>;
            default:
                return <ApplicationOverview
                    appData={appData}
                    dqStatus={dqStatus}
                    currentStatus={currentStatus}
                    onWorkflowAction={handleWorkflowAction}
                    dqFiles={dqFiles}
                    setActiveSection={setActiveSection}
                    isEditing={isEditing}
                    onDataChange={handleDataChange}
                    canEditAllFields={canEditAllFields}
                    onPhoneClick={onPhoneClick}
                />;
        }
    };

    useEffect(() => {
        closeButtonRef.current?.focus();
    }, []);

    const handleKeyDown = (event) => {
        if (event.key === 'Escape') {
            onClosePanel?.();
        }
    };

    return (
        <div
            className="fixed inset-0 bg-slate-900/60 z-[60] backdrop-blur-sm flex justify-end transition-opacity duration-300"
            onClick={onClosePanel}
            onKeyDown={handleKeyDown}
        >
            <div
                ref={panelRef}
                role="dialog"
                aria-modal="true"
                aria-labelledby={dialogTitleId}
                tabIndex={-1}
                className="bg-gray-50 w-[90%] md:w-[80%] lg:w-[70%] xl:w-[65%] h-full shadow-2xl flex flex-col transform transition-transform duration-300"
                onClick={e => e.stopPropagation()}
            >
                {/* Top Bar */}
                <div className="p-4 border-b border-gray-200 bg-white flex justify-between items-center shrink-0 shadow-sm z-10">
                    <span id={dialogTitleId} className="sr-only">Application details</span>
                    <div className="flex items-center gap-4">
                        <div className="flex items-center gap-2">
                            <label className="text-xs font-bold text-gray-400 uppercase">Assignee:</label>
                            <select
                                className="px-2 py-1 text-sm border border-gray-300 rounded-lg bg-white focus:ring-2 focus:ring-blue-500 outline-none"
                                value={assignedTo}
                                onChange={(e) => handleAssignChange(e.target.value)}
                                disabled={!canEdit}
                            >
                                <option value="">Unassigned</option>
                                {teamMembers.map(m => <option key={m.id} value={m.id}>{m.name}</option>)}
                            </select>
                        </div>
                    </div>

                    <div className="flex items-center gap-2">
                        {!loading && appData && (
                            <>
                                {canEdit && ['Approved', 'Background Check'].includes(currentStatus) && (
                                    <button onClick={() => setShowOfferModal(true)} className="px-4 py-2 bg-green-600 text-white text-sm font-bold rounded-lg hover:bg-green-700 transition shadow-sm flex items-center gap-2">
                                        <FileSignature size={16} /> Offer
                                    </button>
                                )}
                                <button className="px-3 py-2 border border-gray-300 text-gray-700 font-medium rounded-lg hover:bg-gray-50 text-sm transition flex items-center gap-2" onClick={handleDownloadPdf} aria-label="Download application PDF">
                                    <Download size={16} /> PDF
                                </button>
                            </>
                        )}
                        <div className="h-6 w-px bg-gray-300 mx-1" />
                        <button
                            ref={closeButtonRef}
                            className="p-2 text-gray-400 hover:text-gray-700 hover:bg-gray-100 rounded-full transition"
                            onClick={onClosePanel}
                            aria-label="Close application panel"
                        >
                            <X size={22} />
                        </button>
                    </div>
                </div>

                {/* Main Content */}
                <div className="flex-1 overflow-y-auto">
                    <div className="p-6 space-y-5">
                        {!loading && appData ? (
                            <>
                                <CandidateHero
                                    appData={appData}
                                    currentStatus={currentStatus}
                                    handleStatusUpdate={handleStatusUpdate}
                                    canEdit={canEdit}
                                    onPhoneClick={onPhoneClick}
                                />
                                <div className="sticky top-0 z-10 bg-gray-50/95 backdrop-blur-sm -mx-6 px-6 py-3 border-b border-gray-200">
                                    <div className="flex items-center justify-between gap-4">
                                        <div className="min-w-0">
                                            <p className="text-sm font-semibold text-gray-900 truncate">
                                                {currentAppName || 'Application'}
                                            </p>
                                            <p className="text-xs text-gray-500">Status: {currentStatus}</p>
                                        </div>
                                        <div className="flex items-center gap-2">
                                            {appData.phone && (
                                                <button
                                                    onClick={(e) => {
                                                        window.location.href = `tel:${appData.phone}`;
                                                        if (onPhoneClick) onPhoneClick(e, appData);
                                                    }}
                                                    className="px-2.5 py-1.5 rounded-lg bg-green-100 text-green-700 text-xs font-semibold hover:bg-green-200 transition"
                                                    aria-label={`Call ${appData.firstName || 'driver'}`}
                                                >
                                                    Call
                                                </button>
                                            )}
                                            {appData.email && (
                                                <a
                                                    href={`mailto:${appData.email}`}
                                                    className="px-2.5 py-1.5 rounded-lg bg-gray-100 text-gray-700 text-xs font-semibold hover:bg-gray-200 transition"
                                                    aria-label={`Email ${appData.firstName || 'driver'}`}
                                                >
                                                    Email
                                                </a>
                                            )}
                                        </div>
                                    </div>
                                </div>
                            </>
                        ) : (
                            <div className="space-y-4" aria-hidden="true">
                                <div className="h-32 rounded-xl bg-gray-200 animate-pulse" />
                                <div className="h-10 rounded-xl bg-gray-200 animate-pulse" />
                            </div>
                        )}

                        <div className="flex items-center gap-1 p-1 bg-gray-100 rounded-xl border border-gray-200">
                            {navItems.map(item => (
                                <button
                                    key={item.id}
                                    onClick={() => setActiveSection(item.id)}
                                    className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-all border-b-2 ${activeSection === item.id ? 'bg-white text-gray-900 shadow-sm border-blue-600' : 'text-gray-600 hover:text-gray-900 hover:bg-gray-50 border-transparent'}`}
                                    aria-current={activeSection === item.id ? 'page' : undefined}
                                >
                                    <item.icon size={16} />
                                    <span className="hidden sm:inline">{item.label}</span>
                                </button>
                            ))}
                        </div>

                        {renderContent()}
                    </div>
                </div>

                {/* Footer Actions */}
                {(canEdit || isSuperAdmin) && activeSection === 'overview' && !loading && (
                    <div className="p-4 border-t border-gray-200 bg-white flex justify-between items-center shrink-0 z-10">
                        <div className="flex gap-3">
                            {isSuperAdmin && !isEditing && (
                                <button className="px-4 py-2 bg-indigo-100 text-indigo-700 font-bold rounded-lg hover:bg-indigo-200 transition flex items-center gap-2" onClick={() => setShowMoveModal(true)}>
                                    <ArrowRight size={16} /> Move
                                </button>
                            )}
                            {!isEditing ? (
                                <button className="px-4 py-2 bg-white border border-gray-300 text-gray-700 font-bold rounded-lg hover:bg-gray-100 transition flex items-center gap-2 shadow-sm" onClick={() => setIsEditing(true)}>
                                    <Edit2 size={16} /> Edit
                                </button>
                            ) : (
                                <>
                                    <button className="px-4 py-2 text-gray-600 hover:underline font-medium" onClick={() => { setIsEditing(false); loadApplication(); }}>Cancel</button>
                                    <button className="px-6 py-2 bg-green-600 text-white font-bold rounded-lg hover:bg-green-700 transition flex items-center gap-2 shadow-md" onClick={handleSaveEdit} disabled={isSaving}>
                                        <Save size={16} /> Save
                                    </button>
                                </>
                            )}
                        </div>
                        {!isEditing && (
                            <button className="px-4 py-2 text-red-600 hover:bg-red-50 rounded-lg font-bold transition flex items-center gap-2" onClick={() => setShowDeleteConfirm(true)}>
                                <Trash2 size={16} /> Delete
                            </button>
                        )}
                    </div>
                )}

                {/* Modals */}
                {showDeleteConfirm && (
                    <DeleteConfirmModal
                        appName={currentAppName}
                        companyId={companyId}
                        applicationId={applicationId}
                        collectionName={collectionName}
                        onClose={() => setShowDeleteConfirm(false)}
                        onDeletionComplete={handleManagementComplete}
                    />
                )}
                {showMoveModal && isSuperAdmin && (
                    <MoveApplicationModal
                        sourceCompanyId={companyId}
                        applicationId={applicationId}
                        onClose={() => setShowMoveModal(false)}
                        onMoveComplete={handleManagementComplete}
                    />
                )}
                {showOfferModal && (
                    <SendOfferModal
                        companyId={companyId}
                        applicationId={applicationId}
                        driverId={driverId}
                        driverName={currentAppName}
                        onClose={() => setShowOfferModal(false)}
                        onOfferSent={() => { handleStatusUpdate('Offer Sent'); loadApplication(); }}
                    />
                )}
            </div>
        </div>
    );
}

export default ApplicationDetailViewV2;
