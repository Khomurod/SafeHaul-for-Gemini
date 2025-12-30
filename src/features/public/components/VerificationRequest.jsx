import React, { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import { db } from '@lib/firebase';
import { doc, getDoc, updateDoc, serverTimestamp } from 'firebase/firestore';
import { Loader2, CheckCircle, AlertTriangle, Building2, Calendar, ShieldAlert } from 'lucide-react';

export function VerificationRequest() {
  const { requestId } = useParams();
  const [requestData, setRequestData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [completed, setCompleted] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  // Form State
  const [formData, setFormData] = useState({
      verifiedStartDate: '',
      verifiedEndDate: '',
      eligibleForRehire: '',
      accidentHistory: 'no',
      accidentDetails: '',
      signatureName: '',
      title: ''
  });

  useEffect(() => {
    const fetchRequest = async () => {
        try {
            const docRef = doc(db, 'verification_requests', requestId);
            const snap = await getDoc(docRef);
            
            if (!snap.exists()) {
                setError("Request not found. It may have expired or been deleted.");
            } else {
                const data = snap.data();
                if (data.status === 'Completed') {
                    setCompleted(true);
                } else {
                    setRequestData(data);
                    // Pre-fill dates from driver's claim to make it easier
                    setFormData(prev => ({
                        ...prev,
                        verifiedStartDate: data.claimedStartDate || '',
                        verifiedEndDate: data.claimedEndDate || ''
                    }));
                }
            }
        } catch (err) {
            console.error(err);
            setError("Unable to load verification request.");
        } finally {
            setLoading(false);
        }
    };
    fetchRequest();
  }, [requestId]);

  const handleSubmit = async (e) => {
      e.preventDefault();
      setSubmitting(true);
      
      try {
          const docRef = doc(db, 'verification_requests', requestId);
          await updateDoc(docRef, {
              ...formData,
              status: 'Completed',
              completedAt: serverTimestamp(),
              ipAddress: 'Recorded' // In a real app, you'd capture IP
          });
          setCompleted(true);
      } catch (err) {
          alert("Failed to submit verification. Please try again.");
      } finally {
          setSubmitting(false);
      }
  };

  if (loading) return <div className="h-screen flex items-center justify-center bg-gray-50"><Loader2 className="animate-spin text-blue-600" size={40} /></div>;

  if (error) return (
      <div className="h-screen flex items-center justify-center bg-gray-50 p-4">
          <div className="max-w-md text-center bg-white p-8 rounded-xl shadow-lg border border-red-100">
              <AlertTriangle className="mx-auto text-red-500 mb-4" size={48} />
              <h2 className="text-xl font-bold text-gray-900">Link Invalid</h2>
              <p className="text-gray-500 mt-2">{error}</p>
          </div>
      </div>
  );

  if (completed) return (
      <div className="h-screen flex items-center justify-center bg-gray-50 p-4">
          <div className="max-w-md text-center bg-white p-8 rounded-xl shadow-lg border border-green-100">
              <CheckCircle className="mx-auto text-green-500 mb-4" size={48} />
              <h2 className="text-xl font-bold text-gray-900">Verification Submitted</h2>
              <p className="text-gray-500 mt-2">Thank you for verifying this employment record. You may close this window.</p>
          </div>
      </div>
  );

  return (
    <div className="min-h-screen bg-gray-50 py-12 px-4 sm:px-6 lg:px-8 font-sans">
      <div className="max-w-3xl mx-auto bg-white rounded-2xl shadow-xl overflow-hidden border border-gray-200">
        
        {/* Header */}
        <div className="bg-blue-600 p-8 text-white text-center">
            <Building2 className="mx-auto mb-3" size={32} />
            <h1 className="text-2xl font-bold">Employment Verification Request</h1>
            <p className="text-blue-100 mt-2">
                Requested by <strong>{requestData.requestingCompany}</strong> regarding former employee <strong>{requestData.driverName}</strong>.
            </p>
        </div>

        <form onSubmit={handleSubmit} className="p-8 space-y-8">
            
            {/* Section 1: Dates */}
            <div className="space-y-4">
                <h3 className="text-lg font-bold text-gray-800 flex items-center gap-2 border-b pb-2">
                    <Calendar size={20} className="text-blue-600"/> Employment Dates
                </h3>
                <div className="bg-gray-50 p-4 rounded-lg text-sm text-gray-600 mb-4">
                    Driver claimed dates: <strong>{requestData.claimedStartDate}</strong> to <strong>{requestData.claimedEndDate}</strong>.
                </div>
                
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div>
                        <label className="block text-sm font-bold text-gray-700 mb-1">Verified Start Date</label>
                        <input 
                            type="date" 
                            required
                            className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none"
                            value={formData.verifiedStartDate}
                            onChange={e => setFormData({...formData, verifiedStartDate: e.target.value})}
                        />
                    </div>
                    <div>
                        <label className="block text-sm font-bold text-gray-700 mb-1">Verified End Date</label>
                        <input 
                            type="date" 
                            required
                            className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none"
                            value={formData.verifiedEndDate}
                            onChange={e => setFormData({...formData, verifiedEndDate: e.target.value})}
                        />
                    </div>
                </div>
            </div>

            {/* Section 2: Safety & Rehire */}
            <div className="space-y-4">
                <h3 className="text-lg font-bold text-gray-800 flex items-center gap-2 border-b pb-2">
                    <ShieldAlert size={20} className="text-blue-600"/> Safety & Rehire Status
                </h3>
                
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div>
                        <label className="block text-sm font-bold text-gray-700 mb-2">Eligible for Rehire?</label>
                        <div className="flex gap-4">
                            {['Yes', 'No', 'Review Required'].map(opt => (
                                <label key={opt} className="flex items-center cursor-pointer">
                                    <input 
                                        type="radio" 
                                        name="rehire" 
                                        required
                                        className="w-4 h-4 text-blue-600"
                                        checked={formData.eligibleForRehire === opt}
                                        onChange={() => setFormData({...formData, eligibleForRehire: opt})}
                                    />
                                    <span className="ml-2 text-sm text-gray-700">{opt}</span>
                                </label>
                            ))}
                        </div>
                    </div>

                    <div>
                        <label className="block text-sm font-bold text-gray-700 mb-2">Accident History (Past 3 Years)?</label>
                        <div className="flex gap-4">
                            <label className="flex items-center cursor-pointer">
                                <input 
                                    type="radio" 
                                    name="accidents" 
                                    required
                                    className="w-4 h-4 text-blue-600"
                                    checked={formData.accidentHistory === 'yes'}
                                    onChange={() => setFormData({...formData, accidentHistory: 'yes'})}
                                />
                                <span className="ml-2 text-sm text-gray-700">Yes</span>
                            </label>
                            <label className="flex items-center cursor-pointer">
                                <input 
                                    type="radio" 
                                    name="accidents" 
                                    required
                                    className="w-4 h-4 text-blue-600"
                                    checked={formData.accidentHistory === 'no'}
                                    onChange={() => setFormData({...formData, accidentHistory: 'no'})}
                                />
                                <span className="ml-2 text-sm text-gray-700">No</span>
                            </label>
                        </div>
                    </div>
                </div>

                {formData.accidentHistory === 'yes' && (
                    <div className="mt-4 animate-in fade-in">
                         <label className="block text-sm font-bold text-gray-700 mb-1">Please provide accident details:</label>
                         <textarea 
                            required
                            rows="3"
                            className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none"
                            placeholder="Date, location, and brief description..."
                            value={formData.accidentDetails}
                            onChange={e => setFormData({...formData, accidentDetails: e.target.value})}
                         ></textarea>
                    </div>
                )}
            </div>

            {/* Section 3: Signature */}
            <div className="space-y-4 pt-4 border-t border-gray-100">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div>
                        <label className="block text-sm font-bold text-gray-700 mb-1">Authorized By (Full Name)</label>
                        <input 
                            type="text" 
                            required
                            className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none"
                            placeholder="Jane Doe"
                            value={formData.signatureName}
                            onChange={e => setFormData({...formData, signatureName: e.target.value})}
                        />
                    </div>
                    <div>
                        <label className="block text-sm font-bold text-gray-700 mb-1">Title</label>
                        <input 
                            type="text" 
                            required
                            className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none"
                            placeholder="Safety Manager"
                            value={formData.title}
                            onChange={e => setFormData({...formData, title: e.target.value})}
                        />
                    </div>
                </div>
                <div className="flex items-start gap-2 mt-4">
                    <input type="checkbox" required className="mt-1 w-4 h-4 text-blue-600 rounded" />
                    <span className="text-xs text-gray-500">
                        I certify that the information provided is true and correct to the best of my knowledge. This electronic signature is legally binding.
                    </span>
                </div>
            </div>

            <button 
                type="submit" 
                disabled={submitting}
                className="w-full py-4 bg-blue-600 hover:bg-blue-700 text-white font-bold rounded-xl shadow-lg transition-all flex items-center justify-center gap-2 text-lg disabled:opacity-50"
            >
                {submitting ? <Loader2 className="animate-spin" /> : "Submit Verification"}
            </button>

        </form>
      </div>
      <p className="text-center text-gray-400 text-xs mt-8">Powered by SafeHaul Compliance Engine</p>
    </div>
  );
}
