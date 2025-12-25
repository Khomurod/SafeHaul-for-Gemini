import React, { useState, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { db, storage, auth } from '@lib/firebase';
import { ref, uploadBytes, getDownloadURL } from 'firebase/storage';
import { collection, addDoc, serverTimestamp } from 'firebase/firestore';
import { Document, Page, pdfjs } from 'react-pdf';
import Draggable from 'react-draggable';
import { Loader2, UploadCloud, Move, Save, X, Plus } from 'lucide-react';
import { v4 as uuidv4 } from 'uuid'; // Ensure you have this or use simple random string

// Fix PDF Worker
pdfjs.GlobalWorkerOptions.workerSrc = `//unpkg.com/pdfjs-dist@${pdfjs.version}/build/pdf.worker.min.js`;

export default function EnvelopeCreator({ companyId, onClose }) {
  const navigate = useNavigate();
  
  // State
  const [file, setFile] = useState(null);
  const [numPages, setNumPages] = useState(null);
  const [loading, setLoading] = useState(false);
  const [recipientEmail, setRecipientEmail] = useState('');
  const [recipientName, setRecipientName] = useState('');
  const [title, setTitle] = useState('');
  
  // The "Sign Here" Box State
  const [signBox, setSignBox] = useState(null); // { page: 1, x: 50, y: 50 } (Percent)
  
  // Refs for page elements to calculate dimensions
  const pageRefs = useRef({});

  // 1. File Selection
  const handleFileChange = (e) => {
    const selected = e.target.files[0];
    if (selected && selected.type === 'application/pdf') {
      setFile(selected);
      setTitle(selected.name.replace('.pdf', ''));
    } else {
      alert("Please upload a valid PDF.");
    }
  };

  // 2. Add "Sign Here" Box (Defaults to center of Page 1)
  const addSignatureBox = () => {
    if (!file) return;
    // Default to Page 1, centerish
    setSignBox({ page: 1, x: 40, y: 40 }); 
  };

  // 3. Handle Drag Stop - Calculate % Coordinates
  const handleDragStop = (e, data, pageIndex) => {
    const pageEl = pageRefs.current[pageIndex];
    if (!pageEl) return;

    const rect = pageEl.getBoundingClientRect();
    
    // Calculate position relative to the PAGE container, not the screen
    // Draggable 'data' gives us pixels moved, but we want absolute position within parent
    // We rely on visual placement. A simpler way for this UI:
    // We map the visual DOM box to percentage of the page container.
    
    // Helper: The 'Draggable' component uses transform translate. 
    // We need the visual offset relative to the .pdf-page-container
    // For simplicity in this demo, we will use the `x` and `y` from data which are pixels relative to start.
    // BUT, for a robust app, we need to know exactly where it landed on the page image.
    
    // APPROACH: We update the state purely based on visual pixels, 
    // but when SAVING, we calculate percentage based on the parent div size.
  };

  // Simplified Drag Handler: We trust the visual placement. 
  // We will simply render the Draggable INSIDE the specific Page Container.
  // The 'bound="parent"' prop ensures it stays inside that page.
  
  const savePosition = (e, data, pageNumber) => {
     const node = data.node; // The draggable element
     const parent = node.offsetParent; // The Page Container
     
     if (!parent) return;

     // Calculate Percentage
     const xPercent = (data.x / parent.offsetWidth) * 100;
     const yPercent = (data.y / parent.offsetHeight) * 100;

     setSignBox({
        page: pageNumber,
        x: xPercent,
        y: yPercent
     });
  };

  // 4. Submit & Create Envelope
  const handleSend = async () => {
    if (!file || !recipientEmail || !signBox) {
        alert("Please upload a file, set a recipient, and place the signature box.");
        return;
    }

    setLoading(true);
    try {
        // A. Upload Original PDF
        const storagePath = `secure_documents/${companyId}/originals/${Date.now()}_${file.name}`;
        const fileRef = ref(storage, storagePath);
        await uploadBytes(fileRef, file);

        // B. Create Firestore Request
        const docData = {
            companyId,
            recipientEmail,
            recipientName,
            title,
            status: 'sent',
            createdAt: serverTimestamp(),
            storagePath, // Reference to blank PDF
            
            // THE MAGIC: Store exactly where the signature goes
            signatureConfig: {
                pageNumber: signBox.page,
                xPosition: signBox.x, // % from left
                yPosition: signBox.y, // % from top
                width: 20, // Approx width % of signature
                height: 5  // Approx height %
            },
            
            // Security
            senderId: auth.currentUser.uid,
            // We can resolve recipientId later if they are not yet in the system, 
            // but for now let's assume we link by email or invite.
            recipientId: null // Pending link
        };

        await addDoc(collection(db, 'companies', companyId, 'signing_requests'), docData);
        
        alert("Document sent successfully!");
        if(onClose) onClose();

    } catch (err) {
        console.error("Error sending:", err);
        alert("Failed to send.");
    } finally {
        setLoading(false);
    }
  };

  return (
    <div className="flex flex-col h-screen bg-gray-100">
      {/* Header */}
      <div className="bg-white border-b px-6 py-4 flex justify-between items-center shadow-sm z-20">
        <h2 className="text-xl font-bold flex items-center gap-2">
            <UploadCloud className="text-blue-600" /> New Envelope
        </h2>
        <div className="flex gap-3">
            <button onClick={onClose} className="px-4 py-2 text-gray-600 hover:bg-gray-100 rounded-lg">Cancel</button>
            <button 
                onClick={handleSend}
                disabled={loading}
                className="px-6 py-2 bg-blue-600 text-white font-bold rounded-lg hover:bg-blue-700 flex items-center gap-2 disabled:opacity-50"
            >
                {loading ? <Loader2 className="animate-spin" /> : <Save size={18} />}
                Send Document
            </button>
        </div>
      </div>

      <div className="flex flex-1 overflow-hidden">
        {/* Sidebar Controls */}
        <div className="w-80 bg-white border-r p-6 overflow-y-auto z-10 shadow-lg">
            <div className="space-y-6">
                <div>
                    <label className="block text-sm font-bold text-gray-700 mb-2">1. Upload PDF</label>
                    <input type="file" accept="application/pdf" onChange={handleFileChange} className="block w-full text-sm text-gray-500 file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-sm file:font-semibold file:bg-blue-50 file:text-blue-700 hover:file:bg-blue-100"/>
                </div>

                {file && (
                    <div className="animate-in fade-in slide-in-from-left-4 duration-500">
                        <div>
                            <label className="block text-sm font-bold text-gray-700 mb-2">2. Recipient</label>
                            <input 
                                type="text" placeholder="Driver Name" 
                                className="w-full mb-2 p-2 border rounded"
                                value={recipientName} onChange={e => setRecipientName(e.target.value)}
                            />
                            <input 
                                type="email" placeholder="driver@email.com" 
                                className="w-full p-2 border rounded"
                                value={recipientEmail} onChange={e => setRecipientEmail(e.target.value)}
                            />
                        </div>

                        <div className="mt-6">
                            <label className="block text-sm font-bold text-gray-700 mb-2">3. Place Fields</label>
                            <p className="text-xs text-gray-500 mb-3">Scroll to the desired page, then click below to add a signature box.</p>
                            
                            <button 
                                onClick={addSignatureBox}
                                disabled={!!signBox}
                                className="w-full py-3 bg-indigo-50 text-indigo-700 border border-indigo-200 rounded-lg font-bold flex items-center justify-center gap-2 hover:bg-indigo-100 transition disabled:opacity-50 disabled:cursor-not-allowed"
                            >
                                {signBox ? 'Box Added (Drag it)' : <><Plus size={18}/> Add "Sign Here"</>}
                            </button>
                        </div>
                    </div>
                )}
            </div>
        </div>

        {/* Main Preview Area */}
        <div className="flex-1 overflow-y-auto bg-gray-200 p-8 flex justify-center relative">
            {!file && (
                <div className="flex flex-col items-center justify-center text-gray-400 mt-20">
                    <UploadCloud size={64} className="mb-4 opacity-50"/>
                    <p className="text-lg font-medium">Upload a PDF to begin</p>
                </div>
            )}

            {file && (
                <Document
                    file={file}
                    onLoadSuccess={({ numPages }) => setNumPages(numPages)}
                    className="flex flex-col gap-6"
                >
                    {Array.from(new Array(numPages), (el, index) => {
                        const pageNum = index + 1;
                        const isTargetPage = signBox?.page === pageNum;

                        return (
                            <div 
                                key={pageNum} 
                                className="relative shadow-xl border border-gray-300 bg-white"
                                ref={el => pageRefs.current[index] = el}
                                style={{ width: 'fit-content' }} // Let React-PDF determine size
                            >
                                <Page 
                                    pageNumber={pageNum} 
                                    width={700} // Fixed width for consistency
                                    renderAnnotationLayer={false}
                                    renderTextLayer={false}
                                />
                                
                                {/* Overlay Layer for this Page */}
                                <div className="absolute inset-0 z-10 pointer-events-none">
                                    {isTargetPage && (
                                        <Draggable
                                            bounds="parent"
                                            defaultPosition={{ x: 250, y: 250 }} // Start middle-ish
                                            onStop={(e, data) => savePosition(e, data, pageNum)}
                                        >
                                            <div className="absolute cursor-move pointer-events-auto bg-yellow-400/80 border-2 border-yellow-600 rounded flex flex-col items-center justify-center shadow-lg hover:bg-yellow-400 transition"
                                                style={{ width: '160px', height: '60px' }}
                                            >
                                                <div className="flex items-center gap-1 text-xs font-bold text-yellow-900 uppercase tracking-wider">
                                                    <Move size={12} /> Sign Here
                                                </div>
                                                <div className="text-[10px] text-yellow-800">Driver Signature</div>
                                                
                                                {/* Remove Button */}
                                                <button 
                                                    onClick={(e) => { e.stopPropagation(); setSignBox(null); }}
                                                    className="absolute -top-3 -right-3 bg-red-500 text-white rounded-full p-1 shadow-sm hover:bg-red-700"
                                                >
                                                    <X size={12} />
                                                </button>
                                            </div>
                                        </Draggable>
                                    )}
                                </div>
                            </div>
                        );
                    })}
                </Document>
            )}
        </div>
      </div>
    </div>
  );
}