import React, { Component, useState, useEffect } from 'react';
import { deleteField } from 'firebase/firestore';
import PublicSite from './components/PublicSite';
import InternalPortal from './components/InternalPortal';
import ClientPortal from './components/ClientPortal';
import LoginScreen from './components/LoginScreen';
import {
 Client, Instrument, CalibrationReport, ContactMessage } from './types';
import {
 RefreshCw, Database } from 'lucide-react';
import {

  syncCustomLogo,
  saveCustomLogoConfig,
  syncHeaderLogo,
  saveHeaderLogoConfig,
  syncSitePhotosConfig,
  saveSitePhotosConfig,
  syncClients,
  syncInstruments,
  syncReports,
  syncMessages,
  syncPortalUsers,
  addClientDoc,
  addClientsBulkDocs,
  deleteClientDoc,
  updateClientDoc,
  addInstrumentDoc,
  addInstrumentsBulkDocs,
  deleteInstrumentDoc,
  updateInstrumentDoc,
  saveCalibrationDoc,
  deleteReportDoc,
  addMessageDoc,
  updateMessageDoc,
  addPortalUserDoc,
  updatePortalUserDoc,
  deletePortalUserDoc,
  PortalUser
} from './lib/firebase';

export default function App() {
  const [viewMode, setViewMode] = useState<'public' | 'login' | 'portal' | 'client'>('public');
  const [loginTab, setLoginTab] = useState<'internal' | 'client'>('client');
  const [currentClient, setCurrentClient] = useState<Client | null>(null);

  // Firestore Real-time States
  const [clients, setClients] = useState<Client[]>([]);
  const [instruments, setInstruments] = useState<Instrument[]>([]);
  const [reports, setReports] = useState<CalibrationReport[]>([]);
  const [messages, setMessages] = useState<ContactMessage[]>([]);
  const [internalUsers, setInternalUsers] = useState<PortalUser[]>([]);

  const [currentInternalUser, setCurrentInternalUser] = useState<{
    name: string;
    username: string;
    role: string;
    register: string;
    permissionLevel?: string;
  } | null>(null);

  // Custom logo state for reports and certificates
  const [customLogo, setCustomLogo] = useState<string>('');
  const [headerLogo, setHeaderLogo] = useState<string>('');
  const [sitePhotos, setSitePhotos] = useState<any[]>(() => {
    const saved = localStorage.getItem('comanins_site_photos');
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed) && parsed.length > 0) return parsed;
      } catch (e) {}
    }
    return [];
  });

  const handleSaveCustomLogo = async (logoDataUrl: string) => {
    await saveCustomLogoConfig(logoDataUrl);
    await saveHeaderLogoConfig(logoDataUrl);
  };

  const activeLogo = headerLogo || customLogo;

  // Loading and Error boundaries
  const [isLoading, setIsLoading] = useState(true);
  const [quotaExceededNotice, setQuotaExceededNotice] = useState(false);

  useEffect(() => {
    const handleQuota = () => setQuotaExceededNotice(true);
    window.addEventListener('firestore-quota-exceeded', handleQuota);
    return () => window.removeEventListener('firestore-quota-exceeded', handleQuota);
  }, []);

  // Subscribe to real-time Firestore collections
  useEffect(() => {
    let unsubs: (() => void)[] = [];

    const initFirebaseSync = async () => {
      setIsLoading(true);
      try {
        const u1 = await syncClients(setClients);
        const u2 = await syncInstruments(setInstruments);
        const u3 = await syncReports(setReports);
        const u4 = await syncMessages(setMessages);
        const u5 = await syncPortalUsers((users) => {
          setInternalUsers(users);
        });

        const u6 = await syncCustomLogo(setCustomLogo);
        const u7 = await syncHeaderLogo(setHeaderLogo);
        const u8 = await syncSitePhotosConfig((photos) => {
          if (photos && photos.length > 0) {
            setSitePhotos(photos);
          }
        });
        unsubs = [u1, u2, u3, u4, u5, u6, u7, u8];
      } catch (err) {
        console.error('Error initializing Firestore sync:', err);

      } finally {
        setIsLoading(false);
      }
    };

    initFirebaseSync();

    return () => {
      unsubs.forEach(unsub => unsub && unsub());
    };
  }, []);

  // CLIENT CRUD ACTIONS (Firestore)
  const handleAddClient = async (newClientData: Omit<Client, 'id'>) => {
    try {
      const saved = await addClientDoc(newClientData);
      setClients(prev => [saved, ...prev.filter(c => c.id !== saved.id)]);
      return saved;
    } catch (err: any) {
      console.error('Error adding client to Firestore:', err);

      alert('Erro no Firestore: ' + (err.message || err.toString()));
      throw err;

    }
  };

  const handleAddClientsBulk = async (list: Omit<Client, 'id'>[]) => {
    try {
      const added = await addClientsBulkDocs(list);
      setClients(prev => [...added, ...prev]);
      return added;
    } catch (err) {
      console.error('Error bulk adding clients to Firestore:', err);

      return [];
    }
  };

  const handleDeleteClient = async (id: string) => {
    try {
      setClients(prev => prev.filter(c => c.id !== id));
      await deleteClientDoc(id);
    } catch (err) {
      console.error('Error deleting client from Firestore:', err);

    }
  };

  const handleUpdateClient = async (updatedClient: Client) => {
    try {
      setClients(prev => prev.map(c => c.id === updatedClient.id ? updatedClient : c));
      await updateClientDoc(updatedClient);
    } catch (err) {
      console.error('Error updating client in Firestore:', err);
    }
  };

  // INSTRUMENT CRUD ACTIONS (Firestore)
  const handleAddInstrument = async (newInstData: Omit<Instrument, 'id' | 'status' | 'lastCalibrationDate' | 'nextCalibrationDate'>) => {
    try {
      const saved = await addInstrumentDoc(newInstData);
      setInstruments(prev => [saved, ...prev.filter(i => i.id !== saved.id)]);
      return saved;
    } catch (err) {
      console.error('Error adding instrument to Firestore:', err);
      throw err;

    }
  };

  const handleAddInstrumentsBulk = async (list: Omit<Instrument, 'id' | 'status' | 'lastCalibrationDate' | 'nextCalibrationDate'>[]) => {
    try {
      const added = await addInstrumentsBulkDocs(list);
      setInstruments(prev => [...added, ...prev]);
      return added;
    } catch (err) {
      console.error('Error bulk adding instruments to Firestore:', err);

      return [];
    }
  };

  const handleDeleteInstrument = async (id: string) => {
    try {
      setInstruments(prev => prev.filter(i => i.id !== id));
      await deleteInstrumentDoc(id);
    } catch (err) {
      console.error('Error deleting instrument from Firestore:', err);

    }
  };

  const handleUpdateInstrumentStatus = async (id: string, status: Instrument['status']) => {
    try {
      setInstruments(prev => prev.map(i => i.id === id ? { ...i, status } : i));
      await updateInstrumentDoc(id, { status });
    } catch (err) {
      console.error('Error updating instrument status in Firestore:', err);

    }
  };

  // CALIBRATION BENCH SUBMIT ACTION (Firestore)
  const handleSaveCalibration = async (sessionData: any) => {
    try {
      const activeInst = instruments.find(item => item.id === sessionData.instrumentId);
      if (!activeInst) return;
      await saveCalibrationDoc(sessionData, activeInst);
    } catch (err) {
      console.error('Error saving calibration to Firestore:', err);

    }
  };

  const handleDeleteReport = async (reportId: string) => {
    try {
      setReports(prev => prev.filter(r => r.id !== reportId));
      await deleteReportDoc(reportId);
    } catch (err) {
      console.error('Error deleting calibration report from Firestore:', err);

    }
  };

  // INBOX LEADS ACTIONS (Firestore)
  const handleUpdateMessageStatus = async (id: string, status: ContactMessage['status']) => {
    try {
      await updateMessageDoc(id, status);
    } catch (err) {
      console.error('Error updating contact message in Firestore:', err);

    }
  };

  const handleSubmitContactFromPublic = async (contactData: Omit<ContactMessage, 'id' | 'date' | 'status'>): Promise<boolean> => {
    try {
      await addMessageDoc(contactData);
      return true;
    } catch (err) {
      console.error('Error submitting contact message to Firestore:', err);

      return false;
    }
  };

  // USER MANAGEMENT ACTIONS (Firestore)
  const handleAddInternalUser = async (newUser: { name: string; username: string; role: string; permissionLevel?: string; register: string; password?: string }) => {
    try {
      const email = `${newUser.username.toLowerCase()}@comanins.internal`;
      const tempPass = newUser.password || 'Mudar123456!';
      
      const res = await fetch('/api/auth/create-user', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password: tempPass })
      });
      const data = await res.json();
      
      if (!res.ok && !data.error?.includes('EMAIL_EXISTS')) {
        throw new Error(data.error || 'Erro ao criar conta no Firebase Auth');
      }

      const cleanUser = Object.entries(newUser).reduce((acc, [key, value]) => {
        if (value !== undefined) {
          acc[key] = value;
        }
        return acc;
      }, {} as any);
      
      cleanUser.passwordChangeRequired = true;
      delete cleanUser.password;

      await addPortalUserDoc(cleanUser);
    } catch (err: any) {
      console.error('Error adding internal user to Firestore:', err);
      alert('Erro ao cadastrar usuário: ' + err.message);
    }
  };

  const handleUpdateInternalUser = async (id: string, updates: Partial<PortalUser>) => {
    try {
      const cleanUpdates = Object.entries(updates).reduce((acc, [key, value]) => {
        if (value === null) {
          acc[key] = deleteField();
        } else if (value !== undefined) {
          acc[key] = value;
        }
        return acc;
      }, {} as any);
      await updatePortalUserDoc(id, cleanUpdates);
    } catch (err: any) {
      console.error('Error updating internal user in Firestore:', err);
      if (err.message && err.message.includes("exceeds the maximum allowed size")) {
         alert("⚠️ ERRO: ARMAZENAMENTO EXCEDIDO!\n\nAs alterações não foram salvas porque o tamanho total dos dados (incluindo imagens e PDFs anexados) ultrapassou o limite do banco de dados (1MB). Apague alguns anexos antes de salvar.");
      } else {
         alert("⚠️ Erro ao salvar alterações: " + err.message);
      }
    }
  };

  const handleDeleteInternalUser = async (username: string) => {
    try {
      const target = internalUsers.find(u => u.username === username);
      if (target) {
        await deletePortalUserDoc(target.id);
      }
    } catch (err) {
      console.error('Error deleting internal user from Firestore:', err);

    }
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-slate-900 text-slate-100 flex flex-col items-center justify-center font-sans">
        <div className="text-center space-y-4">
          <div className="relative inline-block">
            <RefreshCw className="h-12 w-12 text-teal-400 animate-spin mx-auto" />
            <Database className="h-5 w-5 text-amber-400 absolute inset-0 m-auto" />
          </div>
          <h2 className="text-xl font-display font-extrabold tracking-tight text-white">Carregando COMANINS Suite</h2>
          <p className="text-teal-400 text-xs font-mono uppercase tracking-wider flex items-center justify-center space-x-1.5">
            <span>Conectando ao banco de dados Firestore...</span>
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="relative min-h-screen bg-slate-950">
      {quotaExceededNotice && (
        <div className="bg-amber-500/90 text-slate-950 px-4 py-2.5 text-xs font-semibold flex items-center justify-between shadow-md z-50 sticky top-0 backdrop-blur-sm border-b border-amber-600/30">
          <div className="flex items-center space-x-2">
            <span className="bg-amber-950 text-amber-200 text-[10px] font-mono px-2 py-0.5 rounded font-bold uppercase tracking-wider">Quota Firestore Excedida</span>
            <span>Os dados do banco <strong>não foram apagados</strong>! A cota diária de leitura do Firebase foi atingida. Exibindo cópia local offline.</span>
          </div>
          <button 
            onClick={() => setQuotaExceededNotice(false)}
            className="ml-4 bg-amber-950/20 hover:bg-amber-950/40 text-slate-950 px-2 py-0.5 rounded text-[11px] font-bold cursor-pointer transition-colors"
          >
            Fechar ✕
          </button>
        </div>
      )}
      {/* Switching Views */}
      <div className="transition-all duration-300">
        {viewMode === 'public' ? (
          <PublicSite
            customLogo={activeLogo}
            sitePhotos={sitePhotos}
            onNavigateToPortal={(tab) => {
              setLoginTab(tab || 'client');
              setViewMode('login');
            }}
            onSubmitContact={handleSubmitContactFromPublic}
          />
        ) : viewMode === 'login' ? (
          <LoginScreen
            customLogo={activeLogo}
            clients={clients}
            initialTab={loginTab}
            internalUsers={internalUsers}
            onUpdateInternalUser={handleUpdateInternalUser}
            onLoginSuccessInternal={(user) => {
              setCurrentInternalUser(user);
              setViewMode('portal');
            }}
            onLoginSuccessClient={(client) => {
              setCurrentClient(client);
              setViewMode('client');
            }}
            onBack={() => setViewMode('public')}
          />
        ) : viewMode === 'client' && currentClient ? (
          <ClientPortal
            client={currentClient}
            instruments={instruments}
            reports={reports}
            customLogo={activeLogo}
            onLogout={() => {
              setCurrentClient(null);
              setViewMode('public');
            }}
          />
        ) : (
          <InternalPortal
            onBackToSite={() => setViewMode('public')}
            currentUser={currentInternalUser}
            internalUsers={internalUsers}
            onAddInternalUser={handleAddInternalUser}
            onUpdateInternalUser={handleUpdateInternalUser}
            onDeleteInternalUser={handleDeleteInternalUser}
            onLogout={() => {
              setCurrentInternalUser(null);
              setViewMode('public');
            }}
            clients={clients}
            instruments={instruments}
            reports={reports}
            messages={messages}
            customLogo={activeLogo}
            onSaveCustomLogo={handleSaveCustomLogo}
            onAddClient={handleAddClient}
            onUpdateClient={handleUpdateClient}
            onAddClientsBulk={handleAddClientsBulk}
            onAddInstrument={handleAddInstrument}
            onAddInstrumentsBulk={handleAddInstrumentsBulk}
            onDeleteClient={handleDeleteClient}
            onDeleteInstrument={handleDeleteInstrument}
            onUpdateInstrumentStatus={handleUpdateInstrumentStatus}
            onSaveCalibration={handleSaveCalibration}
            onDeleteReport={handleDeleteReport}
            onUpdateMessageStatus={handleUpdateMessageStatus}
          />
        )}
      </div>
    </div>
  );
}
