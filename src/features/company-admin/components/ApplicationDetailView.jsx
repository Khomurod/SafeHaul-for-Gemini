import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useApplicationDetails } from '@features/applications/hooks/useApplicationDetails';
import { generateApplicationPDF } from '@shared/utils/pdfGenerator';
import { 
    User, FileText, Truck, AlertTriangle, Briefcase, 
    CheckCircle, XCircle, Download, ChevronLeft, 
    Calendar, MapPin, Shield, Clock
} from 'lucide-react';

// Import our new "Digital Dossier" Components
import SectionCard from './application/view-components/SectionCard';
import DataRow from './application/view-components/DataRow';
import TimelineView from './application/view-components/TimelineView';
import RiskGrid from './application/view-components/RiskGrid';

// FIX: Export as a named constant to satisfy { ApplicationDetailView } imports
export const ApplicationDetailView = () => {
    const { id } = useParams();
    const navigate = useNavigate();
    const { application, loading, error, updateStatus } = useApplicationDetails(id);
    const [isGeneratingPdf, setIsGeneratingPdf] = useState(false);

    // If still loading...
    if (loading) {
        return (
            <div className="flex items-center justify-center h-screen bg-slate-50">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
            </div>
        );
    }

    if (error || !application) {
        return (
            <div className="p-8 text-center">
                <h2 className="text-xl font-bold text-red-600">Application Not Found</h2>
                <button onClick={() => navigate(-1)} className="mt-4 text-blue-600 hover:underline">
                    Go Back
                </button>
            </div>
        );
    }

    const data = application; // Shortcut

    // --- Actions ---

    const handleDownloadPDF = async () => {
        setIsGeneratingPdf(true);
        try {
            await generateApplicationPDF({ 
                applicant: data, 
                company: { companyName: "SafeHaul Carrier" } 
            });
        } catch (err) {
            console.error("PDF Error", err);
            alert("Failed to generate PDF");
        } finally {
            setIsGeneratingPdf(false);
        }
    };

    const handleStatusChange = async (newStatus) => {
        if (window.confirm(`Are you sure you want to mark this application as ${newStatus}?`)) {
            await updateStatus(newStatus);
        }
    };

    // --- Render ---

    return (
        <div className="min-h-screen bg-slate-50 pb-20">
            
            {/* 1. STICKY HEADER (Command Center) */}
            <header className="sticky top-0 z-30 bg-white border-b border-gray-200 shadow-sm px-6 py-4 flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div className="flex items-center gap-4">
                    <button 
                        onClick={() => navigate(-1)} 
                        className="p-2 hover:bg-gray-100 rounded-full text-gray-500 transition-colors"
                    >
                        <ChevronLeft size={24} />
                    </button>
                    <div>
                        <div className="flex items-center gap-3">
                            <h1 className="text-2xl font-black text-slate-900 uppercase tracking-tight">
                                {data.firstName} {data.lastName}
                            </h1>
                            <span className={`px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wide border ${
                                data.status === 'Approved' ? 'bg-green-100 text-green-700 border-green-200' :
                                data.status === 'Rejected' ? 'bg-red-100 text-red-700 border-red-200' :
                                'bg-blue-100 text-blue-700 border-blue-200'
                            }`}>
                                {data.status || 'New'}
                            </span>
                        </div>
                        <p className="text-xs text-gray-500 flex items-center gap-2 mt-1">
                            <span>ID: {id?.substring(0, 8)}...</span>
                            <span className="w-1 h-1 bg-gray-300 rounded-full"></span>
                            <Clock size={12} /> Applied: {data.createdAt?.toDate ? data.createdAt.toDate().toLocaleDateString() : 'N/A'}
                        </p>
                    </div>
                </div>

                <div className="flex items-center gap-3">
                    <button 
                        onClick={handleDownloadPDF}
                        disabled={isGeneratingPdf}
                        className="flex items-center gap-2 px-4 py-2 bg-white border border-gray-300 text-gray-700 font-bold text-sm rounded-lg hover:bg-gray-50 transition-all shadow-sm"
                    >
                        <Download size={16} />
                        {isGeneratingPdf ? 'Generating...' : 'Export PDF'}
                    </button>
                    
                    <button 
                        onClick={() => handleStatusChange('Rejected')}
                        className="flex items-center gap-2 px-4 py-2 bg-white border border-red-200 text-red-600 font-bold text-sm rounded-lg hover:bg-red-50 transition-all shadow-sm"
                    >
                        <XCircle size={16} /> Reject
                    </button>
                    
                    <button 
                        onClick={() => handleStatusChange('Approved')}
                        className="flex items-center gap-2 px-6 py-2 bg-green-600 text-white font-bold text-sm rounded-lg hover:bg-green-700 shadow-md hover:shadow-lg transition-all"
                    >
                        <CheckCircle size={16} /> Approve Driver
                    </button>
                </div>
            </header>

            <main className="max-w-7xl mx-auto px-4 md:px-6 py-8 grid grid-cols-12 gap-8">
                
                {/* 2. SIDEBAR NAVIGATION (Table of Contents) */}
                <aside className="hidden lg:block col-span-3">
                    <nav className="sticky top-28 space-y-1">
                        <p className="px-3 text-xs font-bold text-gray-400 uppercase tracking-wider mb-2">Sections</p>
                        {[
                            { id: 'identity', label: 'Identity & Contact', icon: User },
                            { id: 'qualifications', label: 'Qualifications', icon: Briefcase },
                            { id: 'license', label: 'License & Medical', icon: Truck },
                            { id: 'safety', label: 'Safety Record', icon: AlertTriangle },
                            { id: 'employment', label: 'Employment History', icon: FileText },
                            { id: 'consent', label: 'Legal Consent', icon: Shield },
                        ].map((item) => (
                            <a 
                                key={item.id}
                                href={`#${item.id}`}
                                className="flex items-center gap-3 px-3 py-2.5 text-sm font-medium text-gray-600 rounded-lg hover:bg-white hover:text-blue-600 hover:shadow-sm transition-all"
                            >
                                <item.icon size={16} />
                                {item.label}
                            </a>
                        ))}
                    </nav>
                </aside>

                {/* 3. MAIN CONTENT (The Dossier) */}
                <div className="col-span-12 lg:col-span-9 space-y-8">
                    
                    {/* SECTION: IDENTITY */}
                    <SectionCard id="identity" title="Identity & Contact Information" icon={User}>
                        <DataRow label="Full Legal Name" value={`${data.firstName} ${data.middleName || ''} ${data.lastName} ${data.suffix || ''}`} enableCopy />
                        <DataRow label="Date of Birth" value={data.dob} type="date" />
                        <DataRow label="Social Security No." value={data.ssn} enableCopy />
                        <DataRow label="Primary Phone" value={data.phone} type="phone" enableCopy />
                        <DataRow label="Email Address" value={data.email} type="email" enableCopy />
                        <DataRow label="Current Address" value={`${data.street}, ${data.city}, ${data.state} ${data.zip}`} />
                        {data['residence-3-years'] === 'no' && (
                            <DataRow 
                                label="Previous Address" 
                                value={`${data.prevStreet}, ${data.prevCity}, ${data.prevState} ${data.prevZip}`} 
                                className="bg-yellow-50/50"
                            />
                        )}
                    </SectionCard>

                    {/* SECTION: QUALIFICATIONS */}
                    <SectionCard id="qualifications" title="General Qualifications" icon={Briefcase}>
                        <DataRow label="Position Applied For" value={data.positionApplyingTo} />
                        <DataRow label="Experience Level" value={data['experience-years']} />
                        <DataRow label="Referral Source" value={data.referralSource} />
                        <DataRow label="Legally Eligible to Work?" value={data['legal-work']} type="boolean" />
                        <DataRow label="English Proficiency?" value={data['english-fluency']} type="boolean" />
                        <DataRow label="Drug Test History?" value={data['drug-test-positive']} type="boolean" />
                        {data['drug-test-positive'] === 'yes' && (
                            <>
                                <DataRow label="Return to Duty Complete?" value={data['dot-return-to-duty']} type="boolean" />
                                <DataRow label="Explanation" value={data['drug-test-explanation']} />
                            </>
                        )}
                        <DataRow label="Felony Conviction?" value={data['has-felony']} type="boolean" />
                        {data['has-felony'] === 'yes' && (
                            <DataRow label="Felony Details" value={data.felonyExplanation} />
                        )}
                    </SectionCard>

                    {/* SECTION: LICENSE */}
                    <SectionCard id="license" title="License & Credentials" icon={Truck} isComplete={!!data.cdlNumber}>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-x-8">
                            <div>
                                <DataRow label="CDL Number" value={data.cdlNumber} enableCopy />
                                <DataRow label="Issuing State" value={data.cdlState} />
                                <DataRow label="License Class" value={data.cdlClass} />
                            </div>
                            <div>
                                <DataRow label="Expiration Date" value={data.cdlExpiration} type="date" />
                                <DataRow label="Medical Card Exp." value={data.medCardExpiration} type="date" />
                                <DataRow label="TWIC Card Holder?" value={data['has-twic']} type="boolean" />
                            </div>
                        </div>
                        <DataRow label="Endorsements" value={data.endorsements} />
                    </SectionCard>

                    {/* SECTION: SAFETY */}
                    <SectionCard id="safety" title="Safety & Driving Record" icon={AlertTriangle}>
                        <div className="space-y-6">
                            <div>
                                <h4 className="text-xs font-bold text-gray-400 uppercase mb-3">Moving Violations (Past 3 Years)</h4>
                                <RiskGrid data={data.violations} type="violation" />
                            </div>
                            <div>
                                <h4 className="text-xs font-bold text-gray-400 uppercase mb-3">Accident History (Past 3 Years)</h4>
                                <RiskGrid data={data.accidents} type="accident" />
                            </div>
                            <div className="pt-4 border-t border-gray-100">
                                <DataRow label="License Suspended/Revoked?" value={data['driving-convictions']} type="boolean" />
                                <DataRow label="License Denied?" value={data['revoked-licenses']} type="boolean" />
                            </div>
                        </div>
                    </SectionCard>

                    {/* SECTION: EMPLOYMENT */}
                    <SectionCard id="employment" title="Employment History" icon={FileText}>
                        <TimelineView items={data.employers} type="employment" />
                        
                        {/* Schools & Military if present */}
                        {(data.schools?.length > 0 || data.military?.length > 0) && (
                            <div className="mt-8 pt-6 border-t border-gray-100">
                                <h4 className="text-sm font-bold text-slate-800 uppercase mb-4">Education & Military</h4>
                                {data.schools?.map((s, i) => (
                                    <DataRow key={`s-${i}`} label="Driving School" value={`${s.name} (${s.dates})`} />
                                ))}
                                {data.military?.map((m, i) => (
                                    <DataRow key={`m-${i}`} label="Military Service" value={`${m.branch} - ${m.rank} (${m.start} to ${m.end})`} />
                                ))}
                            </div>
                        )}
                    </SectionCard>

                    {/* SECTION: CONSENT */}
                    <SectionCard id="consent" title="Legal Consent & Signature" icon={Shield}>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                            <div className="space-y-2">
                                <DataRow label="Electronic Signature" value="Consented" type="boolean" />
                                <DataRow label="FCRA Disclosure" value="Authorized" type="boolean" />
                                <DataRow label="PSP Disclosure" value="Authorized" type="boolean" />
                                <DataRow label="Clearinghouse" value="Authorized" type="boolean" />
                            </div>
                            
                            <div className="bg-gray-50 p-4 rounded-xl border border-gray-200 text-center">
                                <span className="block text-xs font-bold text-gray-400 uppercase mb-2">Digital Signature Capture</span>
                                {data.signature ? (
                                    data.signature.startsWith('TEXT_SIGNATURE:') ? (
                                        <div className="font-serif italic text-2xl text-slate-800 py-4">
                                            /s/ {data.signature.replace('TEXT_SIGNATURE:', '')}
                                        </div>
                                    ) : (
                                        <img src={data.signature} alt="Signature" className="max-h-16 mx-auto mix-blend-multiply" />
                                    )
                                ) : (
                                    <span className="text-red-500 text-sm font-bold">Signature Missing</span>
                                )}
                                <div className="mt-2 text-[10px] text-gray-400 border-t border-gray-200 pt-2">
                                    Signed: {data.submittedAt?.toDate ? data.submittedAt.toDate().toLocaleString() : 'Date Unknown'} <br/>
                                    IP: {data.ipAddress || 'Recorded'}
                                </div>
                            </div>
                        </div>
                    </SectionCard>

                </div>
            </main>
        </div>
    );
};

// FIX: Retain default export for backwards compatibility
export default ApplicationDetailView;
