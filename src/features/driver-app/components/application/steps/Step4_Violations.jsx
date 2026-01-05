import React from 'react';
import { useForm, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { Step4Schema } from './Step4_Schema';
import InputField from '@shared/components/form/InputField';
import RadioGroup from '@shared/components/form/RadioGroup';
import DynamicRow from '@shared/components/form/DynamicRow';
import { useData } from '@/context/DataContext';
import { YES_NO_OPTIONS } from '@/config/form-options';

const Step4_Violations = ({ control, onNavigate }) => {
    const { currentCompanyProfile } = useData();
    const currentCompany = currentCompanyProfile;

    const { handleSubmit, watch, register } = useForm({
        resolver: zodResolver(Step4Schema),
    });

    const onSubmit = (data) => {
        onNavigate('next');
    };

    const initialViolation = { date: '', charge: '', location: '', penalty: '' };

    const renderViolationRow = (index, item, handleChange) => (
        <div key={index} className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <InputField
                label="Date of Conviction"
                id={'violation-date-' + index}
                name="date"
                type="date"
                value={item.date}
                onChange={handleChange}
                required={true}
            />
            <InputField
                label="Charge"
                id={'violation-charge-' + index}
                name="charge"
                value={item.charge}
                onChange={handleChange}
                required={true}
            />
            <InputField
                label="Location (City, State)"
                id={'violation-location-' + index}
                name="location"
                value={item.location}
                onChange={handleChange}
                className="sm:col-span-2"
            />
            <InputField
                label="Penalty"
                id={'violation-penalty-' + index}
                name="penalty"
                value={item.penalty}
                onChange={handleChange}
                className="sm:col-span-2"
            />
        </div>
    );

    return (
        <form onSubmit={handleSubmit(onSubmit)} className="form-step space-y-6">
            <h3 className="text-xl font-semibold text-gray-800">Step 4 of 9: Motor Vehicle Record</h3>

            <fieldset className="border border-gray-300 rounded-lg p-4 space-y-4">
                <legend className="text-lg font-semibold text-gray-800 px-2">Consent & Revocations</legend>

                <div className="space-y-2 pt-4 border-t border-gray-200">
                    <label className="block text-sm font-medium text-gray-900">Motor Vehicle Record (MVR) Check</label>
                    <p className="text-sm text-gray-600">This is required for employment. We will pull your driving record from all states where you have held a license in the past 3 years.</p>
                    <Controller
                        name="consent-mvr"
                        control={control}
                        render={({ field }) => (
                            <RadioGroup
                                label="I Consent to MVR Check"
                                options={YES_NO_OPTIONS}
                                required={true}
                                {...field}
                            />
                        )}
                    />
                </div>

                <Controller
                    name="revoked-licenses"
                    control={control}
                    render={({ field }) => (
                        <RadioGroup
                            label="Has any license, permit or privilege ever been denied, suspended, or revoked for any reason?"
                            options={YES_NO_OPTIONS}
                            required={true}
                            {...field}
                        />
                    )}
                />
                {watch('revoked-licenses') === 'yes' && (
                    <div className="pt-2 animate-in fade-in slide-in-from-top-1">
                        <label htmlFor="revocation-explanation" className="block text-sm font-medium text-gray-700 mb-1">Please provide details (date, location, circumstances): <span className="text-red-500">*</span></label>
                        <textarea
                            id="revocation-explanation"
                            rows="3"
                            required
                            className="w-full p-3 border border-gray-300 rounded-lg shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                            placeholder="Provide details here..."
                            {...register('revocationExplanation')}
                        ></textarea>
                    </div>
                )}

                <Controller
                    name="driving-convictions"
                    control={control}
                    render={({ field }) => (
                        <RadioGroup
                            label="Have you ever been convicted of driving during license suspension or revocation, or driving without a valid license or an expired license, or are any charges pending?"
                            options={YES_NO_OPTIONS}
                            required={true}
                            {...field}
                        />
                    )}
                />
                {watch('driving-convictions') === 'yes' && (
                    <div className="pt-2 animate-in fade-in slide-in-from-top-1">
                        <label htmlFor="conviction-explanation" className="block text-sm font-medium text-gray-700 mb-1">Please provide details (date, location, circumstances): <span className="text-red-500">*</span></label>
                        <textarea
                            id="conviction-explanation"
                            rows="3"
                            required
                            className="w-full p-3 border border-gray-300 rounded-lg shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                            placeholder="Provide details here..."
                            {...register('convictionExplanation')}
                        ></textarea>
                    </div>
                )}

                <Controller
                    name="drug-alcohol-convictions"
                    control={control}
                    render={({ field }) => (
                        <RadioGroup
                            label="Have you ever been convicted for any alcohol or controlled substance related offense while operating a motor vehicle, or are any charges pending?"
                            options={YES_NO_OPTIONS}
                            required={true}
                            {...field}
                        />
                    )}
                />
                {watch('drug-alcohol-convictions') === 'yes' && (
                    <div className="pt-2 animate-in fade-in slide-in-from-top-1">
                        <label htmlFor="drug-conviction-explanation" className="block text-sm font-medium text-gray-700 mb-1">Please provide details (date, location, circumstances): <span className="text-red-500">*</span></label>
                        <textarea
                            id="drug-conviction-explanation"
                            rows="3"
                            required
                            className="w-full p-3 border border-gray-300 rounded-lg shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                            placeholder="Provide details here..."
                            {...register('drugConvictionExplanation')}
                        ></textarea>
                    </div>
                )}

            </fieldset>

            <fieldset className="border border-gray-300 rounded-lg p-4 space-y-4 mt-6">
                <legend className="text-lg font-semibold text-gray-800 px-2">Moving Violations (Past 3 Years)</legend>
                <p className="text-sm text-gray-600">Please list all moving violations or traffic convictions within the past 3 years (whether in a personal or commercial vehicle).</p>
                <Controller
                    name="violations"
                    control={control}
                    render={({ field }) => (
                        <DynamicRow
                            listKey="violations"
                            formData={{ violations: field.value }}
                            updateFormData={(key, value) => field.onChange(value)}
                            renderRow={renderViolationRow}
                            initialItemState={initialViolation}
                            addButtonLabel="+ Add Violation"
                        />
                    )}
                />
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

export default Step4_Violations;
