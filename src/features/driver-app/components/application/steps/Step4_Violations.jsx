import React from 'react';
import InputField from '@shared/components/form/InputField';
import RadioGroup from '@shared/components/form/RadioGroup';
import DynamicRow from '@shared/components/form/DynamicRow';
import { YES_NO_OPTIONS } from '@/config/form-options';
import { AlertCircle, Gavel } from 'lucide-react';

const Step4_Violations = ({ formData, updateFormData, onNavigate }) => {
    
    // Initial state for a single violation entry
    const initialViolation = { date: '', charge: '', location: '', penalty: '' };

    const handleContinue = () => {
        const form = document.getElementById('driver-form');
        if (form && !form.checkValidity()) {
            form.reportValidity();
            return;
        }
        onNavigate('next');
    };

    // Renders one Violation "Sub-Card"
    const renderViolationRow = (index, item, handleChange) => (
        <div key={index} className="p-4 mb-4 bg-gray-50 rounded-lg border border-gray-200 relative animate-in slide-in-from-bottom-2">
            <div className="absolute top-2 right-2 text-xs font-bold text-gray-400 uppercase tracking-wider">
                Violation #{index + 1}
            </div>
            
            <div className="space-y-4 pt-2">
                <InputField 
                    label="Date of Conviction" 
                    id={`viol-date-${index}`} 
                    name="date" 
                    type="date" 
                    value={item.date} 
                    onChange={handleChange} 
                    required={true}
                />
                
                <InputField 
                    label="Offense / Charge" 
                    id={`viol-charge-${index}`} 
                    name="charge" 
                    value={item.charge} 
                    onChange={handleChange} 
                    required={true}
                    placeholder="e.g. Speeding 15+ over"
                />
                
                <InputField 
                    label="Location (City & State)" 
                    id={`viol-loc-${index}`} 
                    name="location" 
                    value={item.location} 
                    onChange={handleChange} 
                    required={true}
                    placeholder="e.g. Dallas, TX"
                />
                
                <InputField 
                    label="Penalty Type" 
                    id={`viol-penalty-${index}`} 
                    name="penalty" 
                    value={item.penalty} 
                    onChange={handleChange} 
                    required={true}
                    placeholder="e.g. Fine, Points, Warning"
                />
            </div>
        </div>
    );

    return (
        <div id="page-4" className="space-y-8 animate-in fade-in duration-500">
            
            <div className="space-y-2">
                <h3 className="text-2xl font-bold text-gray-900">Driving Record</h3>
                <p className="text-gray-600">
                    List all traffic convictions and forfeitures for the past 3 years (other than parking violations).
                </p>
            </div>

            {/* CARD 1: LEGAL QUESTIONS */}
            <section className="bg-white p-6 md:p-8 rounded-xl shadow-sm border border-gray-200 space-y-6">
                <div className="flex items-center gap-3 border-b border-gray-100 pb-4 mb-2">
                    <div className="p-2 bg-red-50 rounded-lg text-red-600">
                        <Gavel size={20} />
                    </div>
                    <h4 className="text-lg font-bold text-gray-900">Legal Disclosures</h4>
                </div>

                <div className="space-y-6">
                    <RadioGroup 
                        label="Have you ever been denied a license, permit or privilege to operate a motor vehicle?" 
                        name="revoked-licenses" 
                        options={YES_NO_OPTIONS}
                        value={formData['revoked-licenses']} 
                        onChange={(name, value) => updateFormData(name, value)}
                        required={true}
                    />

                    <RadioGroup 
                        label="Has any license, permit or privilege ever been suspended or revoked?" 
                        name="driving-convictions" 
                        options={YES_NO_OPTIONS}
                        value={formData['driving-convictions']} 
                        onChange={(name, value) => updateFormData(name, value)}
                        required={true}
                    />

                    <RadioGroup 
                        label="Have you ever been convicted of a felony?" 
                        name="has-felony" 
                        options={YES_NO_OPTIONS}
                        value={formData['has-felony']} 
                        onChange={(name, value) => updateFormData(name, value)}
                        required={true}
                        horizontal={false}
                    />

                    {formData['has-felony'] === 'yes' && (
                        <div className="animate-in fade-in">
                            <InputField 
                                label="Please explain the felony conviction" 
                                id="felonyExplanation" 
                                name="felonyExplanation" 
                                value={formData.felonyExplanation} 
                                onChange={(name, value) => updateFormData(name, value)} 
                                required={true}
                            />
                        </div>
                    )}
                </div>
            </section>

            {/* CARD 2: VIOLATIONS LIST */}
            <section className="bg-white p-6 md:p-8 rounded-xl shadow-sm border border-gray-200 space-y-6">
                <div className="flex items-center gap-3 border-b border-gray-100 pb-4 mb-2">
                    <div className="p-2 bg-orange-50 rounded-lg text-orange-600">
                        <AlertCircle size={20} />
                    </div>
                    <h4 className="text-lg font-bold text-gray-900">Traffic Violations</h4>
                </div>

                {/* Using DynamicRow with Custom "Sub-Card" Renderer */}
                <DynamicRow
                    listKey="violations"
                    formData={formData}
                    updateFormData={updateFormData}
                    renderRow={renderViolationRow}
                    initialItemState={initialViolation}
                    addButtonLabel="+ Add Violation"
                    emptyMessage="I certify that I have had no violations in the past 3 years."
                />
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

export default Step4_Violations;
