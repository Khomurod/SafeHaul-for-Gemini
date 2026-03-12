#!/usr/bin/env bash
# SafeHaul Unified Sequential Deployment Script (Bash)
# Purpose: Deploy all active functions one-by-one with pauses to avoid CPU spikes.

set -euo pipefail

COOLDOWN_SECONDS=10

FUNCTIONS=(
    # 1. Core Infrastructure & Auth
    "createPortalUser" "deletePortalUser" "updatePortalUser" "onMembershipWrite"
    "joinCompanyTeam" "deleteCompany"

    # 2. Document Processing & Flows
    "sealDocument" "notifySigner" "getPublicEnvelope" "submitPublicEnvelope"
    "onApplicationSubmitted" "onLeadSubmitted" "syncDriverOnLog"
    "syncDriverOnActivity" "sendAutomatedEmail"

    # 3. Lead Distribution & Management
    "cleanupBadLeads" "handleLeadOutcome" "migrateDriversToLeads"
    "confirmDriverInterest" "runLeadDistribution"
    "distributeDailyLeads" "getLeadSupplyAnalytics" "recallAllPlatformLeads"
    "forceUnlockPool" "getBadLeadsAnalytics" "getCompanyDistributionStatus"
    "processCompanyDistribution"

    # 4. SMS & Messaging Integrations
    "saveIntegrationConfig" "verifySmsConfig" "sendTestSMS" "sendSMS"
    "executeReactivationBatch" "initBulkSession" "processBulkBatch"
    "retryFailedAttempts" "getFilterCount" "getFilteredLeadsPage"
    "resumeBulkSession" "pauseBulkSession" "cancelBulkSession"
    "addPhoneLine" "removePhoneLine"
    "testLineConnection" "verifyLineConnection" "connectFacebookPage"
    "facebookWebhook" "facebookWebhookV1"

    # 5. Monitoring, Tools & Stats
    "syncSystemStructure" "runSecurityAudit" "getSignedUploadUrl"
    "testEmailConnection" "runMigration" "debugAppCounts"
    "onActivityLogCreated" "onLegacyActivityCreated" "onLeadsActivityLogCreated"
    "backfillCompanyStats" "backfillAllStats"

    # 6. Engagement Engine
    "onApplicationUpdateSegments" "onApplicationCreatedSegments" "handleOptOut"
)

LOG_FILE="deployment_report.md"
printf '# Deployment Report - %s\n\n' "$(date -u)" > "$LOG_FILE"
printf 'Total functions: %d\n\n' "${#FUNCTIONS[@]}" >> "$LOG_FILE"
printf '| Function | Status | Duration |\n' >> "$LOG_FILE"
printf '|---|---|---|\n' >> "$LOG_FILE"

FAILED=()

for FUNC in "${FUNCTIONS[@]}"; do
    echo "--- Deploying $FUNC ---"
    START=$(date +%s)

    if firebase deploy --only "functions:$FUNC"; then
        END=$(date +%s)
        DURATION=$(( END - START ))
        echo "SUCCESS: $FUNC (${DURATION}s)"
        printf '| %s | ✅ Success | %ds |\n' "$FUNC" "$DURATION" >> "$LOG_FILE"
    else
        END=$(date +%s)
        DURATION=$(( END - START ))
        echo "FAILURE: $FUNC (${DURATION}s)"
        printf '| %s | ❌ Failed | %ds |\n' "$FUNC" "$DURATION" >> "$LOG_FILE"
        FAILED+=("$FUNC")
    fi

    echo "Cooling down for ${COOLDOWN_SECONDS} seconds..."
    sleep "$COOLDOWN_SECONDS"
done

echo ""
echo "=== Deployment cycle complete ==="
echo "Total functions: ${#FUNCTIONS[@]}"
echo "Failed: ${#FAILED[@]}"

if [ "${#FAILED[@]}" -gt 0 ]; then
    echo "Failed functions:"
    for F in "${FAILED[@]}"; do echo "  - $F"; done
    echo "Details saved to $LOG_FILE."
    exit 1
fi

echo "Details saved to $LOG_FILE."
