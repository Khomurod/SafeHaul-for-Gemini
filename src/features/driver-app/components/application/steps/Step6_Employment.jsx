import React from 'react';
import InputField from '@shared/components/form/InputField';
import RadioGroup from '@shared/components/form/RadioGroup';
import DynamicRow from '@shared/components/form/DynamicRow';
import { useUtils } from '@shared/hooks/useUtils';
import { useData } from '@/context/DataContext';
import { YES_NO_OPTIONS, MILITARY_BRANCH_OPTIONS } from '@/config/form-options';
import { Truck, Calendar, Building, Mail, AlertCircle, BookOpen, Flag } from 'lucide-react';

const Step6_Employment = ({ formData, updateFormData, onNavigate }) => {
    const { states } = useUtils();
    const { currentCompanyProfile } = useData();
    const currentCompany = currentCompanyProfile;

    // --- Configuration ---
    const getConfig = (fieldId, defaultReq = true) => {
        const config = currentCompany?.applicationConfig?.[fieldId];
        return {
            hidden: config?.hidden || false,
            required: config !== undefined ? config.required : defaultReq
        };
    };

    const empHistoryConfig = getConfig('employmentHistory', true);

    // Initial States
    const initialEmployer = { 
        name: '', street: '', city: '', state: '', zip: '', 
        phone: '', fax: '', email: '', contactPerson: '', 
        position: '', dates: '', reason: '' 
    };
    
    const initialSchool = { name: '', dates: '', location: '' };
    const initialUnemployment = { startDate: '', endDate: '', details: '' };
    const initialMilitary = { branch: '', start: '', end: '', rank: '', heavyEq: 'no', honorable: 'yes', explanation: '' };

    const handleContinue = () => {
        const form = document.getElementById('driver-form');
        if (form && !form.checkValidity()) {
            form.reportValidity();
            return;
        }
        onNavigate('next');
    };

    // --- RENDERERS ---

    const renderEmployerRow = (index, item, handleChange) => (
        <div key={index} className="p-5 mb-6 bg-white rounded-xl border border-gray-200 shadow-sm relative animate-in slide-in-from-bottom-2">
            <div className="absolute top-0 right-0 bg-gray-100 px-3 py-1 rounded-bl-xl text-xs font-bold text-gray-500 uppercase tracking-wider">
                Employer #{index + 1}
            </div>

            {/* 1. Company Details */}
            <div className="space-y-5 pt-4">
                <div className="flex items-center gap-2 mb-2">
                    <Building size={18} className="text-gray-400" />
                    <h5 className="text-sm font-bold text-gray-900 uppercase">Company Information</h5>
                </div>

                <InputField 
                    label="Company Name" 
                    id={'emp-name-' + index} 
                    name="name" 
                    value={item.name} 
                    onChange={handleChange} 
                    required={empHistoryConfig.required} 
                    placeholder="Official Name"
                />
                
                <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                    <InputField 
                        label="Position Held" 
                        id={'emp-position-' + index} 
                        name="position" 
                        value={item.position} 
                        onChange={handleChange} 
                        required={true}
                    />
                    <InputField 
                        label="Dates Employed" 
                        id={'emp-dates-' + index} 
                        name="dates" 
                        value={item.dates} 
                        onChange={handleChange} 
                        required={true}
                        placeholder="MM/YYYY - MM/YYYY"
                    />
                </div>

                <div className="space-y-2">
                    <label className="block text-sm font-bold text-gray-900 uppercase tracking-wide">
                        Address <span className="text-red-500">*</span>
                    </label>
                    <div className="grid grid-cols-1 gap-4">
                        <input
                            type="text"
                            placeholder="Street Address"
                            className="w-full p-4 border border-gray-300 rounded-lg"
                            value={item.street || ""}
                            onChange={(e) => handleChange("street", e.target.value)}
                            required={empHistoryConfig.required}
                        />
                        <div className="grid grid-cols-2 gap-4">
                            <input
                                type="text"
                                placeholder="City"
                                className="w-full p-4 border border-gray-300 rounded-lg"
                                value={item.city || ""}
                                onChange={(e) => handleChange("city", e.target.value)}
                                required={empHistoryConfig.required}
                            />
                            <select 
                                required={empHistoryConfig.required} 
                                value={item.state || ""} 
                                onChange={(e) => handleChange("state", e.target.value)} 
                                className="w-full p-4 border border-gray-300 rounded-lg bg-white"
                            >
                                <option value="" disabled>State</option>
                                {states.map(state => <option key={state} value={state}>{state}</option>)}
                            </select>
                        </div>
                        <input
                            type="text"
                            placeholder="Zip Code"
                            className="w-full p-4 border border-gray-300 rounded-lg"
                            value={item.zip || ""}
                            onChange={(e) => handleChange("zip", e.target.value)}
                            required={empHistoryConfig.required}
                        />
                    </div>
                </div>

                <InputField 
                    label="Reason for Leaving" 
                    id={'emp-reason-' + index} 
                    name="reason" 
                    value={item.reason} 
                    onChange={handleChange} 
                    required={true}
                />
            </div>

            {/* 2. Verification Contact (Highlighted) */}
            <div className="mt-6 p-4 bg-blue-50 rounded-lg border border-blue-100">
                <div className="flex items-center gap-2 mb-4">
                    <Mail size={18} className="text-blue-600" />
                    <h5 className="text-sm font-bold text-blue-900 uppercase">Verification Contact</h5>
                </div>
                <p className="text-xs text-blue-700 mb-4">
                    Please provide a valid email/phone for the safety manager or HR department. We will use this to automatically verify your employment.
                </p>

                <div className="space-y-4">
                    <InputField 
                        label="Supervisor / Contact Person" 
                        id={'emp-contact-' + index} 
                        name="contactPerson" 
                        value={item.contactPerson} 
                        onChange={handleChange} 
                        placeholder="e.g. Jane Doe (Safety Director)"
                    />
                    
                    <InputField 
                        label="Email Address" 
                        id={'emp-email-' + index} 
                        name="email" 
                        type="email"
                        value={item.email} 
                        onChange={handleChange} 
                        placeholder="safety@company.com"
                        required={true}
                        helperText="Required for automated verification."
                    />

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <InputField 
                            label="Phone" 
                            id={'emp-phone-' + index} 
                            name="phone" 
                            type="tel" 
                            value={item.phone} 
                            onChange={handleChange} 
                            required={true}
                        />
                        <InputField 
                            label="Fax (Optional)" 
                            id={'emp-fax-' + index} 
                            name="fax" 
                            type="tel" 
                            value={item.fax} 
                            onChange={handleChange} 
                        />
                    </div>
                </div>
            </div>
        </div>
    );

    const renderUnemploymentRow = (index, item, handleChange) => (
        <div key={index} className="p-4 mb-4 bg-gray-50 rounded-lg border border-gray-200">
            <div className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                    <InputField label="Start Date" id={`gap-start-${index}`} name="startDate" value={item.startDate} onChange={handleChange} required placeholder="MM/YYYY" />
                    <InputField label="End Date" id={`gap-end-${index}`} name="endDate" value={item.endDate} onChange={handleChange} required placeholder="MM/YYYY" />
                </div>
                <InputField label="Explanation" id={`gap-det-${index}`} name="details" value={item.details} onChange={handleChange} required placeholder="Reason for gap..." />
            </div>
        </div>
    );

    const renderSchoolRow = (index, item, handleChange) => (
        <div key={index} className="p-4 mb-4 bg-gray-50 rounded-lg border border-gray-200 space-y-4">
            <InputField label="School Name" id={`sch-name-${index}`} name="name" value={item.name} onChange={handleChange} required />
            <InputField label="Dates Attended" id={`sch-dates-${index}`} name="dates" value={item.dates} onChange={handleChange} />
            <InputField label="Location" id={`sch-loc-${index}`} name="location" value={item.location} onChange={handleChange} />
        </div>
    );

    const renderMilitaryRow = (index, item, handleChange) => (
        <div key={index} className="p-4 mb-4 bg-gray-50 rounded-lg border border-gray-200 space-y-4">
            <RadioGroup label="Branch" name="branch" options={MILITARY_BRANCH_OPTIONS} value={item.branch} onChange={(n, v) => handleChange(n, v)} required horizontal={false} />
            <div className="grid grid-cols-2 gap-4">
                <InputField label="Start Date" id={`mil-start-${index}`} name="start" value={item.start} onChange={handleChange} required />
                <InputField label="End Date" id={`mil-end-${index}`} name="end" value={item.end} onChange={handleChange} required />
            </div>
            <InputField label="Rank at Discharge" id={`mil-rank-${index}`} name="rank" value={item.rank} onChange={handleChange} required />
            <RadioGroup label="Honorable Discharge?" name="honorable" options={YES_NO_OPTIONS} value={item.honorable} onChange={(n, v) => handleChange(n, v)} />
        </div>
    );

    return (
        <div id="page-6" className="space-y-8 animate-in fade-in duration-500">
            
            <div className="space-y-2">
                <h3 className="text-2xl font-bold text-gray-900">Employment History</h3>
                <p className="text-gray-600">
                    Provide 3 years of history. If you drove a CMV, provide 10 years.
                </p>
            </div>

            {/* 1. EMPLOYERS */}
            {!empHistoryConfig.hidden && (
                <section className="space-y-4">
                    <div className="flex items-center gap-3 mb-2">
                        <div className="p-2 bg-blue-50 rounded-lg text-blue-600">
                            <Truck size={20} />
                        </div>
                        <h4 className="text-lg font-bold text-gray-900">Previous Employers</h4>
                    </div>
                    
                    <div className="bg-gray-50 p-4 rounded-xl border border-gray-200">
                        <DynamicRow
                            listKey="employers"
                            formData={formData}
                            updateFormData={updateFormData}
                            renderRow={renderEmployerRow}
                            initialItemState={initialEmployer}
                            addButtonLabel="+ Add Employer"
                            emptyMessage="No previous employers listed. Click below to add."
                        />
                    </div>
                </section>
            )}

            {/* 2. GAPS */}
            <section className="space-y-4">
                <div className="flex items-center gap-3 mb-2">
                    <div className="p-2 bg-orange-50 rounded-lg text-orange-600">
                        <Calendar size={20} />
                    </div>
                    <h4 className="text-lg font-bold text-gray-900">Employment Gaps</h4>
                </div>
                <div className="bg-white p-6 rounded-xl border border-gray-200 shadow-sm">
                    <p className="text-sm text-gray-500 mb-4">Explain any gaps in employment of 30 days or more.</p>
                    <DynamicRow
                        listKey="unemployment"
                        formData={formData}
                        updateFormData={updateFormData}
                        renderRow={renderUnemploymentRow}
                        initialItemState={initialUnemployment}
                        addButtonLabel="+ Add Gap Explanation"
                    />
                </div>
            </section>

            {/* 3. SCHOOLS */}
            <section className="space-y-4">
                <div className="flex items-center gap-3 mb-2">
                    <div className="p-2 bg-indigo-50 rounded-lg text-indigo-600">
                        <BookOpen size={20} />
                    </div>
                    <h4 className="text-lg font-bold text-gray-900">Driving Schools</h4>
                </div>
                <div className="bg-white p-6 rounded-xl border border-gray-200 shadow-sm">
                    <DynamicRow
                        listKey="schools"
                        formData={formData}
                        updateFormData={updateFormData}
                        renderRow={renderSchoolRow}
                        initialItemState={initialSchool}
                        addButtonLabel="+ Add Driving School"
                    />
                </div>
            </section>

            {/* 4. MILITARY */}
            <section className="space-y-4">
                <div className="flex items-center gap-3 mb-2">
                    <div className="p-2 bg-gray-100 rounded-lg text-gray-600">
                        <Flag size={20} />
                    </div>
                    <h4 className="text-lg font-bold text-gray-900">Military Service</h4>
                </div>
                <div className="bg-white p-6 rounded-xl border border-gray-200 shadow-sm">
                    <DynamicRow
                        listKey="military"
                        formData={formData}
                        updateFormData={updateFormData}
                        renderRow={renderMilitaryRow}
                        initialItemState={initialMilitary}
                        addButtonLabel="+ Add Military Service"
                    />
                </div>
            </section>

            {/* NAV */}
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

export default Step6_Employment;
