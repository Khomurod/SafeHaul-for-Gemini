import React from 'react';
import { ShieldCheck, AlertTriangle } from 'lucide-react';

const RiskGrid = ({ data = [], type = 'violation' }) => {
    const isClean = !data || data.length === 0;

    if (isClean) {
        return (
            <div className="flex flex-col items-center justify-center p-8 bg-green-50 rounded-xl border border-green-100 text-center">
                <div className="p-3 bg-white rounded-full shadow-sm mb-3">
                    <ShieldCheck size={32} className="text-green-600" />
                </div>
                <h4 className="text-green-900 font-bold text-lg">Clean Record Declared</h4>
                <p className="text-green-700 text-sm">
                    Applicant declared zero {type === 'violation' ? 'moving violations' : 'accidents'} in the past 3 years.
                </p>
            </div>
        );
    }

    return (
        <div className="overflow-hidden border border-red-100 rounded-xl bg-white shadow-sm">
            <div className="bg-red-50 px-4 py-3 border-b border-red-100 flex items-center gap-2">
                <AlertTriangle size={16} className="text-red-600" />
                <h4 className="text-xs font-bold text-red-900 uppercase tracking-wider">
                    {data.length} {type === 'violation' ? 'Violations' : 'Accidents'} Reported
                </h4>
            </div>
            
            <div className="divide-y divide-gray-100">
                {data.map((item, idx) => (
                    <div key={idx} className="p-4 hover:bg-gray-50 transition-colors grid grid-cols-1 sm:grid-cols-12 gap-4">
                        {/* Date & Loc */}
                        <div className="sm:col-span-3">
                            <span className="block text-xs font-bold text-gray-500 uppercase">When</span>
                            <span className="text-sm font-medium text-gray-900">{item.date}</span>
                            <span className="block text-xs text-gray-500">{item.location || item.city}</span>
                        </div>

                        {/* Context */}
                        <div className="sm:col-span-9">
                            <span className="block text-xs font-bold text-gray-500 uppercase">
                                {type === 'violation' ? 'Offense' : 'Description'}
                            </span>
                            <span className="text-sm font-bold text-gray-900 block mb-1">
                                {item.charge || "Accident Report"}
                            </span>
                            
                            {/* Tags/Badges */}
                            <div className="flex flex-wrap gap-2">
                                {item.penalty && (
                                    <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-gray-100 text-gray-600 border border-gray-200">
                                        Penalty: {item.penalty}
                                    </span>
                                )}
                                {item.fatalities === 'yes' && (
                                    <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-red-100 text-red-700 border border-red-200">
                                        FATALITY
                                    </span>
                                )}
                                {item.injuries === 'yes' && (
                                    <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-orange-100 text-orange-700 border border-orange-200">
                                        INJURY
                                    </span>
                                )}
                                {item.commercial === 'yes' && (
                                    <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-blue-100 text-blue-700 border border-blue-200">
                                        CMV
                                    </span>
                                )}
                            </div>
                            
                            {item.details && (
                                <p className="mt-2 text-xs text-gray-600 italic">"{item.details}"</p>
                            )}
                        </div>
                    </div>
                ))}
            </div>
        </div>
    );
};

export default RiskGrid;
