import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor, fireEvent } from '@testing-library/react';
import { BrowserRouter } from 'react-router-dom';
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

describe('Authentication Flow', () => {
    beforeEach(() => {
        vi.clearAllMocks();
    });

    it('should render login form with email and password fields', () => {
        render(
            <BrowserRouter>
                <LoginScreen />
            </BrowserRouter>
        );

        expect(screen.getByPlaceholderText(/you@example.com/i)).toBeInTheDocument();
        expect(screen.getByPlaceholderText(/enter your password/i)).toBeInTheDocument();
        expect(screen.getByRole('button', { name: /sign in|login/i })).toBeInTheDocument();
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

        render(
            <BrowserRouter>
                <LoginScreen />
            </BrowserRouter>
        );

        const emailInput = screen.getByPlaceholderText(/you@example.com/i);
        const passwordInput = screen.getByPlaceholderText(/enter your password/i);
        const submitButton = screen.getByRole('button', { name: /sign in|login/i });

        fireEvent.change(emailInput, { target: { value: 'test@example.com' } });
        fireEvent.change(passwordInput, { target: { value: 'password123' } });
        fireEvent.click(submitButton);

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
        // The authService maps 'auth/wrong-password' to 'Invalid email or password.'
        const error = new Error('The password is invalid');
        error.code = 'auth/wrong-password';
        signInWithEmailAndPassword.mockRejectedValue(error);

        render(
            <BrowserRouter>
                <LoginScreen />
            </BrowserRouter>
        );

        const emailInput = screen.getByPlaceholderText(/you@example.com/i);
        const passwordInput = screen.getByPlaceholderText(/enter your password/i);
        const submitButton = screen.getByRole('button', { name: /sign in|login/i });

        fireEvent.change(emailInput, { target: { value: 'test@example.com' } });
        fireEvent.change(passwordInput, { target: { value: 'wrongpassword' } });
        fireEvent.click(submitButton);

        await waitFor(() => {
            // Note the period at the end as per mapAuthError
            expect(screen.getByText('Invalid email or password.')).toBeInTheDocument();
        });
    });

    it('should display error message on network error', async () => {
        const { signInWithEmailAndPassword } = await import('firebase/auth');

        // Mock network error
        // The authService maps unknown codes to 'An unexpected error occurred. Please try again.'
        // or 'auth/network-request-failed' isn't explicitly handled in mapAuthError, so it goes to default.
        const error = new Error('Network error');
        error.code = 'auth/network-request-failed';
        signInWithEmailAndPassword.mockRejectedValue(error);

        render(
            <BrowserRouter>
                <LoginScreen />
            </BrowserRouter>
        );

        const emailInput = screen.getByPlaceholderText(/you@example.com/i);
        const passwordInput = screen.getByPlaceholderText(/enter your password/i);
        const submitButton = screen.getByRole('button', { name: /sign in|login/i });

        fireEvent.change(emailInput, { target: { value: 'test@example.com' } });
        fireEvent.change(passwordInput, { target: { value: 'password123' } });
        fireEvent.click(submitButton);

        await waitFor(() => {
            expect(screen.getByText('An unexpected error occurred. Please try again.')).toBeInTheDocument();
        });
    });

    it('should show loading state during authentication', async () => {
        const { signInWithEmailAndPassword } = await import('firebase/auth');

        // Mock slow login
        signInWithEmailAndPassword.mockImplementation(
            () => new Promise((resolve) => setTimeout(resolve, 100))
        );

        render(
            <BrowserRouter>
                <LoginScreen />
            </BrowserRouter>
        );

        const emailInput = screen.getByPlaceholderText(/you@example.com/i);
        const passwordInput = screen.getByPlaceholderText(/enter your password/i);
        const submitButton = screen.getByRole('button', { name: /sign in|login/i });

        fireEvent.change(emailInput, { target: { value: 'test@example.com' } });
        fireEvent.change(passwordInput, { target: { value: 'password123' } });
        fireEvent.click(submitButton);

        // Button should be disabled during loading
        expect(submitButton).toBeDisabled();
    });
});
