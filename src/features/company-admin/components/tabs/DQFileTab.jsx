import React, { useState, useEffect, useMemo } from 'react';
import { db, storage } from '@lib/firebase';
import { collection, addDoc, getDocs, deleteDoc, doc, query, orderBy, updateDoc, Timestamp } from 'firebase/firestore';
import { ref, uploadBytes, getDownloadURL, deleteObject } from 'firebase/storage';
import { Loader2, Upload, Trash2, FileText, Download, AlertTriangle, Calendar, FileCheck } from 'lucide-react';
import { Section } from '../application/ApplicationUI'; 
import { generateApplicationPDF } from '@shared/utils/pdfGenerator'; // Import PDF Generator

const DQ_FILE_TYPES = [
  "CDL / Driver's License", // NEW
  "Medical Card",
  "MVR (Annual)",
  "Previous Employer Inquiry (3yr)",
  "Road Test Certificate",
  "PSP Report",
  "Clearinghouse Report (Full)",
  "Clearinghouse Report (Annual)",
  "Certificate of Violations (Annual)",
  "Annual Review",
  "Other"
];

export function DQFileTab({ companyId, applicationId, collectionName = 'applications', appData }) {

  const [dqFiles, setDqFiles] = useState([]);
  const [loading, setLoading] = useState(true);
  const [isUploading, setIsUploading] = useState(false);
  const [uploadMessage, setUploadMessage] = useState('');
  const [error, setError] = useState('');
  
  // Form State
  const [fileToUpload, setFileToUpload] = useState(null);
  const [selectedFileType, setSelectedFileType] = useState(DQ_FILE_TYPES[0]);
  const [expirationDate, setExpirationDate] = useState('');

  // --- 1. Get the correct Firestore path ---
  const appRef = useMemo(() => {
      return doc(db, "companies", companyId, collectionName, applicationId);
  }, [companyId, collectionName, applicationId]);

  const dqFilesCollectionRef = useMemo(() => {
    return collection(appRef, "dq_files");
  }, [appRef]);

  // --- 2. Fetch DQ files ---
  const fetchDqFiles = async () => {
    setLoading(true);
    setError('');
    try {
      const q = query(dqFilesCollectionRef, orderBy("createdAt", "desc"));
      const snapshot = await getDocs(q);
      const files = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      setDqFiles(files);
    } catch (err) {
      console.error("Error fetching DQ files:", err);
      setError("Could not load DQ files. Check permissions.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchDqFiles();
  }, [dqFilesCollectionRef]);

  // --- 3. Handle File Upload (Smart Logic) ---
  const handleUpload = async () => {
    if (!fileToUpload || !selectedFileType) {
      setError("Please select a file and a file type.");
      return;
    }

    // Validation for Expiry
    const needsExpiry = ["Medical Card", "CDL / Driver's License"].includes(selectedFileType);
    if (needsExpiry && !expirationDate) {
        setError(`Please enter an expiration date for the ${selectedFileType}.`);
        return;
    }

    setIsUploading(true);
    setUploadMessage('Uploading file...');
    setError('');

    try {
      // Storage Path
      const storagePath = `companies/${companyId}/applications/${applicationId}/dq_files/${selectedFileType.replace(/[^a-zA-Z0-9]/g, '_')}_${Date.now()}_${fileToUpload.name}`;
      const storageRef = ref(storage, storagePath);

      // Upload
      await uploadBytes(storageRef, fileToUpload);
      const downloadURL = await getDownloadURL(storageRef);
      setUploadMessage('Updating records...');

      // A. Update Main Profile with Expiration Data (The "Compliance Engine" Feed)
      if (needsExpiry && expirationDate) {
          const dateParts = expirationDate.split('-');
          const dateObj = new Date(dateParts[0], dateParts[1] - 1, dateParts[2]); // Avoid timezone shifts
          const timestamp = Timestamp.fromDate(dateObj);

          const updates = {};
          if (selectedFileType === "Medical Card") updates.medCardExpiration = timestamp;
          if (selectedFileType === "CDL / Driver's License") updates.cdlExpiration = timestamp;
          
          // Dual-write: Update the parent application document
          await updateDoc(appRef, updates);
      }

      // B. Create File Record
      const newDoc = {
        fileType: selectedFileType,
        fileName: fileToUpload.name,
        url: downloadURL,
        storagePath: storagePath,
        expirationDate: expirationDate || null,
        uploadedBy: 'admin',
        createdAt: Timestamp.now()
      };

      await addDoc(dqFilesCollectionRef, newDoc);

      setUploadMessage('Upload Complete & Profile Updated!');
      setFileToUpload(null);
      setExpirationDate('');
      setSelectedFileType(DQ_FILE_TYPES[0]);
      document.getElementById('dq-file-input').value = null; 

      await fetchDqFiles(); 
      setTimeout(() => setUploadMessage(''), 3000);

    } catch (err) {
      console.error("Upload failed:", err);
      setError(`Upload failed: ${err.message}`);
    } finally {
      setIsUploading(false);
    }
  };

  const handleDelete = async (file) => {
    if (!window.confirm(`Delete "${file.fileName}"? This cannot be undone.`)) return;
    setLoading(true); 
    try {
      await deleteObject(ref(storage, file.storagePath));
      await deleteDoc(doc(dqFilesCollectionRef, file.id));
      await fetchDqFiles();
    } catch (err) {
      setError(`Delete failed: ${err.message}`);
      setLoading(false);
    }
  };

  // --- Virtual PDF Generation ---
  const handleGeneratePDF = () => {
      if (!appData) {
          alert("Application data not available.");
          return;
      }
      try {
          // Pass null for agreements if not available locally, the generator handles defaults
          generateApplicationPDF({ applicant: appData, agreements: [], company: { id: companyId } });
      } catch (e) {
          console.error(e);
          alert("Failed to generate PDF.");
      }
  };

  // Helper: Should we show date input?
  const showDateInput = ["Medical Card", "CDL / Driver's License"].includes(selectedFileType);

  return (
    <div className="space-y-8">
      
      {/* 1. Upload Section */}
      <Section title="Upload Compliance Document">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-bold text-gray-700 mb-1">Document Type</label>
              <select
                className="w-full p-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none bg-white"
                value={selectedFileType}
                onChange={(e) => setSelectedFileType(e.target.value)}
                disabled={isUploading}
              >
                {DQ_FILE_TYPES.map(type => <option key={type} value={type}>{type}</option>)}
              </select>
            </div>

            {/* Conditional Date Input */}
            {showDateInput && (
                <div className="animate-in fade-in slide-in-from-top-2">
                    <label className="block text-sm font-bold text-blue-800 mb-1 flex items-center gap-1">
                        <Calendar size={14}/> Expiration Date
                    </label>
                    <input 
                        type="date"
                        className="w-full p-2.5 border border-blue-300 bg-blue-50 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none"
                        value={expirationDate}
                        onChange={(e) => setExpirationDate(e.target.value)}
                        disabled={isUploading}
                    />
                    <p className="text-xs text-blue-600 mt-1">
                        * This date will update the driver's compliance profile automatically.
                    </p>
                </div>
            )}
          </div>

          <div className="space-y-4">
            <div>
              <label className="block text-sm font-bold text-gray-700 mb-1">Select File</label>
              <input
                type="file"
                id="dq-file-input"
                className="w-full text-sm text-gray-600
                           file:mr-4 file:py-2.5 file:px-4
                           file:rounded-lg file:border-0
                           file:text-sm file:font-bold
                           file:bg-gray-100 file:text-gray-700
                           hover:file:bg-gray-200 cursor-pointer"
                onChange={(e) => setFileToUpload(e.target.files[0])}
                disabled={isUploading}
              />
            </div>

            <button 
              className="w-full py-2.5 bg-blue-600 text-white font-bold rounded-lg hover:bg-blue-700 transition disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
              onClick={handleUpload}
              disabled={isUploading || !fileToUpload}
            >
              {isUploading ? <Loader2 className="animate-spin" size={18} /> : <Upload size={18} />}
              {isUploading ? 'Processing...' : 'Upload & Sync'}
            </button>
          </div>
        </div>

        {uploadMessage && <p className="mt-3 text-sm text-green-600 font-medium text-center">{uploadMessage}</p>}
        {error && <p className="mt-3 text-sm text-red-600 bg-red-50 p-2 rounded flex items-center gap-2"><AlertTriangle size={14}/> {error}</p>}
      </Section>

      {/* 2. File List */}
      <Section title="DQ File Inventory">
        <div className="space-y-3">
          
          {/* Virtual Application Row */}
          <div className="flex items-center justify-between p-4 bg-blue-50 border border-blue-200 rounded-lg shadow-sm">
             <div className="flex items-center gap-3">
                 <div className="p-2 bg-blue-100 text-blue-600 rounded-lg">
                    <FileCheck size={20} />
                 </div>
                 <div>
                     <p className="text-sm font-bold text-blue-900">Application for Employment</p>
                     <p className="text-xs text-blue-700">Digital Original (System Generated)</p>
                 </div>
             </div>
             <button 
                onClick={handleGeneratePDF}
                className="p-2 text-blue-700 hover:bg-blue-100 rounded-lg transition-colors flex items-center gap-2 text-sm font-semibold"
             >
                 <Download size={16} /> Download PDF
             </button>
          </div>

          {/* Uploaded Files */}
          {loading && <div className="text-center py-4"><Loader2 className="animate-spin mx-auto text-gray-400"/></div>}
          
          {!loading && dqFiles.map(file => (
            <div key={file.id} className="flex items-center justify-between p-3 bg-white border border-gray-200 rounded-lg hover:border-gray-300 transition-colors">
              <div className="flex items-center gap-3 overflow-hidden">
                <FileText size={20} className="text-gray-400 shrink-0" />
                <div className="overflow-hidden">
                  <p className="text-sm font-medium text-gray-900 truncate">{file.fileType}</p>
                  <p className="text-xs text-gray-500 truncate">
                      {file.fileName}
                      {file.expirationDate && <span className="ml-2 text-orange-600 font-medium">Exp: {file.expirationDate}</span>}
                  </p>
                </div>
              </div>
              <div className="flex gap-2 shrink-0">
                <a
                  href={file.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="p-2 text-gray-500 hover:text-blue-600 hover:bg-gray-50 rounded-lg transition"
                >
                  <Download size={18} />
                </a>
                <button
                  className="p-2 text-gray-500 hover:text-red-600 hover:bg-gray-50 rounded-lg transition"
                  onClick={() => handleDelete(file)}
                >
                  <Trash2 size={18} />
                </button>
              </div>
            </div>
          ))}
        </div>
      </Section>
    </div>
  );
}
