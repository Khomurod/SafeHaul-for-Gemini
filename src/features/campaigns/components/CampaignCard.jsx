import React from 'react';
import {
  Megaphone, Calendar, CheckCircle2, AlertCircle, Clock,
  MoreHorizontal, Play, Pause, Edit3, Trash2
} from 'lucide-react';

export function CampaignCard({ campaign, onClick, onAction }) {
  const statusColors = {
    draft: 'bg-slate-100 text-slate-500',
    scheduled: 'bg-blue-50 text-blue-600',
    active: 'bg-emerald-50 text-emerald-600',
    completed: 'bg-indigo-50 text-indigo-600',
    paused: 'bg-amber-50 text-amber-600',
    cancelled: 'bg-red-50 text-red-600'
  };

  const StatusIcon = {
    draft: Edit3,
    scheduled: Calendar,
    active: Play,
    completed: CheckCircle2,
    paused: Pause,
    cancelled: AlertCircle
  }[campaign.status] || AlertCircle;

  return (
    <div
      onClick={onClick}
      className="group bg-white border border-slate-200 rounded-2xl p-5 hover:border-blue-300 hover:shadow-md transition-all cursor-pointer relative"
    >
      <div className="flex justify-between items-start mb-4">
        <div className={`px-3 py-1.5 rounded-lg text-xs font-bold uppercase tracking-wider flex items-center gap-2 ${statusColors[campaign.status] || 'bg-slate-100'}`}>
          <StatusIcon size={12} />
          {campaign.status}
        </div>

        <button
          onClick={(e) => { e.stopPropagation(); onAction('menu', campaign); }}
          className="p-1 text-slate-300 hover:text-slate-600 transition-colors"
        >
          <MoreHorizontal size={16} />
        </button>
      </div>

      <h3 className="text-lg font-bold text-slate-900 mb-1 line-clamp-1 group-hover:text-blue-600 transition-colors">
        {campaign.name || 'Untitled Campaign'}
      </h3>

      <p className="text-sm text-slate-500 mb-6 line-clamp-2 min-h-[40px]">
        {campaign.config?.message || 'No content configured...'}
      </p>

      <div className="flex items-center justify-between pt-4 border-t border-slate-50">
        <div className="flex items-center gap-2 text-xs font-bold text-slate-400">
          <Megaphone size={12} />
          {campaign.type || (campaign.config?.method === 'email' ? 'Email' : 'SMS')}
        </div>

        {campaign.status === 'completed' || campaign.status === 'active' ? (
          <div className="text-right">
            <div className="text-lg font-black text-slate-900 leading-none">
              {campaign.progress?.successCount || 0}
            </div>
            <div className="text-[10px] font-bold text-slate-400 uppercase">Delivered</div>
          </div>
        ) : (
          <div className="flex items-center gap-1.5 text-xs text-slate-400">
            <Clock size={12} />
            {campaign.updatedAt?.toDate ? campaign.updatedAt.toDate().toLocaleDateString() : 'Just now'}
          </div>
        )}
      </div>
    </div>
  );
}
