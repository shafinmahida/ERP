import React, { useState, useEffect } from 'react';
import { AppShell, ActiveTab } from './components/layout/AppShell';
import { CustomerList } from './components/customers/CustomerList';
import { CustomerFormModal } from './components/customers/CustomerFormModal';
import { RegistrationList } from './components/registrations/RegistrationList';
import { RegistrationFormModal } from './components/registrations/RegistrationFormModal';
import { DocumentVaultView } from './components/documents/DocumentVaultView';
import { SettingsScreen } from './components/settings/SettingsScreen';


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

export function App() {
  const [activeTab, setActiveTab] = useState<ActiveTab>('customers');

  const [customers, setCustomers] = useState<CustomerWithIdentity[]>([]);
  const [registrations, setRegistrations] = useState<RegistrationWithDetails[]>([]);
  const [seasons, setSeasons] = useState<SeasonWithDetails[]>([]);

  // Modals state
  const [showCustomerModal, setShowCustomerModal] = useState(false);
  const [editingCustomer, setEditingCustomer] = useState<CustomerWithIdentity | null>(null);

  const [showRegistrationModal, setShowRegistrationModal] = useState(false);
  const [preselectedCustomerForReg, setPreselectedCustomerForReg] = useState<CustomerWithIdentity | null>(null);

  const reloadData = () => {
    try {
      const custs = getAllCustomers();
      setCustomers(custs);

      const sList = getAllSeasons();
      setSeasons(sList);

      const regs = getAllRegistrations();
      setRegistrations(regs);
    } catch (e) {
      console.error('Failed to load database content:', e);
    }
  };

  useEffect(() => {
    runFullStartupDiagnostic();
    reloadData();
  }, []);


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
      } else {
        createCustomer(data);
      }
      reloadData();
      setShowCustomerModal(false);
    } catch (err: any) {
      alert('Error saving customer: ' + err.message);
    }
  };

  // Registration Actions
  const handleOpenAddRegistration = (preselectedCust?: CustomerWithIdentity | null) => {
    setPreselectedCustomerForReg(preselectedCust || null);
    setShowRegistrationModal(true);
  };

  const handleCreateRegistration = (data: {
    customer_id: number;
    season_id: number;
    package_id: number;
    status: RegistrationStatus;
  }) => {
    try {
      createRegistration(data);
      reloadData();
      setShowRegistrationModal(false);
      setActiveTab('registrations');
    } catch (err: any) {
      alert('Error creating registration: ' + err.message);
    }
  };

  const handleUpdateRegistrationStatus = (regId: number, status: RegistrationStatus) => {
    try {
      updateRegistrationStatus(regId, status);
      reloadData();
    } catch (err: any) {
      alert('Error updating status: ' + err.message);
    }
  };

  const handleQuickBackup = async () => {
    try {
      const b = await createBackup();
      alert(`Backup created successfully!\nFile: ${b.filename}\nSize: ${(b.sizeBytes / 1024).toFixed(1)} KB`);
    } catch (err: any) {
      alert('Backup failed: ' + err.message);
    }
  };

  return (
    <AppShell
      activeTab={activeTab}
      setActiveTab={setActiveTab}
      onOpenNewCustomer={handleOpenAddCustomer}
      onOpenNewRegistration={() => handleOpenAddRegistration(null)}
      onQuickBackup={handleQuickBackup}
    >
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
          onUpdateStatus={handleUpdateRegistrationStatus}
        />
      )}

      {activeTab === 'documents' && <DocumentVaultView />}

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
    </AppShell>
  );
}

export default App;
