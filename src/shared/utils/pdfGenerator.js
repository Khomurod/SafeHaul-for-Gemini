import { jsPDF } from "jspdf";
import { getFieldValue } from '@shared/utils/helpers';
import { PDF_THEME } from '@shared/utils/pdf/pdfStyles';
import { 
    addPageHeader, 
    renderPersonalInfo,
    renderLicenseSection,
    renderSafetyHistory,
    renderAccidentHistory,
    renderEmploymentSection,
    renderCustomQuestions,
    renderHosTable,
    renderSignatureBlock,
    renderAgreementHeader
} from '@shared/utils/pdf/pdfSections';

// --- LEGAL TEXT CONSTANTS (Preserved) ---

const TEXT_ELECTRONIC_SIG = `AGREEMENT TO CONDUCT TRANSACTION ELECTRONICALLY

1. DEFINITIONS.
"We," "Us," and "Company" refer to the motor carrier to which you are applying. "You" and "Your" refer to the applicant. "Communication" means any application forms, disclosures, notices, responses, agreements, and other documents related to your application for employment.

2. SCOPE. You agree that we may provide you with any Communications in electronic format, and that we may discontinue sending paper Communications to you. You agree that your electronic signature has the same legal effect as a manual signature.

3. CONSENT. By signing this application electronically, you consent to receive and respond to Communications in electronic format. You have the right to request paper copies of any Communication by contacting us directly.

4. WITHDRAWAL. You may withdraw your consent to receive Communications electronically by providing written notice to us. However, withdrawing consent may terminate the application process if we are unable to proceed with a paper-based application.

5. SYSTEM REQUIREMENTS. To access and retain the electronic Communications, you will need a device with internet access and a PDF reader. I acknowledge that I have read, understand, and agree to the terms set forth above.`;

const TEXT_FCRA_DISCLOSURE = `BACKGROUND CHECK DISCLOSURE AND AUTHORIZATION (FCRA)

In connection with your application for employment with Company ("Prospective Employer"), Prospective Employer, its employees, agents or contractors may obtain one or more reports regarding your credit, driving, and/or criminal background history from a consumer reporting agency.

These reports may include information regarding your character, general reputation, personal characteristics, mode of living, driving history, criminal history, and employment history.

AUTHORIZATION
I hereby authorize Prospective Employer to obtain the consumer reports described above about me. I authorize, without reservation, any party or agency contacted by Prospective Employer to furnish the above-mentioned information.

I understand that I have the right to make a written request within a reasonable period of time to receive additional detailed information about the nature and scope of any investigation. I acknowledge that I have received a copy of the summary of rights under the Fair Credit Reporting Act (FCRA).`;

const TEXT_PSP_DISCLOSURE = `IMPORTANT DISCLOSURE REGARDING BACKGROUND REPORTS FROM THE PSP Online Service

In connection with your application for employment with Company ("Prospective Employer"), Prospective Employer, its employees, agents or contractors may obtain one or more reports regarding your driving, and safety inspection history from the Federal Motor Carrier Safety Administration (FMCSA).

When the application for employment is submitted in connection with a driver position, Prospective Employer cannot obtain background reports from FMCSA unless you consent in writing.

AUTHORIZATION
I hereby authorize Prospective Employer to access the FMCSA Pre-Employment Screening Program (PSP) system to seek information regarding my commercial driving safety record and information regarding my safety inspection history.

I understand that I am authorizing the release of safety performance information including crash data from the previous five (5) years and inspection history from the previous three (3) years. I understand that I have the right to review the information provided by the PSP system and to contest the accuracy of that information by submitting a request to the FMCSA DataQs system.`;

const TEXT_CLEARINGHOUSE_CONSENT = `GENERAL CONSENT FOR FULL QUERY OF THE FMCSA DRUG AND ALCOHOL CLEARINGHOUSE

I hereby provide consent to Company ("Prospective Employer") to conduct a full query of the FMCSA Commercial Driver's License Drug and Alcohol Clearinghouse (Clearinghouse) to determine whether drug or alcohol violation information about me exists in the Clearinghouse, and to release that information to Prospective Employer.

I understand that if the full query conducted by Prospective Employer indicates that drug or alcohol violation information about me exists in the Clearinghouse, FMCSA will disclose that information to Prospective Employer.

I further understand that if I refuse to provide consent for Prospective Employer to conduct a full query of the Clearinghouse, Prospective Employer must prohibit me from performing safety-sensitive functions, including driving a commercial motor vehicle, as required by FMCSA's drug and alcohol program regulations.`;

export function generateApplicationPDF(pdfData) {
    if (!pdfData) {
        console.error("Generate PDF: Missing data");
        return;
    }

    // Destructure
    const { applicant = {}, company = {} } = pdfData;

    // Fallbacks
    const companyProfile = company || { companyName: "SafeHaul Carrier" };
    const companyName = getFieldValue(companyProfile.companyName);
    const applicantName = `${getFieldValue(applicant.firstName)} ${getFieldValue(applicant.lastName)}`;

    // Init PDF
    const doc = new jsPDF('p', 'mm', 'a4');
    let y = PDF_THEME.LAYOUT.MARGIN;

    // --- SECTION 1: THE APPLICATION ---
    
    // 1. Header
    y = addPageHeader(doc, companyProfile);

    // 2. Personal Info
    y = renderPersonalInfo(doc, y, applicant);
    y += PDF_THEME.LAYOUT.SECTION_GAP;

    // 3. License
    y = renderLicenseSection(doc, y, applicant);
    y += PDF_THEME.LAYOUT.SECTION_GAP;

    // 4. Safety
    y = renderSafetyHistory(doc, y, applicant);
    y += PDF_THEME.LAYOUT.SECTION_GAP;

    // 5. Accidents
    y = renderAccidentHistory(doc, y, applicant.accidents);
    y += PDF_THEME.LAYOUT.SECTION_GAP;

    // 6. Employment
    y = renderEmploymentSection(doc, y, applicant.employers);
    y += PDF_THEME.LAYOUT.SECTION_GAP;

    // 7. Custom Questions
    y = renderCustomQuestions(doc, y, applicant.customAnswers);
    y += PDF_THEME.LAYOUT.SECTION_GAP;

    // 8. HOS Logs
    y = renderHosTable(doc, y, applicant);
    
    // 9. Initial Signature on App
    y = renderSignatureBlock(doc, y, applicant);

    // --- SECTION 2: THE AGREEMENTS ---

    const replaceCompany = (text) => text.replaceAll('Company', companyName).replaceAll('Prospective Employer', companyName);

    const agreements = [
        { title: "AGREEMENT TO CONDUCT TRANSACTION ELECTRONICALLY", text: replaceCompany(TEXT_ELECTRONIC_SIG) },
        { title: "BACKGROUND CHECK DISCLOSURE AND AUTHORIZATION", text: replaceCompany(TEXT_FCRA_DISCLOSURE) },
        { title: "FMCSA PSP DISCLOSURE AND AUTHORIZATION", text: replaceCompany(TEXT_PSP_DISCLOSURE) },
        { title: "FMCSA CLEARINGHOUSE CONSENT", text: replaceCompany(TEXT_CLEARINGHOUSE_CONSENT) }
    ];

    agreements.forEach(agreement => {
        doc.addPage();
        let pageY = PDF_THEME.LAYOUT.MARGIN;

        // Header
        pageY = renderAgreementHeader(doc, pageY, agreement.title, companyName);
        
        // Body Text
        doc.setFont(PDF_THEME.FONTS.MAIN, 'normal');
        doc.setFontSize(9);
        doc.setTextColor(PDF_THEME.COLORS.TEXT);
        
        const splitText = doc.splitTextToSize(agreement.text, PDF_THEME.LAYOUT.PAGE_WIDTH - (PDF_THEME.LAYOUT.MARGIN * 2));
        doc.text(splitText, PDF_THEME.LAYOUT.MARGIN, pageY);
        
        pageY += (splitText.length * 5) + 15;

        // Signature Block again for each agreement
        renderSignatureBlock(doc, pageY, applicant);
    });

    // --- FOOTER (ALL PAGES) ---
    const pageCount = doc.internal.getNumberOfPages();
    for(let i = 1; i <= pageCount; i++) {
        doc.setPage(i); 
        
        // Footer Line
        doc.setDrawColor(PDF_THEME.COLORS.BORDER);
        doc.line(PDF_THEME.LAYOUT.MARGIN, PDF_THEME.LAYOUT.PAGE_HEIGHT - 12, PDF_THEME.LAYOUT.PAGE_WIDTH - PDF_THEME.LAYOUT.MARGIN, PDF_THEME.LAYOUT.PAGE_HEIGHT - 12);

        // Footer Text
        doc.setFont(PDF_THEME.FONTS.MAIN, 'normal');
        doc.setFontSize(7);
        doc.setTextColor(PDF_THEME.COLORS.SECONDARY);
        
        // Left: App Name
        doc.text(`Applicant: ${applicantName} | Ref: ${applicant.id || 'N/A'}`, PDF_THEME.LAYOUT.MARGIN, PDF_THEME.LAYOUT.PAGE_HEIGHT - 8);
        
        // Center: System Brand
        doc.text("SafeHaul Compliance Engine - Digitally Sealed", PDF_THEME.LAYOUT.PAGE_WIDTH / 2, PDF_THEME.LAYOUT.PAGE_HEIGHT - 8, { align: 'center' });

        // Right: Page No
        doc.text(`Page ${i} of ${pageCount}`, PDF_THEME.LAYOUT.PAGE_WIDTH - PDF_THEME.LAYOUT.MARGIN, PDF_THEME.LAYOUT.PAGE_HEIGHT - 8, { align: 'right' });
    }

    doc.save(`Application-${getFieldValue(applicant.lastName)}-${getFieldValue(applicant.firstName)}.pdf`);
}
