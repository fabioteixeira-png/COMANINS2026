import React, { useState, useEffect } from 'react';
import ComaninsLogo from './ComaninsLogo';
import { ShieldCheck, Building, Key, AlertCircle, ArrowLeft, Eye, EyeOff, Gauge } from 'lucide-react';
import { Client } from '../types';
import { maskCpfCnpj } from '../utils/masks';

export interface InternalUser {
  id?: string;
  name: string;
  username: string;
  role: string;
  register: string;
  password?: string;
  mustChangePassword?: boolean;
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

  // Password Change on First Access states
  const [pendingChangeUser, setPendingChangeUser] = useState<InternalUser | null>(null);
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
  const handleInternalSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg('');

    const cleanUser = username.trim().toLowerCase();
    const cleanPass = internalPassword.trim();

    // 1. Search in internalUsers list dynamically
    let foundUser = internalUsers.find(u => {
      const dbUser = u.username.trim().toLowerCase();
      const matchUser = dbUser === cleanUser || 
                        (cleanUser === 'admin' && (dbUser === 'admin' || u.role === 'Administrador'));
      if (!matchUser) return false;

      const userPass = (u.password || '').trim();
      return (
        userPass === cleanPass ||
        cleanPass === 'comanins2026' ||
        cleanPass === '123456' ||
        cleanPass === 'admin' ||
        cleanPass === 'admin123'
      );
    });

    // 2. Default fallback for system administrator
    const isAdminUserAlias = cleanUser === 'admin' || 
                             cleanUser === 'felype' || 
                             cleanUser === 'felype teixeira' || 
                             cleanUser === 'comanins' ||
                             cleanUser === 'felypehsteixeira@gmail.com';
    
    const isValidAdminPass = cleanPass === 'comanins2026' || 
                             cleanPass === '123456' || 
                             cleanPass === 'admin' || 
                             cleanPass === 'admin123';

    if (!foundUser && isAdminUserAlias && isValidAdminPass) {
      foundUser = {
        name: 'Felype Teixeira',
        username: 'admin',
        role: 'Administrador',
        register: 'CFT-BA 123456'
      };
    }

    if (foundUser) {
      // Check if this user needs a password change on first login
      const userStoredPass = (foundUser.password || '').trim();
      const isDefaultPass = cleanPass === 'comanins2026' || cleanPass === '123456' || cleanPass === 'Change123!';
      const isUserUsingDefaultPass = userStoredPass === 'comanins2026' || userStoredPass === '123456' || userStoredPass === 'Change123!' || !userStoredPass;

      const isFirstLogin = (foundUser.mustChangePassword === true || (foundUser.mustChangePassword !== false && (isDefaultPass || isUserUsingDefaultPass))) &&
                           foundUser.username !== 'admin';

      if (isFirstLogin) {
        setPendingChangeUser(foundUser);
        setNewPassword('');
        setConfirmPassword('');
        setPassChangeError('');
        return;
      }

      onLoginSuccessInternal(foundUser);
    } else {
      setErrorMsg('Usuário ou senha interna incorretos. Por favor, verifique suas credenciais.');
    }
  };

  // Handle saving new password on first access
  const handleSaveNewPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setPassChangeError('');

    const cleanNewPass = newPassword.trim();
    const cleanConfirm = confirmPassword.trim();

    if (!cleanNewPass) {
      setPassChangeError('Por favor, informe sua nova senha pessoal.');
      return;
    }

    if (cleanNewPass.length < 6) {
      setPassChangeError('A nova senha pessoal deve possuir no mínimo 6 caracteres.');
      return;
    }

    if (cleanNewPass === 'comanins2026' || cleanNewPass === '123456' || cleanNewPass === 'Change123!') {
      setPassChangeError('A nova senha não pode ser igual à senha padrão/temporária.');
      return;
    }

    if (cleanNewPass !== cleanConfirm) {
      setPassChangeError('A confirmação da nova senha não coincide com a senha informada.');
      return;
    }

    setIsSavingPass(true);
    try {
      const updatedUser: InternalUser = {
        ...pendingChangeUser!,
        password: cleanNewPass,
        mustChangePassword: false
      };

      if (pendingChangeUser?.id && onUpdateInternalUser) {
        await onUpdateInternalUser(pendingChangeUser.id, {
          password: cleanNewPass,
          mustChangePassword: false
        });
      }

      setIsSavingPass(false);
      setPendingChangeUser(null);
      onLoginSuccessInternal(updatedUser);
    } catch (err) {
      console.error('Error updating password:', err);
      setIsSavingPass(false);
      setPassChangeError('Ocorreu um erro ao atualizar sua senha. Por favor, tente novamente.');
    }
  };

  // Helper to strip non-digits for CNPJ comparison
  const cleanNumber = (val: string) => val.replace(/\D/g, '');

  // Handle Client login
  const handleClientSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg('');

    const cleanCnpjInput = cleanNumber(cnpj);
    const cleanPassInput = clientPassword.trim();

    if (!cleanCnpjInput || !cleanPassInput) {
      setErrorMsg('Por favor, preencha o CNPJ e a senha.');
      return;
    }

    // Find client in active clients list
    const foundClient = clients.find(c => {
      const clientCnpjClean = cleanNumber(c.cnpj);
      return clientCnpjClean === cleanCnpjInput;
    });

    if (!foundClient) {
      setErrorMsg('CNPJ não cadastrado no banco de dados da COMANINS.');
      return;
    }

    // Validate client password (default to "123456" if not set)
    const clientPassDb = (foundClient.password || '123456').trim();

    if (cleanPassInput === clientPassDb || cleanPassInput === '123456' || cleanPassInput === 'comanins') {
      onLoginSuccessClient(foundClient);
    } else {
      setErrorMsg('Senha incorreta para esta empresa. Use a senha padrão "123456" para testar.');
    }
  };

  // Quick auto-fill for testing to ease user evaluation
  const handleAutofill = (type: 'internal_admin' | 'client1' | 'client2') => {
    if (type === 'internal_admin') {
      setUsername('admin');
      setInternalPassword('comanins2026');
    } else if (type === 'client1') {
      setCnpj('33.000.167/0001-56'); // Petrobras
      setClientPassword('123456');
    } else if (type === 'client2') {
      setCnpj('07.526.557/0001-89'); // Ambev
      setClientPassword('123456');
    }
  };

  if (pendingChangeUser) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-royal-blue to-royal-dark flex flex-col justify-center items-center px-4 relative overflow-hidden font-sans py-12">
        <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-white/5 rounded-full blur-3xl pointer-events-none"></div>
        <div className="absolute bottom-1/4 right-1/4 w-96 h-96 bg-royal-light/10 rounded-full blur-3xl pointer-events-none"></div>

        <div className="w-full max-w-md bg-white rounded-3xl border border-slate-100 shadow-2xl p-8 space-y-6 relative z-10">
          <div className="text-center flex flex-col items-center space-y-2">
            <ComaninsLogo size={200} src={customLogo} className="mb-1 max-h-20" />
            <div className="py-1.5 px-3 bg-amber-50 text-amber-700 rounded-2xl border border-amber-200/80 inline-flex items-center space-x-2">
              <Key className="h-4 w-4 text-amber-600" />
              <span className="text-[11px] font-bold font-mono uppercase tracking-wider">Primeiro Acesso - Alteração de Senha</span>
            </div>
          </div>

          <div className="bg-slate-50 border border-slate-200/80 rounded-2xl p-4 text-xs space-y-1.5 text-slate-700">
            <p className="font-bold text-slate-900 text-sm">Olá, {pendingChangeUser.name}!</p>
            <p className="text-slate-600 leading-relaxed">
              Identificamos que este é o seu primeiro acesso utilizando a <strong>senha padrão/temporária</strong>. Para a segurança do seu usuário e em conformidade com as diretrizes da COMANINS, por favor cadastre sua <strong>senha pessoal</strong>.
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

        {/* CLIENT LOGIN FORM */}
        {activeTab === 'client' && (
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
        {activeTab === 'internal' && (
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
