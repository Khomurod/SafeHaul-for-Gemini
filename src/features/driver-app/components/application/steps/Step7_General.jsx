import React from 'react';
import { useForm, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { Step7Schema } from './Step7_Schema';
import InputField from '@shared/components/form/InputField';
import RadioGroup from '@shared/components/form/RadioGroup';
import { useUtils } from '@shared/hooks/useUtils';
import { useData } from '@/context/DataContext';
import { YES_NO_OPTIONS, MILES_DRIVEN_OPTIONS, EXPERIENCE_OPTIONS } from '@/config/form-options';
import { Circle } from 'lucide-react';

import DynamicQuestionRenderer from './components/DynamicQuestionRenderer';
import BusinessInfoSection from './components/BusinessInfoSection';
import VehicleExperienceSection from './components/VehicleExperienceSection';
import EmergencyContactsSection from './components/EmergencyContactsSection';

const Step7_General = ({ control, onNavigate, handleFileUpload }) => {
    const { states } = useUtils();
    const { currentCompanyProfile } = useData();
    const currentCompany = currentCompanyProfile;

    const { handleSubmit, watch, register } = useForm({
        resolver: zodResolver(Step7Schema),
    });

    const onSubmit = (data) => {
        onNavigate('next');
    };

    const hasFelony = watch('has-felony') === 'yes';

    return (
        <form onSubmit={handleSubmit(onSubmit)} className="form-step space-y-6">
            <h3 className="text-xl font-semibold text-gray-800">Step 7 of 9: Custom Applicant Questions</h3>

            {currentCompany?.customQuestions?.length > 0 && (
                <fieldset className="border border-blue-200 bg-blue-50/30 rounded-lg p-6 space-y-6 shadow-sm">
                    <legend className="text-lg font-bold text-blue-900 px-2 flex items-center gap-2">
                        <Circle size={16} fill="currentColor" className="text-blue-200" />
                        {currentCompany.companyName || 'Company'} Specific Questions
                    </legend>
                    <p className="text-sm text-blue-700 px-1 mb-4 border-b border-blue-100 pb-2">
                        Please answer the following questions required by the carrier.
                    </p>

                    {currentCompany.customQuestions.map((question, index) => (
                        <DynamicQuestionRenderer
                            key={question.id || index}
                            question={question}
                            index={index}
                            control={control}
                            handleFileUpload={handleFileUpload}
                        />
                    ))}
                </fieldset>
            )}

            {(watch('positionType') === 'ownerOperator' || watch('positionType') === 'leaseOperator') && (
                <BusinessInfoSection
                    control={control}
                    states={states}
                />
            )}

            <VehicleExperienceSection
                control={control}
                milesOptions={MILES_DRIVEN_OPTIONS}
                expOptions={EXPERIENCE_OPTIONS}
            />

            {currentCompany?.applicationConfig?.showEmergencyContacts && (
                <EmergencyContactsSection
                    control={control}
                />
            )}

            <fieldset className="border border-gray-300 rounded-lg p-4 space-y-4 mt-6">
                <legend className="text-lg font-semibold text-gray-800 px-2">Hours of Service (HOS)</legend>
                <p className="text-sm text-gray-600">Total hours worked during the immediately preceding 7 days.</p>
                <div className="grid grid-cols-4 sm:grid-cols-7 gap-3">
                    {[1, 2, 3, 4, 5, 6, 7].map(day => (
                        <div key={day}>
                            <label htmlFor={'hos-day' + day} className="block text-xs font-medium text-gray-700 mb-1">Day {day}</label>
                            <input
                                type="number"
                                id={'hos-day' + day}
                                className="w-full p-2 border border-gray-300 rounded-lg shadow-sm"
                                {...register(`hosDay${day}`)}
                            />
                        </div>
                    ))}
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-6 pt-4 border-t border-gray-200">
                    <InputField label="Last relieved from work (DATE)" id="last-relieved-date" type="date" {...register('lastRelievedDate')} />
                    <InputField label="Last relieved from work (TIME)" id="last-relieved-time" type="time" {...register('lastRelievedTime')} />
                </div>
            </fieldset>

            <fieldset className="border border-gray-300 rounded-lg p-4 space-y-4 mt-6">
                <legend className="text-lg font-semibold text-gray-800 px-2">Felony History</legend>
                <Controller
                    name="has-felony"
                    control={control}
                    render={({ field }) => (
                        <RadioGroup
                            label="Have you ever been convicted of a felony?"
                            options={YES_NO_OPTIONS}
                            required={true}
                            {...field}
                        />
                    )}
                />
                {hasFelony && (
                    <div id="felony-details" className="space-y-2 pt-4 border-t border-gray-200">
                        <label htmlFor="felony-explanation" className="block text-sm font-medium text-gray-700 mb-1">Please explain:</label>
                        <textarea
                            id="felony-explanation"
                            rows="3"
                            className="w-full p-3 border border-gray-300 rounded-lg shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                            {...register('felonyExplanation')}
                        ></textarea>
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

export default Step7_General;
