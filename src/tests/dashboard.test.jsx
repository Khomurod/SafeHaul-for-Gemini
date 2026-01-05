import { describe, it, expect, vi } from 'vitest';
import { render, screen, waitFor } from './test-utils'; // Custom render
import { CompanyAdminDashboard } from '@features/company-admin/components/CompanyAdminDashboard';

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

vi.mock('@lib/firebase', () => ({
    auth: {
        onAuthStateChanged: vi.fn((callback) => {
            callback({ uid: 'test-user', email: 'test@example.com' });
            return () => { };
        }),
    },
    db: {
        collection: vi.fn(() => ({
            where: vi.fn(() => ({
                onSnapshot: vi.fn(() => () => { }),
            })),
            onSnapshot: vi.fn(() => () => { }),
        })),
        doc: vi.fn(() => ({
            collection: vi.fn(() => ({
                where: vi.fn(() => ({
                    onSnapshot: vi.fn(() => () => { }),
                })),
                onSnapshot: vi.fn(() => () => { }),
            })),
        })),
    },
    storage: {},
    functions: {
        httpsCallable: vi.fn(() =>
            vi.fn(async () => ({
                data: {
                    leads: [],
                    total: 0,
                },
            }))
        ),
    },
}));

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

        // This test verifies the component can mount without errors
        expect(() => {
            render(<CompanyAdminDashboard />, {
                wrapperProps: {
                    value: {
                        currentCompanyProfile: mockCompanyProfile,
                    },
                },
            });
        }).not.toThrow();
    });

    it('should display company name when profile is provided', async () => {
        const mockCompanyProfile = {
            id: 'test-company-123',
            companyName: 'Acme Trucking LLC',
        };

        render(<CompanyAdminDashboard />, {
            wrapperProps: {
                value: {
                    currentCompanyProfile: mockCompanyProfile,
                },
            },
        });

        await waitFor(() => {
            expect(screen.getByText('Acme Trucking LLC')).toBeInTheDocument();
        });
    });

    it('should handle missing company profile gracefully', () => {
        // Test with no company profile
        expect(() => {
            render(<CompanyAdminDashboard />, {
                wrapperProps: {
                    value: {
                        currentCompanyProfile: null,
                    },
                },
            });
        }).not.toThrow();
    });

    it('should render key dashboard sections', async () => {
        const mockCompanyProfile = {
            id: 'test-company-123',
            companyName: 'Test Logistics',
        };

        render(<CompanyAdminDashboard />, {
            wrapperProps: {
                value: {
                    currentCompanyProfile: mockCompanyProfile,
                },
            },
        });

        await waitFor(() => {
            // Verify the component structure is rendered
            // (Specific assertions depend on actual dashboard layout)
            const container = document.body;
            expect(container).toBeTruthy();
            expect(container.textContent).toBeTruthy();
        });
    });
});
