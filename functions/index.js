const functions = require('firebase-functions/v1');
const admin = require('firebase-admin');

if (!admin.apps.length) {
  admin.initializeApp();
}

// --- IMPORTS ---
const companyAdmin = require('./companyAdmin');
const hrAdmin = require('./hrAdmin');
const leadLogic = require('./leadLogic');
const leadDistribution = require('./leadDistribution');
const digitalSealing = require('./digitalSealing');
const notifySigner = require('./notifySigner');

// --- EXPORTS ---

// 1. Docs & Email
exports.sealDocument = digitalSealing.sealDocument;
exports.notifySigner = notifySigner.notifySigner; 

// 2. Auth
exports.createPortalUser = companyAdmin.createPortalUser;
exports.deletePortalUser = companyAdmin.deletePortalUser;
exports.updatePortalUser = companyAdmin.updatePortalUser;
exports.onMembershipWrite = companyAdmin.onMembershipWrite;

// 3. Company
exports.getCompanyProfile = companyAdmin.getCompanyProfile;
exports.joinCompanyTeam = companyAdmin.joinCompanyTeam;
exports.deleteCompany = companyAdmin.deleteCompany;
exports.getTeamPerformanceHistory = companyAdmin.getTeamPerformanceHistory;

// 4. HR & Applications
exports.onApplicationSubmitted = hrAdmin.onApplicationSubmitted;
exports.moveApplication = hrAdmin.moveApplication;
exports.sendAutomatedEmail = hrAdmin.sendAutomatedEmail;

// 5. Leads
exports.onLeadSubmitted = leadLogic.onLeadSubmitted;
exports.cleanupBadLeads = leadLogic.cleanupBadLeads;
exports.handleLeadOutcome = leadLogic.handleLeadOutcome;
exports.migrateDriversToLeads = leadLogic.migrateDriversToLeads;
exports.confirmDriverInterest = leadLogic.confirmDriverInterest;

// 6. Distribution
exports.distributeDailyLeadsScheduled = leadDistribution.distributeDailyLeadsScheduled;
exports.runLeadDistribution = leadDistribution.runLeadDistribution;

// 7. Migration
exports.runMigration = companyAdmin.runMigration;

// 8. Analytics (TEMPORARILY DISABLED TO FIX DEPLOYMENT)
// The "aggregateAnalytics" function was causing CPU configuration errors.
// We are pausing it so you can deploy the email feature.
/*
exports.aggregateAnalytics = functions.pubsub.schedule('every 24 hours').onRun(async (context) => {
    const analytics = require('./analytics');
    return analytics.aggregateAnalytics(context);
});
*/