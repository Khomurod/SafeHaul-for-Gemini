import React, { useMemo } from 'react';
import InputField from '@shared/components/form/InputField';
import { Clock, MapPin, CalendarDays } from 'lucide-react';

const Step7_General = ({ formData, updateFormData, onNavigate }) => {

    const handleChange = (name, value) => {
        updateFormData(name, value);
    };

    const handleContinue = () => {
        const form = document.getElementById('driver-form');
        if (form && !form.checkValidity()) {
            form.reportValidity();
            return;
        }
        onNavigate('next');
    };

    // Auto-Calculate Total Hours
    const totalHours = useMemo(() => {
        let total = 0;
        for (let i = 1; i <= 7; i++) {
            const val = parseFloat(formData[`hosDay${i}`]) || 0;
            total += val;
        }
        return total;
    }, [formData]);

    return (
        <div id="page-7" className="space-y-8 animate-in fade-in duration-500">
            
            <div className="space-y-2">
                <h3 className="text-2xl font-bold text-gray-900">Hours of Service</h3>
                <p className="text-gray-600">
                    FMCSA 395.8(j)(2) requires you to list the total hours worked during the last 7 days before applying.
                </p>
            </div>

            {/* CARD 1: 7-DAY LOG */}
            <section className="bg-white p-6 md:p-8 rounded-xl shadow-sm border border-gray-200 space-y-6">
                <div className="flex items-center gap-3 border-b border-gray-100 pb-4 mb-2">
                    <div className="p-2 bg-blue-50 rounded-lg text-blue-600">
                        <CalendarDays size={20} />
                    </div>
                    <h4 className="text-lg font-bold text-gray-900">7-Day Work Log</h4>
                </div>

                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                    {[1, 2, 3, 4, 5, 6, 7].map((day) => (
                        <div key={day} className="space-y-1">
                            <label htmlFor={`hosDay${day}`} className="block text-xs font-bold text-gray-500 uppercase">
                                Day {day}
                            </label>
                            <input
                                type="number"
                                id={`hosDay${day}`}
                                name={`hosDay${day}`}
                                min="0"
                                max="24"
                                step="0.5"
                                value={formData[`hosDay${day}`] || ""}
                                onChange={(e) => handleChange(e.target.name, e.target.value)}
                                className="w-full p-3 text-center font-bold text-gray-900 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none"
                                placeholder="0"
                            />
                        </div>
                    ))}
                    
                    {/* Total Box */}
                    <div className="bg-blue-50 rounded-lg p-1 border border-blue-100 flex flex-col justify-center items-center">
                        <span className="text-xs font-bold text-blue-600 uppercase">Total Hours</span>
                        <span className="text-xl font-black text-blue-900">{totalHours}</span>
                    </div>
                </div>
                
                <p className="text-xs text-gray-500 italic">
                    * Enter "0" if you did not work on a specific day.
                </p>
            </section>

            {/* CARD 2: DUTY STATUS */}
            <section className="bg-white p-6 md:p-8 rounded-xl shadow-sm border border-gray-200 space-y-6">
                <div className="flex items-center gap-3 border-b border-gray-100 pb-4 mb-2">
                    <div className="p-2 bg-green-50 rounded-lg text-green-600">
                        <Clock size={20} />
                    </div>
                    <h4 className="text-lg font-bold text-gray-900">Last Relieved from Duty</h4>
                </div>

                <div className="space-y-6">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        <InputField 
                            label="Date Relieved" 
                            id="lastRelievedDate" 
                            name="lastRelievedDate" 
                            type="date" 
                            value={formData.lastRelievedDate} 
                            onChange={handleChange} 
                            required={true}
                        />
                        <InputField 
                            label="Time Relieved" 
                            id="lastRelievedTime" 
                            name="lastRelievedTime" 
                            type="time" 
                            value={formData.lastRelievedTime} 
                            onChange={handleChange} 
                            required={true}
                        />
                    </div>

                    <div>
                        <div className="relative">
                            <MapPin className="absolute left-4 top-[38px] text-gray-400" size={20} />
                            <InputField 
                                label="Location (City, State)" 
                                id="lastRelievedLocation" 
                                name="lastRelievedLocation" 
                                value={formData.lastRelievedLocation} 
                                onChange={handleChange} 
                                required={true}
                                placeholder="e.g. Phoenix, AZ"
                                className="pl-10" // Extra padding for icon (if supported by component, otherwise handled below)
                            />
                        </div>
                    </div>
                </div>
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
                    Review Application
                </button>
            </div>
        </div>
    );
};

export default Step7_General;
