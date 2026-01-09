import React, { useState, useEffect } from 'react';
import { doc, onSnapshot, updateDoc, collection, getDocs, query, where, documentId } from 'firebase/firestore';
import { db, functions } from '@lib/firebase';
import { httpsCallable } from 'firebase/functions';
import { Phone, Users as UsersIcon, Check, AlertCircle, Save, RefreshCw, Settings, Plus, MessageSquare } from 'lucide-react';
import { useToast } from '@shared/components/feedback/ToastProvider';
import { SMSConfigModal } from './SMSConfigModal';

export function NumberAssignmentManager({ companyId }) {
    const { showSuccess, showError } = useToast();

    // SECURITY FIX: Store only safe fields (no encrypted config)
    const [provider, setProvider] = useState(null);
    const [isActive, setIsActive] = useState(false);
    const [inventory, setInventory] = useState([]);
    const [users, setUsers] = useState([]);
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);

    // Modal states
    const [showConfigModal, setShowConfigModal] = useState(false);
    const [showAddNumberModal, setShowAddNumberModal] = useState(false);
    const [newPhoneNumber, setNewPhoneNumber] = useState('');
    const [addingNumber, setAddingNumber] = useState(false);

    // Local state for edits before save
    const [assignments, setAssignments] = useState({});
    const [defaultNumber, setDefaultNumber] = useState('');

    useEffect(() => {
        if (!companyId) return;

        // 1. Listen to Integration Doc - SECURITY: Filter out config field
        const unsub = onSnapshot(doc(db, 'companies', companyId, 'integrations', 'sms_provider'), (snap) => {
            if (snap.exists()) {
                const data = snap.data();
                // Only store safe, non-credential fields
                setProvider(data.provider || null);
                setIsActive(data.isActive || false);
                setInventory(data.inventory || []);
                setAssignments(data.assignments || {});
                setDefaultNumber(data.defaultPhoneNumber || '');
                // NOTE: We intentionally do NOT store data.config (encrypted credentials)
            } else {
                setProvider(null);
                setIsActive(false);
                setInventory([]);
            }
            setLoading(false);
        });

        // 2. Fetch Users (Recruiters/Admins)
        const fetchUsers = async () => {
            try {
                const q = query(collection(db, 'memberships'), where('companyId', '==', companyId));
                const memberSnap = await getDocs(q);

                const membershipMap = {};
                const memberUserIds = [];

                memberSnap.docs.forEach(d => {
                    const data = d.data();
                    if (data.userId) {
                        memberUserIds.push(data.userId);
                        membershipMap[data.userId] = data.role;
                    }
                });

                if (memberUserIds.length === 0) {
                    setUsers([]);
                    return;
                }

                const batchSize = 30;
                const fetchedUsers = [];

                for (let i = 0; i < memberUserIds.length; i += batchSize) {
                    const batchIds = memberUserIds.slice(i, i + batchSize);
                    const userQ = query(
                        collection(db, 'users'),
                        where(documentId(), 'in', batchIds)
                    );
                    const userSnap = await getDocs(userQ);
                    userSnap.docs.forEach(d => {
                        fetchedUsers.push({
                            id: d.id,
                            ...d.data(),
                            role: membershipMap[d.id]
                        });
                    });
                }

                setUsers(fetchedUsers);
            } catch (e) {
                console.error("Error fetching users for assignment", e);
            }
        };

        fetchUsers();

        return () => unsub();
    }, [companyId]);

    const handleSave = async () => {
        setSaving(true);
        try {
            const docRef = doc(db, 'companies', companyId, 'integrations', 'sms_provider');

            await updateDoc(docRef, {
                assignments: assignments,
                defaultPhoneNumber: defaultNumber,
                updatedAt: new Date()
            });

            showSuccess("Assignments updated successfully.");
        } catch (error) {
            console.error(error);
            showError("Failed to save assignments.");
        } finally {
            setSaving(false);
        }
    };

    const handleAddManualNumber = async () => {
        if (!newPhoneNumber.trim()) {
            showError("Please enter a phone number.");
            return;
        }

        setAddingNumber(true);
        try {
            const addNumber = httpsCallable(functions, 'addManualPhoneNumber');
            await addNumber({ companyId, phoneNumber: newPhoneNumber.trim() });
            showSuccess("Phone number added to inventory.");
            setNewPhoneNumber('');
            setShowAddNumberModal(false);
        } catch (error) {
            console.error(error);
            showError(error.message || "Failed to add phone number.");
        } finally {
            setAddingNumber(false);
        }
    };

    // 8x8-specific labels
    const is8x8 = provider === '8x8';
    const numberLabel = is8x8 ? 'Sender Identity' : 'Phone Number';
    const dropdownLabel = is8x8 ? 'Assigned Sender ID' : 'Assigned Number';

    if (loading) return <div className="p-8 text-center text-gray-400 text-sm">Loading SMS settings...</div>;

    // NOT CONFIGURED STATE - Show "Configure SMS" button (BYOC Flow)
    if (!isActive) {
        return (
            <div className="space-y-6 max-w-4xl animate-in fade-in">
                <div className="border-b border-gray-200 pb-4 mb-6">
                    <h2 className="text-xl font-bold text-gray-900 flex items-center gap-2">
                        <MessageSquare className="text-blue-600" size={24} /> SMS Settings
                    </h2>
                    <p className="text-sm text-gray-500 mt-1">Configure your SMS provider to send messages to drivers and leads.</p>
                </div>

                <div className="bg-gradient-to-br from-blue-50 to-indigo-50 p-8 rounded-2xl border border-blue-100 text-center">
                    <div className="w-16 h-16 bg-white rounded-2xl shadow-sm flex items-center justify-center mx-auto mb-4">
                        <Phone className="text-blue-500" size={32} />
                    </div>
                    <h3 className="text-xl font-bold text-gray-900 mb-2">SMS Not Configured</h3>
                    <p className="text-gray-600 text-sm max-w-md mx-auto mb-6">
                        Connect your RingCentral or 8x8 account to enable SMS messaging for driver outreach and reactivation campaigns.
                    </p>
                    <button
                        onClick={() => setShowConfigModal(true)}
                        className="inline-flex items-center gap-2 px-6 py-3 bg-blue-600 text-white font-semibold rounded-xl hover:bg-blue-700 transition-colors shadow-lg shadow-blue-500/25"
                    >
                        <Settings size={20} />
                        Configure SMS Provider
                    </button>
                </div>

                {showConfigModal && (
                    <SMSConfigModal
                        companyId={companyId}
                        onClose={() => setShowConfigModal(false)}
                        onSuccess={() => setShowConfigModal(false)}
                    />
                )}
            </div>
        );
    }

    // EMPTY INVENTORY STATE - Show add number option (especially for 8x8)
    if (inventory.length === 0) {
        return (
            <div className="space-y-6 max-w-4xl animate-in fade-in">
                <div className="border-b border-gray-200 pb-4 mb-6">
                    <h2 className="text-xl font-bold text-gray-900 flex items-center gap-2">
                        <MessageSquare className="text-blue-600" size={24} /> SMS Settings
                    </h2>
                    <p className="text-sm text-gray-500 mt-1">
                        Provider: <span className="font-medium text-gray-700">{provider === '8x8' ? '8x8' : 'RingCentral'}</span>
                        <span className="ml-2 px-2 py-0.5 bg-green-100 text-green-700 text-xs rounded-full">Connected</span>
                    </p>
                </div>

                <div className="bg-amber-50 p-8 rounded-2xl border border-amber-200 text-center">
                    <Phone className="mx-auto text-amber-500 mb-4" size={40} />
                    <h3 className="text-lg font-bold text-gray-900 mb-2">No {numberLabel}s Found</h3>
                    <p className="text-gray-600 text-sm mb-6 max-w-md mx-auto">
                        {is8x8
                            ? "8x8 uses Sender IDs instead of phone numbers. Add your sender identities below to start sending messages."
                            : "We couldn't find any phone numbers connected to your provider. You can add numbers manually."
                        }
                    </p>
                    <button
                        onClick={() => setShowAddNumberModal(true)}
                        className="inline-flex items-center gap-2 px-5 py-2.5 bg-amber-600 text-white font-semibold rounded-lg hover:bg-amber-700 transition-colors"
                    >
                        <Plus size={18} />
                        Add {numberLabel} Manually
                    </button>
                </div>

                {/* Add Number Modal */}
                {showAddNumberModal && (
                    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
                        <div className="bg-white rounded-xl shadow-xl max-w-md w-full p-6">
                            <h3 className="text-lg font-bold text-gray-900 mb-4">Add {numberLabel}</h3>
                            <input
                                type="text"
                                value={newPhoneNumber}
                                onChange={(e) => setNewPhoneNumber(e.target.value)}
                                placeholder={is8x8 ? "MySenderID" : "+1 555 123 4567"}
                                className="w-full px-4 py-3 border border-gray-200 rounded-lg mb-4 outline-none focus:ring-2 focus:ring-blue-500"
                            />
                            <div className="flex gap-3 justify-end">
                                <button
                                    onClick={() => setShowAddNumberModal(false)}
                                    className="px-4 py-2 text-gray-600 hover:bg-gray-100 rounded-lg"
                                >
                                    Cancel
                                </button>
                                <button
                                    onClick={handleAddManualNumber}
                                    disabled={addingNumber}
                                    className="px-4 py-2 bg-blue-600 text-white rounded-lg font-medium disabled:opacity-50 flex items-center gap-2"
                                >
                                    {addingNumber && <RefreshCw size={16} className="animate-spin" />}
                                    Add {numberLabel}
                                </button>
                            </div>
                        </div>
                    </div>
                )}
            </div>
        );
    }

    // MAIN VIEW - Number Assignment UI
    return (
        <div className="space-y-6 max-w-5xl animate-in fade-in">
            <div className="flex items-center justify-between border-b border-gray-200 pb-4">
                <div>
                    <h2 className="text-xl font-bold text-gray-900 flex items-center gap-2">
                        <Phone className="text-blue-600" size={24} /> {is8x8 ? 'Sender Identity' : 'Number'} Assignments
                    </h2>
                    <p className="text-sm text-gray-500 mt-1">
                        {inventory.length} {is8x8 ? 'sender identities' : 'numbers'} available
                        <span className="mx-2">•</span>
                        <span className="text-gray-700 font-medium">{provider === '8x8' ? '8x8' : 'RingCentral'}</span>
                    </p>
                </div>
                <div className="flex items-center gap-3">
                    <button
                        onClick={() => setShowAddNumberModal(true)}
                        className="px-3 py-2 text-gray-600 border border-gray-200 rounded-lg hover:bg-gray-50 flex items-center gap-2 text-sm"
                    >
                        <Plus size={16} />
                        Add {is8x8 ? 'Sender ID' : 'Number'}
                    </button>
                    <button
                        onClick={handleSave}
                        disabled={saving}
                        className="bg-blue-600 text-white px-4 py-2 rounded-lg font-bold hover:bg-blue-700 transition-colors flex items-center gap-2 shadow-sm disabled:opacity-50"
                    >
                        {saving ? <RefreshCw className="animate-spin" size={18} /> : <Save size={18} />}
                        Save Changes
                    </button>
                </div>
            </div>

            {/* Default Number Section */}
            <div className="bg-white p-6 rounded-xl border border-gray-200 shadow-sm">
                <h3 className="font-bold text-gray-800 mb-4 flex items-center gap-2">
                    <Check className="text-green-500" size={18} /> Company Default {is8x8 ? 'Sender' : 'Line'}
                </h3>
                <p className="text-xs text-gray-500 mb-4">
                    This {is8x8 ? 'sender identity' : 'number'} will be used for automated system messages and for users without a personal assignment.
                </p>
                <div className="max-w-md">
                    <select
                        value={defaultNumber}
                        onChange={(e) => setDefaultNumber(e.target.value)}
                        className="w-full p-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none font-mono"
                    >
                        <option value="">-- Select Default {is8x8 ? 'Sender' : 'Number'} --</option>
                        {inventory.map(num => (
                            <option key={num.phoneNumber} value={num.phoneNumber}>
                                {num.phoneNumber} ({num.usageType || (is8x8 ? 'Sender' : 'Line')})
                            </option>
                        ))}
                    </select>
                </div>
            </div>

            {/* Assignment Matrix */}
            <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
                <div className="p-6 border-b border-gray-100">
                    <h3 className="font-bold text-gray-800 flex items-center gap-2">
                        <UsersIcon className="text-purple-500" size={18} /> Recruiter Assignments
                    </h3>
                    <p className="text-xs text-gray-500 mt-1">
                        Assign dedicated {is8x8 ? 'sender identities' : 'phone lines'} to your team members.
                    </p>
                </div>

                <table className="w-full text-left border-collapse">
                    <thead className="bg-gray-50 text-xs font-bold text-gray-500 uppercase">
                        <tr>
                            <th className="px-6 py-3 border-b border-gray-100">Team Member</th>
                            <th className="px-6 py-3 border-b border-gray-100">Role</th>
                            <th className="px-6 py-3 border-b border-gray-100">{dropdownLabel}</th>
                            <th className="px-6 py-3 border-b border-gray-100 w-10">Status</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-100">
                        {users.map(user => {
                            const currentPhone = assignments[user.id] || '';
                            const isAssigned = !!currentPhone;

                            return (
                                <tr key={user.id} className="hover:bg-gray-50 transition-colors">
                                    <td className="px-6 py-4 text-sm font-medium text-gray-900">
                                        {user.name || user.fullName || user.email}
                                        <div className="text-xs text-gray-400 font-normal">{user.email}</div>
                                    </td>
                                    <td className="px-6 py-4 text-xs text-gray-500 uppercase tracking-wider">
                                        {user.role?.replace('_', ' ')}
                                    </td>
                                    <td className="px-6 py-4">
                                        <select
                                            value={currentPhone}
                                            onChange={(e) => setAssignments(prev => ({ ...prev, [user.id]: e.target.value }))}
                                            className={`w-full p-2 border rounded text-sm outline-none transition-all ${isAssigned ? 'border-purple-200 bg-purple-50 text-purple-700 font-mono' : 'border-gray-200 text-gray-400'
                                                }`}
                                        >
                                            <option value="">No {is8x8 ? 'Sender ID' : 'Direct Line'}</option>
                                            {inventory.map(num => (
                                                <option key={num.phoneNumber} value={num.phoneNumber}>
                                                    {num.phoneNumber}
                                                </option>
                                            ))}
                                        </select>
                                    </td>
                                    <td className="px-6 py-4 text-center">
                                        {isAssigned ? (
                                            <div className="w-2 h-2 rounded-full bg-green-500 mx-auto" title="Active"></div>
                                        ) : (
                                            <div className="w-2 h-2 rounded-full bg-gray-200 mx-auto" title="No Assignment"></div>
                                        )}
                                    </td>
                                </tr>
                            );
                        })}
                    </tbody>
                </table>
                {users.length === 0 && (
                    <div className="p-8 text-center text-gray-400 text-sm">No team members found.</div>
                )}
            </div>

            {/* Add Number Modal */}
            {showAddNumberModal && (
                <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
                    <div className="bg-white rounded-xl shadow-xl max-w-md w-full p-6">
                        <h3 className="text-lg font-bold text-gray-900 mb-4">Add {numberLabel}</h3>
                        <input
                            type="text"
                            value={newPhoneNumber}
                            onChange={(e) => setNewPhoneNumber(e.target.value)}
                            placeholder={is8x8 ? "MySenderID" : "+1 555 123 4567"}
                            className="w-full px-4 py-3 border border-gray-200 rounded-lg mb-4 outline-none focus:ring-2 focus:ring-blue-500"
                        />
                        <div className="flex gap-3 justify-end">
                            <button
                                onClick={() => setShowAddNumberModal(false)}
                                className="px-4 py-2 text-gray-600 hover:bg-gray-100 rounded-lg"
                            >
                                Cancel
                            </button>
                            <button
                                onClick={handleAddManualNumber}
                                disabled={addingNumber}
                                className="px-4 py-2 bg-blue-600 text-white rounded-lg font-medium disabled:opacity-50 flex items-center gap-2"
                            >
                                {addingNumber && <RefreshCw size={16} className="animate-spin" />}
                                Add {numberLabel}
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* Reconfigure Modal */}
            {showConfigModal && (
                <SMSConfigModal
                    companyId={companyId}
                    onClose={() => setShowConfigModal(false)}
                    onSuccess={() => setShowConfigModal(false)}
                />
            )}
        </div>
    );
}
