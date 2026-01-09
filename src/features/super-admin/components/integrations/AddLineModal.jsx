import React, { useState } from 'react';
import { X, Key, Phone, Tag, Loader2, CheckCircle } from 'lucide-react';
import { httpsCallable } from 'firebase/functions';
import { functions } from '@lib/firebase';
import { useToast } from '@shared/components/feedback/ToastProvider';

/**
 * Modal for Super Admins to add a new phone line to the Digital Wallet
 * Collects phone number, label, and JWT, then verifies and provisions the line
 */
export function AddLineModal({ companyId, onClose, onSuccess, sharedCredentials }) {
    const { showSuccess, showError } = useToast();
    const [isSubmitting, setIsSubmitting] = useState(false);

    // Form state
    const [phoneNumber, setPhoneNumber] = useState('');
    const [label, setLabel] = useState('');
    const [jwt, setJwt] = useState('');

    // Shared credentials (only shown if not already configured)
    const [clientId, setClientId] = useState(sharedCredentials?.clientId || '');
    const [clientSecret, setClientSecret] = useState(sharedCredentials?.clientSecret || '');
    const [isSandbox, setIsSandbox] = useState(sharedCredentials?.isSandbox ?? true);

    const needsCredentials = !sharedCredentials?.hasCredentials;

    const handleSubmit = async (e) => {
        e.preventDefault();

        if (!phoneNumber.trim()) {
            showError("Phone number is required.");
            return;
        }
        if (!jwt.trim()) {
            showError("JWT token is required for this line.");
            return;
        }
        if (needsCredentials && (!clientId.trim() || !clientSecret.trim())) {
            showError("Client ID and Client Secret are required for initial setup.");
            return;
        }

        setIsSubmitting(true);
        try {
            const addLineFn = httpsCallable(functions, 'addPhoneLine');
            const result = await addLineFn({
                companyId,
                phoneNumber: phoneNumber.trim(),
                label: label.trim() || phoneNumber.trim(),
                jwt: jwt.trim(),
                ...(needsCredentials && {
                    clientId: clientId.trim(),
                    clientSecret: clientSecret.trim(),
                    isSandbox
                })
            });

            if (result.data.success) {
                showSuccess(result.data.message || `Line ${result.data.phoneNumber} added successfully.`);
                if (result.data.verification?.identity) {
                    showSuccess(`Verified: ${result.data.verification.identity}`);
                }
                onSuccess?.();
                onClose();
            }
        } catch (error) {
            console.error('Add Line Error:', error);
            showError(error.message || 'Failed to add phone line.');
        } finally {
            setIsSubmitting(false);
        }
    };

    return (
        <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-4 animate-in fade-in">
            <div className="bg-white rounded-xl shadow-2xl max-w-lg w-full overflow-hidden max-h-[90vh] overflow-y-auto">
                {/* Header */}
                <div className="bg-gradient-to-r from-blue-600 to-indigo-600 px-6 py-4 flex justify-between items-center">
                    <h3 className="font-bold text-white flex items-center gap-2">
                        <Phone size={18} />
                        Add Phone Line
                    </h3>
                    <button
                        onClick={onClose}
                        className="text-white/80 hover:text-white transition-colors"
                    >
                        <X size={20} />
                    </button>
                </div>

                {/* Body */}
                <form onSubmit={handleSubmit} className="p-6 space-y-5">
                    {/* Phone Number */}
                    <div>
                        <label className="block text-xs font-bold text-gray-500 uppercase mb-1.5">
                            Phone Number *
                        </label>
                        <div className="relative">
                            <input
                                type="tel"
                                placeholder="+1 (555) 123-4567"
                                className="w-full p-2.5 pl-10 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 outline-none"
                                value={phoneNumber}
                                onChange={(e) => setPhoneNumber(e.target.value)}
                                required
                            />
                            <Phone size={16} className="absolute left-3 top-3 text-gray-400" />
                        </div>
                        <p className="text-[10px] text-gray-400 mt-1">
                            E.164 format preferred (e.g., +15551234567)
                        </p>
                    </div>

                    {/* Label */}
                    <div>
                        <label className="block text-xs font-bold text-gray-500 uppercase mb-1.5">
                            Label (Optional)
                        </label>
                        <div className="relative">
                            <input
                                type="text"
                                placeholder="Recruitment Hotline"
                                className="w-full p-2.5 pl-10 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 outline-none"
                                value={label}
                                onChange={(e) => setLabel(e.target.value)}
                            />
                            <Tag size={16} className="absolute left-3 top-3 text-gray-400" />
                        </div>
                    </div>

                    {/* JWT Token */}
                    <div>
                        <label className="block text-xs font-bold text-gray-500 uppercase mb-1.5">
                            JWT Token for This Line *
                        </label>
                        <div className="relative">
                            <textarea
                                placeholder="eyJ0..."
                                className="w-full p-2.5 pl-10 border border-gray-300 rounded-lg text-sm font-mono focus:ring-2 focus:ring-blue-500 outline-none resize-none"
                                rows={3}
                                value={jwt}
                                onChange={(e) => setJwt(e.target.value)}
                                required
                            />
                            <Key size={16} className="absolute left-3 top-3 text-gray-400" />
                        </div>
                        <p className="text-[10px] text-gray-400 mt-1">
                            Generate this in RingCentral Developer Portal for the user who owns this number.
                        </p>
                    </div>

                    {/* Shared Credentials (only if not yet configured) */}
                    {needsCredentials && (
                        <div className="border-t border-gray-200 pt-5 mt-5 space-y-4">
                            <div className="flex items-center gap-2 text-xs text-orange-600 bg-orange-50 p-2 rounded-lg">
                                <CheckCircle size={14} />
                                <span className="font-medium">First-time setup: Enter shared app credentials</span>
                            </div>

                            <div>
                                <label className="block text-xs font-bold text-gray-500 uppercase mb-1.5">
                                    Client ID *
                                </label>
                                <input
                                    type="text"
                                    placeholder="Enter RingCentral Client ID"
                                    className="w-full p-2.5 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 outline-none"
                                    value={clientId}
                                    onChange={(e) => setClientId(e.target.value)}
                                    required
                                />
                            </div>

                            <div>
                                <label className="block text-xs font-bold text-gray-500 uppercase mb-1.5">
                                    Client Secret *
                                </label>
                                <input
                                    type="password"
                                    placeholder="••••••••••••"
                                    className="w-full p-2.5 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 outline-none"
                                    value={clientSecret}
                                    onChange={(e) => setClientSecret(e.target.value)}
                                    required
                                />
                            </div>

                            <label className="flex items-center gap-2 text-sm text-gray-600 cursor-pointer">
                                <input
                                    type="checkbox"
                                    checked={isSandbox}
                                    onChange={(e) => setIsSandbox(e.target.checked)}
                                    className="rounded text-blue-600 focus:ring-blue-500"
                                />
                                Use Sandbox Environment (for testing)
                            </label>
                        </div>
                    )}

                    {/* Submit */}
                    <div className="pt-3">
                        <button
                            type="submit"
                            disabled={isSubmitting}
                            className="w-full py-3 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white font-bold rounded-lg flex items-center justify-center gap-2 transition-all disabled:opacity-70 shadow-md"
                        >
                            {isSubmitting ? (
                                <>
                                    <Loader2 size={18} className="animate-spin" />
                                    Verifying & Adding...
                                </>
                            ) : (
                                <>
                                    <CheckCircle size={18} />
                                    Verify & Add Line
                                </>
                            )}
                        </button>
                        <p className="text-[10px] text-gray-400 mt-2 text-center">
                            JWT will be verified before the line is provisioned
                        </p>
                    </div>
                </form>
            </div>
        </div>
    );
}
