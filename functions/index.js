const functions = require('firebase-functions/v1');
const admin = require('firebase-admin');

// Initialize Admin SDK once
if (!admin.apps.length) {
  admin.initializeApp();
}

// --- IMPORT MODULES ---
const driverSync = require('./driverSync');
const hrAdmin = require('./hrAdmin');
const companyAdmin = require('./companyAdmin');
const leadLogic = require('./leadLogic'); 
const leadDistribution = require('./leadDistribution');
const digitalSealing = require('./digitalSealing');
const notifySigner = require('./notifySigner');
const publicSigning = require('./publicSigning');
const systemIntegrity = require('./systemIntegrity'); 
const searchHandler = require('./searchHandler');
const compliance = require('./compliance'); // <--- NEW IMPORT

// --- EXPORTS ---

// 1. Docs & Email & Public Signing
exports.sealDocument = digitalSealing.sealDocument;
exports.notifySigner = notifySigner.notifySigner; 
exports.getPublicEnvelope = publicSigning.getPublicEnvelope;    
exports.submitPublicEnvelope = publicSigning.submitPublicEnvelope;

// 2. Auth & User Management
exports.createPortalUser = hrAdmin.createPortalUser;
exports.deletePortalUser = hrAdmin.deletePortalUser;
exports.updatePortalUser = hrAdmin.updatePortalUser;
exports.onMembershipWrite = hrAdmin.onMembershipWrite;

// 3. Company Admin
exports.getCompanyProfile = companyAdmin.getCompanyProfile;
exports.joinCompanyTeam = hrAdmin.joinCompanyTeam;
exports.deleteCompany = companyAdmin.deleteCompany;
exports.getTeamPerformanceHistory = companyAdmin.getTeamPerformanceHistory;

// 4. Applications & Driver Sync
exports.onApplicationSubmitted = driverSync.onApplicationSubmitted;
exports.onLeadSubmitted = driverSync.onLeadSubmitted;
exports.moveApplication = companyAdmin.moveApplication;
exports.sendAutomatedEmail = companyAdmin.sendAutomatedEmail;

// 5. Leads & Distribution
exports.cleanupBadLeads = leadDistribution.cleanupBadLeads;
exports.handleLeadOutcome = leadDistribution.handleLeadOutcome;
exports.migrateDriversToLeads = leadDistribution.migrateDriversToLeads;
exports.confirmDriverInterest = leadDistribution.confirmDriverInterest;
exports.runLeadDistribution = leadDistribution.runLeadDistribution;
exports.distributeDailyLeads = leadDistribution.distributeDailyLeads;
exports.distributeDailyLeadsScheduled = leadDistribution.distributeDailyLeadsScheduled;
exports.getLeadSupplyAnalytics = leadDistribution.getLeadSupplyAnalytics;
exports.bulkAssignLeads = leadDistribution.bulkAssignLeads;

// 6. System Integrity
exports.syncSystemStructure = systemIntegrity.syncSystemStructure; 

// 7. Data Migration
exports.runMigration = companyAdmin.runMigration;

// 8. Global Search
exports.searchUnifiedData = searchHandler.searchUnifiedData;

// 9. Compliance & Verification (NEW)
exports.sendVOERequest = compliance.sendVOERequest;             // <--- NEW EXPORT
exports.checkDriverExpirations = compliance.checkDriverExpirations; // <--- NEW EXPORT

// 10. Analytics (Commented out to prevent Gen 1 CPU errors)
/*
exports.aggregateAnalytics = functions.pubsub.schedule('every 24 hours').onRun(async (context) => {
    const analytics = require('./leadDistribution');
    return analytics.aggregateAnalytics(context);
});
*/
