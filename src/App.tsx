import React, { useState } from 'react';
import {
  HashRouter,
  Routes,
  Route,
  Navigate,
  useNavigate,
  useLocation,
} from 'react-router-dom';
import { AuthProvider, useAuth } from './context/AuthContext';
import { Sidebar } from './components/Sidebar';
import { Header } from './components/Header';
import { AlumniCallModal } from './components/AlumniCallModal';
import { LeadDetailsModal } from './components/LeadDetailsModal';
import { ImportAlumniModal } from './components/ImportAlumniModal';
import { GasSetupModal } from './components/GasSetupModal';

import { DashboardPage } from './pages/DashboardPage';
import { AlumniPage } from './pages/AlumniPage';
import { LeadsPage } from './pages/LeadsPage';
import { ReferencesPage } from './pages/ReferencesPage';
import { FollowupsPage } from './pages/FollowupsPage';
import { SCManagementPage } from './pages/SCManagementPage';
import { ReportsPage } from './pages/ReportsPage';
import { DataManagementPage } from './pages/DataManagementPage';
import { PublicReferenceFormPage } from './pages/PublicReferenceFormPage';
import { LoginPage } from './pages/LoginPage';
import { Alumni, Lead } from './types';

// Protected Workspace Shell
const MainWorkspace: React.FC = () => {
  const { user, role, isAuthenticated } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  // Active tab derived from location pathname
  const currentPath = location.pathname.replace('/', '') || 'dashboard';

  // Global modals
  const [callingAlumni, setCallingAlumni] = useState<Alumni | null>(null);
  const [selectedLead, setSelectedLead] = useState<Lead | null>(null);
  const [isImportOpen, setIsImportOpen] = useState(false);
  const [isGasModalOpen, setIsGasModalOpen] = useState(false);
  const [filterScId, setFilterScId] = useState<string | undefined>(undefined);
  const [globalSearch, setGlobalSearch] = useState('');
  const [refreshKey, setRefreshKey] = useState(0);

  if (!isAuthenticated) {
    return <Navigate to="/login" replace />;
  }

  const handleTabChange = (tab: string, param?: any) => {
    if (param?.scId) {
      setFilterScId(param.scId);
    } else {
      setFilterScId(undefined);
    }
    navigate(`/${tab}`);
  };

  const getPageHeaderInfo = () => {
    switch (currentPath) {
      case 'dashboard':
        return {
          title: role === 'ADMIN' ? 'Executive Dashboard' : 'My Counsellor Dashboard',
          subtitle: 'Admissions & Lead Operations Overview',
        };
      case 'alumni':
        return {
          title: role === 'ADMIN' ? 'Alumni Master Database' : 'My Assigned Alumni Roster',
          subtitle: 'Alumni calling, connection status, follow-up scheduler, and reference pipeline',
        };
      case 'leads':
        return {
          title: role === 'ADMIN' ? 'All Admission Leads Pipeline' : 'My Admission Leads Pipeline',
          subtitle: 'Student admission prospects gathered from verified alumni referrals',
        };
      case 'references':
        return {
          title: role === 'ADMIN' ? 'All Reference Submissions & Link Manager' : 'My Reference Collection & Easy Share Links',
          subtitle: 'Share personalized referral links with alumni via WhatsApp and track submissions',
        };
      case 'followups':
        return {
          title: role === 'ADMIN' ? 'All Follow-ups & Counselling Calls' : 'My Scheduled Follow-ups & Callbacks',
          subtitle: 'Scheduled appointments, urgent callbacks, and overdue lead progression',
        };
      case 'sc-management':
        return {
          title: 'Counsellor Accounts & Equal Workload Roster',
          subtitle: 'Manage SC user accounts, activation status, and equal distribution rules',
        };
      case 'reports':
        return {
          title: role === 'ADMIN' ? 'Executive Conversion Funnel & MIS Reports' : 'My Personal Performance & Conversion Funnel',
          subtitle: 'Detailed conversion rates, counsellor scorecards, and clean CSV exports',
        };
      case 'data-management':
        return {
          title: 'Data Management, Security & Live Sheets Sync',
          subtitle: 'Audit logs, soft-deleted record restoration, user accounts, and zero-loss Google Sheets synchronization',
        };
      default:
        return {
          title: 'SEAMEDU FMS',
          subtitle: 'Alumni Calling & Admissions Conversion System',
        };
    }
  };

  const { title, subtitle } = getPageHeaderInfo();

  return (
    <div className="flex h-screen bg-slate-100/70 overflow-hidden font-sans text-slate-800 antialiased selection:bg-indigo-500 selection:text-white">
      {/* Fixed Left Sidebar */}
      <Sidebar
        currentTab={currentPath}
        setCurrentTab={(tab) => handleTabChange(tab)}
        openImportModal={() => {
          if (role === 'ADMIN') setIsImportOpen(true);
        }}
        openGasModal={() => {
          if (role === 'ADMIN') setIsGasModalOpen(true);
        }}
      />

      {/* Main Content Area */}
      <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
        {/* Top Header */}
        <Header
          title={title}
          subtitle={subtitle}
          searchTerm={globalSearch}
          setSearchTerm={setGlobalSearch}
          openImportModal={() => {
            if (role === 'ADMIN') setIsImportOpen(true);
          }}
          openGasModal={() => {
            if (role === 'ADMIN') setIsGasModalOpen(true);
          }}
          onRefresh={() => setRefreshKey((prev) => prev + 1)}
        />

        {/* Content View Body */}
        <main className="flex-1 overflow-y-auto" key={refreshKey}>
          <Routes>
            <Route
              path="/"
              element={
                <DashboardPage
                  onNavigateTab={handleTabChange}
                  onOpenCallModal={(a) => setCallingAlumni(a)}
                  onOpenLeadModal={(l) => setSelectedLead(l)}
                />
              }
            />
            <Route
              path="/dashboard"
              element={
                <DashboardPage
                  onNavigateTab={handleTabChange}
                  onOpenCallModal={(a) => setCallingAlumni(a)}
                  onOpenLeadModal={(l) => setSelectedLead(l)}
                />
              }
            />
            <Route
              path="/alumni"
              element={
                <AlumniPage
                  onOpenCallModal={(a) => setCallingAlumni(a)}
                  filterInitialScId={filterScId}
                />
              }
            />
            <Route
              path="/leads"
              element={<LeadsPage onOpenLeadModal={(l) => setSelectedLead(l)} />}
            />
            <Route path="/references" element={<ReferencesPage />} />
            <Route
              path="/followups"
              element={<FollowupsPage onOpenLeadModal={(l) => setSelectedLead(l)} />}
            />
            <Route
              path="/sc-management"
              element={
                role === 'ADMIN' ? (
                  <SCManagementPage onOpenCallModal={(a) => setCallingAlumni(a)} />
                ) : (
                  <Navigate to="/dashboard" replace />
                )
              }
            />
            <Route path="/reports" element={<ReportsPage />} />
            <Route
              path="/data-management"
              element={
                role === 'ADMIN' ? (
                  <DataManagementPage onOpenGasModal={() => setIsGasModalOpen(true)} />
                ) : (
                  <Navigate to="/dashboard" replace />
                )
              }
            />
            <Route path="*" element={<Navigate to="/dashboard" replace />} />
          </Routes>
        </main>
      </div>

      {/* Global Modals */}
      {callingAlumni && (
        <AlumniCallModal
          alumni={callingAlumni}
          isOpen={!!callingAlumni}
          onClose={() => setCallingAlumni(null)}
          onSuccess={() => {
            setCallingAlumni(null);
            setRefreshKey((prev) => prev + 1);
          }}
        />
      )}

      {selectedLead && (
        <LeadDetailsModal
          lead={selectedLead}
          isOpen={!!selectedLead}
          onClose={() => setSelectedLead(null)}
          onSuccess={() => {
            setSelectedLead(null);
            setRefreshKey((prev) => prev + 1);
          }}
        />
      )}

      {role === 'ADMIN' && isImportOpen && (
        <ImportAlumniModal
          isOpen={isImportOpen}
          onClose={() => setIsImportOpen(false)}
          onSuccess={() => setRefreshKey((prev) => prev + 1)}
        />
      )}

      {role === 'ADMIN' && isGasModalOpen && (
        <GasSetupModal
          isOpen={isGasModalOpen}
          onClose={() => setIsGasModalOpen(false)}
          onSave={() => setRefreshKey((prev) => prev + 1)}
        />
      )}
    </div>
  );
};

export default function App() {
  return (
    <AuthProvider>
      <HashRouter>
        <Routes>
          {/* Public Referral Forms with Secure Tokens */}
          <Route path="/ref/:token" element={<PublicReferenceFormPage />} />
          <Route path="/reference-form" element={<PublicReferenceFormPage />} />

          {/* Login Authentication */}
          <Route path="/login" element={<LoginPage />} />

          {/* Internal Protected Application */}
          <Route path="/*" element={<MainWorkspace />} />
        </Routes>
      </HashRouter>
    </AuthProvider>
  );
}
