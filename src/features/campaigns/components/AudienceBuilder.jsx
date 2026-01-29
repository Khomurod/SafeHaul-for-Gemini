import React, { useState, useEffect } from 'react';
import { useCampaignTargeting } from '../hooks/useCampaignTargeting';
import { useCompanyTeam } from '@/shared/hooks/useCompanyTeam';
import { useData } from '@/context/DataContext';
import { APPLICATION_STATUSES, LAST_CALL_RESULTS } from '../constants/campaignConstants';
import { Filter, Users, RefreshCw, CheckCircle2, UploadCloud, FileSpreadsheet, X, AlertCircle } from 'lucide-react';
import { Virtuoso } from 'react-virtuoso';
import { useBulkImport } from '@/shared/hooks/useBulkImport';

export function AudienceBuilder({ companyId, filters, onChange }) {
    const { currentUser } = useData();
    const { team } = useCompanyTeam(companyId);

    // UI State
    const [activeTab, setActiveTab] = useState('crm'); // 'crm' | 'upload'

    // 1. CRM HOOK
    const {
        previewLeads: crmLeads,
        isPreviewLoading: isCrmLoading,
        matchCount: crmMatchCount,
        previewError,
        setFilters
    } = useCampaignTargeting(companyId, currentUser, false);

    // 2. IMPORT HOOK
    const {
        csvData,
        step: importStep,
        processingSheet,
        handleFileChange,
        handleSheetImport,
        sheetUrl,
        setSheetUrl,
        reset: resetImport
    } = useBulkImport();

    // Sync external filters prop to internal hook state (Only for CRM mode)
    useEffect(() => {
        if (filters && activeTab === 'crm') {
            // Only update if not already consistent to avoid loops?
            setFilters(prev => ({ ...prev, ...filters }));
        }
    }, [filters, activeTab]);

    // Handle Tab Switch & Import Data Sync
    useEffect(() => {
        if (activeTab === 'upload') {
            // When in upload mode, we pass the imported data up
            if (csvData.length > 0) {
                onChange({
                    ...filters,
                    leadType: 'import',
                    rawData: csvData
                }, csvData.length);
            } else {
                onChange({ ...filters, leadType: 'import', rawData: [] }, 0);
            }
        } else {
            // When switching back to CRM, we defer to the crm hook's data
            // We strip rawData from filters
            const { rawData, ...rest } = filters || {};
            if (rest.leadType === 'import') {
                rest.leadType = 'leads'; // Default back to leads
            }
            onChange(rest, crmMatchCount);
        }
    }, [activeTab, csvData, crmMatchCount]);

    // Handle local filter changes
    const handleChange = (key, value) => {
        const newFilters = { ...filters, [key]: value };
        setFilters(newFilters); // Update hook
        // onChange(newFilters, crmMatchCount); // Hook will eventually update matchCount, but we can optimistically update filters?
        // Actually, we should wait for hook to update matchCount, but parent needs filters immediately for state.
        // We'll pass current count.
        onChange(newFilters, crmMatchCount);
    };

    const handleToggleExclusion = (leadId) => {
        const currentExcluded = filters.excludedLeadIds || [];
        const newExcluded = currentExcluded.includes(leadId)
            ? currentExcluded.filter(id => id !== leadId)
            : [...currentExcluded, leadId];

        onChange({ ...filters, excludedLeadIds: newExcluded }, crmMatchCount);
    };

    // Determine what to show
    const isUploadMode = activeTab === 'upload';
    const displayLeads = isUploadMode ? csvData : crmLeads;
    const displayCount = isUploadMode ? csvData.length : crmMatchCount;
    const isLoading = isUploadMode ? processingSheet : isCrmLoading;
    const excludedCount = !isUploadMode ? (filters.excludedLeadIds?.length || 0) : 0;
    const finalCount = Math.max(0, displayCount - excludedCount);

    return (
        <div className="max-w-5xl mx-auto">
            <div className="mb-8 flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div>
                    <h2 className="text-2xl font-black text-slate-900 mb-2">Target Audience</h2>
                    <p className="text-slate-500">Define who receives this message.</p>
                </div>

                {/* Mode Tabs */}
                <div className="flex bg-slate-100 p-1 rounded-xl">
                    <button
                        onClick={() => setActiveTab('crm')}
                        className={`px-4 py-2 rounded-lg text-sm font-bold transition-all ${activeTab === 'crm' ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}
                    >
                        CRM Filters
                    </button>
                    <button
                        onClick={() => setActiveTab('upload')}
                        className={`px-4 py-2 rounded-lg text-sm font-bold transition-all flex items-center gap-2 ${activeTab === 'upload' ? 'bg-white text-blue-600 shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}
                    >
                        <FileSpreadsheet size={16} /> Upload List
                    </button>
                </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                {/* Left: Controls */}
                <div className="lg:col-span-2 space-y-6">
                    <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm h-full">
                        {activeTab === 'crm' ? (
                            <>
                                <h3 className="flex items-center gap-2 font-bold text-slate-900 mb-6 pb-4 border-b border-slate-100">
                                    <Filter size={18} className="text-slate-400" /> Filter Criteria
                                </h3>

                                <div className="space-y-6">
                                    {/* Lead Source */}
                                    <div>
                                        <label className="block text-xs font-bold text-slate-500 uppercase mb-2">Lead Source</label>
                                        <select
                                            className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl font-medium outline-none focus:ring-2 focus:ring-blue-100"
                                            value={filters.leadType || 'applications'}
                                            onChange={(e) => handleChange('leadType', e.target.value)}
                                        >
                                            <option value="applications">Direct Applications</option>
                                            <option value="leads">Assigned Leads (SafeHaul & Imported)</option>
                                            <option value="global">Global Pool (Cold)</option>
                                        </select>
                                    </div>

                                    {/* Recruiter Filter */}
                                    <div>
                                        <label className="block text-xs font-bold text-slate-500 uppercase mb-2">Assigned Recruiter</label>
                                        <select
                                            className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl font-medium outline-none focus:ring-2 focus:ring-blue-100"
                                            value={filters.recruiterId || 'all'}
                                            onChange={(e) => handleChange('recruiterId', e.target.value)}
                                        >
                                            <option value="all">All Recruiters</option>
                                            <option value="my_leads">My Leads Only</option>
                                            {team.map(member => (
                                                <option key={member.id} value={member.id}>{member.name}</option>
                                            ))}
                                        </select>
                                    </div>

                                    {/* Status */}
                                    <div>
                                        <label className="block text-xs font-bold text-slate-500 uppercase mb-2">Application Status</label>
                                        <div className="flex flex-wrap gap-2">
                                            {APPLICATION_STATUSES.map((status) => {
                                                const isSelected = filters.status?.includes(status.id);
                                                return (
                                                    <button
                                                        key={status.id}
                                                        onClick={() => {
                                                            const current = filters.status || [];
                                                            const newVal = isSelected
                                                                ? current.filter(s => s !== status.id)
                                                                : [...current, status.id];
                                                            handleChange('status', newVal);
                                                        }}
                                                        className={`px-3 py-1.5 rounded-lg text-xs font-bold border transition-all ${isSelected ? 'bg-blue-50 border-blue-200 text-blue-700' : 'bg-white border-slate-200 text-slate-500 hover:border-slate-300'}`}
                                                    >
                                                        {status.label}
                                                    </button>
                                                );
                                            })}
                                        </div>
                                    </div>

                                    {/* Last Call Outcome */}
                                    <div>
                                        <label className="block text-xs font-bold text-slate-500 uppercase mb-2">Last Call Outcome</label>
                                        <select
                                            className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl font-medium outline-none focus:ring-2 focus:ring-blue-100"
                                            value={filters.lastCallOutcome || 'all'}
                                            onChange={(e) => handleChange('lastCallOutcome', e.target.value)}
                                        >
                                            <option value="all">Any Outcome</option>
                                            {LAST_CALL_RESULTS.map((result) => (
                                                <option key={result.id} value={result.id}>{result.label}</option>
                                            ))}
                                        </select>
                                    </div>
                                </div>
                            </>
                        ) : (
                            // UPLOAD UI
                            <>
                                <h3 className="flex items-center gap-2 font-bold text-slate-900 mb-6 pb-4 border-b border-slate-100">
                                    <UploadCloud size={18} className="text-slate-400" /> Import Contacts
                                </h3>

                                <div className="space-y-6">
                                    <div className="border-2 border-dashed border-slate-200 rounded-2xl p-8 text-center hover:bg-slate-50 transition-colors relative group">
                                        <input
                                            type="file"
                                            accept=".xlsx,.csv"
                                            onChange={handleFileChange}
                                            className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                                        />
                                        <div className="pointer-events-none">
                                            <div className="w-12 h-12 bg-blue-100 text-blue-600 rounded-full flex items-center justify-center mx-auto mb-4 group-hover:scale-110 transition-transform">
                                                <UploadCloud size={24} />
                                            </div>
                                            <p className="font-bold text-slate-700">Click to Upload Excel/CSV</p>
                                            <p className="text-sm text-slate-400 mt-1">Headers: name, phone, email</p>
                                        </div>
                                    </div>

                                    <div className="relative">
                                        <div className="absolute inset-0 flex items-center">
                                            <div className="w-full border-t border-slate-100"></div>
                                        </div>
                                        <div className="relative flex justify-center text-xs uppercase">
                                            <span className="bg-white px-2 text-slate-400 font-bold">Or from Google Sheets</span>
                                        </div>
                                    </div>

                                    <div className="flex gap-2">
                                        <input
                                            type="text"
                                            placeholder="Paste Google Sheet URL (Anyone with link)"
                                            className="flex-1 p-3 bg-slate-50 border border-slate-200 rounded-xl font-medium text-sm outline-none focus:ring-2 focus:ring-blue-100"
                                            value={sheetUrl}
                                            onChange={(e) => setSheetUrl(e.target.value)}
                                        />
                                        <button
                                            onClick={handleSheetImport}
                                            disabled={processingSheet}
                                            className="px-6 py-3 bg-slate-900 text-white rounded-xl font-bold hover:bg-slate-800 disabled:opacity-50"
                                        >
                                            {processingSheet ? <RefreshCw className="animate-spin" size={20} /> : 'Import'}
                                        </button>
                                    </div>

                                    {csvData.length > 0 && (
                                        <div className="bg-emerald-50 text-emerald-700 p-4 rounded-xl flex items-center justify-between">
                                            <span className="font-bold flex items-center gap-2">
                                                <CheckCircle2 size={18} /> {csvData.length} contacts loaded
                                            </span>
                                            <button onClick={resetImport} className="text-xs font-bold hover:underline">Clear</button>
                                        </div>
                                    )}
                                </div>
                            </>
                        )}
                    </div>
                </div>

                {/* Right: Results Preview (Virtualization) */}
                <div className="lg:col-span-1">
                    <div className="bg-slate-900 text-white p-4 rounded-2xl shadow-xl sticky top-8 h-[600px] flex flex-col">
                        <div className="flex items-center justify-between mb-4 shrink-0">
                            <h3 className="font-bold flex items-center gap-2">
                                <Users size={18} className="text-slate-400" />
                                {isUploadMode ? 'Import Preview' : 'Matched Leads'}
                            </h3>
                            {isLoading && <RefreshCw size={14} className="animate-spin text-slate-400" />}
                        </div>

                        <div className="text-center py-6 border-b border-slate-800 mb-4 shrink-0">
                            <div className="text-5xl font-black tracking-tighter mb-1">
                                {finalCount}
                            </div>
                            <div className="text-sm text-slate-400 font-medium">Recipients Selected</div>
                            {excludedCount > 0 && (
                                <div className="text-xs text-red-400 mt-2">
                                    {excludedCount} excluded manually
                                </div>
                            )}
                        </div>

                        {previewError && (
                            <div className="p-3 bg-red-500/10 border border-red-500/20 text-red-400 text-xs rounded-lg mb-4 shrink-0">
                                {previewError}
                            </div>
                        )}

                        <div className="flex-1 min-h-0">
                            {/* VIRTUOSO LIST */}
                            <Virtuoso
                                style={{ height: '100%' }}
                                data={displayLeads}
                                itemContent={(index, lead) => {
                                    // Handle different data shapes
                                    const id = lead.id || `temp-${index}`;
                                    const name = lead.firstName ? `${lead.firstName} ${lead.lastName || ''}` : (lead.name || 'Unknown');
                                    const contact = lead.phone || lead.normalizedPhone || lead.email || '';
                                    const isExcluded = !isUploadMode && filters.excludedLeadIds?.includes(id);

                                    return (
                                        <div className="pb-2 pr-2">
                                            <div
                                                onClick={() => !isUploadMode && handleToggleExclusion(id)}
                                                className={`p-4 rounded-xl flex items-center gap-4 border transition-all 
                                                    ${isUploadMode ? 'cursor-default border-slate-800 bg-slate-800/50' : 'cursor-pointer group ' + (isExcluded ? 'bg-slate-900 border-slate-700 opacity-60' : 'bg-slate-800 border-transparent hover:border-slate-600')}
                                                `}
                                            >
                                                {!isUploadMode && (
                                                    <div className={`w-5 h-5 rounded flex items-center justify-center border transition-colors ${!isExcluded ? 'bg-blue-600 border-blue-600 text-white' : 'bg-slate-800 border-slate-600'}`}>
                                                        {!isExcluded && <CheckCircle2 size={12} />}
                                                    </div>
                                                )}

                                                <div className="w-10 h-10 rounded-full bg-slate-700 flex items-center justify-center font-bold text-sm shrink-0">
                                                    {name[0] || '?'}
                                                </div>
                                                <div className="flex-1 min-w-0">
                                                    <div className="text-base font-semibold truncate text-white">
                                                        {name}
                                                    </div>
                                                    <div className="text-sm text-slate-400 truncate">{contact}</div>
                                                </div>
                                            </div>
                                        </div>
                                    );
                                }}
                            />
                        </div>

                        {/* Footer Confirmation */}
                        <div className="mt-4 pt-4 border-t border-slate-800 shrink-0">
                            <button
                                className="w-full py-3 bg-emerald-500 hover:bg-emerald-600 text-white rounded-xl font-bold shadow-lg shadow-emerald-500/20 transition-all active:scale-95 flex items-center justify-center gap-2"
                                onClick={() => isUploadMode ? onChange({ ...filters, leadType: 'import', rawData: csvData }, csvData.length) : onChange(filters, finalCount)}
                            >
                                <CheckCircle2 size={18} /> Confirm {finalCount} Recipients
                            </button>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}
