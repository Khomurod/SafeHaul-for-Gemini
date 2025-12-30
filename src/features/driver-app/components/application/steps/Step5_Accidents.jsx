import React from 'react';
import InputField from '@shared/components/form/InputField';
import RadioGroup from '@shared/components/form/RadioGroup';
import DynamicRow from '@shared/components/form/DynamicRow';
import { YES_NO_OPTIONS } from '@/config/form-options';
import { Car, AlertTriangle } from 'lucide-react';

const Step5_Accidents = ({ formData, updateFormData, onNavigate }) => {
    
    // Initial state for single accident
    const initialAccident = { 
        date: '', 
        city: '', 
        state: '', 
        fatalities: 'no', 
        injuries: 'no', 
        hazmat: 'no', 
        commercial: 'no',
        preventable: 'no',
        details: ''
    };

    const handleContinue = () => {
        const form = document.getElementById('driver-form');
        if (form && !form.checkValidity()) {
            form.reportValidity();
            return;
        }
        onNavigate('next');
    };

    // Renders one Accident "Sub-Card"
    const renderAccidentRow = (index, item, handleChange) => (
        <div key={index} className="p-4 mb-4 bg-gray-50 rounded-lg border border-gray-200 relative animate-in slide-in-from-bottom-2">
            <div className="absolute top-2 right-2 text-xs font-bold text-gray-400 uppercase tracking-wider">
                Accident #{index + 1}
            </div>

            <div className="space-y-6 pt-2">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <InputField 
                        label="Date of Accident" 
                        id={`acc-date-${index}`} 
                        name="date" 
                        type="date" 
                        value={item.date} 
                        onChange={handleChange} 
                        required={true}
                    />
                    <InputField 
                        label="Location (City, State)" 
                        id={`acc-loc-${index}`} 
                        name="city" 
                        value={item.city} 
                        onChange={handleChange} 
                        required={true}
                        placeholder="e.g. Chicago, IL"
                    />
                </div>

                <div className="space-y-4 pt-4 border-t border-gray-200">
                    <RadioGroup 
                        label="Were there any injuries?" 
                        name="injuries" 
                        options={YES_NO_OPTIONS}
                        value={item.injuries} 
                        onChange={(name, value) => handleChange(name, value)}
                    />
                    <RadioGroup 
                        label="Were there any fatalities?" 
                        name="fatalities" 
                        options={YES_NO_OPTIONS}
                        value={item.fatalities} 
                        onChange={(name, value) => handleChange(name, value)}
                    />
                    <RadioGroup 
                        label="Did this involve a Commercial Vehicle?" 
                        name="commercial" 
                        options={YES_NO_OPTIONS}
                        value={item.commercial} 
                        onChange={(name, value) => handleChange(name, value)}
                    />
                     <RadioGroup 
                        label="Was this preventable?" 
                        name="preventable" 
                        options={YES_NO_OPTIONS}
                        value={item.preventable} 
                        onChange={(name, value) => handleChange(name, value)}
                    />
                </div>

                <div className="space-y-2">
                    <label className="block text-sm font-bold text-gray-900 uppercase tracking-wide">
                        Description of Accident
                    </label>
                    <textarea
                        rows="3"
                        className="w-full p-4 text-base text-gray-900 bg-white border border-gray-300 rounded-lg shadow-sm focus:outline-none focus:ring-4 focus:ring-blue-500/20 focus:border-blue-600 placeholder:text-gray-400"
                        placeholder="Briefly describe what happened..."
                        value={item.details || ""}
                        onChange={(e) => handleChange("details", e.target.value)}
                    />
                </div>
            </div>
        </div>
    );

    return (
        <div id="page-5" className="space-y-8 animate-in fade-in duration-500">
            
            <div className="space-y-2">
                <h3 className="text-2xl font-bold text-gray-900">Accident History</h3>
                <p className="text-gray-600">
                    List all motor vehicle accidents for the past 3 years. If none, leave blank.
                </p>
            </div>

            <section className="bg-white p-6 md:p-8 rounded-xl shadow-sm border border-gray-200 space-y-6">
                <div className="flex items-center gap-3 border-b border-gray-100 pb-4 mb-2">
                    <div className="p-2 bg-yellow-50 rounded-lg text-yellow-600">
                        <AlertTriangle size={20} />
                    </div>
                    <h4 className="text-lg font-bold text-gray-900">Accident Log</h4>
                </div>

                <DynamicRow
                    listKey="accidents"
                    formData={formData}
                    updateFormData={updateFormData}
                    renderRow={renderAccidentRow}
                    initialItemState={initialAccident}
                    addButtonLabel="+ Add Accident"
                    emptyMessage="I certify that I have had no accidents in the past 3 years."
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

export default Step5_Accidents;
