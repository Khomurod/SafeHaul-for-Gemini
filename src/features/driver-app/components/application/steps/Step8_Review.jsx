import React from 'react';
import { User, Phone, Briefcase, Truck, AlertTriangle, FileText, Edit2, CheckCircle2 } from 'lucide-react';

const Step8_Review = ({ formData, onNavigate, onGoToStep }) => {

    // Reusable Review Card Component
    const ReviewCard = ({ title, icon: Icon, stepIndex, children }) => (
        <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden mb-6">
            <div className="p-4 bg-gray-50 border-b border-gray-200 flex justify-between items-center">
                <div className="flex items-center gap-2">
                    <Icon size={18} className="text-gray-500" />
                    <h4 className="font-bold text-gray-800 uppercase text-sm">{title}</h4>
                </div>
                <button 
                    onClick={() => onGoToStep(stepIndex)}
                    className="text-blue-600 hover:text-blue-800 text-xs font-bold flex items-center gap-1 bg-white px-3 py-1 rounded border border-blue-200 hover:border-blue-300 transition-all"
                >
                    <Edit2 size={12} /> Edit
                </button>
            </div>
            <div className="p-5 text-sm text-gray-600 space-y-2">
                {children}
            </div>
        </div>
    );

    const LabelVal = ({ l, v }) => (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-1 py-1 border-b border-gray-50 last:border-0">
            <span className="font-semibold text-gray-900">{l}</span>
            <span className="text-gray-600 break-words">{v || <span className="italic text-gray-400">Not provided</span>}</span>
        </div>
    );

    return (
        <div id="page-review" className="space-y-8 animate-in fade-in duration-500">
            
            <div className="bg-blue-50 p-6 rounded-xl border border-blue-100 text-center space-y-2">
                <div className="mx-auto w-12 h-12 bg-blue-100 rounded-full flex items-center justify-center text-blue-600 mb-2">
                    <FileText size={24} />
                </div>
                <h3 className="text-2xl font-bold text-blue-900">Review Your Application</h3>
                <p className="text-blue-700 max-w-md mx-auto">
                    Please review all information carefully. Once submitted, this document becomes a legal record.
                </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                
                {/* 1. Identity */}
                <ReviewCard title="Identity & Contact" icon={User} stepIndex={0}>
                    <LabelVal l="Full Name" v={`${formData.firstName} ${formData.lastName}`} />
                    <LabelVal l="DOB" v={formData.dob} />
                    <LabelVal l="SSN" v={formData.ssn} />
                    <LabelVal l="Phone" v={formData.phone} />
                    <LabelVal l="Email" v={formData.email} />
                    <LabelVal l="Address" v={`${formData.street}, ${formData.city}, ${formData.state} ${formData.zip}`} />
                </ReviewCard>

                {/* 2. Qualifications */}
                <ReviewCard title="Qualifications" icon={Briefcase} stepIndex={1}>
                    <LabelVal l="Position" v={formData.positionApplyingTo} />
                    <LabelVal l="Experience" v={formData['experience-years']} />
                    <LabelVal l="Legal to Work" v={formData['legal-work']} />
                    <LabelVal l="Drug Test Hist." v={formData['drug-test-positive']} />
                </ReviewCard>

                {/* 3. License */}
                <ReviewCard title="License (CDL)" icon={Truck} stepIndex={2}>
                    <LabelVal l="CDL Number" v={formData.cdlNumber} />
                    <LabelVal l="State" v={formData.cdlState} />
                    <LabelVal l="Class" v={formData.cdlClass} />
                    <LabelVal l="Expires" v={formData.cdlExpiration} />
                    <LabelVal l="Medical Card" v={formData.medCardExpiration} />
                </ReviewCard>

                {/* 4. History Summary */}
                <ReviewCard title="History Summary" icon={AlertTriangle} stepIndex={3}>
                    <LabelVal l="Violations (3yr)" v={formData.violations?.length || 0} />
                    <LabelVal l="Accidents (3yr)" v={formData.accidents?.length || 0} />
                    <LabelVal l="Employers Listed" v={formData.employers?.length || 0} />
                    <LabelVal l="Schools Listed" v={formData.schools?.length || 0} />
                </ReviewCard>
            </div>

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
                    onClick={() => onNavigate('next')}
                    className="px-10 py-4 bg-green-600 text-white font-bold text-lg rounded-xl shadow-lg hover:bg-green-700 hover:shadow-xl transition-all transform active:scale-95 flex items-center gap-2"
                >
                    <CheckCircle2 size={20} />
                    Proceed to Sign
                </button>
            </div>
        </div>
    );
};

export default Step8_Review;
