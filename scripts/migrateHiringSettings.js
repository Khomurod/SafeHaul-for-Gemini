const admin = require('firebase-admin');
const serviceAccount = require('./service-account.json'); // User must provide this

if (!admin.apps.length) {
    admin.initializeApp({
        credential: admin.credential.cert(serviceAccount)
    });
}

const db = admin.firestore();

async function migrateHiringSettings() {
    console.log('Starting migration...');
    const companiesRef = db.collection('companies');
    const snapshot = await companiesRef.get();

    let totalMigrated = 0;

    for (const doc of snapshot.docs) {
        const companyId = doc.id;
        const companyData = doc.data();
        const settings = companyData.hiringSettings;

        if (!settings) continue;

        const companyName = companyData.name || "Unknown Company";
        const companyLogo = companyData.logoUrl || "";

        // Helper to create job post
        const createJob = async (positionType, teamMode, data) => {
            if (!data.enabled) return;

            console.log(`Creating job for ${companyName}: ${positionType} - ${teamMode}`);

            // Construct Title
            const typeLabel = positionType === 'companyDriver' ? 'Company Driver'
                : positionType === 'ownerOperator' ? 'Owner Operator'
                    : 'Lease Operator';
            const modeLabel = teamMode === 'solo' ? 'Solo' : 'Team';
            const title = `${typeLabel} (${modeLabel}) - ${data.homeTime || 'Home Weekly'}`;

            // Calculate Weekly Pay for Sorting
            let weeklyPay = 0;
            if (data.payType === 'flatRate' || data.payType === 'hourly') {
                weeklyPay = parseInt(data.flatRate?.amount || data.hourly?.amount || 0);
            } else if (data.payType === 'cpm') {
                // Estimate: 2500 miles/week solo, 5000 team
                const miles = teamMode === 'solo' ? 2500 : 5000; // Team split? usually total miles paid
                const rate = parseFloat(data.cpm?.max || 0);
                weeklyPay = Math.round(miles * rate);
            } else {
                // Percentage estimate (hard to guess without load revenue)
                weeklyPay = 0;
            }

            const jobPost = {
                companyId,
                companyName,
                companyLogo,
                title: title,
                description: `Join ${companyName} as a ${typeLabel}. We offer competitive pay and great benefits. Apply now!`,
                status: 'active',
                positionType,
                teamMode,
                routeType: data.hiringGeography?.nationwide ? 'otr' : 'regional',
                freightTypes: data.freightTypes || [],
                payModel: data.payType,
                payMin: parseFloat(data.cpm?.min) || parseFloat(data.percentage?.min) || 0,
                payMax: parseFloat(data.cpm?.max) || parseFloat(data.percentage?.max) || 0,
                estimatedWeeklyPay: weeklyPay,
                minExperience: data.experienceRequired || 'moreThan1Year',
                hiringStates: data.hiringGeography?.states || [],
                benefits: data.benefits || {},
                createdAt: admin.firestore.FieldValue.serverTimestamp(),
                updatedAt: admin.firestore.FieldValue.serverTimestamp()
            };

            // Create in root collection
            await db.collection('job_posts').add(jobPost);
            totalMigrated++;
        };

        // Iterate through settings
        if (settings.companyDriver) {
            await createJob('companyDriver', 'solo', settings.companyDriver.solo);
            await createJob('companyDriver', 'team', settings.companyDriver.team);
        }
        if (settings.ownerOperator) {
            await createJob('ownerOperator', 'solo', settings.ownerOperator.solo);
            await createJob('ownerOperator', 'team', settings.ownerOperator.team);
        }
        if (settings.leaseOperator) {
            await createJob('leaseOperator', 'solo', settings.leaseOperator.solo);
            await createJob('leaseOperator', 'team', settings.leaseOperator.team);
        }
    }

    console.log(`Migration Complete. Created ${totalMigrated} job posts.`);
}

migrateHiringSettings().catch(console.error);
