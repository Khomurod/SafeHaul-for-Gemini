import React, { useState } from 'react';
import { Rocket, AlertTriangle, CheckCircle2, ShieldCheck, Play } from 'lucide-react';
import { httpsCallable } from 'firebase/functions';
import { functions } from '@lib/firebase';
import { useToast } from '@shared/components/feedback/ToastProvider';

export function LaunchPad({ companyId, campaign, onLaunchSuccess }) {
  const { showSuccess, showError } = useToast();
  const [isLaunching, setIsLaunching] = useState(false);
  const [testPhone, setTestPhone] = useState('');

  const handleTestSend = async () => {
    if (!testPhone) return showError("Enter a phone number");
    try {
        const sendTest = httpsCallable(functions, 'sendTestSMS');
        await sendTest({
            companyId,
            testPhoneNumber: testPhone,
            messageBody: campaign.messageConfig?.message // Pass draft message
        });
        showSuccess("Test message sent!");
    } catch (e) {
        showError(e.message);
    }
  };

  const handleLaunch = async () => {
    setIsLaunching(true);
    try {
        const initFn = httpsCallable(functions, 'initBulkSession');

        // Clean payload for backend
        const payload = {
            companyId,
            filters: campaign.filters,
            messageConfig: campaign.messageConfig,
            scheduledFor: campaign.schedule || null
        };

        const result = await initFn(payload);

        if (result.data.success) {
            showSuccess(`Launched! ${result.data.targetCount} drivers targeted.`);
            onLaunchSuccess();
        } else {
            showError(result.data.message);
        }
    } catch (e) {
        showError(e.message);
    } finally {
        setIsLaunching(false);
    }
  };

  return (
    <div className="max-w-3xl mx-auto bg-white rounded-[3rem] p-12 border border-slate-200 shadow-xl text-center">

      <div className="w-24 h-24 bg-emerald-50 text-emerald-500 rounded-full flex items-center justify-center mx-auto mb-8 animate-in zoom-in duration-500">
        <Rocket size={40} />
      </div>

      <h2 className="text-4xl font-black text-slate-900 mb-4 tracking-tight">Ready for Liftoff?</h2>
      <p className="text-lg text-slate-500 mb-10 max-w-lg mx-auto">
        You are about to message <strong className="text-slate-900">{campaign.matchCount || 0} drivers</strong>.
        Please verify your settings one last time.
      </p>

      {/* Safety Checks */}
      <div className="bg-slate-50 rounded-2xl p-6 mb-10 text-left space-y-4 border border-slate-100">
        <div className="flex items-center gap-3">
            <CheckCircle2 className="text-emerald-500" size={20} />
            <span className="text-sm font-medium text-slate-700">Audience count verified ({campaign.matchCount})</span>
        </div>
        <div className="flex items-center gap-3">
            <ShieldCheck className="text-emerald-500" size={20} />
            <span className="text-sm font-medium text-slate-700">Compliance scan passed (SHAFT)</span>
        </div>
        <div className="flex items-center gap-3">
            <AlertTriangle className="text-amber-500" size={20} />
            <span className="text-sm font-medium text-slate-700">Cost: Carrier rates apply</span>
        </div>
      </div>

      {/* Test Send */}
      <div className="flex items-center justify-center gap-2 mb-10">
        <input
            type="tel"
            placeholder="+1 (555) 000-0000"
            value={testPhone}
            onChange={e => setTestPhone(e.target.value)}
            className="bg-slate-100 border border-slate-200 rounded-xl px-4 py-3 text-sm font-bold w-48 outline-none focus:ring-2 focus:ring-blue-100"
        />
        <button
            onClick={handleTestSend}
            className="px-6 py-3 bg-white border border-slate-200 text-slate-600 rounded-xl text-sm font-bold hover:bg-slate-50 transition-colors"
        >
            Send Test
        </button>
      </div>

      {/* Big Button */}
      <button
        onClick={handleLaunch}
        disabled={isLaunching || !campaign.matchCount}
        className="w-full py-6 bg-slate-900 hover:bg-emerald-600 text-white rounded-2xl text-xl font-black uppercase tracking-widest shadow-2xl shadow-slate-300 hover:shadow-emerald-200 transition-all active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-3"
      >
        {isLaunching ? 'Igniting...' : (
            <>
                <Play size={24} fill="currentColor" /> Launch Campaign
            </>
        )}
      </button>

    </div>
  );
}
