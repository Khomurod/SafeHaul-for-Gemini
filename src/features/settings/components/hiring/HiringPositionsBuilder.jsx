import React, { useState } from 'react';
import {
    Users, User, Briefcase, Truck, Key, Heart,
    Hotel, Plane
} from 'lucide-react';
import { SubPositionEditor } from './SubPositionEditor';
import { BENEFITS_LIST } from './HiringConfig';

export function HiringPositionsBuilder({ data, onChange, isCompanyAdmin }) {

    const [activeCategory, setActiveCategory] = useState('companyDriver');

    // Local state for active tabs within categories (Solo vs Team)
    const [activeTabs, setActiveTabs] = useState({
        companyDriver: 'solo',
        ownerOperator: 'solo',
        leaseOperator: 'solo'
    });

    // --- Helpers ---
    const CATEGORY_CONFIG = [
        { id: 'companyDriver', label: 'Company Driver', icon: <Briefcase size={18} /> },
        { id: 'ownerOperator', label: 'Owner Operator', icon: <Truck size={18} /> },
        { id: 'leaseOperator', label: 'Lease Operator', icon: <Key size={18} /> },
        { id: 'benefits', label: 'Benefits & Perks', icon: <Heart size={18} /> },
    ];

    const safeData = data || {};
    const safeCat = (cat) => safeData[cat] || { solo: {}, team: {} };

    // --- Handlers ---
    const handleSubPositionChange = (category, type, newData) => {
        onChange({
            ...safeData,
            [category]: {
                ...safeCat(category),
                [type]: newData
            }
        });
    };

    const toggleBenefit = (benefitId) => {
        const currentBenefits = safeData.benefits || {};
        const newValue = !currentBenefits[benefitId];

        onChange({
            ...safeData,
            benefits: {
                ...currentBenefits,
                [benefitId]: newValue
            }
        });
    };

    const handleTabSwitch = (category, tab) => {
        setActiveTabs(prev => ({ ...prev, [category]: tab }));
    };

    // Toggle enable status directly from sidebar
    const handleToggleEnable = (category, currentStatus) => {
        const currentCatData = safeCat(category);
        // Sticking to existing structure: We will toggle 'enabled' on BOTH solo and team for that category.
        const newStatus = !currentStatus;
        onChange({
            ...safeData,
            [category]: {
                solo: { ...currentCatData.solo, enabled: newStatus },
                team: { ...currentCatData.team, enabled: newStatus }
            }
        });
    };

    // Check if a category is "active" (enabled)
    const isCategoryEnabled = (catKey) => {
        if (catKey === 'benefits') return true; // Always enabled
        const catData = safeCat(catKey);
        // Consider enabled if either solo or team is enabled, or mostly just check solo for the main toggle
        return catData.solo?.enabled === true;
    };

    // --- Renderers ---

    const renderSidebarItem = (item) => {
        const isActive = activeCategory === item.id;
        const isEnabled = isCategoryEnabled(item.id);

        return (
            <div
                key={item.id}
                onClick={() => setActiveCategory(item.id)}
                className={`group flex items-center justify-between p-3 rounded-lg cursor-pointer transition-all duration-200 mb-1 ${isActive
                    ? 'bg-blue-50 border-blue-200 shadow-sm ring-1 ring-blue-200'
                    : 'hover:bg-gray-50 border border-transparent'}`}
            >
                <div className="flex items-center gap-3">
                    <div className={`transition-colors ${isActive ? 'text-blue-600' : 'text-gray-400 group-hover:text-gray-600'}`}>
                        {item.icon}
                    </div>
                    <span className={`text-sm font-semibold ${isActive ? 'text-blue-900' : 'text-gray-600'}`}>
                        {item.label}
                    </span>
                </div>

                {item.id !== 'benefits' && (
                    <div className="flex items-center" onClick={(e) => e.stopPropagation()}>
                        <button
                            onClick={() => handleToggleEnable(item.id, isEnabled)}
                            className={`w-8 h-4 rounded-full relative transition-colors ${isEnabled ? 'bg-emerald-500' : 'bg-gray-300'}`}
                            title={isEnabled ? "Enabled" : "Disabled"}
                        >
                            <div className={`absolute top-0.5 left-0.5 w-3 h-3 bg-white rounded-full transition-transform ${isEnabled ? 'translate-x-4' : 'translate-x-0'}`} />
                        </button>
                    </div>
                )}
            </div>
        );
    };

    const renderRightPanel = () => {
        if (activeCategory === 'benefits') {
            return (
                <div className="animate-in fade-in duration-300">
                    <div className="mb-8">
                        <h2 className="text-2xl font-bold text-gray-900">Benefits & Perks</h2>
                        <p className="text-gray-500 mt-1">Manage global benefits visible on all job listings.</p>
                    </div>

                    <div className="grid grid-cols-2 lg:grid-cols-3 gap-4">
                        {BENEFITS_LIST.map(ben => {
                            const isChecked = safeData.benefits?.[ben.id] === true;
                            return (
                                <button
                                    key={ben.id}
                                    onClick={() => toggleBenefit(ben.id)}
                                    className={`group relative flex items-center gap-3 p-4 rounded-xl border text-left transition-all duration-200 ${isChecked
                                        ? 'bg-blue-50/50 border-blue-500 shadow-sm ring-1 ring-blue-500/20'
                                        : 'bg-white border-gray-200 hover:border-blue-300 hover:bg-gray-50'
                                        }`}
                                >
                                    <div className={`flex-shrink-0 w-8 h-8 rounded-lg flex items-center justify-center border transition-all duration-200 ${isChecked ? 'bg-blue-600 border-blue-600 text-white' : 'border-gray-200 bg-gray-50 text-gray-400 group-hover:border-blue-200 group-hover:text-blue-400'}`}>
                                        <svg className={`w-4 h-4 transition-transform duration-200 ${isChecked ? 'scale-100' : 'scale-0'}`} fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="3" d="M5 13l4 4L19 7"></path></svg>
                                    </div>
                                    <span className={`text-sm font-semibold transition-colors ${isChecked ? 'text-blue-900' : 'text-gray-600 group-hover:text-gray-900'}`}>
                                        {ben.label}
                                    </span>
                                </button>
                            );
                        })}
                    </div>

                    {/* Admin Only Extras */}
                    {isCompanyAdmin && (
                        <div className="mt-8 pt-6 border-t border-gray-100">
                            <h4 className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-4">Logistics & Travel Coverage</h4>
                            <div className="flex flex-col sm:flex-row gap-4">
                                <label className={`flex items-center gap-3 p-4 rounded-xl border cursor-pointer transition-all ${safeData.benefits?.coversTransportation ? 'bg-emerald-50 border-emerald-500 ring-1 ring-emerald-500/20' : 'bg-white border-gray-200 hover:bg-gray-50'}`}>
                                    <input
                                        type="checkbox"
                                        className="sr-only"
                                        checked={safeData.benefits?.coversTransportation === true}
                                        onChange={() => toggleBenefit('coversTransportation')}
                                    />
                                    <div className={`p-2 rounded-lg ${safeData.benefits?.coversTransportation ? 'bg-emerald-100 text-emerald-700' : 'bg-gray-100 text-gray-500'}`}>
                                        <Plane size={18} />
                                    </div>
                                    <div className="flex flex-col">
                                        <span className={`text-sm font-bold ${safeData.benefits?.coversTransportation ? 'text-emerald-900' : 'text-gray-700'}`}>Travel to HQ</span>
                                        <span className="text-xs text-gray-500">Flight/Bus tickets covered</span>
                                    </div>
                                </label>

                                <label className={`flex items-center gap-3 p-4 rounded-xl border cursor-pointer transition-all ${safeData.benefits?.coversHotel ? 'bg-emerald-50 border-emerald-500 ring-1 ring-emerald-500/20' : 'bg-white border-gray-200 hover:bg-gray-50'}`}>
                                    <input
                                        type="checkbox"
                                        className="sr-only"
                                        checked={safeData.benefits?.coversHotel === true}
                                        onChange={() => toggleBenefit('coversHotel')}
                                    />
                                    <div className={`p-2 rounded-lg ${safeData.benefits?.coversHotel ? 'bg-emerald-100 text-emerald-700' : 'bg-gray-100 text-gray-500'}`}>
                                        <Hotel size={18} />
                                    </div>
                                    <div className="flex flex-col">
                                        <span className={`text-sm font-bold ${safeData.benefits?.coversHotel ? 'text-emerald-900' : 'text-gray-700'}`}>Hotel Accommodation</span>
                                        <span className="text-xs text-gray-500">Stay during orientation</span>
                                    </div>
                                </label>
                            </div>
                        </div>
                    )}
                </div>
            );
        }

        // For Job Categories
        const isEnabled = isCategoryEnabled(activeCategory);
        const categoryConfig = CATEGORY_CONFIG.find(c => c.id === activeCategory);
        const activeTab = activeTabs[activeCategory];
        const categoryData = safeCat(activeCategory);

        return (
            <div className="animate-in fade-in duration-300 relative">
                {/* Header */}
                <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-8">
                    <div>
                        <h2 className="text-2xl font-bold text-gray-900">{categoryConfig?.label} Configuration</h2>
                        <div className="flex items-center gap-2 mt-2">
                            <div className={`w-2 h-2 rounded-full ${isEnabled ? 'bg-emerald-500' : 'bg-gray-300'}`} />
                            <span className={`text-sm font-medium ${isEnabled ? 'text-emerald-700' : 'text-gray-500'}`}>
                                {isEnabled ? 'Position is Active' : 'Position is Disabled'}
                            </span>
                        </div>
                    </div>

                    {/* Segmented Control */}
                    {isEnabled && (
                        <div className="flex bg-gray-100 p-1 rounded-lg border border-gray-200/50">
                            <button
                                onClick={() => handleTabSwitch(activeCategory, 'solo')}
                                className={`px-6 py-2 text-sm font-bold rounded-md transition-all duration-200 ${activeTab === 'solo'
                                    ? 'bg-white text-gray-900 shadow-sm ring-1 ring-black/5'
                                    : 'text-gray-500 hover:text-gray-700'
                                    }`}
                            >
                                Solo
                            </button>
                            <button
                                onClick={() => handleTabSwitch(activeCategory, 'team')}
                                className={`px-6 py-2 text-sm font-bold rounded-md transition-all duration-200 ${activeTab === 'team'
                                    ? 'bg-white text-gray-900 shadow-sm ring-1 ring-black/5'
                                    : 'text-gray-500 hover:text-gray-700'
                                    }`}
                            >
                                Team
                            </button>
                        </div>
                    )}
                </div>

                {/* Content */}
                {!isEnabled ? (
                    <div className="text-center py-20 bg-gray-50 rounded-2xl border border-dashed border-gray-300">
                        <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4 text-gray-400">
                            {categoryConfig?.icon}
                        </div>
                        <h3 className="text-lg font-bold text-gray-900 mb-2">This Position is Currently Disabled</h3>
                        <p className="text-gray-500 max-w-md mx-auto mb-6">Enable this position to start configuring pay, requirements, and hiring zones.</p>
                        <button
                            onClick={() => handleToggleEnable(activeCategory, false)}
                            className="px-6 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white font-bold rounded-lg shadow-sm transition-colors"
                        >
                            Enable {categoryConfig?.label}
                        </button>
                    </div>
                ) : (
                    <SubPositionEditor
                        title={`${categoryConfig?.label} (${activeTab === 'solo' ? 'Solo' : 'Team'})`}
                        data={(activeTab === 'solo' ? categoryData.solo : categoryData.team) || {}}
                        onChange={(newData) => handleSubPositionChange(activeCategory, activeTab, newData)}
                        category={activeCategory}
                    />
                )}
            </div>
        );
    };

    return (
        <div className="bg-white rounded-2xl border border-gray-200 shadow-sm overflow-hidden min-h-[600px] flex flex-col md:flex-row">

            {/* Left Sidebar */}
            <div className="w-full md:w-[280px] bg-white border-b md:border-b-0 md:border-r border-gray-100 p-4 flex-shrink-0">
                <h3 className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-4 px-2">Hiring Settings</h3>
                <div className="space-y-1">
                    {CATEGORY_CONFIG.map(renderSidebarItem)}
                </div>
            </div>

            {/* Right Pane */}
            <div className="flex-1 bg-white p-6 md:p-10 overflow-y-auto max-h-[800px]">
                {renderRightPanel()}
            </div>

        </div>
    );
}