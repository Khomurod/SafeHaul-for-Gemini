import React from 'react';
import InputField from '@shared/components/form/InputField';
import RadioGroup from '@shared/components/form/RadioGroup';
import { useUtils } from '@shared/hooks/useUtils';
import { useData } from '@/context/DataContext';
import { YES_NO_OPTIONS, ENGLISH_FLUENCY_OPTIONS } from '@/config/form-options';
import { Briefcase, Scale, AlertTriangle } from 'lucide-react';

const Step2_Qualifications = ({ formData, updateFormData, onNavigate }) => {
    const { currentCompanyProfile } = useData();
    const currentCompany = currentCompanyProfile;

    const getConfig = (fieldId, defaultReq = true) => {
        const config = currentCompany?.applicationConfig?.[fieldId];
        return {
            hidden: config?.hidden || false,
            required: config !== undefined ? config.required : defaultReq
        };
    };

    const handleChange = (name, value) => {
        updateFormData(name, value);
    };

    const handleContinue = () => {
        const form = document.getElementById('driver-form');
        if (form) {
            if (!form.checkValidity()) {
                form.reportValidity();
                return;
            }
        }
        onNavigate('next');
    };

    // Configs
    const posConfig = getConfig('positionApplyingTo', true);
    const expConfig = getConfig('experience', true);

    return (
        <div id="page-2" className="space-y-8 animate-in fade-in duration-500">
            
            <div className="space-y-2">
                <h3 className="text-2xl font-bold text-gray-900">General Qualifications</h3>
                <p className="text-gray-600">Please answer the following questions regarding your eligibility to drive.</p>
            </div>

            {/* CARD 1: POSITION & EXPERIENCE */}
            <section className="bg-white p-6 md:p-8 rounded-xl shadow-sm border border-gray-200 space-y-6">
                <div className="flex items-center gap-3 border-b border-gray-100 pb-4 mb-2">
                    <div className="p-2 bg-blue-50 rounded-lg text-blue-600">
                        <Briefcase size={20} />
                    </div>
                    <h4 className="text-lg font-bold text-gray-900">Position Details</h4>
                </div>

                <div className="space-y-6">
                    {!posConfig.hidden && (
                        <div className="space-y-2">
                            <label htmlFor="positionApplyingTo" className="block text-sm font-bold text-gray-900 uppercase tracking-wide">
                                Position Applying For {posConfig.required && <span className="text-red-500">*</span>}
                            </label>
                            <select 
                                id="positionApplyingTo" 
                                name="positionApplyingTo" 
                                required={posConfig.required} 
                                value={formData.positionApplyingTo || ""} 
                                onChange={(e) => handleChange(e.target.name, e.target.value)} 
                                className="w-full p-4 text-base border border-gray-300 rounded-lg bg-white focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition-all"
                            >
                                <option value="" disabled>Select Position</option>
                                <option value="Company Driver">Company Driver</option>
                                <option value="Owner Operator">Owner Operator</option>
                                <option value="Lease Purchase">Lease Purchase</option>
                                <option value="Team Driver">Team Driver</option>
                            </select>
                        </div>
                    )}

                    {!expConfig.hidden && (
                        <div className="space-y-2">
                            <label htmlFor="experience-years" className="block text-sm font-bold text-gray-900 uppercase tracking-wide">
                                Years of CDL Experience {expConfig.required && <span className="text-red-500">*</span>}
                            </label>
                            <select 
                                id="experience-years" 
                                name="experience-years" 
                                required={expConfig.required} 
                                value={formData['experience-years'] || ""} 
                                onChange={(e) => handleChange(e.target.name, e.target.value)} 
                                className="w-full p-4 text-base border border-gray-300 rounded-lg bg-white focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition-all"
                            >
                                <option value="" disabled>Select Experience</option>
                                <option value="Student">Student / Recent Grad</option>
                                <option value="< 1 year">Less than 1 year</option>
                                <option value="1-2 years">1-2 years</option>
                                <option value="2-5 years">2-5 years</option>
                                <option value="5+ years">5+ years</option>
                            </select>
                        </div>
                    )}
                </div>
            </section>

            {/* CARD 2: LEGAL & ELIGIBILITY */}
            <section className="bg-white p-6 md:p-8 rounded-xl shadow-sm border border-gray-200 space-y-6">
                <div className="flex items-center gap-3 border-b border-gray-100 pb-4 mb-2">
                    <div className="p-2 bg-green-50 rounded-lg text-green-600">
                        <Scale size={20} />
                    </div>
                    <h4 className="text-lg font-bold text-gray-900">Eligibility</h4>
                </div>

                <div className="space-y-6">
                    <RadioGroup 
                        label="Are you legally eligible to work in the United States?" 
                        name="legal-work" 
                        options={YES_NO_OPTIONS}
                        value={formData['legal-work']} 
                        onChange={(name, value) => handleChange(name, value)}
                        required={true}
                    />

                    <RadioGroup 
                        label="Can you speak and read English well enough to converse with the general public and respond to official inquiries?" 
                        name="english-fluency" 
                        options={YES_NO_OPTIONS}
                        value={formData['english-fluency']} 
                        onChange={(name, value) => handleChange(name, value)}
                        required={true}
                        helperText="Required by FMCSR 391.11(b)(2)"
                    />
                </div>
            </section>

            {/* CARD 3: DRUG & ALCOHOL */}
            <section className="bg-white p-6 md:p-8 rounded-xl shadow-sm border border-gray-200 space-y-6">
                <div className="flex items-center gap-3 border-b border-gray-100 pb-4 mb-2">
                    <div className="p-2 bg-red-50 rounded-lg text-red-600">
                        <AlertTriangle size={20} />
                    </div>
                    <h4 className="text-lg font-bold text-gray-900">Drug & Alcohol History</h4>
                </div>

                <div className="space-y-6">
                    <RadioGroup 
                        label="Have you tested positive, or refused to test, on any pre-employment drug or alcohol test administered by an employer to whom you applied, but did not obtain, safety-sensitive transportation work in the past two years?" 
                        name="drug-test-positive" 
                        options={YES_NO_OPTIONS}
                        value={formData['drug-test-positive']} 
                        onChange={(name, value) => handleChange(name, value)}
                        required={true}
                        horizontal={false}
                    />

                    {formData['drug-test-positive'] === 'yes' && (
                        <div className="animate-in fade-in space-y-4">
                            <RadioGroup 
                                label="If YES, have you successfully completed the return-to-duty process?" 
                                name="dot-return-to-duty" 
                                options={YES_NO_OPTIONS}
                                value={formData['dot-return-to-duty']} 
                                onChange={(name, value) => handleChange(name, value)}
                                required={true}
                            />
                            
                            <InputField 
                                label="Please provide details/explanation" 
                                id="drug-test-explanation" 
                                name="drug-test-explanation" 
                                value={formData['drug-test-explanation']} 
                                onChange={handleChange} 
                                required={true}
                                placeholder="Enter details here..."
                            />
                        </div>
                    )}
                </div>
            </section>

            {/* NAVIGATION */}
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

export default Step2_Qualifications;
