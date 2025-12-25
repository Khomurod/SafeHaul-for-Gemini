import React from 'react';
import { useNavigate } from 'react-router-dom';
import { useData } from '@/context/DataContext';
import EnvelopeCreator from '@features/signing/components/EnvelopeCreator';
import GlobalLoadingState from '@shared/components/feedback/GlobalLoadingState';

export default function CreateEnvelopePage() {
  const { currentCompanyProfile, loading } = useData();
  const navigate = useNavigate();

  // 1. Loading State
  if (loading) return <GlobalLoadingState />;

  // 2. Safety Check: If page accessed without a selected company, redirect
  if (!currentCompanyProfile) {
     setTimeout(() => navigate('/company/dashboard'), 100);
     return <GlobalLoadingState />;
  }

  // 3. Render the Envelope Creator
  // We pass the companyId from our global context so the creator knows where to save files.
  // We pass onClose to navigate back to the dashboard when the user clicks Cancel or Finish.
  return (
    <div className="h-screen w-full bg-white">
        <EnvelopeCreator 
            companyId={currentCompanyProfile.id} 
            onClose={() => navigate('/company/dashboard')} 
        />
    </div>
  );
}