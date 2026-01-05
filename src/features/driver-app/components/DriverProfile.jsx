import React from 'react';
import { useForm, FormProvider } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { FullApplicationSchema } from './application/steps/FullApplicationSchema';
import { Loader2, User, FileText, Truck, AlertTriangle, Briefcase, ArrowLeft, Save } from 'lucide-react';
import { useDriverProfile } from '../hooks/useDriverProfile';

// Import Steps with correct names
import Step1_Contact from './application/steps/Step1_Contact';
import Step2_Qualifications from './application/steps/Step2_Qualifications';
import Step3_License from './application/steps/Step3_License';
import Step4_Violations from './application/steps/Step4_Violations';
import Step5_Accidents from './application/steps/Step5_Accidents';
import Step6_Employment from './application/steps/Step6_Employment';
import Step7_General from './application/steps/Step7_General';

export function DriverProfile() {
    const {
        formData,
        loading,
        saving,
        handleSave,
        navigate
    } = useDriverProfile();

    const methods = useForm({
        resolver: zodResolver(FullApplicationSchema),
        defaultValues: formData,
    });

    // Mock handler for file inputs in edit mode (Prevents errors in steps)
    const handleMockUpload = (name, file) => {
        alert(`File upload for "${name}" will be available soon. Please use the main application form to upload documents.`);
    };

    if (loading) return (
        <div className="min-h-screen flex items-center justify-center bg-gray-50">
            <Loader2 className="animate-spin text-blue-600" size={40} />
        </div>
    );

    const Section = ({ title, icon, children, fieldsToSave }) => (
        <div className="bg-white">
            <div className="flex justify-between items-center border-b border-gray-100 pb-3 mb-5">
                <h2 className="text-xl font-bold text-gray-800 flex items-center gap-2">
                    {icon} {title}
                </h2>
                <button
                    onClick={() => handleSave(fieldsToSave.reduce((obj, key) => ({ ...obj, [key]: methods.watch(key) }), {}))}
                    disabled={saving}
                    className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white font-semibold rounded-lg hover:bg-blue-700 disabled:opacity-50 transition-all shadow-md"
                >
                    {saving ? <Loader2 className="animate-spin" size={20} /> : <Save size={20} />}
                    Save
                </button>
            </div>
            <div className="profile-editor-section">
                {children}
            </div>
        </div>
    );

    return (
        <FormProvider {...methods}>
            <div className="min-h-screen bg-gray-50 p-4 sm:p-8">
                <div className="max-w-4xl mx-auto bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
                    {/* Global Overrides to create a seamless profile list from individual steps */}
                    <style>{`
                        .profile-editor-section h3.text-xl { display: none !important; }
                        .profile-editor-section legend { display: none !important; }
                        .profile-editor-section .form-step { padding-top: 0 !important; }
                        .profile-editor-section .flex.justify-between.pt-6 { display: none !important; }
                        .profile-editor-section .flex.flex-col.sm\\:flex-row.sm\\:justify-end { display: none !important; }
                        .profile-editor-section fieldset { border: none !important; padding: 0 !important; }
                    `}</style>

                    {/* Header */}
                    <div className="p-6 border-b border-gray-200 flex justify-between items-center bg-white sticky top-0 z-30 shadow-sm">
                        <div className="flex items-center gap-4">
                            <button onClick={() => navigate('/driver/dashboard')} className="text-gray-500 hover:text-gray-800 transition-colors">
                                <ArrowLeft size={24} />
                            </button>
                            <h1 className="text-2xl font-bold text-gray-900">Edit Master Profile</h1>
                        </div>
                    </div>

                    <div className="p-6 sm:p-10 space-y-12">
                        <Section title="Driver Status" icon={<Truck size={20} className="text-blue-600" />} fieldsToSave={['driverType', 'availability', 'truckType']}>
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-1">I am a...</label>
                                    <select
                                        className="w-full p-3 border border-gray-300 rounded-lg bg-white"
                                        {...methods.register('driverType')}
                                    >
                                        <option value="">-- Select Type --</option>
                                        <option value="companyDriverSolo">Company Driver (Solo)</option>
                                        <option value="companyDriverTeam">Company Driver (Team)</option>
                                        <option value="ownerOperatorSolo">Owner Operator (Solo)</option>
                                        <option value="ownerOperatorTeam">Owner Operator (Team)</option>
                                        <option value="leaseOperatorSolo">Lease Operator (Solo)</option>
                                        <option value="leaseOperatorTeam">Lease Operator (Team)</option>
                                    </select>
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-1">Availability Status</label>
                                    <select
                                        className="w-full p-3 border border-gray-300 rounded-lg bg-white"
                                        {...methods.register('availability')}
                                    >
                                        <option value="actively_looking">Actively Looking</option>
                                        <option value="reviewing_offers">Reviewing Offers</option>
                                        <option value="not_available">Working / Not Available</option>
                                    </select>
                                </div>
                                {(methods.watch('driverType')?.toLowerCase().includes('owner') || methods.watch('driverType')?.toLowerCase().includes('lease')) && (
                                    <div className="md:col-span-2">
                                        <label className="block text-sm font-medium text-gray-700 mb-1">Truck Info (Year, Make, Model)</label>
                                        <input
                                            type="text"
                                            className="w-full p-3 border border-gray-300 rounded-lg"
                                            placeholder="e.g., 2020 Peterbilt 579"
                                            {...methods.register('truckType')}
                                        />
                                    </div>
                                )}
                            </div>
                        </Section>

                        <Section title="Personal Information" icon={<User size={20} className="text-blue-600" />} fieldsToSave={Object.keys(Step1Schema.shape)}>
                            <Step1_Contact control={methods.control} onNavigate={() => { }} onPartialSubmit={() => { }} />
                        </Section>

                        <Section title="Qualifications" icon={<FileText size={20} className="text-blue-600" />} fieldsToSave={Object.keys(Step2Schema.shape)}>
                            <Step2_Qualifications control={methods.control} onNavigate={() => { }} />
                        </Section>

                        <Section title="License Information" icon={<Truck size={20} className="text-blue-600" />} fieldsToSave={Object.keys(Step3Schema.shape)}>
                            <Step3_License control={methods.control} handleFileUpload={handleMockUpload} onNavigate={() => { }} />
                        </Section>

                        <Section title="Violations & Convictions" icon={<AlertTriangle size={20} className="text-blue-600" />} fieldsToSave={Object.keys(Step4Schema.shape)}>
                            <Step4_Violations control={methods.control} onNavigate={() => { }} />
                        </Section>

                        <Section title="Accident History" icon={<AlertTriangle size={20} className="text-blue-600" />} fieldsToSave={Object.keys(Step5Schema.shape)}>
                            <Step5_Accidents control={methods.control} onNavigate={() => { }} />
                        </Section>

                        <Section title="Employment History" icon={<Briefcase size={20} className="text-blue-600" />} fieldsToSave={Object.keys(Step6Schema.shape)}>
                            <Step6_Employment control={methods.control} onNavigate={() => { }} />
                        </Section>

                        <Section title="Additional Questions" icon={<FileText size={20} className="text-blue-600" />} fieldsToSave={Object.keys(Step7Schema.shape)}>
                            <Step7_General control={methods.control} onNavigate={() => { }} />
                        </Section>
                    </div>
                </div>
            </div>
        </FormProvider>
    );
}
