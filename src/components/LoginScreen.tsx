import React, { useState, useEffect } from 'react';
import ComaninsLogo from './ComaninsLogo';
import { ShieldCheck, Building, Key, AlertCircle, ArrowLeft, Eye, EyeOff, Gauge } from 'lucide-react';
import { Client } from '../types';
import { auth } from '../lib/firebase';
import { signInWithEmailAndPassword, sendPasswordResetEmail, createUserWithEmailAndPassword, updatePassword, getIdToken } from 'firebase/auth';
import { doc, updateDoc } from 'firebase/firestore';
import { db } from '../lib/firebase';
import { maskCpfCnpj } from '../utils/masks';
import { authJsonFetch } from '../utils/authApi';

export interface InternalUser {
  id?: string;
  name: string;
  username: string;
  role: string;
  register: string;
  password?: string;
  mustChangePassword?: boolean;
  passwordChangeRequired?: boolean;
  authUid?: string;
  authEmail?: string;
  permissionLevel?: string;
  signaturePath?: string;
  signatureVersion?: number;
  signatureDate?: string;
}

interface LoginScreenProps {
  clients: Client[];
  initialTab: 'internal' | 'client';
  onLoginSuccessInternal: (user: InternalUser) => void;
  onLoginSuccessClient: (client: Client) => void;
  onBack: () => void;
  internalUsers: InternalUser[];
  onUpdateInternalUser?: (id: string, updates: any) => Promise<void> | void;
  customLogo?: string;
}

export default function LoginScreen({ 
  clients, 
  initialTab, 
  onLoginSuccessInternal, 
  onLoginSuccessClient, 
  onBack,
  internalUsers,
  onUpdateInternalUser,
  customLogo
}: LoginScreenProps) {
  const [activeTab, setActiveTab] = useState<'internal' | 'client'>(initialTab);
  
  // Form states
  const [username, setUsername] = useState('');
  const [internalPassword, setInternalPassword] = useState('');
  const [cnpj, setCnpj] = useState('');
  const [clientPassword, setClientPassword] = useState('');
  
  // UI states
  const [showPassword, setShowPassword] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');
  const [showForgotPassword, setShowForgotPassword] = useState(false);
  const [resetEmail, setResetEmail] = useState('');
  const [resetSuccess, setResetSuccess] = useState(false);

  // Password Change on First Access states
  const [pendingChangeUser, setPendingChangeUser] = useState<InternalUser | null>(null);
  const [passwordChangeRequired, setPasswordChangeRequired] = useState(false);
  const [pendingUserEmail, setPendingUserEmail] = useState('');
  const [legacyAuthSuccess, setLegacyAuthSuccess] = useState(false);
  const [activeTabType, setActiveTabType] = useState<'internal'|'client'>('internal');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showNewPass, setShowNewPass] = useState(false);
  const [showConfirmPass, setShowConfirmPass] = useState(false);
  const [passChangeError, setPassChangeError] = useState('');
  const [isSavingPass, setIsSavingPass] = useState(false);

  // Reset errors on tab change
  useEffect(() => {
    setActiveTab(initialTab);
    setErrorMsg('');
    setUsername('');
    setInternalPassword('');
    setCnpj('');
    setClientPassword('');
    setPendingChangeUser(null);
  }, [initialTab]);

  // Handle Internal login
  
  
  const handleForgotPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg('');
    setResetSuccess(false);
    
    if (!resetEmail) {
      setErrorMsg('Por favor, informe seu e-mail para recuperação.');
      return;
    }
    
    try {
      await sendPasswordResetEmail(auth, resetEmail);
      setResetSuccess(true);
    } catch (err: any) {
      console.error(err);
      if (err.code === 'auth/user-not-found') {
         setResetSuccess(true);
      } else if (err.code === 'auth/invalid-email') {
         setErrorMsg('E-mail inválido.');
      } else {
         setErrorMsg('Erro ao tentar redefinir a senha. Verifique o e-mail ou contate o suporte.');
      }
    }
  };

  const handleInternalSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg('');
    const cleanUser = username.trim().toLowerCase();
    const cleanPass = internalPassword.trim();
    
    const email = `${cleanUser}@comanins.internal`;

    try {
      const userCredential = await signInWithEmailAndPassword(auth, email, cleanPass);

      const syncResponse = await authJsonFetch('/api/auth/sync-internal-profile', {
        method: 'POST',
      });
      const syncData = await syncResponse.json();

      if (!syncResponse.ok || !syncData?.user) {
        if (syncResponse.status === 409) {
          setErrorMsg('Esta conta Firebase está vinculada a outro cadastro. Contate o administrador.');
        } else if (syncResponse.status === 404) {
          setErrorMsg('Usuário autenticado, mas cadastro não encontrado em portalUsers.');
        } else {
          setErrorMsg('Não foi possível sincronizar o cadastro interno. Contate o administrador.');
        }
        await auth.signOut();
        return;
      }

      const userDoc = syncData.user as InternalUser;
      await userCredential.user.getIdToken(true);
      const tokenResult = await userCredential.user.getIdTokenResult(true);
      const needsChange = tokenResult.claims.passwordChangeRequired === true || 
                          userDoc?.passwordChangeRequired === true || 
                          String(userDoc?.passwordChangeRequired) === "true" || 
                          userDoc?.mustChangePassword === true || 
                          String(userDoc?.mustChangePassword) === "true" || 
                          (userDoc && userDoc.passwordChangeRequired !== false);
      
      if (needsChange) {
        setPendingChangeUser(userDoc);
        setPasswordChangeRequired(true);
        setPendingUserEmail(email);
        setActiveTabType('internal');
        return;
      }

      if (userDoc) {
        onLoginSuccessInternal(userDoc);
      } else {
        setErrorMsg('Usuário autenticado, mas cadastro não encontrado no banco de dados (portalUsers). Contate o administrador para vincular a conta.');
        return;
      }
    } catch (err: any) {
      if (err.code === 'auth/user-not-found' || err.code === 'auth/invalid-credential') {
        try {
          const res = await fetch('/api/auth/legacy-login', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ username: cleanUser, password: cleanPass, type: 'internal' })
          });
          
          if (!res.ok) {
            setErrorMsg('Não foi possível conectar ao servidor para validar a credencial antiga. Tente novamente ou contate o administrador.');
            return;
          }
          
          const data = await res.json();
          if (res.ok && data.valid) {
            let userDoc = data.user;
            if (userDoc) {
              setPendingChangeUser(userDoc);
              setPasswordChangeRequired(true);
              setPendingUserEmail(email);
              setLegacyAuthSuccess(true);
              setActiveTabType('internal');
            } else {
              setErrorMsg('Usuário não encontrado na base.');
            }
          } else if (res.ok && !data.valid) {
            setErrorMsg('Usuário ou senha interna incorretos. Por favor, verifique suas credenciais.');
          } else {
            setErrorMsg('Não foi possível validar sua conta antiga para migração. Tente novamente ou contate o administrador.');
          }
        } catch (serverErr) {
          setErrorMsg('Erro ao conectar ao servidor para validação de legado.');
        }
      } else {
        setErrorMsg('Erro de autenticação: ' + err.message);
      }
    }
  };

  const handleClientSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg('');
    const cleanCnpj = cnpj.replace(/\D/g, '');
    const cleanPass = clientPassword.trim();
    
    const email = `${cleanCnpj}@comanins.client`;

    try {
      const userCredential = await signInWithEmailAndPassword(auth, email, cleanPass);
      let clientDoc = clients.find(c => c.cnpj?.replace(/\D/g, '') === cleanCnpj);
      if (!clientDoc) {
        // Fallback to fetch from DB just in case cache is empty

      }
      
      const tokenResult = await userCredential.user.getIdTokenResult();
      const needsChange = tokenResult.claims.passwordChangeRequired === true || clientDoc?.passwordChangeRequired === true || (clientDoc && clientDoc.passwordChangeRequired !== false);
      
      if (needsChange) {
        setPendingChangeUser(clientDoc as any);
        setPasswordChangeRequired(true);
        setPendingUserEmail(email);
        setActiveTabType('client');
        return;
      }

      onLoginSuccessClient(clientDoc);
    } catch (err: any) {
      if (err.code === 'auth/user-not-found' || err.code === 'auth/invalid-credential') {
        try {
          const res = await fetch('/api/auth/legacy-login', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ cnpj: cleanCnpj, password: cleanPass, type: 'client' })
          });
          
          if (!res.ok) {
            setErrorMsg('Não foi possível conectar ao servidor para validar a credencial antiga. Tente novamente ou contate o administrador.');
            return;
          }
          
          const data = await res.json();
          if (res.ok && data.valid) {
            let clientDoc = data.user;
            if (clientDoc) {
              setPendingChangeUser(clientDoc as any);
              setPasswordChangeRequired(true);
              setPendingUserEmail(email);
              setLegacyAuthSuccess(true);
              setActiveTabType('client');
            } else {
              setErrorMsg('Cliente não encontrado na base.');
            }
          } else if (res.ok && !data.valid) {
            setErrorMsg('CNPJ ou senha incorretos.');
          } else {
            setErrorMsg('Não foi possível validar sua conta antiga para migração. Tente novamente ou contate o administrador.');
          }
        } catch (serverErr) {
          setErrorMsg('Erro ao conectar ao servidor.');
        }
      } else {
        setErrorMsg('Erro de autenticação: ' + err.message);
      }
    }
  };

  const handleSaveNewPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setPassChangeError('');

    if (newPassword !== confirmPassword) {
      setPassChangeError('As senhas não coincidem. Digite novamente.');
      return;
    }

    if (newPassword.length < 10) {
      setPassChangeError('A nova senha deve ter no mínimo 10 caracteres.');
      return;
    }
    
    if (!/[A-Z]/.test(newPassword)) {
      setPassChangeError('A nova senha deve ter pelo menos uma letra maiúscula.');
      return;
    }
    if (!/[a-z]/.test(newPassword)) {
      setPassChangeError('A nova senha deve ter pelo menos uma letra minúscula.');
      return;
    }
    if (!/[0-9]/.test(newPassword)) {
      setPassChangeError('A nova senha deve ter pelo menos um número.');
      return;
    }
    if (!/[!@#$%^&*(),.?":{}|<>]/.test(newPassword)) {
      setPassChangeError('A nova senha deve ter pelo menos um caractere especial.');
      return;
    }

    const currentTypedPass = activeTabType === 'internal' ? internalPassword.trim() : clientPassword.trim();
    if (newPassword === currentTypedPass) {
      setPassChangeError('A nova senha não pode ser igual à senha atual.');
      return;
    }

    setIsSavingPass(true);
    try {
      if (legacyAuthSuccess) {
        await createUserWithEmailAndPassword(auth, pendingUserEmail, newPassword);
      } else {
        if (auth.currentUser) {
          await updatePassword(auth.currentUser, newPassword);
        } else {
           throw new Error("Usuário não está autenticado para trocar a senha.");
        }
      }
      
      if (activeTabType === 'internal' && onUpdateInternalUser && pendingChangeUser?.id) {
        await onUpdateInternalUser(pendingChangeUser.id, { passwordChangeRequired: false, mustChangePassword: false });

        const syncResponse = await authJsonFetch('/api/auth/sync-internal-profile', {
          method: 'POST',
        });
        const syncData = await syncResponse.json();
        if (!syncResponse.ok || !syncData?.user) {
          throw new Error('Senha atualizada, mas não foi possível sincronizar o perfil de segurança.');
        }

        if (auth.currentUser) {
          await auth.currentUser.getIdToken(true);
        }
        onLoginSuccessInternal(syncData.user as InternalUser);
      } else if (activeTabType === 'client' && pendingChangeUser?.id) {
        await updateDoc(doc(db, 'clients', pendingChangeUser.id), { passwordChangeRequired: false, mustChangePassword: false });
        if (auth.currentUser) {
          await auth.currentUser.getIdToken(true);
        }
        onLoginSuccessClient(pendingChangeUser as unknown as Client);
      }

    } catch (err: any) {
      if (err.code === 'auth/email-already-in-use') {
         setPassChangeError('Esta conta já foi migrada. Por favor, faça login usando sua NOVA senha.');
      } else {
         setPassChangeError('Erro ao atualizar senha no Firebase: ' + err.message);
      }
    } finally {
      setIsSavingPass(false);
    }
  };

  if (pendingChangeUser && passwordChangeRequired) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-royal-blue to-royal-dark flex flex-col justify-center items-center px-4 relative overflow-hidden font-sans py-12">
        <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-white/5 rounded-full blur-3xl pointer-events-none"></div>
        <div className="absolute bottom-1/4 right-1/4 w-96 h-96 bg-royal-light/10 rounded-full blur-3xl pointer-events-none"></div>

        <div className="w-full max-w-md bg-white rounded-3xl border border-slate-100 shadow-2xl p-8 space-y-6 relative z-10">
          <div className="text-center flex flex-col items-center space-y-2">
            <ComaninsLogo size={200} src={customLogo} className="mb-1 max-h-20" />
            <div className="py-1.5 px-3 bg-amber-50 text-amber-700 rounded-2xl border border-amber-200/80 inline-flex items-center space-x-2">
              <Key className="h-4 w-4 text-amber-600" />
              <span className="text-[11px] font-bold font-mono uppercase tracking-wider">Atualização de Segurança</span>
            </div>
          </div>

          <div className="bg-slate-50 border border-slate-200/80 rounded-2xl p-4 text-xs space-y-1.5 text-slate-700">
            <p className="font-bold text-slate-900 text-sm">Olá, {pendingChangeUser.name}!</p>
            <p className="text-slate-600 leading-relaxed">
              Identificamos que este é o seu primeiro acesso após a atualização do portal COMANINS. Como medida de segurança, por favor cadastre uma nova <strong>senha pessoal</strong> (com no mínimo 10 caracteres contendo: letra maiúscula, letra minúscula, número e caractere especial).
            </p>
          </div>

          {passChangeError && (
            <div className="bg-rose-50 border border-rose-200 text-rose-600 p-3.5 rounded-xl flex items-start space-x-2 text-xs">
              <AlertCircle className="h-4 w-4 shrink-0 mt-0.5" />
              <p className="leading-relaxed">{passChangeError}</p>
            </div>
          )}

          <form onSubmit={handleSaveNewPassword} className="space-y-4">
            <div className="space-y-1.5">
              <label className="text-[10px] uppercase font-mono font-bold text-slate-600 block tracking-wider">Nova Senha Pessoal</label>
              <div className="relative">
                <input
                  type={showNewPass ? 'text' : 'password'}
                  required
                  minLength={6}
                  placeholder="Mínimo 6 caracteres"
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl pl-4 pr-10 py-3 text-slate-800 text-xs focus:outline-none focus:ring-2 focus:ring-royal-blue font-mono"
                />
                <button
                  type="button"
                  onClick={() => setShowNewPass(!showNewPass)}
                  className="absolute inset-y-0 right-0 pr-3.5 flex items-center text-slate-400 hover:text-slate-600 cursor-pointer"
                >
                  {showNewPass ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              </div>
            </div>

            <div className="space-y-1.5">
              <label className="text-[10px] uppercase font-mono font-bold text-slate-600 block tracking-wider">Confirmar Nova Senha</label>
              <div className="relative">
                <input
                  type={showConfirmPass ? 'text' : 'password'}
                  required
                  minLength={6}
                  placeholder="Repita a nova senha"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl pl-4 pr-10 py-3 text-slate-800 text-xs focus:outline-none focus:ring-2 focus:ring-royal-blue font-mono"
                />
                <button
                  type="button"
                  onClick={() => setShowConfirmPass(!showConfirmPass)}
                  className="absolute inset-y-0 right-0 pr-3.5 flex items-center text-slate-400 hover:text-slate-600 cursor-pointer"
                >
                  {showConfirmPass ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              </div>
            </div>

            <div className="text-[11px] text-slate-500 bg-blue-50/50 p-2.5 rounded-lg border border-blue-100 flex items-center space-x-2">
              <ShieldCheck className="h-4 w-4 text-blue-600 shrink-0" />
              <span>A senha deve possuir pelo menos 6 caracteres e ser diferente de senhas genéricas.</span>
            </div>

            <div className="pt-2 flex flex-col space-y-2">
              <button
                type="submit"
                disabled={isSavingPass}
                className="w-full py-3 bg-emerald-600 hover:bg-emerald-700 active:bg-emerald-800 text-white font-bold text-xs rounded-xl uppercase tracking-wider transition-colors shadow-lg shadow-emerald-600/20 flex items-center justify-center space-x-2 disabled:opacity-50 cursor-pointer"
              >
                <Key className="h-4 w-4" />
                <span>{isSavingPass ? 'Salvando...' : 'Salvar Nova Senha e Acessar Portal'}</span>
              </button>

              <button
                type="button"
                onClick={() => setPendingChangeUser(null)}
                className="w-full py-2.5 text-slate-500 hover:text-slate-700 text-xs font-semibold text-center transition-colors cursor-pointer"
              >
                Voltar
              </button>
            </div>
          </form>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-royal-blue to-royal-dark flex flex-col justify-center items-center px-4 relative overflow-hidden font-sans py-12">
      {/* Background decorations */}
      <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-white/5 rounded-full blur-3xl pointer-events-none"></div>
      <div className="absolute bottom-1/4 right-1/4 w-96 h-96 bg-royal-light/10 rounded-full blur-3xl pointer-events-none"></div>

      {/* Top Header / Navigation Bar with "Voltar ao site" button */}
      <div className="w-full max-w-md mb-4 flex items-center justify-between relative z-10">
        <button
          onClick={onBack}
          type="button"
          className="inline-flex items-center space-x-2 text-white/90 hover:text-white bg-white/10 hover:bg-white/20 px-4 py-2.5 rounded-xl text-xs font-bold transition-all backdrop-blur-md border border-white/20 shadow-sm group cursor-pointer"
        >
          <ArrowLeft className="h-4 w-4 transition-transform group-hover:-translate-x-1" />
          <span>Voltar ao Site Institucional</span>
        </button>
      </div>

      {/* Main Login Card */}
      <div className="w-full max-w-md bg-white rounded-3xl border border-slate-100 shadow-2xl p-8 space-y-6 relative z-10">
        
        {/* Brand / Logo */}
        <div className="text-center flex flex-col items-center space-y-1">
          <ComaninsLogo size={220} src={customLogo} className="mb-2 max-h-24" />
          <p className="text-xs text-slate-500">Entre na sua conta para acessar os serviços metrológicos.</p>
        </div>

        {/* Portal Type Indicator Header */}
        <div className="flex items-center justify-center space-x-2.5 py-3 px-4 bg-blue-50/80 border border-blue-100 rounded-2xl text-center">
          {activeTab === 'client' ? (
            <>
              <Building className="h-4 w-4 text-royal-blue shrink-0" />
              <span className="text-xs font-bold uppercase tracking-wider text-royal-blue font-mono">
                Portal do Cliente
              </span>
            </>
          ) : (
            <>
              <ShieldCheck className="h-4 w-4 text-royal-blue shrink-0" />
              <span className="text-xs font-bold uppercase tracking-wider text-royal-blue font-mono">
                Acesso Restrito - Equipe Técnica
              </span>
            </>
          )}
        </div>

        {/* Error message */}
        {errorMsg && (
          <div className="bg-rose-50 border border-rose-200 text-rose-600 p-3 rounded-lg flex items-start space-x-2 text-xs">
            <AlertCircle className="h-4 w-4 shrink-0 mt-0.5" />
            <p className="leading-relaxed">{errorMsg}</p>
          </div>
        )}

        
        {showForgotPassword && (
          <form onSubmit={handleForgotPassword} className="space-y-4">
            <h3 className="text-sm font-bold text-slate-800 text-center mb-2">Recuperação de Senha</h3>
            <p className="text-xs text-slate-600 text-center mb-4">
              Digite seu e-mail cadastrado. Se ele existir em nossa base, enviaremos um link para redefinir a senha.
            </p>
            {resetSuccess ? (
               <div className="bg-green-50 border border-green-200 text-green-700 p-3 rounded-lg text-xs text-center">
                 E-mail de recuperação enviado! Verifique sua caixa de entrada (e pasta de spam).
               </div>
            ) : (
               <div className="space-y-1.5">
                 <label className="text-[10px] uppercase font-mono font-bold text-slate-600 block tracking-wider">Seu E-mail</label>
                 <input 
                   type="email"
                   required
                   value={resetEmail}
                   onChange={(e) => setResetEmail(e.target.value)}
                   className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 text-slate-800 text-xs focus:outline-none focus:ring-1 focus:ring-royal-blue"
                   placeholder="Ex: seu.email@empresa.com"
                 />
               </div>
            )}
            {!resetSuccess && (
               <button 
                 type="submit"
                 className="w-full py-3 bg-royal-blue hover:bg-royal-light text-white font-bold text-xs rounded-xl uppercase tracking-wider transition-colors shadow-lg mt-2"
               >
                 Enviar Link de Recuperação
               </button>
            )}
            <button 
              type="button"
              onClick={() => { setShowForgotPassword(false); setResetSuccess(false); setErrorMsg(''); }}
              className="w-full py-3 bg-white text-slate-600 font-bold text-xs rounded-xl uppercase tracking-wider transition-colors border border-slate-200 mt-2 hover:bg-slate-50"
            >
              Voltar ao Login
            </button>
          </form>
        )}

        {/* CLIENT LOGIN FORM */}
        {activeTab === 'client' && !showForgotPassword && (
          <form onSubmit={handleClientSubmit} className="space-y-4">
            <div className="space-y-1.5">
              <label className="text-[10px] uppercase font-mono font-bold text-slate-600 block tracking-wider">CNPJ da Empresa</label>
              <input 
                type="text"
                required
                placeholder="Ex: 33.000.167/0001-56"
                value={cnpj}
                onChange={(e) => setCnpj(maskCpfCnpj(e.target.value))}
                className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 text-slate-800 text-xs focus:outline-none focus:ring-1 focus:ring-royal-blue font-mono"
              />
            </div>

            <div className="space-y-1.5">
              <label className="text-[10px] uppercase font-mono font-bold text-slate-600 block tracking-wider">Senha do Portal</label>
              <div className="relative">
                <input 
                  type={showPassword ? 'text' : 'password'}
                  required
                  placeholder="Ex: ••••••"
                  value={clientPassword}
                  onChange={(e) => setClientPassword(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl pl-4 pr-10 py-3 text-slate-800 text-xs focus:outline-none focus:ring-1 focus:ring-royal-blue font-mono"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute inset-y-0 right-0 pr-3.5 flex items-center text-slate-400 hover:text-slate-600"
                >
                  {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              </div>
              <div className="flex justify-end mt-1">
                <button type="button" onClick={() => setShowForgotPassword(true)} className="text-[10px] text-royal-blue hover:underline font-semibold">Esqueceu a senha?</button>
              </div>
            </div>

            <button 
              type="submit"
              className="w-full py-3 bg-royal-blue hover:bg-royal-light active:bg-royal-dark text-white font-bold text-xs rounded-xl uppercase tracking-wider transition-colors shadow-lg shadow-blue-500/10 mt-2"
            >
              Acessar Certificados
            </button>
          </form>
        )}

        {/* INTERNAL LABORATORY LOGIN FORM */}
        {activeTab === 'internal' && !showForgotPassword && (
          <form onSubmit={handleInternalSubmit} className="space-y-4">
            <div className="space-y-1.5">
              <label className="text-[10px] uppercase font-mono font-bold text-slate-600 block tracking-wider">Usuário Técnico</label>
              <input 
                type="text"
                required
                placeholder="Ex: tecnico"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 text-slate-800 text-xs focus:outline-none focus:ring-1 focus:ring-royal-blue font-mono"
              />
            </div>

            <div className="space-y-1.5">
              <label className="text-[10px] uppercase font-mono font-bold text-slate-600 block tracking-wider">Senha Unica Interna</label>
              <div className="relative">
                <input 
                  type={showPassword ? 'text' : 'password'}
                  required
                  placeholder="Ex: ••••••"
                  value={internalPassword}
                  onChange={(e) => setInternalPassword(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl pl-4 pr-10 py-3 text-slate-800 text-xs focus:outline-none focus:ring-1 focus:ring-royal-blue font-mono"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute inset-y-0 right-0 pr-3.5 flex items-center text-slate-400 hover:text-slate-600"
                >
                  {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              </div>
              <div className="flex justify-end mt-1">
                <button type="button" onClick={() => setShowForgotPassword(true)} className="text-[10px] text-royal-blue hover:underline font-semibold">Esqueceu a senha?</button>
              </div>
            </div>

            <button 
              type="submit"
              className="w-full py-3 bg-royal-blue hover:bg-royal-light active:bg-royal-dark text-white font-bold text-xs rounded-xl uppercase tracking-wider transition-colors shadow-lg shadow-blue-500/10 mt-2"
            >
              Acessar Painel Metrológico
            </button>
          </form>
        )}

        {/* Back to site link inside card */}
        <div className="pt-3 text-center">
          <button
            type="button"
            onClick={onBack}
            className="inline-flex items-center space-x-1.5 text-xs text-slate-500 hover:text-royal-blue font-semibold transition-colors py-1 cursor-pointer"
          >
            <ArrowLeft className="h-3.5 w-3.5" />
            <span>Não possui login? Voltar para o site institucional</span>
          </button>
        </div>

        {/* LGPD Disclaimer */}
        <div className="pt-2 text-[10px] text-slate-400 text-center leading-normal border-t border-slate-100/50">
          Seus dados de autenticação corporativa estão sob proteção integral de criptografia e conformidade da <strong>LGPD</strong>.
        </div>

      </div>
    </div>
  );
}
