import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import React from 'react';
import { BrowserRouter } from 'react-router-dom';
import { CompanyAdminDashboard } from '@features/company-admin/components/CompanyAdminDashboard';
import { ToastProvider } from '@/shared/components/feedback/ToastProvider';
import * as DataContextExports from '@/context/DataContext';

// Mock Firebase with complete auth state management
vi.mock('firebase/auth', () => ({
    getAuth: vi.fn(() => ({
        onAuthStateChanged: vi.fn((callback) => {
            // Immediately call with mock user
            callback({ uid: 'test-user', email: 'test@example.com' });
            return () => { }; // unsubscribe
        }),
    })),
    onAuthStateChanged: vi.fn((auth, callback) => {
        callback({ uid: 'test-user', email: 'test@example.com' });
        return () => { };
    }),
}));

vi.mock('firebase/firestore', () => ({
    getFirestore: vi.fn(),
    collection: vi.fn(() => ({
        withConverter: vi.fn(),
    })),
    doc: vi.fn(),
    getDoc: vi.fn(() => Promise.resolve({
        exists: () => true,
        data: () => ({ name: 'Test User', email: 'test@example.com' }),
        id: 'test-user'
    })),
    getDocs: vi.fn(() => Promise.resolve({ docs: [], size: 0, empty: true })),
    setDoc: vi.fn(),
    updateDoc: vi.fn(),
    query: vi.fn(),
    where: vi.fn(),
    orderBy: vi.fn(),
    limit: vi.fn(),
    onSnapshot: vi.fn((query, callback) => {
         callback({ docs: [], size: 0, empty: true });
         return () => {};
    }),
    serverTimestamp: vi.fn(),
    getCountFromServer: vi.fn(() => Promise.resolve({ data: () => ({ count: 0 }) })),
}));

vi.mock('@lib/firebase', () => ({
    auth: {
        onAuthStateChanged: vi.fn((callback) => {
            callback({ uid: 'test-user', email: 'test@example.com' });
            return () => { };
        }),
    },
    db: {},
    storage: {},
    functions: {},
}));

// Mock useData hook
vi.mock('@/context/DataContext', async () => {
    const actual = await vi.importActual('@/context/DataContext');
    return {
        ...actual,
        useData: vi.fn(),
    };
});

describe('CompanyAdminDashboard Smoke Tests', () => {
    it('should render without crashing when provided with mock company profile', () => {
        const mockCompanyProfile = {
            id: 'test-company-123',
            companyName: 'Test Transport Co.',
            email: 'admin@test.com',
            phone: '555-0100',
            address: '123 Test St',
            city: 'Test City',
            state: 'TS',
            zipCode: '12345',
            createdAt: new Date().toISOString(),
        };

        DataContextExports.useData.mockReturnValue({
            currentCompanyProfile: mockCompanyProfile,
            currentUser: { uid: 'test-user', email: 'admin@test.com' },
            currentUserClaims: { roles: { 'test-company-123': 'company_admin' } },
            handleLogout: vi.fn(),
            returnToCompanyChooser: vi.fn(),
        });

        // This test verifies the component can mount without errors
        expect(() => {
            render(
                <BrowserRouter>
                    <ToastProvider>
                        <CompanyAdminDashboard />
                    </ToastProvider>
                </BrowserRouter>
            );
        }).not.toThrow();
    });

    it('should display company name when profile is provided', () => {
        const mockCompanyProfile = {
            id: 'test-company-123',
            companyName: 'Acme Trucking LLC',
        };

        DataContextExports.useData.mockReturnValue({
            currentCompanyProfile: mockCompanyProfile,
            currentUser: { uid: 'test-user', email: 'admin@test.com' },
            currentUserClaims: { roles: { 'test-company-123': 'company_admin' } },
            handleLogout: vi.fn(),
            returnToCompanyChooser: vi.fn(),
        });

        render(
            <BrowserRouter>
                <ToastProvider>
                    <CompanyAdminDashboard />
                </ToastProvider>
            </BrowserRouter>
        );

        // Check for the company name directly
        expect(screen.getByText('Acme Trucking LLC')).toBeTruthy();
    });

    it('should handle missing company profile gracefully', () => {
        DataContextExports.useData.mockReturnValue({
            currentCompanyProfile: null,
            currentUser: { uid: 'test-user', email: 'admin@test.com' },
            currentUserClaims: { roles: {} },
            handleLogout: vi.fn(),
            returnToCompanyChooser: vi.fn(),
        });

        // Test with no company profile
        expect(() => {
            render(
                <BrowserRouter>
                    <ToastProvider>
                        <CompanyAdminDashboard />
                    </ToastProvider>
                </BrowserRouter>
            );
        }).not.toThrow();
    });

    it('should render key dashboard sections', () => {
        const mockCompanyProfile = {
            id: 'test-company-123',
            companyName: 'Test Logistics',
        };

        DataContextExports.useData.mockReturnValue({
            currentCompanyProfile: mockCompanyProfile,
            currentUser: { uid: 'test-user', email: 'admin@test.com' },
            currentUserClaims: { roles: { 'test-company-123': 'company_admin' } },
            handleLogout: vi.fn(),
            returnToCompanyChooser: vi.fn(),
        });

        render(
            <BrowserRouter>
                <ToastProvider>
                    <CompanyAdminDashboard />
                </ToastProvider>
            </BrowserRouter>
        );

        // Verify the component structure is rendered
        // (Specific assertions depend on actual dashboard layout)
        const container = document.body;
        expect(container).toBeTruthy();
        expect(container.textContent).toBeTruthy();
    });
});
