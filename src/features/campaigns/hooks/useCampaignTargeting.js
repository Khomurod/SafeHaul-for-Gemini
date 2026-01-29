import { useState, useEffect } from 'react';
import { db } from '@lib/firebase';
import {
    collection, query, where, getDocs,
    limit, Timestamp, getCountFromServer
} from 'firebase/firestore';
import {
    APPLICATION_STATUSES,
    LAST_CALL_RESULTS,
    getDbValue,
    ERROR_MESSAGES
} from '../constants/campaignConstants';
import { httpsCallable } from 'firebase/functions';
import { functions } from '@/lib/firebase/config';

export function useCampaignTargeting(companyId, currentUser, isAuthLoading) {
    const [filters, setFilters] = useState({
        recruiterId: 'all',
        status: [],
        leadType: 'applications',
        limit: 100,
        createdAfter: '',
        notContactedSince: '',
        lastCallOutcome: 'all',
        excludeRecentDays: false, // New Field
        campaignLimit: '' // New Field
    });

    const [previewLeads, setPreviewLeads] = useState([]);
    const [isPreviewLoading, setIsPreviewLoading] = useState(false);
    const [matchCount, setMatchCount] = useState(0);
    const [previewError, setPreviewError] = useState(null);

    useEffect(() => {
        let isCancelled = false;

        const fetchTargetingData = async () => {
            // --- 1. DEFENSIVE GUARDS (Bulletproof Logic) ---
            if (isAuthLoading) {
                setPreviewError(ERROR_MESSAGES.LOADING);
                return;
            }
            if (!currentUser) {
                setPreviewError(ERROR_MESSAGES.MISSING_AUTH);
                return;
            }
            if (!companyId) {
                setPreviewError(ERROR_MESSAGES.MISSING_COMPANY);
                return;
            }

            setIsPreviewLoading(true);
            setPreviewError(null);

            try {
                // --- 2. SERVER-SIDE AGGREGATION & PREVIEW ---
                // We delegate query logic to the backend to ensure consistency with initBulkSession

                // A. Get Count
                const getCountFn = httpsCallable(functions, 'getFilterCount');

                // Prepare backend-compatible filters
                const backendFilters = {
                    ...filters,
                    // Map local filter names to backend expected names if needed
                    excludeRecentDays: filters.excludeRecentDays ? 7 : null, // Boolean to INT mapping
                    campaignLimit: filters.campaignLimit ? parseInt(filters.campaignLimit) : null
                };

                const countResult = await getCountFn({ companyId, filters: backendFilters });
                let count = countResult.data.count || 0;

                // Apply limit cap to displayed count
                if (backendFilters.campaignLimit) {
                    count = Math.min(count, backendFilters.campaignLimit);
                }

                if (!isCancelled) {
                    setMatchCount(count);
                    if (count === 0) setPreviewError(ERROR_MESSAGES.ZERO_RESULTS);
                }

                // B. Get Preview Page (First 50)
                const getLeadsFn = httpsCallable(functions, 'getFilteredLeadsPage');
                const previewResult = await getLeadsFn({
                    companyId,
                    filters: backendFilters,
                    pageSize: 50
                });

                if (!isCancelled) {
                    setPreviewLeads(previewResult.data.leads || []);
                }

            } catch (err) {
                console.error("Targeting Error:", err);
                if (!isCancelled) {
                    setPreviewLeads([]);
                    setMatchCount(0);
                    // Simplify error message for user
                    setPreviewError("Failed to calculate audience. Please check filters.");
                }
            } finally {
                if (!isCancelled) setIsPreviewLoading(false);
            }
        };

        const timer = setTimeout(fetchTargetingData, 500);
        return () => { isCancelled = true; clearTimeout(timer); };
    }, [
        filters.leadType,
        filters.status,
        filters.recruiterId,
        filters.createdAfter,
        filters.notContactedSince,
        filters.lastCallOutcome,
        filters.segmentId,
        filters.limit,
        filters.excludeRecentDays, // Trigger update
        filters.campaignLimit,     // Trigger update
        companyId,
        currentUser,
        isAuthLoading
    ]);

    return {
        filters, setFilters,
        previewLeads, isPreviewLoading,
        matchCount, previewError
    };
}
