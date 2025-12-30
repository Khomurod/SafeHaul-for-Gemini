import React from 'react';
import InputField from '@shared/components/form/InputField';
import RadioGroup from '@shared/components/form/RadioGroup';
import { useUtils } from '@shared/hooks/useUtils';
import { YES_NO_OPTIONS, LICENSE_CLASS_OPTIONS, LICENSE_ENDORSEMENT_OPTIONS } from '@/config/form-options';
import { CreditCard, Shield, Truck } from 'lucide-react';

const Step3_License = ({ formData, updateFormData, onNavigate }) => {
    const { states } = useUtils();

    const handleChange = (name, value) => {
        updateFormData(name, value);
    };

    const handleCheckboxChange = (e) => {
        const { value, checked } = e.target;
        let current = formData.endorsements ? formData.endorsements.split(',') : [];
        if (checked) {
            current.push(value);
        } else {
            current = current.filter(item => item !== value);
        }
        updateFormData('endorsements', current.join(','));
    };

    const handleContinue = () => {
        const form = document.getElementById('driver-form');
        if (form && !form.checkValidity()) {
            form.reportValidity();
            return;
        }
        onNavigate('next');
    };

    return (
        <div id="page-3" className="space-y-8 animate-in fade-in duration-500">
            <div className="space-y-2">
                <h3 className="text-2xl font-bold text-gray-900">License Information</h3>
                <p className="text-gray-600">Provide details about your Commercial Driver's License (CDL).</p>
            </div>

            {/* CARD 1: LICENSE DETAILS */}
            <section className="bg-white p-6 md:p-8 rounded-xl shadow-sm border border-gray-200 space-y-6">
                <div className="flex items-center gap-3 border-b border-gray-100 pb-4 mb-2">
                    <div className="p-2 bg-blue-50 rounded-lg text-blue-600">
                        <CreditCard size={20} />
                    </div>
                    <h4 className="text-lg font-bold text-gray-900">Primary CDL Details</h4>
                </div>

                <div className="space-y-6">
                    <InputField 
                        label="License Number" 
                        id="cdlNumber" 
                        name="cdlNumber" 
                        value={formData.cdlNumber} 
                        onChange={handleChange} 
                        required 
                        placeholder="Enter CDL Number"
                    />

                    <div className="space-y-2">
                        <label className="block text-sm font-bold text-gray-900 uppercase tracking-wide">
                            Issuing State <span className="text-red-500">*</span>
                        </label>
                        <select 
                            name="cdlState" 
                            value={formData.cdlState || ""} 
                            onChange={(e) => handleChange("cdlState", e.target.value)} 
                            required 
                            className="w-full p-4 border border-gray-300 rounded-lg bg-white focus:ring-2 focus:ring-blue-500 outline-none"
                        >
                            <option value="" disabled>Select State</option>
                            {states.map(s => <option key={s} value={s}>{s}</option>)}
                        </select>
                    </div>

                    <div className="space-y-2">
                        <label className="block text-sm font-bold text-gray-900 uppercase tracking-wide">
                            License Class <span className="text-red-500">*</span>
                        </label>
                        <select 
                            name="cdlClass" 
                            value={formData.cdlClass || ""} 
                            onChange={(e) => handleChange("cdlClass", e.target.value)} 
                            required 
                            className="w-full p-4 border border-gray-300 rounded-lg bg-white focus:ring-2 focus:ring-blue-500 outline-none"
                        >
                            <option value="" disabled>Select Class</option>
                            {LICENSE_CLASS_OPTIONS.map(opt => <option key={opt.value} value={opt.value}>{opt.label}</option>)}
                        </select>
                    </div>

                    <InputField 
                        label="Expiration Date" 
                        id="cdlExpiration" 
                        name="cdlExpiration" 
                        type="date" 
                        value={formData.cdlExpiration} 
                        onChange={handleChange} 
                        required 
                        helperText="Must be a valid future date."
                    />
                </div>
            </section>

            {/* CARD 2: ENDORSEMENTS */}
            <section className="bg-white p-6 md:p-8 rounded-xl shadow-sm border border-gray-200 space-y-6">
                <div className="flex items-center gap-3 border-b border-gray-100 pb-4 mb-2">
                    <div className="p-2 bg-indigo-50 rounded-lg text-indigo-600">
                        <Truck size={20} />
                    </div>
                    <h4 className="text-lg font-bold text-gray-900">Endorsements</h4>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    {LICENSE_ENDORSEMENT_OPTIONS.map((opt) => {
                        const isChecked = (formData.endorsements || '').split(',').includes(opt.value);
                        return (
                            <label 
                                key={opt.value}
                                className={`
                                    flex items-center p-4 border rounded-lg cursor-pointer transition-all
                                    ${isChecked ? 'border-blue-600 bg-blue-50' : 'border-gray-200 hover:bg-gray-50'}
                                `}
                            >
                                <input 
                                    type="checkbox" 
                                    value={opt.value} 
                                    checked={isChecked} 
                                    onChange={handleCheckboxChange}
                                    className="w-5 h-5 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
                                />
                                <span className="ml-3 text-sm font-medium text-gray-900">{opt.label}</span>
                            </label>
                        );
                    })}
                </div>
            </section>

            {/* CARD 3: COMPLIANCE */}
            <section className="bg-white p-6 md:p-8 rounded-xl shadow-sm border border-gray-200 space-y-6">
                <div className="flex items-center gap-3 border-b border-gray-100 pb-4 mb-2">
                    <div className="p-2 bg-orange-50 rounded-lg text-orange-600">
                        <Shield size={20} />
                    </div>
                    <h4 className="text-lg font-bold text-gray-900">Medical & TWIC</h4>
                </div>

                <div className="space-y-6">
                    <InputField 
                        label="Medical Card Expiration Date" 
                        id="medCardExpiration" 
                        name="medCardExpiration" 
                        type="date" 
                        value={formData.medCardExpiration} 
                        onChange={handleChange} 
                        required 
                    />

                    <RadioGroup 
                        label="Do you hold a valid TWIC Card?" 
                        name="has-twic" 
                        options={YES_NO_OPTIONS}
                        value={formData['has-twic']} 
                        onChange={(name, value) => handleChange(name, value)}
                        required={true}
                    />

                    {formData['has-twic'] === 'yes' && (
                        <div className="animate-in slide-in-from-top-2">
                            <InputField 
                                label="TWIC Expiration Date" 
                                id="twicExpiration" 
                                name="twicExpiration" 
                                type="date" 
                                value={formData.twicExpiration} 
                                onChange={handleChange} 
                                required={true}
                            />
                        </div>
                    )}
                </div>
            </section>

            <div className="flex justify-between pt-8 pb-10">
                <button 
                    type="button" 
                    onClick={() => onNavigate('back')}
                    className="px-8 py-4 bg-gray-100 text-gray-600 font-bold rounded-xl hover:bg-gray-200 transition-colors"
                >
                    Back
                </button>
                <button 
                    type="button" 
                    onClick={handleContinue}
                    className="px-10 py-4 bg-blue-600 text-white font-bold text-lg rounded-xl shadow-lg hover:bg-blue-700 hover:shadow-xl transition-all transform active:scale-95"
                >
                    Continue
                </button>
            </div>
        </div>
    );
};

export default Step3_License;
