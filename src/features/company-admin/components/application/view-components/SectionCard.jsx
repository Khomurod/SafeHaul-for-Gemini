import React from 'react';
import { ChevronUp } from 'lucide-react';

const SectionCard = ({ 
    id, 
    title, 
    icon: Icon, 
    children, 
    action, // Optional action button in header (e.g. "Verify")
    isComplete = false 
}) => {
    return (
        <div id={id} className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden mb-8 scroll-mt-24">
            {/* Header */}
            <div className="px-6 py-4 bg-slate-50 border-b border-gray-200 flex items-center justify-between">
                <div className="flex items-center gap-3">
                    {Icon && (
                        <div className={`p-2 rounded-lg ${isComplete ? 'bg-green-100 text-green-700' : 'bg-slate-200 text-slate-600'}`}>
                            <Icon size={18} />
                        </div>
                    )}
                    <div>
                        <h3 className="text-sm font-bold text-slate-800 uppercase tracking-wide">
                            {title}
                        </h3>
                        {isComplete && (
                            <span className="text-[10px] font-bold text-green-600 uppercase tracking-wider flex items-center gap-1">
                                Verified Data
                            </span>
                        )}
                    </div>
                </div>

                {/* Optional Action Slot */}
                {action && (
                    <div>
                        {action}
                    </div>
                )}
            </div>

            {/* Body */}
            <div className="p-6 space-y-1">
                {children}
            </div>
        </div>
    );
};

export default SectionCard;
