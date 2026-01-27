import React from 'react';
import { Users, Loader2, AlertCircle } from 'lucide-react';

export function AudiencePreview({ previewLeads, isPreviewLoading, previewError }) {
    const total = previewLeads.length;
    const withPhone = previewLeads.filter(l => l.phone || l.phoneNumber).length;
    const healthScore = total > 0 ? Math.round((withPhone / total) * 100) : 100;

    return (
        <div className="mt-10 pt-8 border-t border-slate-50">
            <div className="flex items-center justify-between mb-4">
                <h4 className="text-[10px] font-black text-slate-400 uppercase tracking-widest flex items-center gap-2">
                    <Users size={14} /> Live Audience Preview
                </h4>
                {isPreviewLoading && <Loader2 size={12} className="animate-spin text-blue-500" />}
            </div>

            {!isPreviewLoading && total > 0 && healthScore < 100 && (
                <div className="mb-6 p-4 bg-amber-50 border border-amber-100 rounded-2xl flex items-start gap-3">
                    <AlertCircle size={16} className="text-amber-500 mt-0.5 shrink-0" />
                    <div>
                        <div className="text-[10px] font-black text-amber-700 uppercase tracking-widest">Low Delivery Confidence</div>
                        <p className="text-[10px] text-amber-600 font-medium leading-tight mt-1">
                            {100 - healthScore}% of your selected list is missing phone numbers. Delivery will be limited.
                        </p>
                    </div>
                    <div className="ml-auto text-xl font-black text-amber-600">{healthScore}%</div>
                </div>
            )}

            <div className="space-y-2 max-h-[250px] overflow-y-auto pr-2 custom-scrollbar">
                {previewError ? (
                    <div className="p-4 bg-red-50 border border-red-100 rounded-2xl text-[10px] font-medium text-red-600 leading-relaxed italic">
                        <AlertCircle size={14} className="mb-2" />
                        A new database index is required for this combination. Please contact support or use a simpler filter.
                        <div className="mt-2 text-[8px] font-mono break-all opacity-70">{previewError}</div>
                    </div>
                ) : !isPreviewLoading && previewLeads.length === 0 ? (
                    <div className="text-center py-8 text-slate-300 italic text-[10px]">No matches found for currently active filters.</div>
                ) : (
                    previewLeads.map(l => (
                        <div key={l.id} className="p-3 bg-slate-50/50 border border-slate-100 rounded-xl flex items-center justify-between">
                            <div>
                                <div className="text-[11px] font-black text-slate-700 uppercase tracking-tighter">{l.firstName || 'Unknown'} {l.lastName || ''}</div>
                                <div className="text-[9px] font-bold text-slate-400 font-mono tracking-tight">{l.phone || l.phoneNumber || 'NO_PHONE'}</div>
                            </div>
                            <div className="text-[8px] font-black px-2 py-0.5 bg-white border border-slate-100 rounded-full text-blue-500 uppercase tracking-tighter">
                                {l.status || 'New'}
                            </div>
                        </div>
                    ))
                )}
            </div>
        </div>
    );
}
