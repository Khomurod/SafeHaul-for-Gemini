import React, { useEffect } from 'react';
import {
    DollarSign, MapPin, Truck, Clock, Briefcase,
    CheckSquare, Square, Heart
} from 'lucide-react';
import {
    PAY_TYPES, EXPERIENCE_LEVELS, FREIGHT_TYPES, BENEFITS_LIST
} from './HiringConfig';

const US_STATES = [
    "AL", "AK", "AZ", "AR", "CA", "CO", "CT", "DE", "FL", "GA",
    "HI", "ID", "IL", "IN", "IA", "KS", "KY", "LA", "ME", "MD",
    "MA", "MI", "MN", "MS", "MO", "MT", "NE", "NV", "NH", "NJ",
    "NM", "NY", "NC", "ND", "OH", "OK", "OR", "PA", "RI", "SC",
    "SD", "TN", "TX", "UT", "VT", "VA", "WA", "WV", "WI", "WY"
];

export function SubPositionEditor({ title, data, onChange, category }) {

    // Note: 'enabled' toggle is now handled by the parent sidebar.

    // --- Safety Check for Pay Types ---
    useEffect(() => {
        const isContractor = category === 'ownerOperator' || category === 'leaseOperator';
        if (isContractor && (data.payType === 'cpm' || data.payType === 'hourly')) {
            // Default to percentage if invalid type for contractor
            onChange({ ...data, payType: 'percentage' });
        }
    }, [category, data.payType]);


    const handleToggleEnable = (checked) => {
        onChange({ ...data, enabled: checked });
    };

    const handlePayTypeChange = (e) => {
        onChange({ ...data, payType: e.target.value });
    };

    const handlePayValueChange = (type, field, value) => {
        const currentPayData = data[type] || {};
        onChange({
            ...data,
            [type]: { ...currentPayData, [field]: value }
        });
    };

    const handleGeographyToggle = (isNationwide) => {
        onChange({
            ...data,
            hiringGeography: { ...data.hiringGeography, nationwide: isNationwide }
        });
    };

    const handleStateToggle = (stateCode) => {
        const currentStates = data.hiringGeography?.states || [];
        const newStates = currentStates.includes(stateCode)
            ? currentStates.filter(s => s !== stateCode)
            : [...currentStates, stateCode];

        onChange({
            ...data,
            hiringGeography: { ...data.hiringGeography, states: newStates }
        });
    };

    const handleFreightToggle = (type) => {
        const current = data.freightTypes || [];
        const updated = current.includes(type)
            ? current.filter(t => t !== type)
            : [...current, type];
        onChange({ ...data, freightTypes: updated });
    };

    const handleBenefitToggle = (benefitId) => {
        const currentBenefits = data.benefits || {};
        const newValue = !currentBenefits[benefitId];
        onChange({
            ...data,
            benefits: { ...currentBenefits, [benefitId]: newValue }
        });
    };

    // --- Logic for Pay Types ---
    const availablePayTypes = PAY_TYPES.filter(pt => {
        const isContractor = category === 'ownerOperator' || category === 'leaseOperator';
        if (isContractor) {
            return pt.value === 'percentage' || pt.value === 'flatRate';
        }
        return true;
    });

    const renderPayInputs = () => {
        const type = data.payType;

        if (type === 'cpm') {
            return (
                <div className="flex gap-4 w-full items-center">
                    <div className="flex-1">
                        <div className="relative group">
                            <span className="absolute left-0 top-3 text-gray-400 text-lg font-medium group-hover:text-emerald-600 transition-colors">$</span>
                            <input
                                type="number" step="0.01" placeholder="0.50"
                                className="w-full pl-6 pr-2 py-4 border-b-2 border-gray-200 bg-transparent text-2xl leading-relaxed font-bold text-gray-900 focus:border-emerald-500 focus:outline-none transition-all placeholder-gray-300"
                                value={data.cpm?.min || ''}
                                onChange={(e) => handlePayValueChange('cpm', 'min', e.target.value)}
                            />
                            <label className="text-[10px] text-gray-400 uppercase font-bold tracking-wider mt-1 block">Min CPM</label>
                        </div>
                    </div>
                    <div className="text-gray-300 text-xl font-light px-2">—</div>
                    <div className="flex-1">
                        <div className="relative group">
                            <span className="absolute left-0 top-3 text-gray-400 text-lg font-medium group-hover:text-emerald-600 transition-colors">$</span>
                            <input
                                type="number" step="0.01" placeholder="0.75"
                                className="w-full pl-6 pr-2 py-4 border-b-2 border-gray-200 bg-transparent text-2xl leading-relaxed font-bold text-gray-900 focus:border-emerald-500 focus:outline-none transition-all placeholder-gray-300"
                                value={data.cpm?.max || ''}
                                onChange={(e) => handlePayValueChange('cpm', 'max', e.target.value)}
                            />
                            <label className="text-[10px] text-gray-400 uppercase font-bold tracking-wider mt-1 block">Max CPM</label>
                        </div>
                    </div>
                </div>
            );
        }

        if (type === 'percentage') {
            return (
                <div className="flex gap-4 w-full">
                    <div className="flex-1">
                        <div className="relative group">
                            <input
                                type="number" placeholder="25"
                                className="w-full pr-8 pl-2 py-4 border-b-2 border-gray-200 bg-transparent text-2xl leading-relaxed font-bold text-gray-900 focus:border-emerald-500 focus:outline-none transition-all placeholder-gray-300"
                                value={data.percentage?.min || ''}
                                onChange={(e) => handlePayValueChange('percentage', 'min', e.target.value)}
                            />
                            <span className="absolute right-0 top-4 text-gray-400 text-lg font-bold group-hover:text-emerald-600 transition-colors">%</span>
                            <label className="text-[10px] text-gray-400 uppercase font-bold tracking-wider mt-1 block">Percentage of Load</label>
                        </div>
                    </div>
                </div>
            );
        }

        if (type === 'flatRate' || type === 'hourly') {
            const fieldKey = type === 'flatRate' ? 'flatRate' : 'hourly';
            const label = type === 'flatRate' ? 'Flat Rate per Load' : 'Hourly Rate';
            return (
                <div className="flex gap-4 w-full">
                    <div className="flex-1">
                        <div className="relative group">
                            <span className="absolute left-0 top-4 text-gray-400 text-lg font-medium group-hover:text-emerald-600 transition-colors">$</span>
                            <input
                                type="number" placeholder="1500"
                                className="w-full pl-6 pr-2 py-4 border-b-2 border-gray-200 bg-transparent text-2xl leading-relaxed font-bold text-gray-900 focus:border-emerald-500 focus:outline-none transition-all placeholder-gray-300"
                                value={data[fieldKey]?.amount || ''}
                                onChange={(e) => handlePayValueChange(fieldKey, 'amount', e.target.value)}
                            />
                            <label className="text-[10px] text-gray-400 uppercase font-bold tracking-wider mt-1 block">{label}</label>
                        </div>
                    </div>
                </div>
            );
        }
    };

    const isEnabled = data.enabled || false;

    return (
        <div className={`transition-all duration-300 ${!isEnabled ? 'opacity-80 grayscale-[0.5]' : 'opacity-100'}`}>

            {/* Header / Active Toggle */}
            <div className="flex justify-between items-center mb-6 pt-2">
                <div>
                    <div className="flex items-center gap-2 mb-1">
                        <div className={`w-2 h-2 rounded-full ${isEnabled ? 'bg-emerald-500 shadow-[0_0_8px_rgba(16,185,129,0.5)]' : 'bg-gray-300'}`} />
                        <span className={`text-xs font-bold uppercase tracking-widest ${isEnabled ? 'text-emerald-600' : 'text-gray-400'}`}>
                            {isEnabled ? 'Active Position' : 'Draft Mode'}
                        </span>
                    </div>
                    <p className="text-xs text-gray-400 max-w-md">
                        {isEnabled ? 'This position is live and visible to potential drivers.' : 'Enable this position to make it visible on public listings.'}
                    </p>
                </div>

                {/* Toggle Switch - Controls this specific sub-position */}
                <label className="relative inline-flex items-center cursor-pointer">
                    <input
                        type="checkbox"
                        className="sr-only peer"
                        checked={isEnabled}
                        onChange={(e) => handleToggleEnable(e.target.checked)}
                    />
                    <div className="w-12 h-7 bg-gray-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[4px] after:left-[4px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-emerald-500 shadow-inner"></div>
                </label>
            </div>

            {isEnabled && (
                <div className="space-y-8 animate-in fade-in slide-in-from-top-4 duration-500 pb-10">

                    {/* Pay Section - Clean Layout */}
                    <div>
                        <div className="flex items-center gap-2 mb-6">
                            <DollarSign size={16} className="text-emerald-500" />
                            <h5 className="text-xs font-bold text-gray-900 uppercase tracking-widest">Compensation</h5>
                            <div className="h-px bg-gray-100 flex-1 ml-2"></div>
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-8 lg:gap-12">
                            <div className="w-full">
                                <label className="text-[10px] text-gray-400 uppercase font-bold tracking-wider mb-2 block">Payment Model</label>
                                <div className="relative">
                                    <select
                                        className="w-full p-3 border border-gray-200 rounded-lg bg-gray-50 text-sm font-semibold text-gray-700 focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 outline-none transition-all appearance-none"
                                        value={data.payType}
                                        onChange={handlePayTypeChange}
                                    >
                                        {availablePayTypes.map(pt => <option key={pt.value} value={pt.value}>{pt.label}</option>)}
                                    </select>
                                    <div className="absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none text-gray-400">
                                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 9l-7 7-7-7"></path></svg>
                                    </div>
                                </div>
                            </div>
                            <div className="flex items-end pb-2">
                                {renderPayInputs()}
                            </div>
                        </div>
                    </div>

                    {/* Requirements Section */}
                    <div>
                        <div className="flex items-center gap-2 mb-6">
                            <CheckSquare size={16} className="text-blue-500" />
                            <h5 className="text-xs font-bold text-gray-900 uppercase tracking-widest">Requirements & Hiring Zone</h5>
                            <div className="h-px bg-gray-100 flex-1 ml-2"></div>
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                            {/* Experience */}
                            <div>
                                <label className="text-[10px] text-gray-400 uppercase font-bold tracking-wider mb-2 block">Minimum Experience</label>
                                <div className="relative">
                                    <select
                                        className="w-full p-3 border border-gray-200 rounded-lg bg-gray-50 text-sm font-semibold text-gray-700 focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 outline-none transition-all appearance-none"
                                        value={data.experienceRequired}
                                        onChange={(e) => onChange({ ...data, experienceRequired: e.target.value })}
                                    >
                                        {EXPERIENCE_LEVELS.map(ex => <option key={ex.value} value={ex.value}>{ex.label}</option>)}
                                    </select>
                                    <div className="absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none text-gray-400">
                                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 9l-7 7-7-7"></path></svg>
                                    </div>
                                </div>
                            </div>

                            {/* Geography */}
                            <div>
                                <label className="text-[10px] text-gray-400 uppercase font-bold tracking-wider mb-2 block">Hiring Scope</label>
                                <div className="flex items-center gap-2 p-1 bg-gray-100 rounded-lg w-fit">
                                    <button
                                        onClick={() => handleGeographyToggle(true)}
                                        className={`px-4 py-2 text-xs font-bold rounded-md transition-all ${data.hiringGeography?.nationwide === true
                                            ? 'bg-white text-blue-600 shadow-sm'
                                            : 'text-gray-500 hover:text-gray-700'}`}
                                    >
                                        Nationwide
                                    </button>
                                    <button
                                        onClick={() => handleGeographyToggle(false)}
                                        className={`px-4 py-2 text-xs font-bold rounded-md transition-all ${data.hiringGeography?.nationwide === false
                                            ? 'bg-white text-blue-600 shadow-sm'
                                            : 'text-gray-500 hover:text-gray-700'}`}
                                    >
                                        Regional
                                    </button>
                                </div>
                            </div>
                        </div>

                        {/* State Selector */}
                        {data.hiringGeography?.nationwide === false && (
                            <div className="mt-8">
                                <label className="text-[10px] text-gray-400 uppercase font-bold tracking-wider mb-3 block">Supported States</label>
                                <div className="p-1 max-h-60 overflow-y-auto grid grid-cols-6 sm:grid-cols-8 md:grid-cols-10 gap-2 custom-scrollbar">
                                    {US_STATES.map(state => {
                                        const isSelected = data.hiringGeography.states?.includes(state);
                                        return (
                                            <button
                                                key={state}
                                                onClick={() => handleStateToggle(state)}
                                                className={`text-[10px] sm:text-xs font-bold py-2 rounded transition-all ${isSelected
                                                    ? 'bg-blue-600 text-white shadow-md shadow-blue-500/20'
                                                    : 'bg-gray-50 text-gray-400 hover:bg-gray-100'
                                                    }`}
                                            >
                                                {state}
                                            </button>
                                        );
                                    })}
                                </div>
                            </div>
                        )}

                        {/* Freight Types */}
                        <div className="mt-8">
                            <label className="text-[10px] text-gray-400 uppercase font-bold tracking-wider mb-3 block">Freight Capabilities</label>
                            <div className="flex flex-wrap gap-2">
                                {FREIGHT_TYPES.map(ft => {
                                    const isSelected = data.freightTypes?.includes(ft);
                                    return (
                                        <button
                                            key={ft}
                                            onClick={() => handleFreightToggle(ft)}
                                            className={`px-4 py-2 text-xs font-bold rounded-full border transition-all duration-200 ${isSelected
                                                ? 'bg-slate-800 text-white border-slate-800 shadow-lg shadow-slate-200'
                                                : 'bg-white text-gray-500 border-gray-200 hover:border-gray-300'
                                                }`}
                                        >
                                            {ft}
                                        </button>
                                    );
                                })}
                            </div>
                        </div>
                    </div>

                    {/* Benefits Section - Per Position */}
                    <div>
                        <div className="flex items-center gap-2 mb-6">
                            <Heart size={16} className="text-rose-500" />
                            <h5 className="text-xs font-bold text-gray-900 uppercase tracking-widest">Benefits & Perks</h5>
                            <div className="h-px bg-gray-100 flex-1 ml-2"></div>
                        </div>

                        <div className="grid grid-cols-2 lg:grid-cols-3 gap-3">
                            {BENEFITS_LIST.map(ben => {
                                const isChecked = data.benefits?.[ben.id] === true;
                                return (
                                    <button
                                        key={ben.id}
                                        onClick={() => handleBenefitToggle(ben.id)}
                                        className={`group relative flex items-center gap-3 p-3 rounded-xl border text-left transition-all duration-200 ${isChecked
                                            ? 'bg-rose-50/50 border-rose-500 shadow-sm ring-1 ring-rose-500/20'
                                            : 'bg-white border-gray-200 hover:border-rose-300 hover:bg-gray-50'
                                            }`}
                                    >
                                        <div className={`flex-shrink-0 w-6 h-6 rounded-md flex items-center justify-center border transition-all duration-200 ${isChecked ? 'bg-rose-500 border-rose-500 text-white' : 'border-gray-200 bg-gray-50 text-gray-400 group-hover:border-rose-200 group-hover:text-rose-400'}`}>
                                            <svg className={`w-3 h-3 transition-transform duration-200 ${isChecked ? 'scale-100' : 'scale-0'}`} fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="3" d="M5 13l4 4L19 7"></path></svg>
                                        </div>
                                        <span className={`text-xs font-bold transition-colors ${isChecked ? 'text-rose-900' : 'text-gray-600 group-hover:text-gray-900'}`}>
                                            {ben.label}
                                        </span>
                                    </button>
                                );
                            })}
                        </div>
                    </div>

                </div>
            )}
        </div>
    );
}