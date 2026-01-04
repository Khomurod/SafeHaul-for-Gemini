import React from 'react';
import {
    DollarSign, MapPin, Truck, Clock, Briefcase,
    CheckSquare, Square
} from 'lucide-react';
import {
    PAY_TYPES, EXPERIENCE_LEVELS, FREIGHT_TYPES
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
                                className="w-full pl-6 pr-2 py-2 border-b-2 border-gray-200 bg-transparent text-2xl font-bold text-gray-900 focus:border-emerald-500 focus:outline-none transition-all placeholder-gray-300"
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
                                className="w-full pl-6 pr-2 py-2 border-b-2 border-gray-200 bg-transparent text-2xl font-bold text-gray-900 focus:border-emerald-500 focus:outline-none transition-all placeholder-gray-300"
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
                                className="w-full pr-8 pl-2 py-2 border-b-2 border-gray-200 bg-transparent text-2xl font-bold text-gray-900 focus:border-emerald-500 focus:outline-none transition-all placeholder-gray-300"
                                value={data.percentage?.min || ''}
                                onChange={(e) => handlePayValueChange('percentage', 'min', e.target.value)}
                            />
                            <span className="absolute right-0 top-3 text-gray-400 text-lg font-bold group-hover:text-emerald-600 transition-colors">%</span>
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
                            <span className="absolute left-0 top-3 text-gray-400 text-lg font-medium group-hover:text-emerald-600 transition-colors">$</span>
                            <input
                                type="number" placeholder="1500"
                                className="w-full pl-6 pr-2 py-2 border-b-2 border-gray-200 bg-transparent text-2xl font-bold text-gray-900 focus:border-emerald-500 focus:outline-none transition-all placeholder-gray-300"
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

    return (
        <div className="space-y-10">

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
                        <select
                            className="w-full p-3 border border-gray-200 rounded-lg bg-gray-50 text-sm font-semibold text-gray-700 focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 outline-none transition-all appearance-none bg-[url('data:image/svg+xml;charset=US-ASCII,%3Csvg%20xmlns%3D%22http%3A%2F%2Fwww.w3.org%2F2000%2Fsvg%22%20width%3D%22292.4%22%20height%3D%22292.4%22%3E%3Cpath%20fill%3D%22%236b7280%22%20d%3D%22M287%2069.4a17.6%2017.6%200%200%200-13-5.4H18.4c-5%200-9.3%201.8-12.9%205.4A17.6%2017.6%200%200%200%200%2082.2c0%205%201.8%209.3%205.4%2012.9l128%20127.9c3.6%203.6%207.8%205.4%2012.8%205.4s9.2-1.8%2012.8-5.4L287%2095c3.5-3.5%205.4-7.8%205.4-12.8%200-5-1.9-9.2-5.5-12.8z%22%2F%3E%3C%2Fsvg%3E')] bg-[length:10px_10px] bg-no-repeat bg-[right:14px_center]"
                            value={data.payType}
                            onChange={handlePayTypeChange}
                        >
                            {availablePayTypes.map(pt => <option key={pt.value} value={pt.value}>{pt.label}</option>)}
                        </select>
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
                        <select
                            className="w-full p-3 border border-gray-200 rounded-lg bg-gray-50 text-sm font-semibold text-gray-700 focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 outline-none transition-all appearance-none bg-[url('data:image/svg+xml;charset=US-ASCII,%3Csvg%20xmlns%3D%22http%3A%2F%2Fwww.w3.org%2F2000%2Fsvg%22%20width%3D%22292.4%22%20height%3D%22292.4%22%3E%3Cpath%20fill%3D%22%236b7280%22%20d%3D%22M287%2069.4a17.6%2017.6%200%200%200-13-5.4H18.4c-5%200-9.3%201.8-12.9%205.4A17.6%2017.6%200%200%200%200%2082.2c0%205%201.8%209.3%205.4%2012.9l128%20127.9c3.6%203.6%207.8%205.4%2012.8%205.4s9.2-1.8%2012.8-5.4L287%2095c3.5-3.5%205.4-7.8%205.4-12.8%200-5-1.9-9.2-5.5-12.8z%22%2F%3E%3C%2Fsvg%3E')] bg-[length:10px_10px] bg-no-repeat bg-[right:14px_center]"
                            value={data.experienceRequired}
                            onChange={(e) => onChange({ ...data, experienceRequired: e.target.value })}
                        >
                            {EXPERIENCE_LEVELS.map(ex => <option key={ex.value} value={ex.value}>{ex.label}</option>)}
                        </select>
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
        </div>
    );
}