import React from 'react';
import { useForm, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { Step3Schema } from './Step3_Schema';
import InputField from '@shared/components/form/InputField';
import RadioGroup from '@shared/components/form/RadioGroup';
import DynamicRow from '@shared/components/form/DynamicRow';
import { useUtils } from '@shared/hooks/useUtils';
import { useData } from '@/context/DataContext';
import { YES_NO_OPTIONS, LICENSE_CLASS_OPTIONS, ENDORSEMENT_OPTIONS } from '@/config/form-options';

const Step3_License = ({ control, onNavigate, handleFileUpload }) => {
    const { states } = useUtils();
    const { currentCompanyProfile } = useData();
    const currentCompany = currentCompanyProfile;

    const { handleSubmit, watch, register } = useForm({
        resolver: zodResolver(Step3Schema),
    });

    const onSubmit = (data) => {
        onNavigate('next');
    };

    // --- Configuration ---
    const getConfig = (fieldId, defaultReq = true) => {
        const config = currentCompany?.applicationConfig?.[fieldId];
        return {
            hidden: config?.hidden || false,
            required: config !== undefined ? config.required : defaultReq
        };
    };

    const cdlUploadConfig = getConfig('cdlUpload', true);
    const medCardConfig = getConfig('medCardUpload', false);

    const hasTwic = watch('has-twic') === 'yes';

    return (
        <form onSubmit={handleSubmit(onSubmit)} className="form-step space-y-6">
            <h3 className="text-xl font-semibold text-gray-800">Step 3 of 9: License Information</h3>

            <fieldset className="border border-gray-300 rounded-lg p-4 space-y-4">
                <legend className="text-lg font-semibold text-gray-800 px-2">Current License Information</legend>

                <div>
                    <label htmlFor="cdl-state" className="block text-sm font-medium text-gray-700 mb-1">License State <span className="text-red-500">*</span></label>
                    <select
                        id="cdl-state"
                        required
                        className="w-full p-3 border border-gray-300 rounded-lg shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white text-gray-700"
                        {...register('cdlState')}
                    >
                        <option value="" disabled>Select State</option>
                        {states.map(state => <option key={state} value={state}>{state}</option>)}
                    </select>
                </div>

                <Controller
                    name="cdlClass"
                    control={control}
                    render={({ field }) => (
                        <RadioGroup
                            label="License Class"
                            options={LICENSE_CLASS_OPTIONS}
                            required={true}
                            horizontal={false}
                            {...field}
                        />
                    )}
                />


                <InputField label="License Number" id="cdl-number" required={true} {...register('cdlNumber')} />
                <InputField label="License Expiration" id="cdl-expiration" type="date" required={true} {...register('cdlExpiration')} />

                <div className="space-y-3 pt-4 border-t border-gray-200">
                    <label className="block text-sm font-medium text-gray-900">Endorsements</label>
                    <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                        {ENDORSEMENT_OPTIONS.map(option => (
                            <div key={option.value} className="flex items-center">
                                <input
                                    id={'endorse-' + option.value}
                                    type="checkbox"
                                    className="h-4 w-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
                                    value={option.value}
                                    {...register('endorsements')}
                                />
                                <label htmlFor={'endorse-' + option.value} className="ml-2 text-sm text-gray-700">{option.label}</label>
                            </div>
                        ))}
                    </div>
                </div>

                {/* --- Additional Licenses from Other States --- */}
                <div className="pt-6 border-t border-gray-200">
                    <Controller
                        name="has-other-licenses"
                        control={control}
                        render={({ field }) => (
                            <RadioGroup
                                label="Have you held a license in any other state in the past 3 years?"
                                options={YES_NO_OPTIONS}
                                required={true}
                                {...field}
                            />
                        )}
                    />

                    {watch('has-other-licenses') === 'yes' && (
                        <div className="mt-4 animate-in fade-in">
                            <h4 className="text-sm font-semibold text-gray-800 mb-2">Additional Licenses (Past 3 Years)</h4>
                            <Controller
                                name="additionalLicenses"
                                control={control}
                                render={({ field }) => (
                                    <DynamicRow
                                        listKey="additionalLicenses"
                                        title=""
                                        formData={{ additionalLicenses: field.value }}
                                        updateFormData={(key, value) => field.onChange(value)}
                                        initialItemState={{ state: '', number: '', class: 'A', expiration: '' }}
                                        addButtonLabel="Add Another License"
                                        renderRow={(index, item, handleChange) => (
                                            <div className="space-y-4">
                                                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                                    <div>
                                                        <label htmlFor={`add-lic-state-${index}`} className="block text-sm font-medium text-gray-700 mb-1">State <span className="text-red-500">*</span></label>
                                                        <select
                                                            id={`add-lic-state-${index}`}
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
                                                        label="License Number"
                                                        id={`add-lic-number-${index}`}
                                                        value={item.number}
                                                        onChange={(n, v) => handleChange('number', v)}
                                                        placeholder="License #"
                                                        required={true}
                                                    />
                                                </div>
                                                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                                    <div>
                                                        <label htmlFor={`add-lic-class-${index}`} className="block text-sm font-medium text-gray-700 mb-1">Class <span className="text-red-500">*</span></label>
                                                        <select
                                                            id={`add-lic-class-${index}`}
                                                            value={item.class || "A"}
                                                            onChange={(e) => handleChange('class', e.target.value)}
                                                            className="w-full p-3 border border-gray-300 rounded-lg shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white text-gray-700"
                                                            required
                                                        >
                                                            {LICENSE_CLASS_OPTIONS.map(opt => <option key={opt.value} value={opt.value}>{opt.label}</option>)}
                                                        </select>
                                                    </div>
                                                    <InputField
                                                        label="Expiration Date"
                                                        id={`add-lic-exp-${index}`}
                                                        type="date"
                                                        value={item.expiration}
                                                        onChange={(n, v) => handleChange('expiration', v)}
                                                        required={true}
                                                    />
                                                </div>
                                            </div>
                                        )}
                                    />
                                )}
                            />
                        </div>
                    )}
                </div>

                {/* CDL UPLOADS */}
                {!cdlUploadConfig.hidden && (
                    <div className="space-y-4 pt-4 border-t border-gray-200">
                        <InputField
                            label="Upload CDL (Front)"
                            id="cdl-front"
                            type="file"
                            onChange={(name, file) => handleFileUpload(name, file)}
                            required={cdlUploadConfig.required}
                        />
                        <InputField
                            label="Upload CDL (Back)"
                            id="cdl-back"
                            type="file"
                            onChange={(name, file) => handleFileUpload(name, file)}
                            required={cdlUploadConfig.required}
                        />
                    </div>
                )}

                {/* MEDICAL CARD UPLOAD */}
                {!medCardConfig.hidden && (
                    <div className="pt-4 border-t border-gray-200">
                        <InputField
                            label="Upload Medical Card"
                            id="medical-card-upload"
                            type="file"
                            onChange={(name, file) => handleFileUpload(name, file)}
                            required={medCardConfig.required}
                        />
                    </div>
                )}

            </fieldset>

            <fieldset className="border border-gray-300 rounded-lg p-4 space-y-4 mt-6">
                <legend className="text-lg font-semibold text-gray-800 px-2">TWIC Card</legend>
                <Controller
                    name="has-twic"
                    control={control}
                    render={({ field }) => (
                        <RadioGroup
                            label="Do you have a TWIC (Transportation Worker Identification Credential) card?"
                            options={YES_NO_OPTIONS}
                            required={true}
                            {...field}
                        />
                    )}
                />
                {hasTwic && (
                    <div id="twic-card-details" className="space-y-4 pt-4 border-t border-gray-200">
                        <InputField label="Expiration Date" id="twic-expiration" type="date" {...register('twicExpiration')} />
                        <InputField
                            label="Upload TWIC Card"
                            id="twic-card-upload"
                            type="file"
                            onChange={(name, file) => handleFileUpload(name, file)}
                        />
                    </div>
                )}
            </fieldset>

            <div className="flex justify-between pt-6">
                <button
                    type="button"
                    onClick={() => onNavigate('back')}
                    className="w-auto px-6 py-3 bg-gray-600 text-white font-semibold rounded-lg shadow-md hover:bg-gray-700 focus:outline-none focus:ring-2 focus:ring-gray-500 focus:ring-offset-2 transition duration-200"
                >
                    Back
                </button>
                <button
                    type="submit"
                    className="w-auto px-6 py-3 bg-blue-600 text-white font-semibold rounded-lg shadow-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 transition duration-200"
                >
                    Continue
                </button>
            </div>
        </form>
    );
};

export default Step3_License;
