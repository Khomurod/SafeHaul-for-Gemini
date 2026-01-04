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

    // Toggle enable status directly from sidebar or empty state
    const handleToggleEnable = (category, currentStatus) => {
        const activeTab = activeTabs[category]; // 'solo' or 'team'
        const currentCatData = safeCat(category);
        const currentSubPosData = currentCatData[activeTab] || {};

        onChange({
            ...safeData,
            [category]: {
                ...currentCatData,
                [activeTab]: { ...currentSubPosData, enabled: !currentStatus }
            }
        });
    };

    // Check if the ACTIVE tab for a category is enabled
    const isCategoryEnabled = (catKey) => {
        const activeTab = activeTabs[catKey];
        const catData = safeCat(catKey);
        return catData[activeTab]?.enabled === true;
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

                <div className="flex items-center" onClick={(e) => e.stopPropagation()}>
                    <button
                        onClick={() => handleToggleEnable(item.id, isEnabled)}
                        className={`w-8 h-4 rounded-full relative transition-colors ${isEnabled ? 'bg-emerald-500' : 'bg-gray-300'}`}
                        title={isEnabled ? "Enabled" : "Disabled"}
                    >
                        <div className={`absolute top-0.5 left-0.5 w-3 h-3 bg-white rounded-full transition-transform ${isEnabled ? 'translate-x-4' : 'translate-x-0'}`} />
                    </button>
                </div>
            </div>
        );
    };

    const renderRightPanel = () => {
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
                        <p className="text-gray-500 max-w-md mx-auto mb-6">Enable the {activeTab === 'solo' ? 'Solo' : 'Team'} position to start configuring pay, requirements, and hiring zones.</p>
                        <button
                            onClick={() => handleToggleEnable(activeCategory, false)}
                            className="px-6 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white font-bold rounded-lg shadow-sm transition-colors"
                        >
                            Enable {categoryConfig?.label} ({activeTab === 'solo' ? 'Solo' : 'Team'})
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
    }



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