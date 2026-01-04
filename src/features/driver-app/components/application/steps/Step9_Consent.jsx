import React from 'react';
import AgreementBox from '@shared/components/form/AgreementBox';
import InputField from '@shared/components/form/InputField'; // Kept for potential future use
import { useData } from '@/context/DataContext';
import { FileSignature, PenTool, CheckCircle } from 'lucide-react';
import { getSignatureDataUrl } from '@/lib/signature';

const Step9_Consent = ({ formData, updateFormData, onNavigate, onFinalSubmit, handleFileUpload }) => {
    const { currentCompanyProfile } = useData();
    const currentCompany = currentCompanyProfile;

    const isFinalCertified = formData['final-certification'] === 'agreed';

    const handleFinalCertificationChange = (e) => {
        updateFormData('final-certification', e.target.checked ? 'agreed' : '');
    };

    return (
        <div id="page-9" className="form-step space-y-6">
            {/* Load a cursive font for the signature preview */}
            <style>
                {`@import url('https://fonts.googleapis.com/css2?family=Dancing+Script:wght@600&display=swap');`}
            </style>

            <h3 className="text-xl font-semibold text-gray-800">Step 9 of 9: Agreements & Signature</h3>

            {/* 1. Electronic Transaction Agreement */}
            <AgreementBox
                contentId="Agreement to Conduct Transaction Electronically"
                companyData={currentCompany}
                formData={formData}
                updateFormData={updateFormData}
                checkboxName="agree-electronic"
                checkboxLabel="I Agree"
                checkboxDescription="I have read, understood, and agree to the terms of transacting electronically."
                required={true}
            >
                <p>This electronic transaction service is provided on behalf of <strong className="company-name-placeholder">{currentCompany?.companyName || 'The Company'}</strong> (the "Employer").
                    The Employer is requesting that we - SafeHaul - provide legal documents, notices, and disclosures electronically and that we obtain your signature to legal agreements, authorizations, and other documents electronically.</p>
                <h4>Scope of Agreement</h4>
                <p>You are agreeing to receive notices electronically, authorize background checks, and provide electronic signatures in lieu of wet ink signatures.</p>
            </AgreementBox>

            {/* 2. Background Check Disclosure */}
            <AgreementBox
                contentId="Background Check Disclosure"
                companyData={currentCompany}
                formData={formData}
                updateFormData={updateFormData}
                checkboxName="agree-background-check"
                checkboxLabel="I Acknowledge and Authorize"
                checkboxDescription="I have read, understood, and agree to the Background Check Disclosure."
                required={true}
            >
                <p>In connection with your application for employment with <strong className="company-name-placeholder">{currentCompany?.companyName || 'The Company'}</strong>, a consumer report and/or investigative consumer report may be requested about you for employment purposes.</p>
                <p>These reports may include criminal history, driving records, and employment history.</p>
            </AgreementBox>

            {/* 3. FMCSA PSP Authorization */}
            <AgreementBox
                contentId="FMCSA PSP Authorization"
                companyData={currentCompany}
                formData={formData}
                updateFormData={updateFormData}
                checkboxName="agree-psp"
                checkboxLabel="I Authorize PSP Check"
                checkboxDescription="I have read, understood, and agree to the PSP Disclosure and Authorization."
                required={true}
            >
                <p>I authorize <strong className="company-name-placeholder">{currentCompany?.companyName || 'The Company'}</strong> to access the FMCSA Pre-Employment Screening Program (PSP) system to seek information regarding my commercial driving safety record.</p>
            </AgreementBox>

            {/* 4. Drug & Alcohol Clearinghouse */}
            <AgreementBox
                contentId="Drug & Alcohol Clearinghouse"
                companyData={currentCompany}
                formData={formData}
                updateFormData={updateFormData}
                checkboxName="agree-clearinghouse"
                checkboxLabel="I Provide Consent"
                checkboxDescription="I have read, understood, and provide consent for the Clearinghouse limited query."
                required={true}
            >
                <h4>General Consent for Limited Queries</h4>
                <p>I hereby provide consent to <strong className="company-name-placeholder">{currentCompany?.companyName || 'The Company'}</strong> to conduct a limited query of the FMCSA Commercial Driver's License Drug and Alcohol Clearinghouse.</p>
            </AgreementBox>

            {/* 5. Final Certification & E-Signature */}
            <fieldset className="border border-gray-300 rounded-lg p-4 space-y-4 mt-6 bg-white">
                <legend className="text-lg font-semibold text-gray-800 px-2 flex items-center gap-2">
                    <FileSignature size={20} className="text-blue-600" /> Final Certification & Signature
                </legend>

                <div className="bg-gray-50 p-4 rounded text-sm text-gray-700 leading-relaxed border border-gray-200">
                    <p className="mb-2">This certifies that this application was completed by me, and that all entries on it and information in it are true and complete to the best of my knowledge.</p>
                    <p>I authorize you to make such investigations and inquiries of my personal, employment, financial or medical history and other related matters as may be necessary in arriving at an employment decision.</p>
                </div>

                <div className="pt-4 border-t border-gray-200 space-y-4">
                    <label className="block text-sm font-bold text-gray-700 mb-1">
                        Applicant Signature (Please Draw Below) <span className="text-red-500">*</span>
                    </label>
                    <div className="relative bg-white border-2 border-dashed border-blue-200 rounded-lg overflow-hidden h-40">
                        <canvas
                            id="signature-canvas"
                            className="w-full h-full cursor-crosshair"
                            onMouseUp={() => {
                                const data = getSignatureDataUrl();
                                updateFormData('signature', data);
                                updateFormData('signatureType', 'drawn');
                            }}
                            onTouchEnd={() => {
                                const data = getSignatureDataUrl();
                                updateFormData('signature', data);
                                updateFormData('signatureType', 'drawn');
                            }}
                        ></canvas>
                        <button
                            type="button"
                            id="clear-signature"
                            className="absolute top-2 right-2 p-2 bg-gray-100/80 hover:bg-gray-200 text-gray-600 rounded-md text-xs font-bold transition-all"
                        >
                            Clear
                        </button>
                    </div>

                    <div className="flex items-start p-4 bg-blue-50/50 border border-blue-100 rounded-lg mt-4">
                        <div className="flex-shrink-0">
                            <input
                                id="final-certification"
                                name="final-certification"
                                type="checkbox"
                                checked={isFinalCertified}
                                onChange={handleFinalCertificationChange}
                                value="agreed"
                                required
                                className="h-5 w-5 text-blue-600 border-gray-300 rounded focus:ring-blue-500 mt-0.5"
                            />
                        </div>
                        <div className="ml-3 text-sm">
                            <label htmlFor="final-certification" className="font-bold text-gray-800 cursor-pointer">
                                I Certify and Agree
                            </label>
                            <p className="text-gray-600 mt-1">
                                This certifies that this application was completed by me, and that all entries on it and information in it are true and complete to the best of my knowledge. I authorize you to make such investigations and inquiries of my personal, employment, financial or medical history and other related matters as may be necessary in arriving at an employment decision.
                            </p>
                        </div>
                    </div>
                </div>
            </fieldset>

            <div className="flex justify-between pt-6">
                <button
                    type="button"
                    onClick={() => onNavigate('back')}
                    className="w-auto px-6 py-3 bg-gray-600 text-white font-semibold rounded-lg shadow-md hover:bg-gray-700"
                >
                    Back
                </button>
                <button
                    type="submit"
                    name="submit-full"
                    onClick={onFinalSubmit}
                    disabled={!isFinalCertified || !formData.signature}
                    className="w-auto px-6 py-3 bg-green-600 text-white font-semibold rounded-lg shadow-md hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
                >
                    <CheckCircle size={18} /> Submit Full Application
                </button>
            </div>
        </div>
    );
};

export default Step9_Consent;