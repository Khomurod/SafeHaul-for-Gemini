import React from 'react';
import { Wifi, Battery, Signal } from 'lucide-react';

export function DeviceMockup({ type = 'iphone', children }) {
  if (type === 'browser') {
    return (
      <div className="w-full h-full bg-white rounded-xl shadow-2xl border border-slate-200 overflow-hidden flex flex-col">
        <div className="bg-slate-100 border-b border-slate-200 p-3 flex items-center gap-2">
          <div className="flex gap-1.5">
            <div className="w-2.5 h-2.5 rounded-full bg-red-400"></div>
            <div className="w-2.5 h-2.5 rounded-full bg-amber-400"></div>
            <div className="w-2.5 h-2.5 rounded-full bg-green-400"></div>
          </div>
          <div className="flex-1 bg-white h-6 rounded-md mx-4 shadow-sm"></div>
        </div>
        <div className="flex-1 bg-white overflow-hidden relative">
          {children}
        </div>
      </div>
    );
  }

  // Phone Default
  return (
    <div className="mx-auto w-[300px] h-[600px] bg-slate-900 rounded-[3rem] p-4 shadow-2xl border-[6px] border-slate-800 relative">
      {/* Notch */}
      <div className="absolute top-0 left-1/2 -translate-x-1/2 h-7 w-32 bg-slate-900 rounded-b-2xl z-20"></div>

      {/* Screen */}
      <div className="w-full h-full bg-white rounded-[2.2rem] overflow-hidden flex flex-col relative z-10">

        {/* Status Bar */}
        <div className="h-12 bg-slate-50 flex items-center justify-between px-6 pt-2 select-none">
          <span className="text-[10px] font-bold text-slate-900">9:41</span>
          <div className="flex items-center gap-1.5 text-slate-900">
            <Signal size={10} />
            <Wifi size={10} />
            <Battery size={10} />
          </div>
        </div>

        {/* Content Area */}
        <div className="flex-1 bg-slate-50 relative overflow-y-auto no-scrollbar">
          {children}
        </div>

        {/* Home Indicator */}
        <div className="h-1 bg-slate-300 w-1/3 mx-auto rounded-full mb-2 mt-2"></div>
      </div>

      {/* Side Buttons */}
      <div className="absolute top-24 -left-2 w-1 h-8 bg-slate-700 rounded-l-md"></div>
      <div className="absolute top-36 -left-2 w-1 h-12 bg-slate-700 rounded-l-md"></div>
      <div className="absolute top-28 -right-2 w-1 h-16 bg-slate-700 rounded-r-md"></div>
    </div>
  );
}
