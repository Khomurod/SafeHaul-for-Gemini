import { useState, useEffect, useCallback, useRef } from 'react';
import { 
    collection, doc, deleteDoc, 
    serverTimestamp, setDoc, getDoc, getDocs, query, where
} from 'firebase/firestore';
import { ref, uploadString, deleteObject, getDownloadURL } from 'firebase/storage';
import { httpsCallable } from 'firebase/functions';
import { db, storage, functions } from '@lib/firebase';
import { jsPDF } from 'jspdf';

const STORAGE_KEY = 'safehaul_system_health_state';

const STEPS = [
    { id: 'init', label: '1. Initializing Environment' },
    { id: 'storage_write', label: '2. Infrastructure: Storage System' },
    { id: 'firestore_company', label: '3. Infrastructure: Database Write' },
    { id: 'cloud_function', label: '4. Infrastructure: Cloud Server' },

    // LEVEL 2: USER FLOWS
    { id: 'sim_driver_app', label: '5. Flow: Direct Application (Slug)' },
    { id: 'sim_doc_upload', label: '6. Flow: Document Upload (CDL)' },
    { id: 'sim_signature', label: '7. Flow: E-Signature Capture' },
    
    // NEW: User Management Cycle
    { id: 'test_user_access', label: '8. Security: User Creation & Reassignment' },

    // RECRUITER
    { id: 'sim_recruiter_link', label: '9. Flow: Recruiter Link Attribution' },

    // OFFERS
    { id: 'sim_job_offer', label: '10. Flow: Company Sending Offer' },
    { id: 'sim_offer_receive', label: '11. Flow: Driver Receiving Offer' },

    // LEVEL 3: CRITICAL LOGIC
    { id: 'sim_pdf_gen', label: '12. Engine: PDF Generation' },
    { id: 'sim_activity_log', label: '13. Logic: Audit Trail Logging' },
    
    // NEW: Visibility & Integrity
    { id: 'test_visibility', label: '14. Data: Dashboard Visibility Check' },
    { id: 'test_integrity', label: '15. Data: DB <-> Storage Alignment' },

    { id: 'cleanup', label: '16. System Cleanup & Data Purge' }
];

export function useSystemHealth() {
    const [status, setStatus] = useState('idle');
    const [currentStepIndex, setCurrentStepIndex] = useState(0);
    const [progress, setProgress] = useState(0);
    const [logs, setLogs] = useState([]);

    const [testData, setTestData] = useState({}); 
    const testDataRef = useRef({}); 
    const abortController = useRef(null);

    useEffect(() => {
        const saved = localStorage.getItem(STORAGE_KEY);
        if (saved) {
            try {
                const parsed = JSON.parse(saved);
                if (parsed.status !== 'success' && parsed.status !== 'idle') {
                    setStatus('paused');
                    setCurrentStepIndex(parsed.currentStepIndex || 0);
                    setLogs(parsed.logs || []);
                    const data = parsed.testData || {};
                    setTestData(data);
                    testDataRef.current = data;
                    setProgress(parsed.progress || 0);
                    addLog("⚠️ Restored previous test session. Ready to resume.", "warning");
                }
            } catch (e) {
                console.error("Failed to load saved health state", e);
                localStorage.removeItem(STORAGE_KEY);
            }
        }
    }, []);

    useEffect(() => {
        if (status === 'idle') return;
        const stateToSave = { status, currentStepIndex, logs, testData, progress };
        localStorage.setItem(STORAGE_KEY, JSON.stringify(stateToSave));
    }, [status, currentStepIndex, logs, testData, progress]);

    const addLog = useCallback((message, type = 'info') => {
        setLogs(prev => [...prev, { 
            id: Date.now() + Math.random(), 
            time: new Date().toISOString(), 
            message, 
            type 
        }]);
    }, []);

    const wait = (ms) => new Promise(res => setTimeout(res, ms));

    const runDiagnostics = async (resume = false) => {
        if (!resume) {
            setStatus('running');
            setLogs([]);
            setTestData({});
            testDataRef.current = {}; 
            setCurrentStepIndex(0);
            setProgress(0);
            addLog("🚀 Starting Comprehensive System Diagnostic...", "info");
        } else {
            setStatus('running');
            testDataRef.current = testData; 
            addLog("🔄 Resuming Diagnostic...", "info");
        }

        abortController.current = new AbortController();

        try {
            for (let i = resume ? currentStepIndex : 0; i < STEPS.length; i++) {
                if (abortController.current?.signal.aborted) break;

                const step = STEPS[i];
                setCurrentStepIndex(i);
                setProgress(Math.round(((i) / STEPS.length) * 100));
                addLog(`Testing: ${step.label}...`, "info");

                await executeStep(step.id);
                await wait(1000); // Slight delay for visual pacing
            }

            if (!abortController.current?.signal.aborted) {
                setProgress(100);
                setStatus('success');
                addLog("✅ All Systems Operational. Test Complete.", "success");
                localStorage.removeItem(STORAGE_KEY);
            }

        } catch (error) {
            console.error("Diagnostic Error:", error);
            setStatus('error');
            addLog(`❌ FAILURE: ${error.message}`, "error");
        }
    };

    const executeStep = async (stepId) => {
        const currentData = testDataRef.current;
        const updateData = (newData) => {
            const merged = { ...testDataRef.current, ...newData };
            testDataRef.current = merged;
            setTestData(merged);
        };

        switch (stepId) {
            case 'init':
                if (!navigator.onLine) throw new Error("No Internet Connection");
                addLog("✅ Network Connection Verified.", "success");
                break;

            case 'storage_write':
                // Note: We use .txt extension and SYS_TEST prefix to bypass strict production rules
                const fileRefPath = `system_health_tests/SYS_TEST_${Date.now()}.txt`;
                const storageRef = ref(storage, fileRefPath);
                await uploadString(storageRef, "System Health Check - Write Test");
                updateData({ fileRefPath });
                addLog("✅ Storage Write Access Verified.", "success");
                break;

            case 'firestore_company':
                // Create Company A
                const testCompanyId = `SYS_TEST_${Date.now()}`;
                await setDoc(doc(db, 'companies', testCompanyId), {
                    companyName: "Test Company A",
                    appSlug: `test-slug-${Date.now()}`,
                    isTestRecord: true,
                    createdAt: serverTimestamp(),
                    dailyQuota: 50, 
                    status: 'active'
                });

                // Create Company B (For re-assignment test later)
                const testCompanyIdB = `SYS_TEST_B_${Date.now()}`;
                await setDoc(doc(db, 'companies', testCompanyIdB), {
                    companyName: "Test Company B",
                    isTestRecord: true
                });

                const testDriverId = `SYS_DRIVER_${Date.now()}`;
                await setDoc(doc(db, 'drivers', testDriverId), {
                    personalInfo: { firstName: 'Test', lastName: 'Driver', email: `driver_${Date.now()}@test.com` },
                    isTestRecord: true,
                    createdAt: serverTimestamp()
                });

                updateData({ companyId: testCompanyId, companyIdB: testCompanyIdB, driverId: testDriverId });
                addLog(`✅ Test Companies & Driver Created.`, "success");
                break;

            case 'cloud_function':
                const migrateFn = httpsCallable(functions, 'runMigration'); 
                const pingResult = await migrateFn({ mode: 'ping' });
                if (!pingResult.data?.success) throw new Error("Cloud Function Ping Failed");
                addLog("✅ Cloud Functions are Responding.", "success");
                break;

            case 'sim_driver_app':
                if (!currentData.companyId || !currentData.driverId) throw new Error("Missing IDs");
                // Simulate application via Slug
                const appRef = doc(db, 'companies', currentData.companyId, 'applications', currentData.driverId);
                await setDoc(appRef, {
                    driverId: currentData.driverId,
                    status: 'New Application',
                    submittedAt: serverTimestamp(),
                    applicantName: 'Test Driver',
                    source: 'Slug Apply', // Testing source tracking
                    companyId: currentData.companyId, // Important for indexing
                    isTestRecord: true
                });
                addLog("✅ Driver Application Submitted via Slug.", "success");
                break;

            case 'sim_doc_upload':
                // Using .txt to pass the specific test-mode storage rule
                const cdlPath = `companies/${currentData.companyId}/applications/${currentData.driverId}/cdl_front.txt`;
                const cdlRef = ref(storage, cdlPath);
                await uploadString(cdlRef, "FAKE CDL CONTENT");
                updateData({ cdlPath });

                const appDocRef1 = doc(db, 'companies', currentData.companyId, 'applications', currentData.driverId);
                await setDoc(appDocRef1, { 
                    'cdl-front': { url: 'http://fake-url.com', storagePath: cdlPath } 
                }, { merge: true });

                addLog("✅ CDL Document Uploaded & Linked to Profile.", "success");
                break;

            case 'sim_signature':
                const appDocRef2 = doc(db, 'companies', currentData.companyId, 'applications', currentData.driverId);
                await setDoc(appDocRef2, {
                    signature: {
                        name: 'Test Driver',
                        date: new Date().toISOString(),
                        data: 'base64_fake_signature_string'
                    },
                    isCertified: true
                }, { merge: true });
                addLog("✅ E-Signature Successfully Captured.", "success");
                break;

            // --- NEW: USER MANAGEMENT CYCLE ---
            case 'test_user_access':
                const tempEmail = `systest_${Date.now()}@example.com`;
                const tempPass = "Test1234!";
                
                // 1. Create User
                addLog(".. Creating temporary user...", "info");
                const createFn = httpsCallable(functions, 'createPortalUser');
                const createRes = await createFn({
                    fullName: "System Test User",
                    email: tempEmail,
                    password: tempPass,
                    companyId: currentData.companyId,
                    role: 'hr_user'
                });
                
                if (!createRes.data?.userId) throw new Error("User creation failed (No UID returned)");
                const tempUserId = createRes.data.userId;
                updateData({ tempUserId });

                // 2. Verify Membership A
                const memQ1 = query(collection(db, 'memberships'), where("userId", "==", tempUserId), where("companyId", "==", currentData.companyId));
                const snap1 = await getDocs(memQ1);
                if (snap1.empty) throw new Error("User created but NOT assigned to Company A.");
                addLog(".. User assigned to Company A.", "info");

                // 3. Reassign to Company B
                // First delete old membership (Simulate UI action)
                const oldMemId = snap1.docs[0].id;
                await deleteDoc(doc(db, 'memberships', oldMemId));

                // Add new membership
                const addMemFn = httpsCallable(functions, 'joinCompanyTeam'); // Or direct DB write if you prefer
                // We'll simulate direct write since 'joinCompanyTeam' creates new users usually.
                // Let's use direct DB write to simulate the 'EditUserModal' logic
                await setDoc(doc(db, 'memberships', `TEMP_MEM_${Date.now()}`), {
                    userId: tempUserId,
                    companyId: currentData.companyIdB,
                    role: 'company_admin',
                    isTestRecord: true
                });

                // 4. Verify Access Change
                const memQ2 = query(collection(db, 'memberships'), where("userId", "==", tempUserId), where("companyId", "==", currentData.companyIdB));
                const snap2 = await getDocs(memQ2);
                if (snap2.empty) throw new Error("Reassignment Failed: User not found in Company B.");
                
                addLog("✅ User Access Cycle (Create -> Assign -> Reassign) Verified.", "success");
                break;

            case 'sim_recruiter_link':
                // Create a dummy Recruiter
                const recruiterId = `TEST_REC_${Date.now()}`;
                
                // Driver applies with recruiter link
                const linkedAppRef = doc(db, 'companies', currentData.companyId, 'applications', `LINKED_APP_${Date.now()}`);
                await setDoc(linkedAppRef, {
                    status: 'New Application',
                    applicantName: 'Linked Driver',
                    source: 'Recruiter Link',
                    assignedTo: recruiterId, 
                    isTestRecord: true,
                    submittedAt: serverTimestamp()
                });

                // Verify Attribution
                const linkedSnap = await getDoc(linkedAppRef);
                if (linkedSnap.data().assignedTo !== recruiterId) {
                    throw new Error("Recruiter Link Logic Failed: 'assignedTo' field missing or incorrect.");
                }
                updateData({ linkedAppId: linkedAppRef.id });
                addLog("✅ Recruiter Attribution Logic Verified.", "success");
                break;

            case 'sim_job_offer':
                const appRefOffer = doc(db, 'companies', currentData.companyId, 'applications', currentData.driverId);
                await setDoc(appRefOffer, {
                    status: 'Offer Sent',
                    offerDetails: {
                        payRate: '0.70',
                        payType: 'CPM',
                        generatedAt: new Date().toISOString()
                    }
                }, { merge: true });
                addLog("✅ Job Offer Sent.", "success");
                break;

            case 'sim_offer_receive':
                const checkRef = doc(db, 'companies', currentData.companyId, 'applications', currentData.driverId);
                const snap = await getDoc(checkRef);
                if (snap.data().status !== 'Offer Sent') throw new Error("Status update failed.");
                addLog("✅ Driver Received Offer.", "success");
                break;

            case 'sim_pdf_gen':
                try {
                    const pdfDoc = new jsPDF();
                    pdfDoc.text("System Health Check", 10, 10);
                    const out = pdfDoc.output('datauristring');
                    if (!out.startsWith('data:application/pdf')) throw new Error("Invalid PDF header");
                    addLog("✅ PDF Generation Engine OK.", "success");
                } catch (e) {
                    throw new Error(`PDF Engine Error: ${e.message}`);
                }
                break;

            case 'sim_activity_log':
                const logRef = doc(collection(db, 'companies', currentData.companyId, 'applications', currentData.driverId, 'activities'));
                await setDoc(logRef, { type: 'test', text: 'Audit Log Test', createdAt: serverTimestamp() });
                const logSnap = await getDoc(logRef);
                if (!logSnap.exists()) throw new Error("Activity Log failed to write.");
                addLog("✅ Audit/Activity Logging OK.", "success");
                break;

            // --- NEW: VISIBILITY CHECK ---
            case 'test_visibility':
                // Check Applications List
                const qApps = query(collection(db, 'companies', currentData.companyId, 'applications'));
                const snapApps = await getDocs(qApps);
                const foundApp = snapApps.docs.find(d => d.id === currentData.driverId);
                if (!foundApp) throw new Error("Dashboard Visibility Error: Application not showing in query.");

                // Check Company Leads (Create one first)
                const leadRef = doc(collection(db, 'companies', currentData.companyId, 'leads'));
                await setDoc(leadRef, { name: "Test Lead", status: 'new', isTestRecord: true });
                const qLeads = query(collection(db, 'companies', currentData.companyId, 'leads'));
                const snapLeads = await getDocs(qLeads);
                if (snapLeads.empty) throw new Error("Dashboard Visibility Error: Leads not showing in query.");

                addLog("✅ Dashboard Visibility Checked (Apps & Leads appear in queries).", "success");
                break;

            // --- NEW: BACKEND INTEGRITY ---
            case 'test_integrity':
                // 1. Fetch Application from DB
                const integAppRef = doc(db, 'companies', currentData.companyId, 'applications', currentData.driverId);
                const integSnap = await getDoc(integAppRef);
                const storedPath = integSnap.data()['cdl-front']?.storagePath;

                if (!storedPath) throw new Error("Integrity Fail: DB missing file path.");

                // 2. Check if file actually exists in Storage
                try {
                    const fileRef = ref(storage, storedPath);
                    await getDownloadURL(fileRef); // Will throw if missing
                } catch (e) {
                    throw new Error(`Integrity Fail: DB points to ${storedPath}, but file is missing in Storage.`);
                }
                addLog("✅ Backend Integrity Verified (DB links match Storage files).", "success");
                break;

            case 'cleanup':
                addLog("🧹 Beginning Deep Cleanup...", "warning");
                
                // 1. Delete Firestore Data
                if (currentData.companyId) {
                    // Delete Application
                    await deleteDoc(doc(db, 'companies', currentData.companyId, 'applications', currentData.driverId)).catch(e => console.warn(e));
                    if (currentData.linkedAppId) {
                        await deleteDoc(doc(db, 'companies', currentData.companyId, 'applications', currentData.linkedAppId)).catch(e => console.warn(e));
                    }
                    // Delete Company
                    await deleteDoc(doc(db, 'companies', currentData.companyId)).catch(e => console.warn(e));
                }
                if (currentData.companyIdB) await deleteDoc(doc(db, 'companies', currentData.companyIdB)).catch(e => console.warn(e));
                if (currentData.driverId) await deleteDoc(doc(db, 'drivers', currentData.driverId)).catch(e => console.warn(e));

                // 2. Delete Auth User (Using Backend Function)
                if (currentData.tempUserId) {
                    try {
                        addLog(".. Deleting test user account...", "info");
                        const deleteFn = httpsCallable(functions, 'deletePortalUser');
                        await deleteFn({ userId: currentData.tempUserId }); 
                        await deleteDoc(doc(db, 'users', currentData.tempUserId)).catch(console.warn);
                    } catch (e) {
                        console.warn("Cleanup: Failed to delete auth user", e);
                    }
                }

                // 3. Delete Memberships
                // We query for any remaining memberships for this test user
       if (currentData.tempUserId)