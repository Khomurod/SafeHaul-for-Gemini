import React, { useState } from 'react';
import { X, Loader2, Phone, CheckCircle, AlertCircle, Shield } from 'lucide-react';
import { functions } from '@lib/firebase';
import { httpsCallable } from 'firebase/functions';
import { useToast } from '@shared/components/feedback/ToastProvider';

const PROVIDERS = [
    { id: 'ringcentral', name: 'RingCentral', description: 'Enterprise VoIP with SMS capabilities' },
    { id: '8x8', name: '8x8', description: 'Cloud communications platform' }
];

const PROVIDER_FIELDS = {
    ringcentral: [
        { key: 'clientId', label: 'Client ID', type: 'text', placeholder: 'Your RingCentral Client ID' },
        { key: 'clientSecret', label: 'Client Secret', type: 'password', placeholder: 'Your RingCentral Client Secret' },
        { key: 'jwt', label: 'JWT Token', type: 'password', placeholder: 'Your RingCentral JWT Token' }
    ],
    '8x8': [
        { key: 'subAccountId', label: 'SubAccount ID', type: 'text', placeholder: 'Your 8x8 SubAccount ID' },
        { key: 'apiKey', label: 'API Key', type: 'password', placeholder: 'Your 8x8 API Key' },
        { key: 'senderId', label: 'Sender ID (Optional)', type: 'text', placeholder: 'Custom Sender ID or leave blank' }
    ]
};

export function SMSConfigModal({ companyId, onClose, onSuccess }) {
    const { showSuccess, showError } = useToast();
    const [step, setStep] = useState(1); // 1 = select provider, 2 = enter credentials
    const [provider, setProvider] = useState('');
    const [config, setConfig] = useState({});
    const [saving, setSaving] = useState(false);
    const [testing, setTesting] = useState(false);
    const [testPhone, setTestPhone] = useState('');

    const handleProviderSelect = (providerId) => {
        setProvider(providerId);
        setConfig({});
        setStep(2);
    };

    const handleFieldChange = (key, value) => {
        setConfig(prev => ({ ...prev, [key]: value }));
    };

    const handleSave = async () => {
        if (!provider || !companyId) return;

        // Validate required fields
        const requiredFields = PROVIDER_FIELDS[provider].filter(f => !f.key.includes('Optional'));
        const missingFields = requiredFields.filter(f => !config[f.key]?.trim());
        
        if (missingFields.length > 0) {
            showError(`Missing required fields: ${missingFields.map(f => f.label).join(', ')}`);
            return;
        }

        setSaving(true);
        try {
            const saveConfig = httpsCallable(functions, 'saveIntegrationConfig');
            const result = await saveConfig({ companyId, provider, config });

            if (result.data?.warning) {
                showError(result.data.warning);
            } else {
                showSuccess(`SMS provider configured successfully! ${result.data?.inventoryCount || 0} phone numbers synced.`);
            }
            
            onSuccess?.();
            onClose();
        } catch (error) {
            console.error('Save config error:', error);
            showError(error.message || 'Failed to save configuration.');
        } finally {
            setSaving(false);
        }
    };

    const handleTestConnection = async () => {
        if (!testPhone.trim()) {
            showError('Please enter a test phone number.');
            return;
        }

        setTesting(true);
        try {
            const sendTest = httpsCallable(functions, 'sendTestSMS');
            await sendTest({ companyId, testPhoneNumber: testPhone });
            showSuccess('Test message sent successfully!');
        } catch (error) {
            console.error('Test SMS error:', error);
            showError(error.message || 'Failed to send test message.');
        } finally {
            setTesting(false);
        }
    };

    return (
        <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-4 animate-in fade-in">
            <div className="bg-white rounded-2xl shadow-2xl max-w-lg w-full max-h-[90vh] overflow-y-auto">
                {/* Header */}
                <div className="flex items-center justify-between p-6 border-b border-gray-100">
                    <div className="flex items-center gap-3">
                        <div className="w-10 h-10 bg-gradient-to-br from-blue-500 to-indigo-600 rounded-xl flex items-center justify-center">
                            <Phone className="text-white" size={20} />
                        </div>
                        <div>
                            <h2 className="text-lg font-bold text-gray-900">Configure SMS Provider</h2>
                            <p className="text-xs text-gray-500">Step {step} of 2</p>
                        </div>
                    </div>
                    <button onClick={onClose} className="p-2 hover:bg-gray-100 rounded-lg transition-colors">
                        <X size={20} className="text-gray-400" />
                    </button>
                </div>

                {/* Content */}
                <div className="p-6">
                    {step === 1 && (
                        <div className="space-y-4">
                            <p className="text-sm text-gray-600 mb-4">
                                Select your SMS provider to integrate with SafeHaul. Your credentials are encrypted and never shared.
                            </p>
                            
                            <div className="flex items-center gap-2 text-xs text-green-600 bg-green-50 p-3 rounded-lg mb-4">
                                <Shield size={14} />
                                <span>Credentials are encrypted using AES-256 before storage</span>
                            </div>

                            <div className="grid gap-3">
                                {PROVIDERS.map(p => (
                                    <button
                                        key={p.id}
                                        onClick={() => handleProviderSelect(p.id)}
                                        className="flex items-center gap-4 p-4 border border-gray-200 rounded-xl hover:border-blue-300 hover:bg-blue-50/50 transition-all text-left group"
                                    >
                                        <div className="w-12 h-12 bg-gray-100 rounded-lg flex items-center justify-center group-hover:bg-blue-100 transition-colors">
                                            <Phone size={24} className="text-gray-400 group-hover:text-blue-600" />
                                        </div>
                                        <div>
                                            <h3 className="font-semibold text-gray-900">{p.name}</h3>
                                            <p className="text-xs text-gray-500">{p.description}</p>
                                        </div>
                                    </button>
                                ))}
                            </div>
                        </div>
                    )}

                    {step === 2 && (
                        <div className="space-y-5">
                            <button 
                                onClick={() => setStep(1)} 
                                className="text-sm text-blue-600 hover:underline mb-2"
                            >
                                ← Back to provider selection
                            </button>

                            <div className="bg-gray-50 p-3 rounded-lg mb-4">
                                <p className="text-sm font-medium text-gray-700">
                                    Configuring: <span className="text-blue-600">{PROVIDERS.find(p => p.id === provider)?.name}</span>
                                </p>
                            </div>

                            {PROVIDER_FIELDS[provider]?.map(field => (
                                <div key={field.key}>
                                    <label className="block text-sm font-medium text-gray-700 mb-1.5">
                                        {field.label}
                                    </label>
                                    <input
                                        type={field.type}
                                        value={config[field.key] || ''}
                                        onChange={(e) => handleFieldChange(field.key, e.target.value)}
                                        placeholder={field.placeholder}
                                        className="w-full px-4 py-2.5 border border-gray-200 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-400 outline-none transition-all text-sm"
                                    />
                                </div>
                            ))}

                            <div className="border-t border-gray-100 pt-5 mt-6">
                                <h4 className="text-sm font-semibold text-gray-700 mb-3">Test Connection (Optional)</h4>
                                <div className="flex gap-2">
                                    <input
                                        type="tel"
                                        value={testPhone}
                                        onChange={(e) => setTestPhone(e.target.value)}
                                        placeholder="+1 555 123 4567"
                                        className="flex-1 px-4 py-2 border border-gray-200 rounded-lg text-sm outline-none focus:ring-2 focus:ring-green-500"
                                    />
                                    <button
                                        onClick={handleTestConnection}
                                        disabled={testing || saving}
                                        className="px-4 py-2 bg-green-600 text-white rounded-lg text-sm font-medium hover:bg-green-700 disabled:opacity-50 flex items-center gap-2"
                                    >
                                        {testing ? <Loader2 size={16} className="animate-spin" /> : <CheckCircle size={16} />}
                                        Test
                                    </button>
                                </div>
                                <p className="text-xs text-gray-400 mt-2">We'll send a test SMS to verify your credentials work.</p>
                            </div>
                        </div>
                    )}
                </div>

                {/* Footer */}
                {step === 2 && (
                    <div className="p-6 border-t border-gray-100 bg-gray-50 flex justify-end gap-3">
                        <button
                            onClick={onClose}
                            className="px-5 py-2.5 text-gray-600 font-medium rounded-lg hover:bg-gray-100 transition-colors"
                        >
                            Cancel
                        </button>
                        <button
                            onClick={handleSave}
                            disabled={saving}
                            className="px-5 py-2.5 bg-blue-600 text-white font-semibold rounded-lg hover:bg-blue-700 disabled:opacity-50 flex items-center gap-2 shadow-sm"
                        >
                            {saving ? <Loader2 size={18} className="animate-spin" /> : <CheckCircle size={18} />}
                            Save Configuration
                        </button>
                    </div>
                )}
            </div>
        </div>
    );
}
