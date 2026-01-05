import React, { useEffect } from 'react';
import { useForm, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { Step1Schema } from './Step1_Schema';
import InputField from '@shared/components/form/InputField';
import RadioGroup from '@shared/components/form/RadioGroup';
import DynamicRow from '@shared/components/form/DynamicRow';
import { useUtils } from '@shared/hooks/useUtils';
import { useData } from '@/context/DataContext';
import { AlertCircle } from 'lucide-react';

const Step1_Contact = ({ formData, updateFormData, onNavigate, onPartialSubmit }) => {
    const { states } = useUtils();
    const { currentCompanyProfile } = useData();
    const currentCompany = currentCompanyProfile;

    const { register, handleSubmit, control, watch, formState: { errors } } = useForm({
        resolver: zodResolver(Step1Schema),
        defaultValues: formData,
    });

    const onSubmit = (data) => {
        updateFormData(data);
        onNavigate('next');
    };

    // --- Configuration Helper ---
    const getConfig = (fieldId, defaultReq = true) => {
        const config = currentCompany?.applicationConfig?.[fieldId];
        return {
            hidden: config?.hidden || false,
            required: config !== undefined ? config.required : defaultReq
        };
    };

    const ssnConfig = getConfig('ssn', true);
    const dobConfig = getConfig('dob', true);
    const historyConfig = getConfig('addressHistory', true);
    const referralConfig = getConfig('referralSource', false);

    // --- Logic ---
    const knownByOtherName = watch('known-by-other-name') === 'yes';

    const yesNoOptions = [{ label: 'Yes', value: 'yes' }, { label: 'No', value: 'no' }];

    return (
        <form id="driver-form" onSubmit={handleSubmit(onSubmit)} className="form-step space-y-6">

            {/* --- Personal Details --- */}
            <fieldset className="border border-gray-300 rounded-lg p-4 space-y-4">
                <legend className="text-lg font-semibold text-gray-800 px-2">Step 1 of 9: Personal Information</legend>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                    <InputField label="First Name" id="first-name" {...register('firstName')} required={true} placeholder="John" error={errors.firstName} />
                    <InputField label="Middle Name" id="middle-name" {...register('middleName')} placeholder="M" error={errors.middleName} />
                    <InputField label="Last Name" id="last-name" {...register('lastName')} required={true} placeholder="Doe" error={errors.lastName} />
                    <InputField label="Suffix" id="suffix" {...register('suffix')} placeholder="Jr." error={errors.suffix} />
                </div>

                <div className="flex items-center pt-2 border-t border-gray-200">
                    <input
                        id="known-by-other-name"
                        type="checkbox"
                        {...register('known-by-other-name')}
                        className="h-4 w-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
                    />
                    <label htmlFor="known-by-other-name" className="ml-2 block text-sm font-medium text-gray-800">Known by other name(s)?</label>
                </div>

                {knownByOtherName && (
                    <div id="other-name-field" className="pt-2">
                        <InputField label="Other Name(s)" id="other-name" {...register('otherName')} placeholder="e.g., Johnny" error={errors.otherName} />
                    </div>
                )}

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                    {/* SSN Field - Configurable */}
                    {!ssnConfig.hidden && (
                        <div>
                            <InputField
                                label="Social Security Number (SSN)"
                                id="ssn"
                                {...register('ssn')}
                                required={ssnConfig.required}
                                placeholder="XXX-XX-XXXX"
                                error={errors.ssn}
                            />
                        </div>
                    )}

                    {/* DOB Field - Configurable */}
                    {!dobConfig.hidden && (
                        <InputField
                            label="Date of Birth"
                            id="dob"
                            type="date"
                            {...register('dob')}
                            required={dobConfig.required}
                            error={errors.dob}
                        />
                    )}
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-6 pt-4 border-t border-gray-200">
                    <div>
                        <InputField label="Phone" id="phone" type="tel" {...register('phone')} required={true} placeholder="(555) 555-5555" error={errors.phone} />
                    </div>
                    <div>
                        <InputField label="Email" id="email" type="email" {...register('email')} required={true} placeholder="you@example.com" error={errors.email} />
                    </div>
                </div>

                <Controller
                    name="sms-consent"
                    control={control}
                    render={({ field }) => (
                        <RadioGroup
                            label="Can we send you SMS messages?"
                            options={yesNoOptions}
                            horizontal={true}
                            {...field}
                        />
                    )}
                />


                {/* Referral Source - Configurable */}
                {!referralConfig.hidden && (
                    <div className="pt-4 border-t border-gray-200">
                        <InputField
                            label="How did you hear about us?"
                            id="referral-source"
                            {...register('referralSource')}
                            required={referralConfig.required}
                            placeholder="e.g. Facebook, Indeed, Friend..."
                            error={errors.referralSource}
                        />
                    </div>
                )}
            </fieldset>

            {/* --- Current Address --- */}
            <fieldset className="border border-gray-300 rounded-lg p-4 space-y-4 mt-6">
                <legend className="text-lg font-semibold text-gray-800 px-2">Current Address</legend>
                <div>
                    <InputField label="Address 1" id="street" {...register('street')} required={true} placeholder="123 Main St" error={errors.street} />
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-6">
                    <InputField label="City" id="city" {...register('city')} required={true} placeholder="Anytown" error={errors.city} />
                    <div>
                        <label htmlFor="state" className="block text-sm font-medium text-gray-700 mb-1">State <span className="text-red-500">*</span></label>
                        <select
                            id="state"
                            {...register('state')}
                            required
                            className="w-full p-3 border border-gray-300 rounded-lg shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white text-gray-700"
                        >
                            <option value="" disabled>Select State</option>
                            {states.map(state => <option key={state} value={state}>{state}</option>)}
                        </select>
                        {errors.state && <p className="text-red-500 text-xs mt-1">{errors.state.message}</p>}
                    </div>
                    <div>
                        <InputField label="ZIP Code" id="zip" {...register('zip')} required={true} placeholder="12345" error={errors.zip} />
                    </div>
                </div>

                {/* Only show "3 Years" question if history is not hidden */}
                {!historyConfig.hidden && (
                    <Controller
                        name="residence-3-years"
                        control={control}
                        render={({ field }) => (
                            <RadioGroup
                                label="Lived at this residence for 3 years or more?"
                                options={yesNoOptions}
                                horizontal={true}
                                required={historyConfig.required}
                                {...field}
                            />
                        )}
                    />
                )}
            </fieldset>

            {/* --- Previous Address History (Past 3 Years) --- */}
            <div className="mt-6 animate-in fade-in">
                <Controller
                    name="previousAddresses"
                    control={control}
                    render={({ field }) => (
                        <DynamicRow
                            listKey="previousAddresses"
                            title="Previous Addresses (Past 3 Years)"
                            formData={{ previousAddresses: field.value }}
                            updateFormData={(key, value) => field.onChange(value)}
                            initialItemState={{ street: '', city: '', state: '', zip: '', startDate: '', endDate: '' }}
                            addButtonLabel="Add Previous Address"
                            renderRow={(index, item, handleChange) => (
                                <div className="space-y-4">
                                    <InputField
                                        label="Address"
                                        id={`prev-street-${index}`}
                                        name="street"
                                        value={item.street}
                                        onChange={(n, v) => handleChange('street', v)}
                                        placeholder="123 Old St"
                                        required={true}
                                    />
                                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-6">
                                        <InputField
                                            label="City"
                                            id={`prev-city-${index}`}
                                            name="city"
                                            value={item.city}
                                            onChange={(n, v) => handleChange('city', v)}
                                            placeholder="City"
                                            required={true}
                                        />
                                        <div>
                                            <label htmlFor={`prev-state-${index}`} className="block text-sm font-medium text-gray-700 mb-1">State <span className="text-red-500">*</span></label>
                                            <select
                                                id={`prev-state-${index}`}
                                                name="state"
                                                value={item.state || ""}
                                                onChange={(e) => handleChange('state', e.target.value)}
                                                className="w-full p-3 border border-gray-300 rounded-lg shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white text-gray-700"
                                                required
                                            >
                                                <option value="" disabled>Select State</option>
                                                {states.map(state => <option key={state} value={state}>{state}</option>)}
                                            </select>
                                        </div>
                                        <InputField
                                            label="ZIP Code"
                                            id={`prev-zip-${index}`}
                                            name="zip"
                                            value={item.zip}
                                            onChange={(n, v) => handleChange('zip', v)}
                                            placeholder="Zip"
                                            required={true}
                                        />
                                    </div>
                                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                                        <InputField
                                            label="From Date"
                                            id={`prev-start-${index}`}
                                            name="startDate"
                                            type="month"
                                            value={item.startDate}
                                            onChange={(n, v) => handleChange('startDate', v)}
                                            required={true}
                                        />
                                        <InputField
                                            label="To Date"
                                            id={`prev-end-${index}`}
                                            name="endDate"
                                            type="month"
                                            value={item.endDate}
                                            onChange={(n, v) => handleChange('endDate', v)}
                                            required={true}
                                        />
                                    </div>
                                </div>
                            )}
                        />
                    )}
                />
            </div>


            {/* --- Buttons --- */}
            <div className="flex flex-col sm:flex-row sm:justify-end pt-6 space-y-3 sm:space-y-0 sm:space-x-4">
                <button
                    type="button"
                    name="submit-partial"
                    onClick={() => onPartialSubmit(watch())}
                    className="w-full sm:w-auto px-6 py-3 bg-gray-600 text-white font-semibold rounded-lg shadow-md hover:bg-gray-700 focus:outline-none focus:ring-2 focus:ring-gray-500 focus:ring-offset-2 transition duration-200"
                >
                    Save as Draft
                </button>
                <button
                    type="submit"
                    className="w-full sm:w-auto px-6 py-3 bg-blue-600 text-white font-semibold rounded-lg shadow-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 transition duration-200"
                >
                    Continue
                </button>
            </div>
        </form>
    );
};

export default Step1_Contact;
