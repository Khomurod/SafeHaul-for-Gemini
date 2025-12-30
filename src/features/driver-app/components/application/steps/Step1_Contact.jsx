import React from 'react';
import InputField from '@shared/components/form/InputField';
import RadioGroup from '@shared/components/form/RadioGroup';
import { useUtils } from '@shared/hooks/useUtils';
import { YES_NO_OPTIONS } from '@/config/form-options';
import { User, MapPin, Phone, FileText } from 'lucide-react';

const Step1_Contact = ({ formData, updateFormData, onNavigate }) => {
    const { states } = useUtils();

    const handleChange = (name, value) => {
        updateFormData(name, value);
    };

    const handleContinue = () => {
        // 1. Basic HTML5 Validation
        const form = document.getElementById('driver-form');
        if (form) {
            if (!form.checkValidity()) {
                form.reportValidity();
                return;
            }
        }

        // 2. Age Validation (FMCSA Requirement)
        if (formData.dob) {
            if (!validateAge(formData.dob)) {
                alert("You must be at least 21 years old to apply.");
                return;
            }
        }

        onNavigate('next');
    };

    const validateAge = (dateString) => {
        const today = new Date();
        const birthDate = new Date(dateString);
        let age = today.getFullYear() - birthDate.getFullYear();
        const m = today.getMonth() - birthDate.getMonth();
        if (m < 0 || (m === 0 && today.getDate() < birthDate.getDate())) {
            age--;
        }
        return age >= 21;
    };

    return (
        <div id="page-1" className="space-y-8 animate-in fade-in duration-500">
            
            {/* Header */}
            <div className="space-y-2">
                <h3 className="text-2xl font-bold text-gray-900">Personal Information</h3>
                <p className="text-gray-600">
                    Please provide your legal details as they appear on your Commercial Driver's License (CDL).
                </p>
            </div>

            {/* CARD 1: IDENTITY */}
            <section className="bg-white p-6 md:p-8 rounded-xl shadow-sm border border-gray-200 space-y-6">
                <div className="flex items-center gap-3 border-b border-gray-100 pb-4 mb-2">
                    <div className="p-2 bg-blue-50 rounded-lg text-blue-600">
                        <User size={20} />
                    </div>
                    <h4 className="text-lg font-bold text-gray-900">Legal Identity</h4>
                </div>

                <div className="space-y-6">
                    <InputField 
                        label="First Name" 
                        id="firstName" 
                        name="firstName" 
                        value={formData.firstName} 
                        onChange={handleChange} 
                        required 
                        placeholder="Legal First Name"
                        className="w-full"
                    />
                    
                    <InputField 
                        label="Middle Name" 
                        id="middleName" 
                        name="middleName" 
                        value={formData.middleName} 
                        onChange={handleChange} 
                        placeholder="Middle Name (Optional)"
                        className="w-full"
                    />
                    
                    <InputField 
                        label="Last Name" 
                        id="lastName" 
                        name="lastName" 
                        value={formData.lastName} 
                        onChange={handleChange} 
                        required 
                        placeholder="Legal Last Name"
                        className="w-full"
                    />

                    <InputField 
                        label="Suffix" 
                        id="suffix" 
                        name="suffix" 
                        value={formData.suffix} 
                        onChange={handleChange} 
                        placeholder="Jr, Sr, III (Optional)"
                        className="w-full"
                    />

                    <div className="pt-4 border-t border-gray-100">
                        <RadioGroup 
                            label="Are you known by any other name?" 
                            name="known-by-other-name" 
                            options={YES_NO_OPTIONS}
                            value={formData['known-by-other-name']} 
                            onChange={(name, value) => handleChange(name, value)}
                        />
                        
                        {formData['known-by-other-name'] === 'yes' && (
                            <div className="mt-4 animate-in slide-in-from-top-2">
                                <InputField 
                                    label="Other Name(s) Used" 
                                    id="otherName" 
                                    name="otherName" 
                                    value={formData.otherName} 
                                    onChange={handleChange} 
                                    required
                                    placeholder="Maiden name, alias, etc."
                                />
                            </div>
                        )}
                    </div>

                    <div className="grid grid-cols-1 gap-6 pt-4 border-t border-gray-100">
                        <div>
                            <InputField 
                                label="Social Security Number (SSN)" 
                                id="ssn" 
                                name="ssn" 
                                value={formData.ssn} 
                                onChange={handleChange} 
                                required 
                                placeholder="XXX-XX-XXXX"
                            />
                            <p className="text-xs text-gray-500 mt-1.5 flex items-center gap-1">
                                <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="w-3 h-3">
                                  <path fillRule="evenodd" d="M10 1a4.5 4.5 0 00-4.5 4.5V9H5a2 2 0 00-2 2v6a2 2 0 002 2h10a2 2 0 002-2v-6a2 2 0 00-2-2h-.5V5.5A4.5 4.5 0 0010 1zm3 8V5.5a3 3 0 10-6 0V9h6z" clipRule="evenodd" />
                                </svg>
                                Encrypted securely for background check purposes only.
                            </p>
                        </div>
                        
                        <div>
                            <InputField 
                                label="Date of Birth" 
                                id="dob" 
                                name="dob" 
                                type="date" 
                                value={formData.dob} 
                                onChange={handleChange} 
                                required 
                            />
                            <p className="text-xs text-gray-500 mt-1.5">
                                Must be at least 21 years of age to operate interstate.
                            </p>
                        </div>
                    </div>
                </div>
            </section>

            {/* CARD 2: CONTACT */}
            <section className="bg-white p-6 md:p-8 rounded-xl shadow-sm border border-gray-200 space-y-6">
                <div className="flex items-center gap-3 border-b border-gray-100 pb-4 mb-2">
                    <div className="p-2 bg-green-50 rounded-lg text-green-600">
                        <Phone size={20} />
                    </div>
                    <h4 className="text-lg font-bold text-gray-900">Contact Details</h4>
                </div>

                <div className="space-y-6">
                    <InputField 
                        label="Phone Number" 
                        id="phone" 
                        name="phone" 
                        type="tel" 
                        value={formData.phone} 
                        onChange={handleChange} 
                        required 
                        placeholder="(555) 555-5555"
                    />

                    <InputField 
                        label="Email Address" 
                        id="email" 
                        name="email" 
                        type="email" 
                        value={formData.email} 
                        onChange={handleChange} 
                        required 
                        placeholder="name@example.com"
                    />
                </div>
            </section>

            {/* CARD 3: ADDRESS */}
            <section className="bg-white p-6 md:p-8 rounded-xl shadow-sm border border-gray-200 space-y-6">
                <div className="flex items-center gap-3 border-b border-gray-100 pb-4 mb-2">
                    <div className="p-2 bg-indigo-50 rounded-lg text-indigo-600">
                        <MapPin size={20} />
                    </div>
                    <h4 className="text-lg font-bold text-gray-900">Current Residence</h4>
                </div>

                <div className="space-y-6">
                    <InputField 
                        label="Street Address" 
                        id="street" 
                        name="street" 
                        value={formData.street} 
                        onChange={handleChange} 
                        required 
                        placeholder="123 Main St"
                    />

                    <div className="space-y-6">
                         <InputField 
                            label="City" 
                            id="city" 
                            name="city" 
                            value={formData.city} 
                            onChange={handleChange} 
                            required 
                        />

                        <div className="space-y-2">
                            <label htmlFor="state" className="block text-sm font-bold text-gray-900">
                                State <span className="text-red-500">*</span>
                            </label>
                            <select 
                                id="state" 
                                name="state" 
                                required 
                                value={formData.state || ""} 
                                onChange={(e) => handleChange(e.target.name, e.target.value)} 
                                className="w-full p-4 border border-gray-300 rounded-lg bg-white text-gray-900 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition-all"
                            >
                                <option value="" disabled>Select State</option>
                                {states.map(state => (
                                    <option key={state} value={state}>{state}</option>
                                ))}
                            </select>
                        </div>

                        <InputField 
                            label="Zip Code" 
                            id="zip" 
                            name="zip" 
                            value={formData.zip} 
                            onChange={handleChange} 
                            required 
                            placeholder="12345"
                        />
                    </div>

                    <div className="pt-4 border-t border-gray-100">
                        <RadioGroup 
                            label="Have you lived at this address for 3 years?" 
                            name="residence-3-years" 
                            options={YES_NO_OPTIONS}
                            value={formData['residence-3-years']} 
                            onChange={(name, value) => handleChange(name, value)}
                        />
                        
                        {formData['residence-3-years'] === 'no' && (
                            <div className="mt-6 p-4 bg-gray-50 rounded-lg border border-gray-200 animate-in fade-in">
                                <p className="text-sm font-bold text-gray-700 mb-4 uppercase tracking-wide">Previous Address</p>
                                <div className="space-y-4">
                                    <InputField label="Previous Street" id="prevStreet" name="prevStreet" value={formData.prevStreet} onChange={handleChange} required />
                                    <InputField label="Previous City" id="prevCity" name="prevCity" value={formData.prevCity} onChange={handleChange} required />
                                    <div className="space-y-2">
                                        <label className="block text-sm font-bold text-gray-700">Previous State</label>
                                        <select name="prevState" value={formData.prevState || ""} onChange={(e) => handleChange("prevState", e.target.value)} required className="w-full p-3 border border-gray-300 rounded-lg bg-white"><option value="">Select State</option>{states.map(s => <option key={s} value={s}>{s}</option>)}</select>
                                    </div>
                                    <InputField label="Previous Zip" id="prevZip" name="prevZip" value={formData.prevZip} onChange={handleChange} required />
                                </div>
                            </div>
                        )}
                    </div>
                </div>
            </section>

             {/* CARD 4: REFERRAL */}
             <section className="bg-white p-6 md:p-8 rounded-xl shadow-sm border border-gray-200 space-y-6">
                <div className="flex items-center gap-3 border-b border-gray-100 pb-4 mb-2">
                    <div className="p-2 bg-purple-50 rounded-lg text-purple-600">
                        <FileText size={20} />
                    </div>
                    <h4 className="text-lg font-bold text-gray-900">Application Source</h4>
                </div>
                <div className="space-y-6">
                     <InputField 
                        label="How did you hear about us?" 
                        id="referralSource" 
                        name="referralSource" 
                        value={formData.referralSource} 
                        onChange={handleChange} 
                        placeholder="e.g., Facebook, Indeed, Friend..."
                    />
                </div>
            </section>

            {/* Navigation */}
            <div className="flex justify-end pt-8 pb-10">
                <button 
                    type="button" 
                    onClick={handleContinue}
                    className="w-full sm:w-auto px-10 py-4 bg-blue-600 text-white font-bold text-lg rounded-xl shadow-lg hover:bg-blue-700 hover:shadow-xl focus:outline-none focus:ring-4 focus:ring-blue-200 transition-all transform active:scale-95"
                >
                    Save & Continue
                </button>
            </div>
        </div>
    );
};

export default Step1_Contact;
