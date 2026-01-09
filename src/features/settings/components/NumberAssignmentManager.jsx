import React, { useState, useEffect } from 'react';
import { useData } from '@/context/DataContext';
import { doc, onSnapshot, updateDoc, collection, getDocs, query, where, documentId } from 'firebase/firestore';
import { db } from '@lib/firebase';
import { Phone, Users as UsersIcon, Check, AlertCircle, Save, RefreshCw, Beaker } from 'lucide-react';
import { useToast } from '@shared/components/feedback/ToastProvider';
import { SMSDiagnosticModal } from './SMSDiagnosticModal';

export function NumberAssignmentManager({ companyId }) {
    const { showSuccess, showError } = useToast();
    const [configDoc, setConfigDoc] = useState(null);
    const [users, setUsers] = useState([]);
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);

    // Local state for edits before save
    const [assignments, setAssignments] = useState({});
    const [defaultNumber, setDefaultNumber] = useState('');
    const [showTestModal, setShowTestModal] = useState(false);

    useEffect(() => {
        if (!companyId) return;

        // 1. Listen to Integration Doc
        const unsub = onSnapshot(doc(db, 'companies', companyId, 'integrations', 'sms_provider'), (snap) => {
            if (snap.exists()) {
                const data = snap.data();
                setConfigDoc(data);
                setAssignments(data.assignments || {});
                setDefaultNumber(data.defaultPhoneNumber || data.config?.defaultPhoneNumber || '');
            } else {
                setConfigDoc(null);
            }
            setLoading(false);
        });

        // 2. Fetch Users (Recruiters/Admins)
        const fetchUsers = async () => {
            try {
                // Get memberships
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

                // Firestore 'in' queries are limited to 30 items
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

    if (loading) return <div className="p-8 text-center text-gray-400 text-sm">Loading inventory...</div>;

    if (!configDoc || !configDoc.isActive) {
        return (
            <div className="bg-orange-50 p-6 rounded-xl border border-orange-100 text-center">
                <AlertCircle className="mx-auto text-orange-400 mb-2" />
                <h3 className="text-orange-800 font-bold">SMS Integration Not Active</h3>
                <p className="text-orange-600 text-sm mt-1">Please contact a Super Admin to enable SMS for your company.</p>
            </div>
        );
    }

    const inventory = configDoc.inventory || []; // Array of { phoneNumber, ... }

    if (inventory.length === 0) {
        return (
            <div className="bg-gray-50 p-8 rounded-xl border border-gray-200 text-center">
                <Phone className="mx-auto text-gray-400 mb-3" size={32} />
                <h3 className="text-gray-900 font-bold">No Numbers Found</h3>
                <p className="text-gray-500 text-sm mt-1">We couldn't find any phone numbers connected to your provider account.</p>
                <button className="mt-4 text-blue-600 hover:underline text-sm font-medium flex items-center justify-center gap-2 mx-auto">
                    <RefreshCw size={14} /> Refresh Inventory
                </button>
            </div>
        );
    }

    return (
        <div className="space-y-6 max-w-5xl animate-in fade-in">
            <div className="flex items-center justify-between border-b border-gray-200 pb-4">
                <div>
                    <h2 className="text-xl font-bold text-gray-900 flex items-center gap-2">
                        <Phone className="text-blue-600" size={24} /> Number Assignments
                    </h2>
                    <p className="text-sm text-gray-500 mt-1">inventory: {inventory.length} numbers available</p>
                </div>
                <div className="flex items-center gap-3">
                    {/* Diagnostic Test Button */}
                    <button
                        onClick={() => setShowTestModal(true)}
                        className="px-3 py-2 text-blue-700 bg-blue-50 border border-blue-200 rounded-lg hover:bg-blue-100 flex items-center gap-2 text-sm font-medium transition-colors"
                    >
                        <Beaker size={16} />
                        Test Lines
                    </button>
                    {/* Save Button */}
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
                    <Check className="text-green-500" size={18} /> Company Default Line
                </h3>
                <p className="text-xs text-gray-500 mb-4">
                    This number will be used for automated system messages and for users who don't have a personal line assigned.
                </p>
                <div className="max-w-md">
                    <select
                        value={defaultNumber}
                        onChange={(e) => setDefaultNumber(e.target.value)}
                        className="w-full p-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none font-mono"
                    >
                        <option value="">-- Select Default Number --</option>
                        {inventory.map(num => (
                            <option key={num.phoneNumber} value={num.phoneNumber}>
                                {num.phoneNumber} ({num.usageType || 'Line'})
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
                    <p className="text-xs text-gray-500 mt-1">Assign strict 1:1 lines for your team members.</p>
                </div>

                <table className="w-full text-left border-collapse">
                    <thead className="bg-gray-50 text-xs font-bold text-gray-500 uppercase">
                        <tr>
                            <th className="px-6 py-3 border-b border-gray-100">Team Member</th>
                            <th className="px-6 py-3 border-b border-gray-100">Role</th>
                            <th className="px-6 py-3 border-b border-gray-100">Assigned Number</th>
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
                                            <option value="">No Direct Line</option>
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

            {/* SMS Diagnostic Lab Modal */}
            {showTestModal && (
                <SMSDiagnosticModal
                    companyId={companyId}
                    inventory={inventory}
                    onClose={() => setShowTestModal(false)}
                />
            )}
        </div>
    );
}
