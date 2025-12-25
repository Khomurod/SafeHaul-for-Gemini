import React, { useState, useEffect, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { doc, getDoc, updateDoc, serverTimestamp } from 'firebase/firestore';
import { ref, getDownloadURL, uploadString } from 'firebase/storage';
import { db, storage, auth } from '@lib/firebase';
import { initializeSignatureCanvas, clearCanvas, isCanvasEmpty, getSignatureDataUrl } from '@lib/signature';
import { Document, Page, pdfjs } from 'react-pdf';
import { Loader2, CheckCircle, AlertTriangle, PenTool, X, ChevronRight } from 'lucide-react';

pdfjs.GlobalWorkerOptions.workerSrc = `//unpkg.com/pdfjs-dist@${pdfjs.version}/build/pdf.worker.min.js`;

export default function SigningRoom() {
  const { companyId, requestId } = useParams();
  const navigate = useNavigate();
  
  const [request, setRequest] = useState(null);
  const [pdfUrl, setPdfUrl] = useState(null);
  const [loading, setLoading] = useState(true);
  const [numPages, setNumPages] = useState(null);
  const [isSigning, setIsSigning] = useState(false); // Modal Open?
  const [submitting, setSubmitting] = useState(false);

  // Load Data
  useEffect(() => {
    async function load() {
      if (!auth.currentUser) return;
      try {
        const snap = await getDoc(doc(db, 'companies', companyId, 'signing_requests', requestId));
        if (!snap.exists()) throw new Error("Document not found");
        
        // Simple Auth Check (Rules enforce strict check)
        // Note: For now we allow reading if we have the link, assuming the driver is logged in.
        
        setRequest(snap.data());
        const url = await getDownloadURL(ref(storage, snap.data().storagePath));
        setPdfUrl(url);
      } catch (err) {
        console.error(err);
      } finally {
        setLoading(false);
      }
    }
    load();
  }, [companyId, requestId]);

  // Init Canvas
  useEffect(() => {
    if (isSigning) setTimeout(initializeSignatureCanvas, 100);
  }, [isSigning]);

  const handleFinishSigning = async () => {
    if (isCanvasEmpty()) return alert("Please sign first.");
    setSubmitting(true);
    try {
        const sigData = getSignatureDataUrl();
        // Upload Signature Image
        const sigPath = `secure_documents/${companyId}/signatures/${requestId}_${Date.now()}.png`;
        await uploadString(ref(storage, sigPath), sigData, 'data_url');

        // Update Request -> Triggers Backend Sealing
        await updateDoc(doc(db, 'companies', companyId, 'signing_requests', requestId), {
            status: 'pending_seal',
            signatureUrl: sigPath,
            signedAt: serverTimestamp(),
            // Audit Data
            auditTrail: {
                ip: '127.0.0.1', // Use a function to get real IP if needed
                userAgent: navigator.userAgent,
                signedBy: auth.currentUser.email
            }
        });
        
        setRequest(prev => ({ ...prev, status: 'pending_seal' }));
        setIsSigning(false);
        alert("Document signed! Processing...");

    } catch (e) {
        console.error(e);
        alert("Error saving signature.");
    } finally {
        setSubmitting(false);
    }
  };

  if (loading) return <GlobalLoadingState />;

  // Helper: Render the "Click to Sign" Button
  const renderSignButton = (pageNum) => {
     // Only render if this is the correct page AND status is sent
     if (request.status !== 'sent') return null;
     if (request.signatureConfig?.pageNumber !== pageNum) return null;

     const { xPosition, yPosition } = request.signatureConfig;

     return (
        <div 
            className="absolute z-20 cursor-pointer animate-pulse"
            style={{ 
                left: `${xPosition}%`, 
                top: `${yPosition}%`,
                transform: 'translate(0, 0)' // We stored top-left coordinates
            }}
            onClick={() => setIsSigning(true)}
        >
            <div className="bg-yellow-400 hover:bg-yellow-300 border-2 border-yellow-700 text-yellow-900 font-bold px-4 py-3 rounded shadow-lg flex items-center gap-2">
                <PenTool size={20} />
                <span>CLICK TO SIGN</span>
                <div className="absolute -right-1 -top-1 w-3 h-3 bg-red-500 rounded-full"></div>
            </div>
        </div>
     );
  };
  
  // Helper: Render the Final Signature Image (If signed)
  const renderSignedImage = (pageNum) => {
      if (request.status === 'sent') return null;
      if (request.signatureConfig?.pageNumber !== pageNum) return null;
      
      // If it's already signed, we might want to show a placeholder or just let the PDF show (if sealed)
      // Since the backend seals it, the new PDF will have it. 
      // But while 'pending_seal', we can show a placeholder.
      if (request.status === 'pending_seal') {
          const { xPosition, yPosition } = request.signatureConfig;
          return (
             <div className="absolute border-2 border-green-500 bg-green-100/50 px-4 py-2 text-green-700 font-bold rounded"
                style={{ left: `${xPosition}%`, top: `${yPosition}%` }}>
                <CheckCircle size={16} className="inline mr-1"/> Signed
             </div>
          );
      }
      return null;
  };

  return (
    <div className="min-h-screen bg-gray-100 flex flex-col">
        <header className="bg-white p-4 shadow-sm flex justify-between items-center sticky top-0 z-30">
            <h1 className="font-bold text-gray-800">{request?.title || 'Document'}</h1>
            <div className={`px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wide
                ${request?.status === 'sent' ? 'bg-blue-100 text-blue-700' : 'bg-green-100 text-green-700'}`}>
                Status: {request?.status}
            </div>
        </header>

        <main className="flex-1 overflow-y-auto p-8 flex justify-center">
            <Document file={pdfUrl} onLoadSuccess={({numPages}) => setNumPages(numPages)} className="flex flex-col gap-6">
                {Array.from(new Array(numPages), (el, index) => (
                    <div key={index} className="relative shadow-lg border bg-white">
                        <Page pageNumber={index + 1} width={Math.min(window.innerWidth - 40, 800)} renderAnnotationLayer={false} renderTextLayer={false}/>
                        {renderSignButton(index + 1)}
                        {renderSignedImage(index + 1)}
                    </div>
                ))}
            </Document>
        </main>

        {/* Signature Modal (Reused) */}
        {isSigning && (
            <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm p-4">
                <div className="bg-white w-full max-w-md rounded-xl shadow-2xl overflow-hidden">
                    <div className="bg-gray-50 p-4 border-b flex justify-between items-center">
                        <h3 className="font-bold">Adopt Your Signature</h3>
                        <button onClick={() => setIsSigning(false)}><X size={20}/></button>
                    </div>
                    <div className="p-6 text-center">
                         <div className="border-2 border-dashed border-gray-300 rounded bg-gray-50 mb-4 relative">
                            <canvas id="signature-canvas" className="w-full h-40 touch-none"></canvas>
                            <button id="clear-signature" onClick={clearCanvas} className="absolute bottom-2 right-2 text-xs text-red-500 underline">Clear</button>
                         </div>
                         <p className="text-xs text-gray-400">By clicking "Sign", I agree to be legally bound by this electronic signature.</p>
                    </div>
                    <div className="p-4 bg-gray-50 flex justify-end gap-2">
                        <button onClick={() => setIsSigning(false)} className="px-4 py-2 text-gray-600">Cancel</button>
                        <button onClick={handleFinishSigning} disabled={submitting} className="px-6 py-2 bg-green-600 text-white font-bold rounded shadow hover:bg-green-700 flex items-center gap-2">
                            {submitting ? <Loader2 className="animate-spin"/> : <CheckCircle size={16}/>} Sign Document
                        </button>
                    </div>
                </div>
            </div>
        )}
    </div>
  );
}

function GlobalLoadingState() {
    return <div className="h-screen flex items-center justify-center"><Loader2 className="animate-spin" size={40}/></div>;
}