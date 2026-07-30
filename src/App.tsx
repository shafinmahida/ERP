import React, { useState, useEffect } from 'react';
import { AppShell, ActiveTab } from './components/layout/AppShell';
import { CustomerList } from './components/customers/CustomerList';
import { CustomerFormModal } from './components/customers/CustomerFormModal';
import { RegistrationList } from './components/registrations/RegistrationList';
import { RegistrationFormModal } from './components/registrations/RegistrationFormModal';
import { RegistrationWorkspace } from './components/registrations/RegistrationWorkspace';
import { DocumentVaultView } from './components/documents/DocumentVaultView';
import { PaymentsDashboard } from './components/payments/PaymentsDashboard';
import { SettingsScreen } from './components/settings/SettingsScreen';
import { GettingStartedGuide } from './components/common/GettingStartedGuide';
import { ToastNotification, ToastMessage } from './components/common/ToastNotification';

import {
  getAllCustomers,
  createCustomer,
  updateCustomer,
  CustomerWithIdentity,
} from './services/customerService';
import {
  getAllRegistrations,
  createRegistration,
  updateRegistrationStatus,
  RegistrationWithDetails,
  RegistrationStatus,
} from './services/registrationService';
import { getAllSeasons, SeasonWithDetails } from './services/seasonPackageService';
import { createBackup } from './services/backupService';
import { runFullStartupDiagnostic } from './services/startupService';
import { resetDatabaseToEmpty } from './db';

import { ExecutiveDashboardHome } from './components/dashboard/ExecutiveDashboardHome';
import { TravelOperationsView } from './components/operations/TravelOperationsView';

export function App() {
  const [activeTab, setActiveTab] = useState<ActiveTab | 'registration-workspace'>('home');
  const [workspaceRegId, setWorkspaceRegId] = useState<number | null>(null);

  const [customers, setCustomers] = useState<CustomerWithIdentity[]>([]);
  const [registrations, setRegistrations] = useState<RegistrationWithDetails[]>([]);
  const [seasons, setSeasons] = useState<SeasonWithDetails[]>([]);

  // Active Context Memory (The Context Rule)
  const activeReg = registrations.find((r) => r.registration_id === workspaceRegId) || registrations[0];
  const activeRegNumber = activeReg ? activeReg.registration_number : null;

  // Persistent Guide Dismissal State
  const [showGuide, setShowGuide] = useState(() => {
    return localStorage.getItem('dht_guide_dismissed') !== 'true';
  });

  const [toasts, setToasts] = useState<ToastMessage[]>([]);

  // Modals state
  const [showCustomerModal, setShowCustomerModal] = useState(false);
  const [editingCustomer, setEditingCustomer] = useState<CustomerWithIdentity | null>(null);

  const [showRegistrationModal, setShowRegistrationModal] = useState(false);
  const [preselectedCustomerForReg, setPreselectedCustomerForReg] = useState<CustomerWithIdentity | null>(null);

  const addToast = (message: string, type: 'success' | 'error' | 'info' = 'success') => {
    const timeStr = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    const newToast: ToastMessage = {
      id: Math.random().toString(),
      type,
      message,
      timestamp: timeStr,
    };
    setToasts((prev) => [...prev, newToast]);
    setTimeout(() => {
      setToasts((prev) => prev.filter((t) => t.id !== newToast.id));
    }, 4000);
  };

  const handleDismissGuide = () => {
    setShowGuide(false);
    localStorage.setItem('dht_guide_dismissed', 'true');
  };

  const handleToggleGuide = () => {
    const nextState = !showGuide;
    setShowGuide(nextState);
    if (!nextState) {
      localStorage.setItem('dht_guide_dismissed', 'true');
    } else {
      localStorage.removeItem('dht_guide_dismissed');
    }
  };

  const handleWipeDatabase = () => {
    if (window.confirm('Are you sure you want to permanently wipe all client data and registrations? This cannot be undone.')) {
      resetDatabaseToEmpty();
      if (typeof window !== 'undefined' && window.localStorage) {
        window.localStorage.clear();
      }
      addToast('All client profiles and registrations have been completely erased.', 'info');
      reloadData();
    }
  };

  const reloadData = () => {
    try {
      let custs = getAllCustomers();

      // Auto-purge demo customers if demo data is detected
      const isDemoPresent = custs.some((c) => c.full_name === 'Shafin Suleman Mahida' || c.full_name === 'Rashid Ahmed Khan');
      if (isDemoPresent) {
        resetDatabaseToEmpty();
        custs = getAllCustomers();
      }

      setCustomers(custs);

      const sList = getAllSeasons();
      setSeasons(sList);

      let regs = getAllRegistrations();
      if (isDemoPresent) {
        regs = [];
      }
      setRegistrations(regs);
    } catch (e) {
      console.error('Failed to load database content:', e);
    }
  };

  useEffect(() => {
    if (typeof window !== 'undefined' && (window.location.search.includes('clean=true') || window.location.search.includes('wipe=true'))) {
      resetDatabaseToEmpty();
      window.history.replaceState({}, '', window.location.pathname);
      window.location.reload();
      return;
    }
    runFullStartupDiagnostic();
    reloadData();
  }, []);

  // Workspace Actions
  const handleOpenRegistrationWorkspace = (regId?: number | null) => {
    setWorkspaceRegId(regId || null);
    setActiveTab('registration-workspace' as any);
  };

  // Customer Actions
  const handleOpenAddCustomer = () => {
    setEditingCustomer(null);
    setShowCustomerModal(true);
  };

  const handleOpenEditCustomer = (cust: CustomerWithIdentity) => {
    setEditingCustomer(cust);
    setShowCustomerModal(true);
  };

  const handleSaveCustomer = (data: any) => {
    try {
      if (editingCustomer) {
        updateCustomer(editingCustomer.customer_id, data);
        addToast(`✓ Updated pilgrim profile for ${data.full_name}`);
      } else {
        createCustomer(data);
        addToast(`✓ Created new pilgrim profile for ${data.full_name}`);
      }
      reloadData();
      setShowCustomerModal(false);
    } catch (err: any) {
      addToast('Error saving customer: ' + err.message, 'error');
    }
  };

  // Registration Actions
  const handleOpenAddRegistration = (preselectedCust?: CustomerWithIdentity | null) => {
    handleOpenRegistrationWorkspace(null);
  };

  const handleCreateRegistration = (data: {
    customer_id: number;
    season_id: number;
    package_id: number;
    status: RegistrationStatus;
  }) => {
    try {
      const reg = createRegistration(data);
      reloadData();
      setShowRegistrationModal(false);
      addToast(`✓ Created registration ${reg.registration_number}`);
      setActiveTab('registrations');
    } catch (err: any) {
      addToast('Error creating registration: ' + err.message, 'error');
    }
  };

  const handleUpdateRegistrationStatus = (regId: number, status: RegistrationStatus) => {
    try {
      updateRegistrationStatus(regId, status);
      reloadData();
      addToast(`✓ Status updated to ${status}`);
    } catch (err: any) {
      addToast('Error updating status: ' + err.message, 'error');
    }
  };

  const handleQuickBackup = async () => {
    try {
      const b = await createBackup();
      addToast(`✓ Backup archive created: ${b.filename} (${(b.sizeBytes / 1024).toFixed(1)} KB)`);
    } catch (err: any) {
      addToast('Backup failed: ' + err.message, 'error');
    }
  };

  if (activeTab === 'registration-workspace') {
    return (
      <>
        <RegistrationWorkspace
          registrationId={workspaceRegId}
          onClose={() => {
            reloadData();
            setActiveTab('registrations');
          }}
          onSaved={(savedReg) => {
            reloadData();
            setWorkspaceRegId(savedReg.registration_id);
            addToast(`✓ Saved registration ${savedReg.registration_number}`);
          }}
        />
        <ToastNotification toasts={toasts} onDismiss={(id) => setToasts((prev) => prev.filter((t) => t.id !== id))} />
      </>
    );
  }

  return (
    <AppShell
      activeTab={activeTab as any}
      setActiveTab={setActiveTab as any}
      activeContextRegNumber={activeRegNumber}
      onOpenNewCustomer={handleOpenAddCustomer}
      onOpenNewRegistration={() => handleOpenAddRegistration(null)}
      onQuickBackup={handleQuickBackup}
      onToggleGuide={handleToggleGuide}
      showGuide={showGuide}
      onWipeDatabase={handleWipeDatabase}
    >
      {activeTab === 'home' && (
        <ExecutiveDashboardHome
          customerCount={customers.length}
          registrationCount={registrations.length}
          recentRegistrations={registrations}
          onNavigateToTab={(tab) => setActiveTab(tab as any)}
          onOpenNewRegistration={() => handleOpenAddRegistration(null)}
          onOpenRegistrationWorkspace={(regId) => handleOpenRegistrationWorkspace(regId)}
        />
      )}

      {activeTab === 'customers' && (
        <CustomerList
          customers={customers}
          onAddCustomer={handleOpenAddCustomer}
          onEditCustomer={handleOpenEditCustomer}
          onCreateRegistrationForCustomer={(cust) => handleOpenAddRegistration(cust)}
        />
      )}

      {activeTab === 'registrations' && (
        <RegistrationList
          registrations={registrations}
          seasons={seasons}
          onOpenNewRegistration={() => handleOpenAddRegistration(null)}
          onOpenWorkspace={(regId) => handleOpenRegistrationWorkspace(regId)}
          onUpdateStatus={handleUpdateRegistrationStatus}
          onRefreshRegistrations={reloadData}
        />
      )}

      {activeTab === 'operations' && (
        <TravelOperationsView
          registrations={registrations}
          activeRegistrationId={workspaceRegId}
          onRefreshRegistrations={reloadData}
        />
      )}

      {activeTab === 'documents' && <DocumentVaultView />}

      {activeTab === 'payments' && (
        <PaymentsDashboard
          registrations={registrations}
          seasons={seasons}
          onRefreshRegistrations={reloadData}
        />
      )}

      {activeTab === 'settings' && <SettingsScreen />}

      {/* Customer Create/Edit Modal */}
      <CustomerFormModal
        isOpen={showCustomerModal}
        onClose={() => setShowCustomerModal(false)}
        onSaveCustomer={handleSaveCustomer}
        editingCustomer={editingCustomer}
        onSelectExistingCustomer={(existingCust) => {
          handleOpenAddRegistration(existingCust);
        }}
      />

      {/* Registration Builder Modal */}
      <RegistrationFormModal
        isOpen={showRegistrationModal}
        onClose={() => setShowRegistrationModal(false)}
        customers={customers}
        seasons={seasons}
        preselectedCustomer={preselectedCustomerForReg}
        onSubmitRegistration={handleCreateRegistration}
        onOpenQuickAddCustomer={handleOpenAddCustomer}
        onRefreshSeasons={reloadData}
      />

      <ToastNotification toasts={toasts} onDismiss={(id) => setToasts((prev) => prev.filter((t) => t.id !== id))} />
    </AppShell>
  );
}

export default App;
