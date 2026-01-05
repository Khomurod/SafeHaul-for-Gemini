import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor, fireEvent } from './test-utils'; // Custom render
import { LoginScreen } from '@features/auth';

// Mock Firebase auth module
vi.mock('firebase/auth', () => ({
    getAuth: vi.fn(() => ({})),
    signInWithEmailAndPassword: vi.fn(),
    onAuthStateChanged: vi.fn((auth, callback) => {
        // Mock unsubscribe function
        return () => { };
    }),
}));

// Mock Firebase config
vi.mock('@lib/firebase', () => ({
    auth: {
        onAuthStateChanged: vi.fn((callback) => () => { }),
    },
    db: {},
    storage: {},
    functions: {},
}));

vi.mock('@/context/DataContext', async () => {
    const actual = await vi.importActual('@/context/DataContext');
    return {
        ...actual,
        useData: () => ({
            loading: false,
        }),
    };
});


describe('Authentication Flow', () => {
    beforeEach(() => {
        vi.clearAllMocks();
        window.alert = vi.fn();
    });

    it('should render login form with email and password fields', async () => {
        render(<LoginScreen />);

        await waitFor(() => {
            expect(screen.getByPlaceholderText(/email/i)).toBeInTheDocument();
            expect(screen.getByPlaceholderText(/password/i)).toBeInTheDocument();
            expect(screen.getByRole('button', { name: /sign in|login/i })).toBeInTheDocument();
        });
    });

    it('should handle successful login', async () => {
        const { signInWithEmailAndPassword } = await import('firebase/auth');

        // Mock successful login
        signInWithEmailAndPassword.mockResolvedValue({
            user: {
                uid: 'test-uid-123',
                email: 'test@example.com',
            },
        });

        render(<LoginScreen />);

        await waitFor(() => {
            fireEvent.change(screen.getByPlaceholderText(/email/i), { target: { value: 'test@example.com' } });
            fireEvent.change(screen.getByPlaceholderText(/password/i), { target: { value: 'password123' } });
            fireEvent.click(screen.getByRole('button', { name: /sign in|login/i }));
        });

        await waitFor(() => {
            expect(signInWithEmailAndPassword).toHaveBeenCalledWith(
                expect.anything(),
                'test@example.com',
                'password123'
            );
        });
    });

    it('should display error message on wrong password', async () => {
        const { signInWithEmailAndPassword } = await import('firebase/auth');

        // Mock failed login with wrong password error
        signInWithEmailAndPassword.mockRejectedValue({
            code: 'auth/wrong-password',
            message: 'The password is invalid',
        });

        render(<LoginScreen />);

        await waitFor(() => {
            fireEvent.change(screen.getByPlaceholderText(/email/i), { target: { value: 'test@example.com' } });
            fireEvent.change(screen.getByPlaceholderText(/password/i), { target: { value: 'wrongpassword' } });
            fireEvent.click(screen.getByRole('button', { name: /sign in|login/i }));
        });

        await waitFor(() => {
            expect(window.alert).toHaveBeenCalled();
        });
    });

    it('should display error message on network error', async () => {
        const { signInWithEmailAndPassword } = await import('firebase/auth');

        // Mock network error
        signInWithEmailAndPassword.mockRejectedValue({
            code: 'auth/network-request-failed',
            message: 'Network error',
        });

        render(<LoginScreen />);

        await waitFor(() => {
            fireEvent.change(screen.getByPlaceholderText(/email/i), { target: { value: 'test@example.com' } });
            fireEvent.change(screen.getByPlaceholderText(/password/i), { target: { value: 'password123' } });
            fireEvent.click(screen.getByRole('button', { name: /sign in|login/i }));
        });

        await waitFor(() => {
            expect(window.alert).toHaveBeenCalled();
        });
    });

    it('should show loading state during authentication', async () => {
        const { signInWithEmailAndPassword } = await import('firebase/auth');

        // Mock slow login
        signInWithEmailAndPassword.mockImplementation(
            () => new Promise((resolve) => setTimeout(resolve, 100))
        );

        render(<LoginScreen />);

        await waitFor(() => {
            fireEvent.change(screen.getByPlaceholderText(/email/i), { target: { value: 'test@example.com' } });
            fireEvent.change(screen.getByPlaceholderText(/password/i), { target: { value: 'password123' } });
            fireEvent.click(screen.getByRole('button', { name: /sign in|login/i }));
        });

        // Button should be disabled during loading
        expect(screen.getByRole('button', { name: /sign in|login/i })).toBeDisabled();
    });
});
