import React from 'react';
import { useForm, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { Step2Schema } from './Step2_Schema';
import RadioGroup from '@shared/components/form/RadioGroup';
import { YES_NO_OPTIONS, EXPERIENCE_OPTIONS } from '@/config/form-options';

const Step2_Qualifications = ({ control, onNavigate }) => {
    const { handleSubmit, watch } = useForm({
        resolver: zodResolver(Step2Schema),
    });

    const onSubmit = (data) => {
        onNavigate('next');
    };

    const drugTestPositive = watch('drug-test-positive') === 'yes';

    return (
        <form onSubmit={handleSubmit(onSubmit)} className="form-step space-y-6">
            <h3 className="text-xl font-semibold text-gray-800">Step 2 of 9: Qualification Information</h3>

            <fieldset className="border border-gray-300 rounded-lg p-4 space-y-4">
                <legend className="text-lg font-semibold text-gray-800 px-2">General Qualifications</legend>
                <Controller
                    name="legal-work"
                    control={control}
                    render={({ field }) => (
                        <RadioGroup
                            label="Legally eligible to work in the U.S.?"
                            options={YES_NO_OPTIONS}
                            required={true}
                            {...field}
                        />
                    )}
                />
                <Controller
                    name="english-fluency"
                    control={control}
                    render={({ field }) => (
                        <RadioGroup
                            label="Can you read, write, speak and understand English?"
                            options={YES_NO_OPTIONS}
                            required={true}
                            {...field}
                        />
                    )}
                />
            </fieldset>

            <fieldset className="border border-gray-300 rounded-lg p-4 space-y-4 mt-6">
                <legend className="text-lg font-semibold text-gray-800 px-2">Drug & Alcohol History</legend>
                <p className="text-sm text-gray-600">
                    Have you ever tested positive, or refused to test on a pre-employment drug or alcohol test by an employer to whom you applied, but did not obtain safety-sensitive transportation work covered by DOT drug and alcohol testing regulations, or have you ever tested positive or refused to test on any DOT-mandated drug or alcohol test?
                </p>
                <Controller
                    name="drug-test-positive"
                    control={control}
                    render={({ field }) => (
                        <RadioGroup
                            label="Drug and alcohol positive tests or refusals?"
                            options={YES_NO_OPTIONS}
                            required={true}
                            {...field}
                        />
                    )}
                />
                {drugTestPositive && (
                    <div id="drug-test-details" className="space-y-2 pt-4 border-t border-gray-200">
                        <label htmlFor="drug-test-explanation" className="block text-sm font-medium text-gray-700 mb-1">Please explain:</label>
                        <textarea
                            id="drug-test-explanation"
                            rows="3"
                            className="w-full p-3 border border-gray-300 rounded-lg shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                            {...control.register('drug-test-explanation')}
                        ></textarea>
                    </div>
                )}
                <Controller
                    name="dot-return-to-duty"
                    control={control}
                    render={({ field }) => (
                        <RadioGroup
                            label="Can you provide documentation, if requested, that confirms successful completion of the DOT return to duty process?"
                            options={YES_NO_OPTIONS}
                            required={true}
                            {...field}
                        />
                    )}
                />
            </fieldset>

            <fieldset className="border border-gray-300 rounded-lg p-4 space-y-4 mt-6">
                <legend className="text-lg font-semibold text-gray-800 px-2">Commercial Experience</legend>
                <Controller
                    name="experience-years"
                    control={control}
                    render={({ field }) => (
                        <RadioGroup
                            label="Years of commercial driving experience?"
                            options={EXPERIENCE_OPTIONS}
                            required={true}
                            horizontal={false}
                            {...field}
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

export default Step2_Qualifications;
