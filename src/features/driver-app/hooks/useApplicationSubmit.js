import { useState } from 'react';
import { db } from '@lib/firebase';
import { collection, addDoc, serverTimestamp } from 'firebase/firestore';

export const useApplicationSubmit = (companyId) => {
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [error, setError] = useState(null);

    const submit = async (formData) => {
        setIsSubmitting(true);
        setError(null);
        
        try {
            // 1. Prepare Payload
            const payload = {
                ...formData,
                companyId: companyId || 'general-pool', // Fallback if no company
                status: 'New',
                stage: 'applied',
                createdAt: serverTimestamp(),
                submittedAt: serverTimestamp(),
                sourceType: 'Company App', 
                isArchived: false,
                isRead: false,
                
                // Ensure critical dates are handled if they exist as strings
                // (Though Date Standardization Logic usually handles this elsewhere, safe to keep raw here)
            };

            // 2. Clean undefined values to prevent Firestore errors
            Object.keys(payload).forEach(key => payload[key] === undefined && delete payload[key]);

            // 3. Write to Firestore
            // Path: companies/{id}/applications (or 'leads' depending on your architecture, assuming applications here)
            const collectionPath = companyId ? `companies/${companyId}/applications` : `leads`;
            
            await addDoc(collection(db, collectionPath), payload);
            
            return true;
        } catch (err) {
            console.error("Submission Error:", err);
            setError("Failed to submit application. Please check your connection and try again.");
            return false;
        } finally {
            setIsSubmitting(false);
        }
    };

    return { submit, isSubmitting, error };
};
