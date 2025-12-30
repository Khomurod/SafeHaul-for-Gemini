import { PDF_THEME } from './pdfStyles';

/**
 * Checks if there is enough space on the page for a new element.
 * If not, adds a new page and resets Y.
 */
export const checkPageBreak = (doc, currentY, requiredSpace = 20) => {
    if (currentY + requiredSpace > PDF_THEME.LAYOUT.PAGE_HEIGHT - PDF_THEME.LAYOUT.MARGIN) {
        doc.addPage();
        return PDF_THEME.LAYOUT.MARGIN + 25; // Reset Y (account for header)
    }
    return currentY;
};

/**
 * Draws a "Section Card" container with a colored header.
 * @param {string} title - The section title (e.g. "PERSONAL INFORMATION")
 * @param {function} renderContent - Callback to render content inside the box
 */
export const drawSectionCard = (doc, startY, title, renderContent) => {
    // 1. Check space for at least the header + some content
    let y = checkPageBreak(doc, startY, 40);
    const startX = PDF_THEME.LAYOUT.MARGIN;
    const width = PDF_THEME.LAYOUT.PAGE_WIDTH - (PDF_THEME.LAYOUT.MARGIN * 2);

    // 2. Draw Section Header (Colored Bar)
    doc.setFillColor(PDF_THEME.COLORS.BG_SECTION);
    doc.setDrawColor(PDF_THEME.COLORS.BORDER);
    doc.rect(startX, y, width, 10, 'F'); // Filled gray/blue background

    // Title Text
    doc.setFont(PDF_THEME.FONTS.MAIN, 'bold');
    doc.setFontSize(PDF_THEME.SIZES.SECTION_HEADER);
    doc.setTextColor(PDF_THEME.COLORS.ACCENT);
    doc.text(title.toUpperCase(), startX + 4, y + 7);

    // 3. Render Content Inside
    y += 15; // Move down into the card body
    return renderContent(doc, y, startX, width);
};

/**
 * Draws a "Field Label" and "Value" stacked vertically.
 * This mimics the "Focus-Mode" UI of the app.
 */
export const drawField = (doc, x, y, label, value, width = 60) => {
    // Label (Small, Uppercase, Gray)
    doc.setFont(PDF_THEME.FONTS.MAIN, 'bold');
    doc.setFontSize(PDF_THEME.SIZES.LABEL);
    doc.setTextColor(PDF_THEME.COLORS.SECONDARY);
    doc.text(String(label).toUpperCase(), x, y);

    // Value (Larger, Dark)
    doc.setFont(PDF_THEME.FONTS.MAIN, 'normal');
    doc.setFontSize(PDF_THEME.SIZES.VALUE);
    doc.setTextColor(PDF_THEME.COLORS.TEXT);
    
    // Handle text wrapping for long values
    const safeValue = value ? String(value) : "N/A";
    const splitText = doc.splitTextToSize(safeValue, width);
    doc.text(splitText, x, y + 5);

    // Return the height used (lines * line height)
    return (splitText.length * 5) + 6; 
};

/**
 * Draws a 2-column grid row.
 */
export const drawGridRow = (doc, y, col1, col2) => {
    const colWidth = (PDF_THEME.LAYOUT.PAGE_WIDTH - (PDF_THEME.LAYOUT.MARGIN * 2)) / 2;
    const x1 = PDF_THEME.LAYOUT.MARGIN;
    const x2 = x1 + colWidth;

    const h1 = drawField(doc, x1, y, col1.label, col1.value, colWidth - 5);
    const h2 = drawField(doc, x2, y, col2.label, col2.value, colWidth - 5);

    return y + Math.max(h1, h2) + PDF_THEME.LAYOUT.SECTION_GAP; // Return new Y position
};

/**
 * Draws a horizontal divider line.
 */
export const drawDivider = (doc, y) => {
    doc.setDrawColor(PDF_THEME.COLORS.BORDER);
    doc.line(
        PDF_THEME.LAYOUT.MARGIN, 
        y, 
        PDF_THEME.LAYOUT.PAGE_WIDTH - PDF_THEME.LAYOUT.MARGIN, 
        y
    );
    return y + 5;
};

/**
 * Draws a professional "Boolean Badge" (YES/NO).
 */
export const drawBooleanBadge = (doc, x, y, label, value) => {
    // Draw Label first
    doc.setFont(PDF_THEME.FONTS.MAIN, 'bold');
    doc.setFontSize(PDF_THEME.SIZES.LABEL);
    doc.setTextColor(PDF_THEME.COLORS.SECONDARY);
    doc.text(String(label).toUpperCase(), x, y);

    // Draw Badge
    const isYes = String(value).toLowerCase() === 'yes';
    const badgeColor = isYes ? PDF_THEME.COLORS.ERROR : PDF_THEME.COLORS.SUCCESS; // Red for "Yes" usually means alert in safety context (accidents, violations), swap if needed
    const badgeText = isYes ? "YES" : "NO";
    
    // Logic check: If "Yes" is good (e.g. Legal to work), we might want green. 
    // For now, let's stick to neutral/gray vs highlight.
    
    doc.setFillColor(isYes ? '#FEF2F2' : '#F0FDF4'); // Light Red vs Light Green bg
    doc.setDrawColor(isYes ? '#F87171' : '#4ADE80');
    doc.roundedRect(x, y + 2, 20, 7, 1, 1, 'FD');

    doc.setFontSize(PDF_THEME.SIZES.SMALL);
    doc.setTextColor(isYes ? '#991B1B' : '#166534');
    doc.text(badgeText, x + 5, y + 7);
    
    return 15; // height used
};
