import React from 'react';
import { Briefcase, MapPin, AlertCircle, Calendar } from 'lucide-react';

const TimelineView = ({ items = [], type = 'employment' }) => {
    
    if (!items || items.length === 0) {
        return (
            <div className="p-6 text-center bg-gray-50 rounded-lg border border-dashed border-gray-300">
                <p className="text-gray-500 italic">No history recorded.</p>
            </div>
        );
    }

    return (
        <div className="relative pl-4 space-y-0 before:absolute before:inset-0 before:ml-4 before:h-full before:w-0.5 before:-translate-x-px before:bg-gradient-to-b before:from-gray-200 before:via-gray-200 before:to-transparent">
            {items.map((item, index) => (
                <div key={index} className="relative pb-8 pl-8 group">
                    {/* Timeline Dot */}
                    <span className="absolute left-0 top-1 flex h-8 w-8 -translate-x-1/2 items-center justify-center rounded-full bg-white ring-4 ring-gray-50 group-hover:ring-blue-50 transition-all border border-gray-200">
                        {type === 'employment' ? (
                            <Briefcase size={14} className="text-blue-600" />
                        ) : (
                            <MapPin size={14} className="text-indigo-600" />
                        )}
                    </span>

                    {/* Content Card */}
                    <div className="bg-white p-4 rounded-lg border border-gray-200 shadow-sm hover:shadow-md transition-shadow">
                        <div className="flex flex-col sm:flex-row sm:justify-between sm:items-start mb-2">
                            <div>
                                <h4 className="text-sm font-bold text-gray-900 uppercase tracking-wide">
                                    {item.name || item.street || "Unknown Entity"}
                                </h4>
                                <p className="text-xs text-gray-500 font-medium">
                                    {item.position ? item.position : `${item.city || ''}, ${item.state || ''}`}
                                </p>
                            </div>
                            <div className="mt-2 sm:mt-0 flex items-center gap-1.5 text-xs font-bold text-gray-600 bg-gray-100 px-2.5 py-1 rounded-md">
                                <Calendar size={12} />
                                {item.dates || "Dates Unknown"}
                            </div>
                        </div>

                        {/* Additional Details */}
                        <div className="text-xs text-gray-600 mt-2 space-y-1">
                            {item.reason && (
                                <p><span className="font-semibold text-gray-500">Reason for Leaving:</span> {item.reason}</p>
                            )}
                            {item.contactPerson && (
                                <p><span className="font-semibold text-gray-500">Contact:</span> {item.contactPerson} ({item.phone})</p>
                            )}
                            {item.email && (
                                <p><span className="font-semibold text-gray-500">Email:</span> {item.email}</p>
                            )}
                        </div>
                    </div>

                    {/* Gap Detection Mockup (Logic can be enhanced based on parsed dates) */}
                    {item.gapAfter && (
                        <div className="mt-4 flex items-center gap-2 p-2 bg-red-50 text-red-700 text-xs font-bold rounded border border-red-100 w-fit">
                            <AlertCircle size={14} />
                            <span>GAP DETECTED: {item.gapDuration}</span>
                        </div>
                    )}
                </div>
            ))}
        </div>
    );
};

export default TimelineView;
