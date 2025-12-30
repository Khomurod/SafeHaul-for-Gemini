// src/shared/utils/pdf/pdfStyles.js

/**
 * Enterprise PDF Design System
 * Defines the "SafeHaul Professional" look for generated documents.
 */

export const PDF_THEME = {
  COLORS: {
    PRIMARY: '#111827',   // Gray 900 (Headings)
    SECONDARY: '#4B5563', // Gray 600 (Labels)
    ACCENT: '#2563EB',    // Blue 600 (Brand Elements)
    BORDER: '#E5E7EB',    // Gray 200 (Dividers)
    BG_SECTION: '#F9FAFB',// Gray 50 (Section Backgrounds)
    TEXT: '#1F2937',      // Gray 800 (Body Text)
    WHITE: '#FFFFFF',
    SUCCESS: '#059669',   // Green 600
    ERROR: '#DC2626'      // Red 600
  },
  FONTS: {
    MAIN: 'helvetica',
    CODE: 'courier'
  },
  SIZES: {
    TITLE: 18,
    SECTION_HEADER: 12,
    LABEL: 8,
    VALUE: 10,
    SMALL: 8,
    LEGAL: 7
  },
  LAYOUT: {
    MARGIN: 15,       // mm
    PAGE_WIDTH: 210,  // A4 Width
    PAGE_HEIGHT: 297, // A4 Height
    LINE_HEIGHT: 5,
    COL_GAP: 5,
    SECTION_GAP: 10
  }
};

// --- Style Applicators (Helpers to keep code clean) ---

export const setHeaderStyle = (doc) => {
    doc.setFont(PDF_THEME.FONTS.MAIN, 'bold');
    doc.setFontSize(PDF_THEME.SIZES.TITLE);
    doc.setTextColor(PDF_THEME.COLORS.PRIMARY);
};

export const setSectionTitleStyle = (doc) => {
    doc.setFont(PDF_THEME.FONTS.MAIN, 'bold');
    doc.setFontSize(PDF_THEME.SIZES.SECTION_HEADER);
    doc.setTextColor(PDF_THEME.COLORS.PRIMARY);
};

export const setLabelStyle = (doc) => {
    doc.setFont(PDF_THEME.FONTS.MAIN, 'bold'); // Bold labels are easier to scan
    doc.setFontSize(PDF_THEME.SIZES.LABEL);
    doc.setTextColor(PDF_THEME.COLORS.SECONDARY); // Slightly lighter
};

export const setValueStyle = (doc) => {
    doc.setFont(PDF_THEME.FONTS.MAIN, 'normal');
    doc.setFontSize(PDF_THEME.SIZES.VALUE);
    doc.setTextColor(PDF_THEME.COLORS.TEXT);
};

export const setSmallStyle = (doc) => {
    doc.setFont(PDF_THEME.FONTS.MAIN, 'italic');
    doc.setFontSize(PDF_THEME.SIZES.SMALL);
    doc.setTextColor(PDF_THEME.COLORS.SECONDARY);
};
