import React, { useRef, useState } from 'react';
import SignatureCanvas from 'react-signature-canvas';
// FIX: Corrected relative path (needs 3 levels up to reach driver-app/hooks)
import { useApplicationSubmit } from '../../../hooks/useApplicationSubmit';
import { 
    FileSignature, 
    ChevronDown, 
    ChevronUp, 
    CheckCircle2, 
    AlertTriangle,
    Loader2
} from 'lucide-react';

const Step9_Consent = ({ formData, updateFormData, onNavigate, companyId, isPreview }) => {
    const sigPad = useRef({});
    const [signatureType, setSignatureType] = useState('draw'); // 'draw' or 'type'
    const [typedName, setTypedName] = useState('');
    const { submit, isSubmitting, error } = useApplicationSubmit(companyId);
    
    // State for expanding legal text accordions
    const [expanded, setExpanded] = useState({
        electronic: false,
        fcra: false,
        psp: false,
        clearinghouse: false
    });

    const toggleExpand = (key) => {
        setExpanded(prev => ({ ...prev, [key]: !prev[key] }));
    };

    const clearSignature = () => {
        if(sigPad.current) {
            sigPad.current.clear();
        }
        updateFormData('signature', null);
    };

    const handleSignature = () => {
        if (signatureType === 'draw') {
            if (sigPad.current && sigPad.current.isEmpty()) {
                updateFormData('signature', null);
            } else if (sigPad.current) {
                updateFormData('signature', sigPad.current.getTrimmedCanvas().toDataURL('image/png'));
            }
        } else {
            // Typed signature is stored as a special string
            updateFormData('signature', typedName ? `TEXT_SIGNATURE:${typedName}` : null);
        }
    };

    const handleSubmit = async () => {
        // Final capture before submit
        handleSignature();

        const form = document.getElementById('driver-form');
        if (form && !form.checkValidity()) {
            form.reportValidity();
            alert("Please agree to all required consents before submitting.");
            return;
        }

        // Slight delay to ensure state update if drawing just finished
        if (!formData.signature && !typedName && (!sigPad.current || sigPad.current.isEmpty())) {
            alert("A digital signature is required to proceed.");
            return;
        }

        // If drawing exists but not yet in formData, capture it now
        let finalData = { ...formData };
        if (signatureType === 'draw' && sigPad.current && !sigPad.current.isEmpty()) {
             finalData.signature = sigPad.current.getTrimmedCanvas().toDataURL('image/png');
        } else if (signatureType === 'type' && typedName) {
             finalData.signature = `TEXT_SIGNATURE:${typedName}`;
        }

        if (isPreview) {
            alert("Preview Mode: Application would be submitted now.");
            onNavigate('next'); 
        } else {
            const success = await submit(finalData);
            if (success) {
                onNavigate('next');
            }
        }
    };

    // Reusable Accordion Component for Legal Text
    const LegalAccordion = ({ title, id, children, isOpen, onToggle }) => (
        <div className="border border-gray-200 rounded-xl overflow-hidden bg-white shadow-sm">
            <button
                type="button"
                onClick={onToggle}
                className="w-full flex justify-between items-center p-4 bg-gray-50 hover:bg-gray-100 transition-colors"
            >
                <div className="flex items-center gap-2">
                    <FileSignature size={18} className="text-blue-600" />
                    <span className="font-bold text-gray-800 text-sm uppercase text-left">{title}</span>
                </div>
                {isOpen ? <ChevronUp size={18} className="text-gray-500" /> : <ChevronDown size={18} className="text-gray-500" />}
            </button>
            
            {isOpen && (
                <div className="p-5 text-sm text-gray-600 space-y-4 border-t border-gray-100 animate-in slide-in-from-top-1">
                    {children}
                    <div className="flex items-center gap-2 pt-4 border-t border-gray-100">
                         <input 
                            type="checkbox" 
                            id={`agree-${id}`} 
                            required 
                            className="w-5 h-5 text-blue-600 border-gray-300 rounded focus:ring-blue-500 cursor-pointer"
                        />
                        <label htmlFor={`agree-${id}`} className="font-bold text-gray-900 cursor-pointer select-none">
                            I have read and agree to the terms above.
                        </label>
                    </div>
                </div>
            )}
        </div>
    );

    return (
        <div id="page-consent" className="space-y-8 animate-in fade-in duration-500">
            
            <div className="space-y-2">
                <h3 className="text-2xl font-bold text-gray-900">Legal Consent & Signature</h3>
                <p className="text-gray-600">
                    Please review and agree to the following required disclosures to complete your application.
                </p>
            </div>

            {error && (
                <div className="p-4 bg-red-50 border border-red-200 text-red-700 rounded-xl flex items-center gap-2 animate-in shake">
                    <AlertTriangle size={20} />
                    <span>{error}</span>
                </div>
            )}

            {/* LEGAL AGREEMENTS (Accordions) */}
            <div className="space-y-4">
                
                {/* 1. Electronic Signature */}
                <LegalAccordion 
                    title="Agreement to Conduct Transaction Electronically" 
                    id="electronic"
                    isOpen={expanded.electronic}
                    onToggle={() => toggleExpand('electronic')}
                >
                    <p><strong>1. DEFINITIONS.</strong> "We," "Us," and "Company" refer to the motor carrier to which you are applying. "You" and "Your" refer to the applicant. "Communication" means any application forms, disclosures, notices, responses, agreements, and other documents related to your application for employment.</p>
                    <p><strong>2. SCOPE.</strong> You agree that we may provide you with any Communications in electronic format, and that we may discontinue sending paper Communications to you. You agree that your electronic signature has the same legal effect as a manual signature.</p>
                    <p><strong>3. CONSENT.</strong> By signing this application electronically, you consent to receive and respond to Communications in electronic format.</p>
                </LegalAccordion>

                {/* 2. FCRA */}
                <LegalAccordion 
                    title="Background Check Disclosure (FCRA)" 
                    id="fcra"
                    isOpen={expanded.fcra}
                    onToggle={() => toggleExpand('fcra')}
                >
                    <p>In connection with your application for employment, Prospective Employer may obtain one or more reports regarding your credit, driving, and/or criminal background history from a consumer reporting agency.</p>
                    <p><strong>AUTHORIZATION:</strong> I hereby authorize Prospective Employer to obtain the consumer reports described above about me.</p>
                </LegalAccordion>

                {/* 3. PSP */}
                <LegalAccordion 
                    title="FMCSA PSP Disclosure" 
                    id="psp"
                    isOpen={expanded.psp}
                    onToggle={() => toggleExpand('psp')}
                >
                    <p>You understand that Prospective Employer may obtain one or more reports regarding your driving, and safety inspection history from the Federal Motor Carrier Safety Administration (FMCSA) Pre-Employment Screening Program (PSP).</p>
                    <p><strong>AUTHORIZATION:</strong> I hereby authorize Prospective Employer to access the FMCSA PSP system to seek information regarding my commercial driving safety record.</p>
                </LegalAccordion>

                 {/* 4. Clearinghouse */}
                 <LegalAccordion 
                    title="Drug & Alcohol Clearinghouse Consent" 
                    id="clearinghouse"
                    isOpen={expanded.clearinghouse}
                    onToggle={() => toggleExpand('clearinghouse')}
                >
                    <p>I hereby provide consent to Prospective Employer to conduct a full query of the FMCSA Commercial Driver's License Drug and Alcohol Clearinghouse to determine whether drug or alcohol violation information about me exists.</p>
                </LegalAccordion>

                {/* 5. General Certification */}
                 <div className="bg-blue-50 p-5 rounded-xl border border-blue-100 flex items-start gap-3">
                    <input 
                        type="checkbox" 
                        id="agree-general" 
                        required 
                        className="w-5 h-5 text-blue-600 border-gray-300 rounded focus:ring-blue-500 mt-1 cursor-pointer"
                    />
                    <label htmlFor="agree-general" className="text-sm text-blue-900 cursor-pointer select-none leading-relaxed">
                        <strong>CERTIFICATION:</strong> I certify that this application was completed by me, and that all entries on it and information in it are true and complete to the best of my knowledge. I authorize the carrier to make such investigations and inquiries of my personal, employment, financial or medical history and other related matters as may be necessary in arriving at an employment decision.
                    </label>
                </div>
            </div>

            {/* DIGITAL SIGNATURE BOX */}
            <section className="bg-white p-6 md:p-8 rounded-xl shadow-sm border border-gray-200 space-y-6">
                <div className="flex items-center justify-between border-b border-gray-100 pb-4 mb-2">
                    <div className="flex items-center gap-3">
                        <div className="p-2 bg-gray-100 rounded-lg text-gray-600">
                            <FileSignature size={20} />
                        </div>
                        <h4 className="text-lg font-bold text-gray-900">Digital Signature</h4>
                    </div>
                    <div className="text-sm text-gray-500 font-medium bg-gray-50 px-3 py-1 rounded-lg border border-gray-200">
                        Date: {new Date().toLocaleDateString()}
                    </div>
                </div>

                {/* Signature Type Toggle */}
                <div className="flex bg-gray-100 p-1 rounded-lg w-full sm:w-auto self-start">
                    <button
                        type="button"
                        onClick={() => setSignatureType('draw')}
                        className={`flex-1 sm:flex-none px-4 py-2 text-sm font-bold rounded-md transition-all ${signatureType === 'draw' ? 'bg-white text-blue-600 shadow-sm' : 'text-gray-500 hover:text-gray-700'}`}
                    >
                        Draw Signature
                    </button>
                    <button
                        type="button"
                        onClick={() => setSignatureType('type')}
                        className={`flex-1 sm:flex-none px-4 py-2 text-sm font-bold rounded-md transition-all ${signatureType === 'type' ? 'bg-white text-blue-600 shadow-sm' : 'text-gray-500 hover:text-gray-700'}`}
                    >
                        Type Signature
                    </button>
                </div>

                <div className="border-2 border-dashed border-gray-300 rounded-xl bg-gray-50 relative" onTouchStart={(e) => e.stopPropagation()}>
                    {signatureType === 'draw' ? (
                        <>
                            <SignatureCanvas 
                                ref={sigPad} 
                                canvasProps={{ className: 'w-full h-40 rounded-xl' }}
                                onEnd={handleSignature} 
                            />
                            <div className="absolute bottom-2 left-0 w-full text-center pointer-events-none text-xs text-gray-400 font-bold uppercase tracking-widest">
                                Sign Here
                            </div>
                            <button 
                                type="button" 
                                onClick={clearSignature}
                                className="absolute top-2 right-2 text-xs bg-white border border-gray-200 text-gray-500 px-2 py-1 rounded hover:bg-gray-100 z-10"
                            >
                                Clear
                            </button>
                        </>
                    ) : (
                        <div className="h-40 flex items-center justify-center p-4">
                             <input
                                type="text"
                                placeholder="Type your full legal name..."
                                value={typedName}
                                onChange={(e) => { setTypedName(e.target.value); handleSignature(); }}
                                className="w-full text-center text-3xl font-serif italic border-none bg-transparent focus:ring-0 placeholder:text-gray-300 text-gray-800 outline-none"
                                style={{ fontFamily: '"Times New Roman", serif' }}
                            />
                        </div>
                    )}
                </div>
                <p className="text-xs text-gray-500 text-center">
                    By providing your signature, you agree that it is the legally binding equivalent of your handwritten signature.
                </p>
            </section>

            {/* SUBMIT BUTTON */}
            <div className="flex justify-between pt-8 pb-10">
                <button 
                    type="button" 
                    onClick={() => onNavigate('back')}
                    className="px-8 py-4 bg-gray-100 text-gray-600 font-bold rounded-xl hover:bg-gray-200 transition-colors"
                    disabled={isSubmitting}
                >
                    Back
                </button>
                <button 
                    type="button" 
                    onClick={handleSubmit}
                    disabled={isSubmitting}
                    className="px-10 py-4 bg-blue-600 text-white font-bold text-lg rounded-xl shadow-lg hover:bg-blue-700 hover:shadow-xl transition-all transform active:scale-95 flex items-center gap-3 disabled:opacity-70 disabled:cursor-not-allowed"
                >
                    {isSubmitting ? (
                        <>
                            <Loader2 size={24} className="animate-spin" />
                            Submitting...
                        </>
                    ) : (
                        <>
                            <CheckCircle2 size={24} />
                            Submit Application
                        </>
                    )}
                </button>
            </div>
        </div>
    );
};

export default Step9_Consent;
