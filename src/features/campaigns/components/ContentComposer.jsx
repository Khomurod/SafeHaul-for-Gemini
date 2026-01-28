import React from 'react';
import { MessageSquare, Image, Paperclip, AlertCircle } from 'lucide-react';
import { DeviceMockup } from './DeviceMockup';

export function ContentComposer({ messageConfig, onChange }) {
  const message = messageConfig.message || '';
  const segments = Math.ceil(message.length / 160);

  const updateConfig = (key, value) => {
    onChange({ ...messageConfig, [key]: value });
  };

  return (
    <div className="h-full flex flex-col lg:flex-row gap-8">

      {/* Editor */}
      <div className="flex-1 bg-white rounded-3xl p-8 border border-slate-200 shadow-sm flex flex-col">
        <h2 className="text-2xl font-black text-slate-900 mb-6 flex items-center gap-3">
          <MessageSquare className="text-blue-600" /> Compose Message
        </h2>

        <div className="flex-1 flex flex-col">
          <textarea
            value={message}
            onChange={(e) => updateConfig('message', e.target.value)}
            placeholder="Hi [Driver Name], are you still interested in driving for us?"
            className="flex-1 w-full resize-none p-6 bg-slate-50 border border-slate-100 rounded-2xl text-lg font-medium outline-none focus:ring-4 focus:ring-blue-50 transition-all placeholder:text-slate-300"
          />

          <div className="mt-4 flex items-center justify-between">
            <div className="flex gap-2">
              <button className="p-2 text-slate-400 hover:text-blue-600 transition-colors bg-slate-50 rounded-lg">
                <Image size={20} />
              </button>
              <button className="p-2 text-slate-400 hover:text-blue-600 transition-colors bg-slate-50 rounded-lg">
                <Paperclip size={20} />
              </button>
            </div>

            <div className="flex items-center gap-4">
               <span className={`text-xs font-bold uppercase tracking-widest ${message.length > 160 ? 'text-amber-500' : 'text-slate-400'}`}>
                 {message.length} chars / {segments} segment{segments !== 1 && 's'}
               </span>
            </div>
          </div>
        </div>

        <div className="mt-6 pt-6 border-t border-slate-100">
          <label className="text-xs font-bold text-slate-400 uppercase tracking-widest mb-3 block">Variables</label>
          <div className="flex flex-wrap gap-2">
            {['[Driver Name]', '[Company Name]', '[Recruiter Name]'].map(tag => (
              <button
                key={tag}
                onClick={() => updateConfig('message', message + ' ' + tag)}
                className="px-3 py-1.5 bg-blue-50 text-blue-600 rounded-full text-xs font-bold hover:bg-blue-100 transition-colors"
              >
                {tag}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Preview */}
      <div className="w-[350px] hidden lg:block shrink-0">
        <DeviceMockup type="iphone">
          <div className="p-4 space-y-4 pt-10">
            <div className="flex justify-center text-xs text-slate-400 font-medium mb-4">Today 9:41 AM</div>

            {/* Incoming Bubble */}
            <div className="max-w-[85%] bg-slate-200 rounded-2xl rounded-bl-none p-3 text-sm text-slate-900 leading-snug">
               Hey, I saw your ad. Is the position still open?
            </div>

            {/* Outgoing Bubble (Preview) */}
            <div className="max-w-[85%] ml-auto bg-blue-500 rounded-2xl rounded-br-none p-3 text-sm text-white leading-snug break-words shadow-sm">
              {message || <span className="opacity-50 italic">Type to preview...</span>}
            </div>
          </div>
        </DeviceMockup>
      </div>

    </div>
  );
}
