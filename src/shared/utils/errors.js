// src/shared/utils/errors.js

/**
 * Formats Firebase and other errors into user-friendly messages.
 * @param {Error} error - The error object.
 * @returns {string} A user-friendly error message.
 */
export function formatErrorMessage(error) {
  if (!error) {
    return "An unknown error occurred.";
  }

  // Firebase Auth errors
  if (error.code?.startsWith("auth/")) {
    switch (error.code) {
      case "auth/user-not-found":
        return "No account found with this email.";
      case "auth/wrong-password":
        return "Incorrect password. Please try again.";
      case "auth/email-already-in-use":
        return "This email is already registered.";
      case "auth/invalid-email":
        return "Please enter a valid email address.";
      case "auth/weak-password":
        return "Password must be at least 6 characters long.";
      default:
        return "Authentication failed. Please try again.";
    }
  }

  // Firebase Functions errors
  if (error.code?.startsWith("functions/")) {
    switch (error.code) {
      case "functions/unauthenticated":
        return "You must be logged in to perform this action.";
      case "functions/permission-denied":
        return "You do not have permission to perform this action.";
      default:
        return "A server error occurred. Please try again later.";
    }
  }

  // Default to the error message if available
  if (error.message) {
    return error.message;
  }

  return "An unexpected error occurred.";
}
