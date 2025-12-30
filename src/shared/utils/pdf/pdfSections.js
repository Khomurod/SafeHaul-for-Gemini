import { PDF_THEME } from './pdfStyles';
import { 
    drawSectionCard, 
    drawGridRow, 
    drawBooleanBadge, 
    checkPageBreak 
} from './pdfHelpers';
import { getFieldValue } from '../helpers';

// Helper to ensure we don't print "undefined"
const val = (v) => (v === undefined || v === null || v === "") ? "N/A" : String(v);
const fmtDate = (d) => d ? new Date(d.toDate ? d.toDate() : d).toLocaleDateString() : "N/A";

/**
 * 1. EXECUTIVE HEADER
 * Replaces: addPageHeader
 * Upgrade: Adds Document ID, Brand Colors, and better layout.
 */
export const addPageHeader = (doc, company, docTitle = "OFFICIAL DRIVER QUALIFICATION FILE") => {
    const startX = PDF_THEME.LAYOUT.MARGIN;
    const endX = PDF_THEME.LAYOUT.PAGE_WIDTH - PDF_THEME.LAYOUT.MARGIN;
    let y = PDF_THEME.LAYOUT.MARGIN;

    // Company Name (Brand Color)
    doc.setFont(PDF_THEME.FONTS.MAIN, 'bold');
    doc.setFontSize(16);
    doc.setTextColor(PDF_THEME.COLORS.ACCENT);
    doc.text(getFieldValue(company?.companyName) || "SAFEHAUL CARRIER", startX, y);

    // Document Label (Right Aligned)
    doc.setFontSize(10);
    doc.setTextColor(PDF_THEME.COLORS.SECONDARY);
    doc.text(docTitle, endX, y, { align: "right" });

    y += 6;

    // Company Address Subtitle
    doc.setFont(PDF_THEME.FONTS.MAIN, 'normal');
    doc.setFontSize(8);
    const address = `${getFieldValue(company?.address?.street)}, ${getFieldValue(company?.address?.city)} ${getFieldValue(company?.address?.state)} ${getFieldValue(company?.address?.zip)}`;
    doc.text(address, startX, y);
    
    // Date Generated
    const dateStr = new Date().toLocaleDateString("en-US", { year: 'numeric', month: 'long', day: 'numeric' });
    doc.text(`Generated: ${dateStr}`, endX, y, { align: "right" });

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
            { label: "Date of Birth", value: fmtDate(data.dob) }
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
        
        // Address History Check
        if(data['residence-3-years'] === 'no') {
             currentY = drawGridRow(doc, currentY, 
                { label: "Previous Address", value: `${val(data.prevStreet)}, ${val(data.prevCity)}, ${val(data.prevState)} ${val(data.prevZip)}` },
                { label: "Residency Check", value: "Less than 3 years at current" }
             );
        }

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
 * Replaces: addDrivingHistorySection (Violations part)
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
            currentY += 12; 
        });

        currentY += 5;

        // Violations Table
        doc.setFont(PDF_THEME.FONTS.MAIN, 'bold');
        doc.setFontSize(10);
        doc.setTextColor(PDF_THEME.COLORS.PRIMARY);
        doc.text("Moving Violations (Past 3 Years)", startX, currentY);
        currentY += 6;

        if (data.violations && data.violations.length > 0) {
            data.violations.forEach((v, i) => {
                currentY = drawGridRow(doc, currentY, 
                   { label: "Violation", value: `${val(v.charge)} (${val(v.date)})` },
                   { label: "Details", value: `Loc: ${val(v.location)} | Penalty: ${val(v.penalty)}` }
                );
            });
        } else {
             doc.setFont(PDF_THEME.FONTS.MAIN, 'italic');
             doc.setFontSize(9);
             doc.setTextColor(PDF_THEME.COLORS.SECONDARY);
             doc.text("No moving violations listed.", startX, currentY);
             currentY += 6;
        }

        return currentY + 5;
    });
};

/**
 * 5. ACCIDENT HISTORY
 * Replaces: addDrivingHistorySection (Accidents part)
 */
export const renderAccidentHistory = (doc, startY, accidents = []) => {
    return drawSectionCard(doc, startY, "Accident History (Past 3 Years)", (doc, y, startX) => {
        let currentY = y;

        if (!accidents || accidents.length === 0) {
            doc.setFont(PDF_THEME.FONTS.MAIN, 'italic');
            doc.setFontSize(9);
            doc.setTextColor(PDF_THEME.COLORS.SECONDARY);
            doc.text("No accidents listed.", startX, currentY);
            return currentY + 10;
        }

        accidents.forEach((a, i) => {
             // Accident Title
             doc.setFont(PDF_THEME.FONTS.MAIN, 'bold');
             doc.setFontSize(9);
             doc.setTextColor(PDF_THEME.COLORS.ACCENT);
             doc.text(`ACCIDENT ${i+1}: ${val(a.date)}`, startX, currentY);
             currentY += 5;

             currentY = drawGridRow(doc, currentY, 
                { label: "Location", value: `${val(a.city)}, ${val(a.state)}` },
                { label: "Flags", value: `CMV: ${val(a.commercial)} | Preventable: ${val(a.preventable)}` }
             );
             
             // Details full width
             currentY -= 2; 
             const detailsText = `Details: ${val(a.details)}`;
             const splitDetails = doc.splitTextToSize(detailsText, PDF_THEME.LAYOUT.PAGE_WIDTH - (PDF_THEME.LAYOUT.MARGIN * 3));
             doc.setFont(PDF_THEME.FONTS.MAIN, 'normal');
             doc.setFontSize(9);
             doc.setTextColor(PDF_THEME.COLORS.TEXT);
             doc.text(splitDetails, startX, currentY);
             
             currentY += (splitDetails.length * 5) + 8;
        });

        return currentY;
    });
};

/**
 * 6. EMPLOYMENT HISTORY
 * Replaces: addEmploymentSection
 */
export const renderEmploymentSection = (doc, startY, employers = []) => {
    if (!employers || employers.length === 0) return startY;

    // Header
    let y = drawSectionCard(doc, startY, "Employment History (Past 3 Years)", (doc, bodyY) => bodyY - 10);
    
    employers.forEach((emp, i) => {
        y = checkPageBreak(doc, y, 40);
        
        // Employer Mini-Card Background
        doc.setFillColor(PDF_THEME.COLORS.BG_SECTION);
        doc.setDrawColor(PDF_THEME.COLORS.BORDER);
        doc.roundedRect(PDF_THEME.LAYOUT.MARGIN, y, PDF_THEME.LAYOUT.PAGE_WIDTH - (PDF_THEME.LAYOUT.MARGIN * 2), 8, 1, 1, 'F');
        
        // Employer Name
        doc.setFont(PDF_THEME.FONTS.MAIN, 'bold');
        doc.setFontSize(9);
        doc.setTextColor(PDF_THEME.COLORS.PRIMARY);
        doc.text(`${i + 1}. ${getFieldValue(emp.name).toUpperCase()}`, PDF_THEME.LAYOUT.MARGIN + 3, y + 5);
        
        y += 12;

        // Details Grid
        y = drawGridRow(doc, y, 
            { label: "Position", value: getFieldValue(emp.position) },
            { label: "Dates", value: getFieldValue(emp.dates) }
        );
        y = drawGridRow(doc, y, 
            { label: "Reason for Leaving", value: getFieldValue(emp.reason) },
            { label: "Contact", value: `${val(emp.contactPerson)} ${emp.phone ? `(${emp.phone})` : ''}` }
        );
        y = drawGridRow(doc, y, 
            { label: "Address", value: `${getFieldValue(emp.city)}, ${getFieldValue(emp.state)}` },
            { label: "FMCSRs?", value: "Yes" }
        );
        
        y += 2; // Gap between employers
    });

    return y + 5;
};

/**
 * 7. CUSTOM QUESTIONS
 * Replaces: addCustomQuestionsSection
 */
export const renderCustomQuestions = (doc, startY, customAnswers) => {
    if (!customAnswers || Object.keys(customAnswers).length === 0) return startY;

    return drawSectionCard(doc, startY, "Supplemental Questions", (doc, y) => {
        let currentY = y;
        Object.entries(customAnswers).forEach(([q, a]) => {
            const val = Array.isArray(a) ? a.join(', ') : String(a);
            // Render full width Q&A
            doc.setFont(PDF_THEME.FONTS.MAIN, 'bold');
            doc.setFontSize(8);
            doc.setTextColor(PDF_THEME.COLORS.SECONDARY);
            doc.text(q.toUpperCase(), PDF_THEME.LAYOUT.MARGIN, currentY);
            
            doc.setFont(PDF_THEME.FONTS.MAIN, 'normal');
            doc.setFontSize(10);
            doc.setTextColor(PDF_THEME.COLORS.TEXT);
            const splitA = doc.splitTextToSize(val, PDF_THEME.LAYOUT.PAGE_WIDTH - (PDF_THEME.LAYOUT.MARGIN * 2));
            doc.text(splitA, PDF_THEME.LAYOUT.MARGIN, currentY + 5);

            currentY += (splitA.length * 5) + 8;
        });
        return currentY;
    });
};

/**
 * 8. HOS TABLE (7-Day Log)
 * Replaces: addHosTable
 * Upgraded to match new visual theme.
 */
export const renderHosTable = (doc, startY, data) => {
    let y = checkPageBreak(doc, startY, 40);
    
    // Title
    doc.setFont(PDF_THEME.FONTS.MAIN, 'bold');
    doc.setFontSize(10);
    doc.setTextColor(PDF_THEME.COLORS.PRIMARY);
    doc.text("RECORD OF HOURS WORKED (Previous 7 Days)", PDF_THEME.LAYOUT.MARGIN, y);
    y += 6;

    const tableX = PDF_THEME.LAYOUT.MARGIN;
    const rowHeight = 8;
    const colWidth = (PDF_THEME.LAYOUT.PAGE_WIDTH - (PDF_THEME.LAYOUT.MARGIN * 2)) / 7;

    // Header Row
    doc.setFontSize(9);
    doc.setFillColor(PDF_THEME.COLORS.BG_SECTION); 
    doc.setDrawColor(PDF_THEME.COLORS.BORDER);
    doc.setLineWidth(0.1);

    let currentX = tableX;
    for (let i = 1; i <= 7; i++) {
        doc.rect(currentX, y, colWidth, rowHeight, 'FD');
        doc.setTextColor(PDF_THEME.COLORS.SECONDARY);
        doc.text(`Day ${i}`, currentX + colWidth / 2, y + 5.5, { align: 'center' });
        currentX += colWidth;
    }
    
    y += rowHeight;

    // Data Row
    currentX = tableX;
    doc.setFont(PDF_THEME.FONTS.MAIN, 'normal');
    doc.setFillColor(255, 255, 255); 
    doc.setTextColor(PDF_THEME.COLORS.TEXT);

    for (let i = 1; i <= 7; i++) {
        const val = getFieldValue(data['hosDay' + i]);
        const displayVal = (val === "Not Specified" || val === "") ? "0" : val;
        doc.rect(currentX, y, colWidth, rowHeight, 'S');
        doc.text(String(displayVal), currentX + colWidth / 2, y + 5.5, { align: 'center' });
        currentX += colWidth;
    }

    return y + rowHeight + PDF_THEME.LAYOUT.SECTION_GAP;
};

/**
 * 9. LEGAL SIGNATURE BLOCK
 * Replaces: addSignatureBlock
 * Upgraded to "Certificate" style.
 */
export const renderSignatureBlock = (doc, startY, data) => {
    let y = checkPageBreak(doc, startY, 60);
    const startX = PDF_THEME.LAYOUT.MARGIN;
    const width = PDF_THEME.LAYOUT.PAGE_WIDTH - (PDF_THEME.LAYOUT.MARGIN * 2);

    // Container Box
    doc.setDrawColor(PDF_THEME.COLORS.BORDER);
    doc.setLineWidth(0.5);
    doc.roundedRect(startX, y, width, 55, 2, 2);

    y += 10;

    // "Digitally Signed" Header
    doc.setFont(PDF_THEME.FONTS.MAIN, 'bold');
    doc.setFontSize(10);
    doc.setTextColor(PDF_THEME.COLORS.ACCENT);
    doc.text("DIGITAL SIGNATURE & CONSENT CERTIFICATE", startX + 5, y);

    y += 8;

    // Legal Text (Certification)
    doc.setFont(PDF_THEME.FONTS.MAIN, 'normal');
    doc.setFontSize(7);
    doc.setTextColor(PDF_THEME.COLORS.SECONDARY);
    const legalText = "By electronically signing this document, I certify that this application was completed by me, and that all entries on it and information in it are true and complete to the best of my knowledge. I authorize the carrier to make such investigations and inquiries of my personal, employment, financial or medical history and other related matters as may be necessary in arriving at an employment decision.";
    const splitLegal = doc.splitTextToSize(legalText, width - 10);
    doc.text(splitLegal, startX + 5, y);

    y += (splitLegal.length * 3) + 10;

    // The Signature
    const sigText = data.signature?.replace('TEXT_SIGNATURE:', '') || data.signatureName || "Not Signed";
    
    // Draw Signature Line (Cursive-ish look using Times Italic)
    doc.setFont("times", 'italic'); 
    doc.setFontSize(18);
    doc.setTextColor(PDF_THEME.COLORS.PRIMARY);
    doc.text(`/s/ ${sigText}`, startX + 10, y);

    // Meta Data (Right Side)
    doc.setFont(PDF_THEME.FONTS.MAIN, 'normal');
    doc.setFontSize(8);
    doc.setTextColor(PDF_THEME.COLORS.SECONDARY);
    const dateSigned = data['signature-date'] || new Date().toLocaleDateString();
    
    doc.text(`Date Signed: ${dateSigned}`, startX + width - 5, y, { align: 'right' });
    doc.text(`IP Address: ${val(data.ipAddress || 'Recorded')}`, startX + width - 5, y + 4, { align: 'right' });
    doc.text(`Ref ID: ${val(data.id || data.applicantId)}`, startX + width - 5, y + 8, { align: 'right' });

    return y + 25;
};

/**
 * 10. AGREEMENT PAGE HEADER
 * Replaces: addAgreementHeader
 */
export const renderAgreementHeader = (doc, y, title, companyName) => {
    y = checkPageBreak(doc, y, 40);
    y += 10;
    doc.setFont(PDF_THEME.FONTS.MAIN, 'bold');
    doc.setFontSize(14);
    doc.setTextColor(PDF_THEME.COLORS.PRIMARY);
    const titleWidth = doc.getTextWidth(title);
    doc.text(title, (PDF_THEME.LAYOUT.PAGE_WIDTH - titleWidth) / 2, y);
    
    y += 8;
    if (companyName) {
        doc.setFontSize(10);
        doc.setFont(PDF_THEME.FONTS.MAIN, 'normal');
        doc.text(`Prepared for: ${companyName}`, PDF_THEME.LAYOUT.MARGIN, y);
        y += 6;
    }
    
    doc.setDrawColor(PDF_THEME.COLORS.BORDER);
    doc.line(PDF_THEME.LAYOUT.MARGIN, y, PDF_THEME.LAYOUT.PAGE_WIDTH - PDF_THEME.LAYOUT.MARGIN, y);
    return y + 8;
};
