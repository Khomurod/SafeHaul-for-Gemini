import { PDF_THEME, setHeaderStyle, setLabelStyle, setValueStyle } from './pdfStyles';
import { 
    drawSectionCard, 
    drawGridRow, 
    drawField, 
    drawBooleanBadge, 
    drawDivider,
    checkPageBreak 
} from './pdfHelpers';

const val = (v) => v || "N/A";

/**
 * 1. EXECUTIVE HEADER
 * Renders a formal letterhead with Company Info and Document ID.
 */
export const addPageHeader = (doc, company, docTitle = "OFFICIAL DRIVER QUALIFICATION FILE") => {
    const startX = PDF_THEME.LAYOUT.MARGIN;
    const endX = PDF_THEME.LAYOUT.PAGE_WIDTH - PDF_THEME.LAYOUT.MARGIN;
    let y = PDF_THEME.LAYOUT.MARGIN;

    // Company Name (Brand Color)
    doc.setFont(PDF_THEME.FONTS.MAIN, 'bold');
    doc.setFontSize(16);
    doc.setTextColor(PDF_THEME.COLORS.ACCENT);
    doc.text(company?.companyName || "SAFEHAUL CARRIER", startX, y);

    // Document Label (Right Aligned)
    doc.setFontSize(10);
    doc.setTextColor(PDF_THEME.COLORS.SECONDARY);
    doc.text(docTitle, endX, y, { align: "right" });

    y += 6;

    // Company Address Subtitle
    doc.setFont(PDF_THEME.FONTS.MAIN, 'normal');
    doc.setFontSize(8);
    const address = `${company?.address?.street || ''}, ${company?.address?.city || ''} ${company?.address?.state || ''}`;
    doc.text(address, startX, y);
    
    // Date Generated
    doc.text(`Generated: ${new Date().toLocaleDateString()}`, endX, y, { align: "right" });

    y += 8;

    // Divider Bar
    doc.setDrawColor(PDF_THEME.COLORS.ACCENT);
    doc.setLineWidth(0.5);
    doc.line(startX, y, endX, y);

    return y + 10;
};

/**
 * 2. PERSONAL IDENTITY CARD
 * Renders Name, DOB, SSN in a clean grid.
 */
export const renderPersonalInfo = (doc, startY, data) => {
    return drawSectionCard(doc, startY, "Legal Identity & Contact", (doc, y) => {
        let currentY = y;

        // Row 1: Name
        const fullName = `${val(data.firstName)} ${val(data.middleName)} ${val(data.lastName)} ${val(data.suffix)}`;
        currentY = drawGridRow(doc, currentY, 
            { label: "Full Legal Name", value: fullName },
            { label: "Date of Birth", value: data.dob ? new Date(data.dob.toDate ? data.dob.toDate() : data.dob).toLocaleDateString() : "N/A" }
        );

        // Row 2: SSN & Phone
        currentY = drawGridRow(doc, currentY,
            { label: "Social Security No.", value: val(data.ssn) },
            { label: "Phone Number", value: val(data.phone) }
        );

        // Row 3: Email & Address
        currentY = drawGridRow(doc, currentY,
            { label: "Email Address", value: val(data.email) },
            { label: "Current Address", value: `${val(data.street)}, ${val(data.city)}, ${val(data.state)} ${val(data.zip)}` }
        );

        return currentY;
    });
};

/**
 * 3. LICENSE & QUALIFICATIONS CARD
 */
export const renderLicenseSection = (doc, startY, data) => {
    return drawSectionCard(doc, startY, "License & Credentials", (doc, y) => {
        let currentY = y;

        currentY = drawGridRow(doc, currentY,
            { label: "CDL Number", value: val(data.cdlNumber) },
            { label: "State of Issue", value: val(data.cdlState) }
        );

        // Helper to format timestamps
        const fmtDate = (d) => d ? new Date(d.toDate ? d.toDate() : d).toLocaleDateString() : "N/A";

        currentY = drawGridRow(doc, currentY,
            { label: "Class & Endorsements", value: `Class ${val(data.cdlClass)} | End: ${val(data.endorsements)}` },
            { label: "Expiration Date", value: fmtDate(data.cdlExpiration) }
        );

        // Medical Card & TWIC
        currentY = drawGridRow(doc, currentY,
            { label: "Medical Card Exp.", value: fmtDate(data.medCardExpiration) },
            { label: "TWIC Card", value: data['has-twic'] === 'yes' ? `YES (Exp: ${val(data.twicExpiration)})` : "NO" }
        );

        return currentY;
    });
};

/**
 * 4. SAFETY & COMPLIANCE HISTORY
 * Uses Boolean Badges for high-level scanning.
 */
export const renderSafetyHistory = (doc, startY, data) => {
    return drawSectionCard(doc, startY, "Safety & Compliance History", (doc, y, startX) => {
        let currentY = y;

        // Boolean Flags
        const flags = [
            { label: "License Suspended/Revoked?", value: data['revoked-licenses'] },
            { label: "Drug/Alcohol Violations?", value: data['drug-alcohol-convictions'] },
            { label: "Felony Convictions?", value: data['has-felony'] }
        ];

        flags.forEach(flag => {
            drawBooleanBadge(doc, startX, currentY, flag.label, flag.value);
            // Stack badges vertically with gap
            currentY += 12; 
        });

        // Add some space if needed
        return currentY + 5;
    });
};

/**
 * 5. EMPLOYMENT HISTORY (Iterative Cards)
 */
export const renderEmploymentSection = (doc, startY, employers = []) => {
    if (!employers || employers.length === 0) return startY;

    // Header
    let y = drawSectionCard(doc, startY, "Employment History (Past 3 Years)", (doc, bodyY) => bodyY - 10);
    
    // Draw each employer as a mini-block
    employers.forEach((emp, i) => {
        y = checkPageBreak(doc, y, 40);
        
        // Mini Header
        doc.setFillColor(PDF_THEME.COLORS.BG_SECTION);
        doc.roundedRect(PDF_THEME.LAYOUT.MARGIN, y, PDF_THEME.LAYOUT.PAGE_WIDTH - (PDF_THEME.LAYOUT.MARGIN * 2), 8, 1, 1, 'F');
        
        doc.setFont(PDF_THEME.FONTS.MAIN, 'bold');
        doc.setFontSize(9);
        doc.setTextColor(PDF_THEME.COLORS.PRIMARY);
        doc.text(`${i + 1}. ${emp.name.toUpperCase()}`, PDF_THEME.LAYOUT.MARGIN + 3, y + 5);
        
        y += 12;

        // Details Grid
        y = drawGridRow(doc, y, 
            { label: "Position", value: emp.position },
            { label: "Dates", value: emp.dates }
        );
        y = drawGridRow(doc, y, 
            { label: "Reason for Leaving", value: emp.reason },
            { label: "Contact", value: `${val(emp.contactPerson)} (${val(emp.email)})` }
        );
        
        y += 2; // Gap between employers
    });

    return y + 5;
};

/**
 * 6. LEGAL SIGNATURE BLOCK
 * Looks like a digital certificate.
 */
export const renderSignatureBlock = (doc, startY, data) => {
    let y = checkPageBreak(doc, startY, 60);
    const startX = PDF_THEME.LAYOUT.MARGIN;
    const width = PDF_THEME.LAYOUT.PAGE_WIDTH - (PDF_THEME.LAYOUT.MARGIN * 2);

    // Container Box
    doc.setDrawColor(PDF_THEME.COLORS.BORDER);
    doc.setLineWidth(0.5);
    doc.roundedRect(startX, y, width, 50, 2, 2);

    y += 10;

    // "Digitally Signed" Header
    doc.setFont(PDF_THEME.FONTS.MAIN, 'bold');
    doc.setFontSize(10);
    doc.setTextColor(PDF_THEME.COLORS.ACCENT);
    doc.text("DIGITAL SIGNATURE & CONSENT CERTIFICATE", startX + 5, y);

    y += 8;

    // Legal Text
    doc.setFont(PDF_THEME.FONTS.MAIN, 'normal');
    doc.setFontSize(7);
    doc.setTextColor(PDF_THEME.COLORS.SECONDARY);
    const legalText = "By electronically signing this document, I certify that this application was completed by me, and that all entries on it and information in it are true and complete to the best of my knowledge. I authorize the carrier to make such investigations and inquiries of my personal, employment, financial or medical history and other related matters as may be necessary in arriving at an employment decision.";
    const splitLegal = doc.splitTextToSize(legalText, width - 10);
    doc.text(splitLegal, startX + 5, y);

    y += (splitLegal.length * 3) + 10;

    // The Signature
    const sigText = data.signature?.replace('TEXT_SIGNATURE:', '') || data.signatureName || "Not Signed";
    
    // Draw Signature Line
    doc.setFont("times", 'italic'); // Serif font looks more like a signature
    doc.setFontSize(18);
    doc.setTextColor(PDF_THEME.COLORS.PRIMARY);
    doc.text(`/s/ ${sigText}`, startX + 10, y);

    // Meta Data (Right Side)
    doc.setFont(PDF_THEME.FONTS.MAIN, 'normal');
    doc.setFontSize(8);
    doc.setTextColor(PDF_THEME.COLORS.SECONDARY);
    const dateSigned = data['signature-date'] || new Date().toLocaleDateString();
    
    doc.text(`Date Signed: ${dateSigned}`, endX - 5, y, { align: 'right' });
    doc.text(`IP Address: ${val(data.ipAddress)}`, endX - 5, y + 4, { align: 'right' });
    doc.text(`Ref ID: ${val(data.id)}`, endX - 5, y + 8, { align: 'right' });

    return y + 20;
};
