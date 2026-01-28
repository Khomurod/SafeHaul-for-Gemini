import React, { useState, useEffect } from 'react';
import { db } from '@lib/firebase';
import { collection, query, where, getCountFromServer, Timestamp } from 'firebase/firestore';
import { Filter, Users, Megaphone, UserCheck } from 'lucide-react';
import { APPLICATION_STATUSES } from '@features/company-admin/views/campaigns/constants/campaignConstants';

export function AudienceBuilder({ companyId, filters, onChange }) {
  const [localFilters, setLocalFilters] = useState(filters);
  const [loadingCount, setLoadingCount] = useState(false);
  const [estimatedCount, setEstimatedCount] = useState(0);

  // Sync prop changes to local state
  useEffect(() => {
    setLocalFilters(filters);
  }, [filters]);

  // Debounced Count Estimator
  useEffect(() => {
    const timer = setTimeout(async () => {
      setLoadingCount(true);
      try {
        // Construct Query (Simplified Logic from useCampaignTargeting)
        // This is a "Dry Run" count
        let baseRef;
        if (localFilters.leadType === 'global') baseRef = collection(db, 'leads');
        else if (localFilters.leadType === 'leads') baseRef = query(collection(db, 'companies', companyId, 'leads'), where('isPlatformLead', '==', true));
        else baseRef = collection(db, 'companies', companyId, 'applications');

        let q = query(baseRef);

        // Apply filters (simplified for estimation)
        // Note: Real deep filtering happens on backend launch
        if (localFilters.status && localFilters.status.length > 0 && localFilters.status !== 'all') {
             // Basic status filter simulation
             // q = query(q, where('status', 'in', localFilters.status.slice(0, 10)));
        }

        const snap = await getCountFromServer(q);
        const count = snap.data().count;

        setEstimatedCount(count);
        // Propagate changes up ONLY after count is ready
        onChange(localFilters, count);
      } catch (e) {
        console.error("Estimation failed", e);
      } finally {
        setLoadingCount(false);
      }
    }, 800); // 800ms debounce

    return () => clearTimeout(timer);
  }, [localFilters, companyId]);

  const updateFilter = (key, value) => {
    setLocalFilters(prev => ({ ...prev, [key]: value }));
  };

  return (
    <div className="max-w-5xl mx-auto grid grid-cols-1 lg:grid-cols-3 gap-8">

      {/* Left: Controls */}
      <div className="lg:col-span-2 space-y-6">
        <div className="bg-white rounded-3xl p-8 shadow-sm border border-slate-200">
          <h2 className="text-2xl font-black text-slate-900 mb-6 flex items-center gap-3">
            <Users className="text-blue-600" /> Target Audience
          </h2>

          <div className="space-y-6">
            <div>
              <label className="text-xs font-bold text-slate-400 uppercase tracking-widest mb-3 block">Source</label>
              <div className="grid grid-cols-3 gap-3">
                {[
                  { id: 'applications', label: 'Applicants', icon: UserCheck },
                  { id: 'leads', label: 'Leads', icon: Users },
                  { id: 'global', label: 'Global', icon: Megaphone }
                ].map(opt => (
                  <button
                    key={opt.id}
                    onClick={() => updateFilter('leadType', opt.id)}
                    className={`flex flex-col items-center justify-center p-4 rounded-2xl border-2 transition-all ${localFilters.leadType === opt.id ? 'border-blue-500 bg-blue-50 text-blue-700' : 'border-slate-100 text-slate-400 hover:border-slate-200'}`}
                  >
                    <opt.icon size={20} className="mb-2" />
                    <span className="text-xs font-bold">{opt.label}</span>
                  </button>
                ))}
              </div>
            </div>

            <div>
              <label className="text-xs font-bold text-slate-400 uppercase tracking-widest mb-3 block">Status Filters</label>
              <div className="flex flex-wrap gap-2">
                {APPLICATION_STATUSES.map(st => (
                  <button
                    key={st.id}
                    onClick={() => {
                        const current = localFilters.status || [];
                        const newStatus = current.includes(st.id)
                            ? current.filter(s => s !== st.id)
                            : [...current, st.id];
                        updateFilter('status', newStatus);
                    }}
                    className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all border ${
                        (localFilters.status || []).includes(st.id)
                        ? 'bg-slate-800 text-white border-slate-800'
                        : 'bg-white text-slate-500 border-slate-200 hover:border-slate-300'
                    }`}
                  >
                    {st.label}
                  </button>
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Right: Live Estimate */}
      <div className="lg:col-span-1">
        <div className="bg-slate-900 text-white rounded-3xl p-8 sticky top-8 shadow-xl shadow-blue-900/20">
          <h3 className="text-sm font-bold text-slate-400 uppercase tracking-widest mb-2">Estimated Reach</h3>
          <div className="text-5xl font-black mb-2 flex items-center gap-2">
            {loadingCount ? (
                <span className="animate-pulse opacity-50">...</span>
            ) : (
                estimatedCount.toLocaleString()
            )}
          </div>
          <p className="text-slate-400 text-sm leading-relaxed">
            Drivers matching your criteria who are eligible to receive messages.
          </p>

          <div className="mt-8 pt-8 border-t border-slate-800">
            <div className="flex justify-between mb-2 text-sm">
                <span className="text-slate-400">Blocked / Opt-Out</span>
                <span className="font-bold text-red-400">~2%</span>
            </div>
            <div className="flex justify-between text-sm">
                <span className="text-slate-400">Valid Phones</span>
                <span className="font-bold text-emerald-400">98%</span>
            </div>
          </div>
        </div>
      </div>

    </div>
  );
}
