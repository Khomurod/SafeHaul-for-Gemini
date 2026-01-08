import React, { useState } from 'react';
import { httpsCallable } from 'firebase/functions';
import { functions } from '@lib/firebase';
import { useToast } from '@shared/components/feedback/ToastProvider';
import { Lock, Save, Send, Database, Key, Phone, Server } from 'lucide-react';

export function IntegrationManager({ companyId }) {
    const { showSuccess, showError } = useToast();
    const [provider, setProvider] = useState('ringcentral');
    
    // Default config state
    const [config, setConfig] = useState({
        isSandbox: true // Default to true for safety
    });
    
    const [testPhone, setTestPhone] = useState('');
    const [isLoading, setIsLoading] = useState(false);
    const [isTesting, setIsTesting] = useState(false);

    const updateConfig = (key, val) => setConfig(prev => ({ ...prev, [key]: val }));

    const handleSave = async (e) => {
        e.preventDefault();
        setIsLoading(true);

        // Prepare payload with correct server URL for RingCentral
        const payloadConfig = { ...config };
        if (provider === 'ringcentral') {
            payloadConfig.serverUrl = config.isSandbox 
                ? 'https://platform.devtest.ringcentral.com' 
                : 'https://platform.ringcentral.com';
        }

        try {
            const saveFn = httpsCallable(functions, 'saveIntegrationConfig');
            await saveFn({ companyId, provider, config: payloadConfig });
            showSuccess("Integration saved successfully (Encrypted).");
        } catch (error) {
            console.error(error);
            showError(`Save Failed: ${error.message}`);
        } finally {
            setIsLoading(false);
        }
    };

    const handleTest = async () => {
        if (!testPhone) return showError("Enter a phone number to test.");
        setIsTesting(true);
        try {
            const testFn = httpsCallable(functions, 'sendTestSMS');
            const result = await testFn({ companyId, testPhoneNumber: testPhone });
            if (result.data.success) {
                showSuccess("Test Message Sent!");
            } else {
                showError("Test Failed: " + result.data.message);
            }
        } catch (error) {
            console.error(error);
            showError(`Test Failed: ${error.message}`);
        } finally {
            setIsTesting(false);
        }
    };

    return (
        <div className="bg-white border border-gray-200 rounded-xl shadow-sm p-6">
            <h2 className="text-xl font-bold text-gray-900 mb-4 flex items-center gap-2">
                <Database className="text-blue-600" size={24} /> SMS Integration
            </h2>

            <form onSubmit={handleSave} className="space-y-6">

                {/* Provider Selector */}
                <div>
                    <label className="block text-sm font-semibold text-gray-700 mb-2">Select Provider</label>
                    <div className="flex gap-4">
                        <button
                            type="button"
                            onClick={() => setProvider('ringcentral')}
                            className={`flex-1 py-3 px-4 rounded-lg border font-medium transition-all ${provider === 'ringcentral'
                                    ? 'bg-blue-50 border-blue-500 text-blue-700 ring-1 ring-blue-500'
                                    : 'bg-white border-gray-300 text-gray-600 hover:bg-gray-50'
                                }`}
                        >
                            RingCentral
                        </button>
                        <button
                            type="button"
                            onClick={() => setProvider('8x8')}
                            className={`flex-1 py-3 px-4 rounded-lg border font-medium transition-all ${provider === '8x8'
                                    ? 'bg-orange-50 border-orange-500 text-orange-700 ring-1 ring-orange-500'
                                    : 'bg-white border-gray-300 text-gray-600 hover:bg-gray-50'
                                }`}
                        >
                            8x8
                        </button>
                    </div>
                </div>

                {/* Dynamic Fields */}
                <div className="bg-gray-50 p-5 rounded-lg border border-gray-200 space-y-4">
                    {provider === 'ringcentral' && (
                        <>
                            <div className="flex items-center gap-2 mb-2 p-2 bg-yellow-50 border border-yellow-200 rounded text-xs text-yellow-800">
                                <Server size={14} />
                                <label className="font-bold flex items-center gap-2 cursor-pointer select-none">
                                    <input 
                                        type="checkbox" 
                                        checked={config.isSandbox || false} 
                                        onChange={(e) => updateConfig('isSandbox', e.target.checked)}
                                        className="rounded text-blue-600 focus:ring-blue-500"
                                    />
                                    Use Sandbox Environment (DevTest)
                                </label>
                            </div>

                            <div>
                                <label className="block text-xs font-bold text-gray-500 uppercase mb-1">Sender Phone Number</label>
                                <div className="relative">
                                    <input
                                        type="text"
                                        className="w-full p-2 pl-10 border border-gray-300 rounded focus:ring-2 focus:ring-blue-500 outline-none"
                                        value={config.phoneNumber || ''}
                                        onChange={e => updateConfig('phoneNumber', e.target.value)}
                                        placeholder="+1 (555) 123-4567"
                                        required
                                    />
                                    <Phone size={16} className="absolute left-3 top-2.5 text-gray-400" />
                                </div>
                                <p className="text-[10px] text-gray-400 mt-1">Must match the number in your RingCentral Developer Console.</p>
                            </div>

                            <div>
                                <label className="block text-xs font-bold text-gray-500 uppercase mb-1">Client ID</label>
                                <input
                                    type="text"
                                    className="w-full p-2 border border-gray-300 rounded focus:ring-2 focus:ring-blue-500 outline-none"
                                    value={config.clientId || ''}
                                    onChange={e => updateConfig('clientId', e.target.value)}
                                    placeholder="Enter Client ID"
                                    required
                                />
                            </div>
                            <div>
                                <label className="block text-xs font-bold text-gray-500 uppercase mb-1">Client Secret</label>
                                <div className="relative">
                                    <input
                                        type="password"
                                        className="w-full p-2 pl-10 border border-gray-300 rounded focus:ring-2 focus:ring-blue-500 outline-none"
                                        value={config.clientSecret || ''}
                                        onChange={e => updateConfig('clientSecret', e.target.value)}
                                        placeholder="••••••••••••••••"
                                        required
                                    />
                                    <Lock size={16} className="absolute left-3 top-2.5 text-gray-400" />
                                </div>
                            </div>
                            <div>
                                <label className="block text-xs font-bold text-gray-500 uppercase mb-1">JWT Token</label>
                                <div className="relative">
                                    <input
                                        type="password"
                                        className="w-full p-2 pl-10 border border-gray-300 rounded focus:ring-2 focus:ring-blue-500 outline-none font-mono text-sm"
                                        value={config.jwt || ''}
                                        onChange={e => updateConfig('jwt', e.target.value)}
                                        placeholder="eyM..."
                                        required
                                    />
                                    <Key size={16} className="absolute left-3 top-2.5 text-gray-400" />
                                </div>
                            </div>
                        </>
                    )}

                    {provider === '8x8' && (
                        <>
                            <div>
                                <label className="block text-xs font-bold text-gray-500 uppercase mb-1">SubAccount ID</label>
                                <input
                                    type="text"
                                    className="w-full p-2 border border-gray-300 rounded focus:ring-2 focus:ring-blue-500 outline-none"
                                    value={config.subAccountId || ''}
                                    onChange={e => updateConfig('subAccountId', e.target.value)}
                                    placeholder="Enter SubAccount ID"
                                    required
                                />
                            </div>
                            <div>
                                <label className="block text-xs font-bold text-gray-500 uppercase mb-1">API Key</label>
                                <div className="relative">
                                    <input
                                        type="password"
                                        className="w-full p-2 pl-10 border border-gray-300 rounded focus:ring-2 focus:ring-blue-500 outline-none"
                                        value={config.apiKey || ''}
                                        onChange={e => updateConfig('apiKey', e.target.value)}
                                        placeholder="••••••••••••••••"
                                        required
                                    />
                                    <Key size={16} className="absolute left-3 top-2.5 text-gray-400" />
                                </div>
                            </div>
                        </>
                    )}
                </div>

                {/* Actions */}
                <div className="flex items-center justify-between pt-4 border-t border-gray-100">
                    <div className="flex items-center gap-2">
                        <input
                            type="tel"
                            placeholder="+1 (555) 000-0000"
                            className="p-2 border border-gray-300 rounded w-40 text-sm"
                            value={testPhone}
                            onChange={e => setTestPhone(e.target.value)}
                        />
                        <button
                            type="button"
                            onClick={handleTest}
                            disabled={isTesting || !testPhone}
                            className="px-3 py-2 bg-gray-100 text-gray-700 font-bold rounded hover:bg-gray-200 disabled:opacity-50 flex items-center gap-2 text-sm"
                        >
                            {isTesting ? 'Sending...' : <><Send size={14} /> Test</>}
                        </button>
                    </div>

                    <button
                        type="submit"
                        disabled={isLoading}
                        className="px-6 py-2 bg-green-600 text-white font-bold rounded hover:bg-green-700 disabled:opacity-50 flex items-center gap-2 shadow-sm"
                    >
                        {isLoading ? 'Saving...' : <><Save size={18} /> Secure Save</>}
                    </button>
                </div>

            </form>
        </div>
    );
}