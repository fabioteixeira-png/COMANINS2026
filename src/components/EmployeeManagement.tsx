import React, { useState, useMemo } from 'react';
import { 
  Users, UserPlus, FileText, ShieldAlert, Lock, Calendar, Award, 
  Stethoscope, Phone, Mail, MapPin, Briefcase, CreditCard, HeartPulse, 
  Key, Printer, Search, Filter, Trash2, Edit, CheckCircle, AlertTriangle, 
  XCircle, Plus, Eye, Clock, ShieldCheck, FileSpreadsheet, Building,
  AlertCircle, ChevronRight, User, AlertOctagon, Check, Camera, Upload,
  Paperclip, Download, X, Image, Maximize, Minimize
} from 'lucide-react';
import { PortalUser, Dependent, AuditLogEntry, AsoContractItem, addEmployeeTrainingDoc,
  addEmployeeAsoDoc,
  deleteEmployeeAsoDoc, deleteEmployeeTrainingDoc, getEmployeeDocuments, addEmployeeDocument, deleteEmployeeDocument, EmployeeDocument } from '../lib/firebase';
import { maskCPF, maskPhone, maskCEP } from '../utils/masks';
import { compressImageToWebResolution } from '../lib/imageCompressor';

interface EmployeeManagementProps {
  currentUser: { name: string; username: string; role: string; register: string; permissionLevel?: string } | null;
  internalUsers: PortalUser[];
  employeeTrainings?: any[];
  employeeAsos?: any[];
  trainings?: any[];
  dropdownOptions?: any;
  onAddInternalUser: (user: Omit<PortalUser, 'id'>) => void;
  onUpdateInternalUser?: (id: string, updates: Partial<PortalUser>) => void;
  onDeleteInternalUser: (username: string) => void;
  requestAdminDelete?: (type: string, id: string, name: string) => void;
  onManagePayslips?: (user: PortalUser) => void;
  activeRhTab: 'cadastro' | 'alertas' | 'aniversarios' | 'treinamentos' | 'exames' | 'contra_cheques';
  setActiveRhTab: (tab: 'cadastro' | 'alertas' | 'aniversarios' | 'treinamentos' | 'exames' | 'contra_cheques') => void;
}

export default function EmployeeManagement({
  currentUser,
  internalUsers,
  employeeTrainings = [],
  employeeAsos = [],
  trainings = [],
  dropdownOptions,
  onAddInternalUser,
  onUpdateInternalUser,
  onDeleteInternalUser,
  requestAdminDelete,
  onManagePayslips,
  activeRhTab,
  setActiveRhTab
}: EmployeeManagementProps) {
  const isUserAdmin = currentUser?.permissionLevel === 'Administrador' || (!currentUser?.permissionLevel && (currentUser?.role === 'Administrador' || currentUser?.role === 'Admin' || currentUser?.role === 'admin' || currentUser?.role === 'master' || currentUser?.role === 'Diretor'));
  // Access control check for sensitive data (LGPD)
  const isAuthorizedRH = 
    currentUser?.role === 'Administrador' || 
    currentUser?.role === 'Recursos Humanos (RH)' || 
    currentUser?.role === 'Financeiro';

  // Search & Filter state
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('todos');
  const [departmentFilter, setDepartmentFilter] = useState<string>('todos');

  // Modal states
  const [showEditModal, setShowEditModal] = useState(false);
  const [isMaximized, setIsMaximized] = useState(false);
  const [showViewModal, setShowViewModal] = useState(false);
  const [selectedUser, setSelectedUser] = useState<PortalUser | null>(null);
  const [activeFormTab, setActiveFormTab] = useState<number>(1); // 1 to 7
  
  // Document attachment local state
  const [userDocuments, setUserDocuments] = useState<EmployeeDocument[]>([]);
  const [isLoadingDocs, setIsLoadingDocs] = useState(false);
  const [newDocName, setNewDocName] = useState('');
  const [newDocType, setNewDocType] = useState('RG / CPF');
  const [newDocFiles, setNewDocFiles] = useState<File[]>([]);

  // ASO per contract local state
  const [newAsoContractName, setNewAsoContractName] = useState('');
  const [newAsoUnitArea, setNewAsoUnitArea] = useState('');
  const [newAsoExamType, setNewAsoExamType] = useState('Periódico');
  const [newAsoExamDate, setNewAsoExamDate] = useState('');
  const [newAsoValidityDate, setNewAsoValidityDate] = useState('');
  const [newAsoStatus, setNewAsoStatus] = useState<'Apto' | 'Apto com Restrições' | 'Inapto' | 'Pendente'>('Apto');
  const [newAsoClinicDoctor, setNewAsoClinicDoctor] = useState('');
  const [newAsoNotes, setNewAsoNotes] = useState('');
  const [newAsoDocFile, setNewAsoDocFile] = useState<File | null>(null);

  // NR Training launch form state
  const [newNrTrainingId, setNewNrTrainingId] = useState('');
  const [newNrCustomName, setNewNrCustomName] = useState('');
  const [newNrCompletionDate, setNewNrCompletionDate] = useState('');
  const [newNrExpirationDate, setNewNrExpirationDate] = useState('');
  const [newNrStatus, setNewNrStatus] = useState<'Válido' | 'Agendado' | 'Pendente' | 'Vencido'>('Válido');
  const [newNrResult, setNewNrResult] = useState('Aprovado');
  const [newNrInstitution, setNewNrInstitution] = useState('COMANINS');
  const [newNrCertificateUrl, setNewNrCertificateUrl] = useState('');
  const [newNrCertificateFile, setNewNrCertificateFile] = useState<File | null>(null);
  const [isSavingNrTraining, setIsSavingNrTraining] = useState(false);

  const standardNrOptions = [
    'NR-06 (EPI)',
    'NR-10 (Seg. em Eletricidade)',
    'NR-10 SEP (Sistema Elétrico de Potência)',
    'NR-12 (Máquinas e Equipamentos)',
    'NR-18 (Construção Civil)',
    'NR-33 (Espaço Confinado)',
    'NR-35 (Trabalho em Altura)',
    'Operador de Empilhadeira',
    'Primeiros Socorros / Brigada',
    'Metrologia & Calibração Industrial',
  ];

  const handleAddNrTraining = async () => {
    if (!newNrTrainingId && !newNrCustomName) {
      alert('Selecione um treinamento do catálogo ou informe o nome do curso de NR.');
      return;
    }

    const empId = formData.id || formData.username || selectedUser?.id || selectedUser?.username;
    const empName = formData.name || selectedUser?.name || 'Colaborador';

    if (!empId) {
      alert('Por favor, informe a Matrícula/Username na aba 1 (Dados Pessoais) antes de lançar o treinamento.');
      return;
    }

    setIsSavingNrTraining(true);
    try {
      const selectedCatalog = (trainings || []).find((t: any) => t.id === newNrTrainingId);
      let courseName = selectedCatalog?.name || newNrCustomName || 'Treinamento NR';
      if (newNrTrainingId.startsWith('std-')) {
        courseName = newNrTrainingId.replace('std-', '');
      }

      let expDate = newNrExpirationDate;
      if (!expDate && newNrCompletionDate && selectedCatalog?.validityMonths) {
        const compDate = new Date(newNrCompletionDate + 'T00:00:00');
        compDate.setMonth(compDate.getMonth() + selectedCatalog.validityMonths);
        expDate = compDate.toISOString().split('T')[0];
      }

      let fileDataUrl = newNrCertificateUrl;
      if (newNrCertificateFile) {
        if (newNrCertificateFile.type.startsWith('image/')) {
          fileDataUrl = await compressImageToWebResolution(newNrCertificateFile, 1200, 1200, 0.7);
        } else {
          if (newNrCertificateFile.size > 500 * 1024) {
            alert("O arquivo do certificado (PDF) é muito grande (" + (newNrCertificateFile.size / 1024).toFixed(1) + "KB). O tamanho máximo permitido para salvar no banco é de 500KB. Reduza o arquivo e tente novamente.");
            setIsSavingNrTraining(false);
            return;
          }
          fileDataUrl = await new Promise((resolve, reject) => {
            const reader = new FileReader();
            reader.onload = (e) => resolve(e.target?.result as string);
            reader.onerror = (e) => reject(new Error("Erro ao ler o arquivo."));
            reader.readAsDataURL(newNrCertificateFile);
          });
        }
      }

      const payload: any = {
        employeeId: empId,
        employeeName: empName,
        trainingId: newNrTrainingId || 'custom',
        trainingName: courseName,
        completionDate: newNrCompletionDate,
        expirationDate: expDate,
        status: newNrStatus,
        result: newNrResult,
        certificateUrl: fileDataUrl,
        institution: newNrInstitution,
      };

      await addEmployeeTrainingDoc(payload);

      // Auto-add to certificatesList if it's not there
      const currentCerts = formData.certificatesList || [];
      if (!currentCerts.includes(courseName)) {
        setFormData((prev: any) => ({ ...prev, certificatesList: [...currentCerts, courseName] }));
      }

      setNewNrTrainingId('');
      setNewNrCustomName('');
      setNewNrCompletionDate('');
      setNewNrExpirationDate('');
      setNewNrStatus('Válido');
      setNewNrResult('Aprovado');
      setNewNrCertificateUrl('');
      setNewNrCertificateFile(null);
      setNewNrInstitution('COMANINS');

      alert('Treinamento de NR lançado com sucesso!');
    } catch (err: any) {
      console.error('Erro ao lançar treinamento de NR:', err);
      alert('Ocorreu um erro ao salvar no banco de dados. Tente sem o anexo primeiro ou verifique a conexão: ' + (err.message || err.toString()));
    } finally {
      setIsSavingNrTraining(false);
    }
  };

  const handleRemoveNrTraining = async (id: string) => {
    if (!confirm('Deseja realmente remover este registro de treinamento de NR?')) return;
    try {
      await deleteEmployeeTrainingDoc(id);
    } catch (err) {
      console.error('Erro ao remover treinamento:', err);
      alert('Erro ao remover o treinamento.');
    }
  };

  // Form State for Create/Edit
  const [formData, setFormData] = useState<Partial<PortalUser>>({
    name: '',
    socialName: '',
    username: '',
    password: '',
    role: 'Técnico de Laboratório',
    register: '',
    cpf: '',
    rgNumber: '',
    rgIssuer: '',
    rgUf: '',
    birthDate: '',
    gender: 'Masculino',
    maritalStatus: 'Solteiro(a)',
    nationality: 'Brasileira',
    naturalness: '',
    motherName: '',
    fatherName: '',
    photoUrl: '',
    phone: '',
    personalEmail: '',
    workEmail: '',
    cep: '',
    address: '',
    addressNumber: '',
    addressComplement: '',
    neighborhood: '',
    city: 'Camaçari',
    state: 'BA',
    companyUnit: 'COMANINS - Filial Camaçari',
    department: 'Metrologia / Calibração',
    costCenter: 'CC-0100',
    manager: '',
    workplace: 'Laboratório Central / Campo',
    contractType: 'CLT',
    admissionDate: new Date().toISOString().split('T')[0],
    workSchedule: '07:30 às 17:18 (Segunda a Sexta)',
    workRegime: 'Presencial',
    salary: undefined,
    unionCategory: 'Sindicato dos Trabalhadores da Indústria Química / Metalúrgica',
    status: 'Ativo',
    pis: '',
    ctps: '',
    voterTitle: '',
    militaryCert: '',
    cnhNumber: '',
    cnhCategory: 'B',
    cnhValidity: '',
    professionalReg: '',
    professionalRegValidity: '',
    asoAdmissionalDate: '',
    asoValidity: '',
    asoContracts: [],
    educationLevel: 'Ensino Técnico',
    certificatesList: ['NR-10', 'NR-35'],
    bank: '',
    bankAgency: '',
    bankAccount: '',
    accountType: 'Corrente',
    pixKey: '',
    transporteBenefit: true,
    alimentacaoBenefit: true,
    healthPlan: true,
    lifeInsurance: true,
    dependents: [],
    emergencyContactName: '',
    emergencyKinship: '',
    emergencyPhone: '',
    emergencyPhoneAlt: '',
    medicalInfo: '',
    deliveredEquipments: 'Notebook institucional, Crachá de acesso',
    deliveredUniformsEpi: 'Bota de segurança, Óculos de proteção, Fardamento COMANINS',
    authorizedVehicle: '',
    adminNotes: ''
  });

  // Dependent sub-form state
  const [newDepName, setNewDepName] = useState('');
  const [newDepKinship, setNewDepKinship] = useState('Filho(a)');
  const [newDepBirthDate, setNewDepBirthDate] = useState('');
  const [newDepCpf, setNewDepCpf] = useState('');

  // ASO Contract Handlers
  const handleAddAsoContract = async () => {
    if (!newAsoContractName.trim()) {
      alert('Por favor, informe o Nome do Contrato ou Cliente.');
      return;
    }
    if (!newAsoValidityDate) {
      alert('Por favor, informe a Data de Validade do ASO.');
      return;
    }

    const newAsoItem: AsoContractItem = {
      id: `aso_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
      contractName: newAsoContractName.trim(),
      unitArea: newAsoUnitArea.trim() || 'Unidade Principal',
      examType: newAsoExamType,
      examDate: newAsoExamDate,
      validityDate: newAsoValidityDate,
      status: newAsoStatus,
      clinicDoctor: newAsoClinicDoctor.trim(),
      notes: newAsoNotes.trim(),
      docUrl: ''
    };

    const processAdd = (docUrl: string) => {
      newAsoItem.docUrl = docUrl;
      const currentList = formData.asoContracts || [];
      const updatedList = [...currentList, newAsoItem];
      updatedList.sort((a, b) => new Date(a.validityDate).getTime() - new Date(b.validityDate).getTime());

      setFormData((prev) => ({
        ...prev,
        asoContracts: updatedList,
        asoValidity: updatedList[0]?.validityDate || prev.asoValidity
      }));

      // Reset sub-form
      setNewAsoContractName('');
      setNewAsoUnitArea('');
      setNewAsoExamType('Periódico');
      setNewAsoExamDate('');
      setNewAsoValidityDate('');
      setNewAsoStatus('Apto');
      setNewAsoClinicDoctor('');
      setNewAsoNotes('');
      setNewAsoDocFile(null);
    };

    if (newAsoDocFile) {
      if (newAsoDocFile.type.startsWith('image/')) {
        try {
          const compressed = await compressImageToWebResolution(newAsoDocFile, 1200, 1200, 0.7);
          processAdd(compressed);
        } catch (err) {
          console.error("Erro ao comprimir imagem:", err);
          alert("Erro ao processar imagem.");
        }
      } else {
        if (newAsoDocFile.size > 500 * 1024) {
          alert("O arquivo do ASO (PDF) é muito grande (" + (newAsoDocFile.size / 1024).toFixed(1) + "KB). O limite é de 500KB.");
          return;
        }
        const reader = new FileReader();
        reader.onload = (e) => {
          processAdd((e.target?.result as string) || '');
        };
        reader.readAsDataURL(newAsoDocFile);
      }
    } else {
      processAdd('');
    }
  };

    const handleRemoveAsoContract = async (asoId: string) => {
    if (currentUser?.role !== 'Administrador') {
      alert("Apenas administradores podem excluir ASOs.");
      return;
    }
    const pwd = window.prompt("Digite sua senha de administrador para confirmar a exclusão deste ASO:");
    if (pwd === null) return;
    
    const adminUser = internalUsers.find(u => u.username === currentUser?.username);
    if (!adminUser || adminUser.password !== pwd.trim()) {
      alert("Senha incorreta.");
      return;
    }

    try {
      if (asoId.startsWith('easo_')) {
        await deleteEmployeeAsoDoc(asoId);
      } else {
        // Fallback for legacy ASOs stored in formData
        const updatedList = (formData.asoContracts || []).filter((item: any) => item.id !== asoId);
        setFormData((prev: any) => ({
          ...prev,
          asoContracts: updatedList,
          asoValidity: updatedList[0]?.validityDate || ''
        }));
      }
    } catch (err) {
      console.error("Erro ao remover ASO:", err);
      alert("Erro ao remover ASO.");
    }
  };

  // EXPIRATION ALERTS ENGINE
  const expirationAlerts = useMemo(() => {
    const alerts: {
      id: string;
      employeeName: string;
      employeeRole: string;
      type: 'ASO' | 'CNH' | 'CREA/CRT' | 'Treinamento/NR';
      description: string;
      date: string;
      daysRemaining: number;
      severity: 'vencido' | 'proximo' | 'ok';
    }[] = [];

    const today = new Date();
    today.setHours(0, 0, 0, 0);

    internalUsers.forEach((u) => {
      // 1. ASO (Suporta Múltiplos Contratos e Áreas)
      if (u.asoContracts && u.asoContracts.length > 0) {
        u.asoContracts.forEach((asoItem) => {
          if (asoItem.validityDate) {
            const valDate = new Date(asoItem.validityDate);
            const diffDays = Math.ceil((valDate.getTime() - today.getTime()) / (1000 * 3600 * 24));
            if (diffDays <= 30) {
              alerts.push({
                id: `aso_${u.id}_${asoItem.id}`,
                employeeName: u.name,
                employeeRole: u.role,
                type: 'ASO',
                description: `ASO [${asoItem.contractName} - ${asoItem.unitArea}] ${diffDays < 0 ? 'vencido' : 'vence em breve'}`,
                date: asoItem.validityDate,
                daysRemaining: diffDays,
                severity: diffDays < 0 ? 'vencido' : 'proximo'
              });
            }
          }
        });
      } else if (u.asoValidity) {
        const valDate = new Date(u.asoValidity);
        const diffDays = Math.ceil((valDate.getTime() - today.getTime()) / (1000 * 3600 * 24));
        if (diffDays <= 30) {
          alerts.push({
            id: `aso_${u.id}`,
            employeeName: u.name,
            employeeRole: u.role,
            type: 'ASO',
            description: `Exame Médico Ocupacional (ASO) ${diffDays < 0 ? 'vencido' : 'vence em breve'}`,
            date: u.asoValidity,
            daysRemaining: diffDays,
            severity: diffDays < 0 ? 'vencido' : 'proximo'
          });
        }
      }

      // 2. CNH
      if (u.cnhValidity) {
        const valDate = new Date(u.cnhValidity);
        const diffDays = Math.ceil((valDate.getTime() - today.getTime()) / (1000 * 3600 * 24));
        if (diffDays <= 30) {
          alerts.push({
            id: `cnh_${u.id}`,
            employeeName: u.name,
            employeeRole: u.role,
            type: 'CNH',
            description: `Carteira Nacional de Habilitação (CNH Cat. ${u.cnhCategory || 'B'}) ${diffDays < 0 ? 'vencida' : 'vence em breve'}`,
            date: u.cnhValidity,
            daysRemaining: diffDays,
            severity: diffDays < 0 ? 'vencido' : 'proximo'
          });
        }
      }

      // 3. Registro Profissional (CREA/CRT)
      if (u.professionalRegValidity) {
        const valDate = new Date(u.professionalRegValidity);
        const diffDays = Math.ceil((valDate.getTime() - today.getTime()) / (1000 * 3600 * 24));
        if (diffDays <= 30) {
          alerts.push({
            id: `reg_${u.id}`,
            employeeName: u.name,
            employeeRole: u.role,
            type: 'CREA/CRT',
            description: `Anuidade/Registro Profissional (${u.professionalReg || 'CREA/CRT'}) ${diffDays < 0 ? 'vencido' : 'vence em breve'}`,
            date: u.professionalRegValidity,
            daysRemaining: diffDays,
            severity: diffDays < 0 ? 'vencido' : 'proximo'
          });
        }
      }
    });

    return alerts.sort((a, b) => a.daysRemaining - b.daysRemaining);
  }, [internalUsers]);

  // Filtered employees list
  const filteredUsers = useMemo(() => {
    return internalUsers.filter((u) => {
      const matchSearch =
        !searchTerm ||
        u.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        u.username.toLowerCase().includes(searchTerm.toLowerCase()) ||
        (u.register && u.register.toLowerCase().includes(searchTerm.toLowerCase())) ||
        (u.cpf && u.cpf.includes(searchTerm)) ||
        (u.department && u.department.toLowerCase().includes(searchTerm.toLowerCase()));

      const matchStatus = statusFilter === 'todos' || (u.status || 'Ativo') === statusFilter;
      const matchDept = departmentFilter === 'todos' || u.department === departmentFilter;

      return matchSearch && matchStatus && matchDept;
    });
  }, [internalUsers, searchTerm, statusFilter, departmentFilter]);

  // Extract unique departments
  const departmentsList = useMemo(() => {
    const deps = new Set<string>();
    internalUsers.forEach((u) => {
      if (u.department) deps.add(u.department);
    });
    return Array.from(deps);
  }, [internalUsers]);

  // Open Create Modal
  const handleOpenCreate = () => {
    setSelectedUser(null);
    setFormData({
      name: '',
      socialName: '',
      username: '',
      password: '',
      role: 'Técnico de Laboratório',
      register: `MAT-${Math.floor(1000 + Math.random() * 9000)}`,
      cpf: '',
      rgNumber: '',
      rgIssuer: '',
      rgUf: 'BA',
      birthDate: '',
      gender: 'Masculino',
      maritalStatus: 'Solteiro(a)',
      nationality: 'Brasileira',
      naturalness: '',
      motherName: '',
      fatherName: '',
      photoUrl: '',
      phone: '',
      personalEmail: '',
      workEmail: '',
      cep: '',
      address: '',
      addressNumber: '',
      addressComplement: '',
      neighborhood: '',
      city: 'Camaçari',
      state: 'BA',
      companyUnit: 'COMANINS - Filial Camaçari',
      department: 'Metrologia / Calibração',
      costCenter: 'CC-0100',
      manager: '',
      workplace: 'Laboratório Central / Campo',
      contractType: 'CLT',
      admissionDate: new Date().toISOString().split('T')[0],
      workSchedule: '07:30 às 17:18 (Segunda a Sexta)',
      workRegime: 'Presencial',
      salary: undefined,
      unionCategory: 'Sindicato dos Trabalhadores da Indústria Química / Metalúrgica',
      status: 'Ativo',
      pis: '',
      ctps: '',
      voterTitle: '',
      militaryCert: '',
      cnhNumber: '',
      cnhCategory: 'B',
      cnhValidity: '',
      professionalReg: '',
      professionalRegValidity: '',
      asoAdmissionalDate: '',
      asoValidity: '',
      educationLevel: 'Ensino Técnico',
      certificatesList: ['NR-10', 'NR-35'],
      bank: '',
      bankAgency: '',
      bankAccount: '',
      accountType: 'Corrente',
      pixKey: '',
      transporteBenefit: true,
      alimentacaoBenefit: true,
      healthPlan: true,
      lifeInsurance: true,
      dependents: [],
      emergencyContactName: '',
      emergencyKinship: '',
      emergencyPhone: '',
      emergencyPhoneAlt: '',
      medicalInfo: '',
      deliveredEquipments: 'Notebook institucional, Crachá de acesso',
      deliveredUniformsEpi: 'Bota de segurança, Óculos de proteção, Fardamento COMANINS',
      authorizedVehicle: '',
      adminNotes: ''
    });
    setActiveFormTab(1);
    setShowEditModal(true);
  };

  // Open Edit Modal
  const handleOpenEdit = async (user: PortalUser) => {
    setSelectedUser(user);
    setFormData({ ...user });
    setActiveFormTab(1);
    
    setIsLoadingDocs(true);
    const docs = await getEmployeeDocuments(user.id);
    setUserDocuments(docs);
    setIsLoadingDocs(false);
    
    setShowEditModal(true);
  };

  // Open Full Ficha Modal (View)
  const handleOpenView = (user: PortalUser) => {
    setSelectedUser(user);

    // Append view audit log entry
    const newLog: AuditLogEntry = {
      date: new Date().toLocaleString('pt-BR'),
      user: currentUser?.name || currentUser?.username || 'Usuário',
      action: 'CONSULTA DE FICHA DE COLABORADOR (LGPD Compliance)',
      details: `Acesso realizado por ${currentUser?.name} às ${new Date().toLocaleTimeString('pt-BR')}`
    };

    const updatedLogs = [newLog, ...(user.auditLogs || [])];
    if (onUpdateInternalUser && user.id) {
      onUpdateInternalUser(user.id, { auditLogs: updatedLogs });
    }

    setShowViewModal(true);
  };

  // Submit Handler
  const handleSubmitForm = (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.name || !formData.username) {
      alert('Por favor, informe o Nome Completo e o Nome de Usuário (Login).');
      return;
    }

    const auditEntry: AuditLogEntry = {
      date: new Date().toLocaleString('pt-BR'),
      user: currentUser?.name || currentUser?.username || 'RH',
      action: selectedUser ? 'ALTERAÇÃO DE CADASTRO DE COLABORADOR' : 'CRIAÇÃO DE NOVO CADASTRO DE COLABORADOR',
      details: selectedUser ? 'Dados atualizados no portal' : 'Novo colaborador registrado no banco de dados'
    };

    const logs = [auditEntry, ...(formData.auditLogs || [])];

    if (selectedUser && onUpdateInternalUser) {
      // Update existing
      const isPasswordChanged = formData.password && formData.password !== selectedUser.password;
      onUpdateInternalUser(selectedUser.id, {
        ...formData,
        permissionLevel: (formData as any).permissionLevel || 'Padrão',
        mustChangePassword: isPasswordChanged ? true : (formData.mustChangePassword ?? selectedUser.mustChangePassword),
        auditLogs: logs
      });
      alert('Cadastro do colaborador atualizado com sucesso!');
    } else {
      // Create new
      onAddInternalUser({
        ...(formData as PortalUser),
        name: formData.name || '',
        username: formData.username?.trim().toLowerCase() || '',
        role: formData.role || 'Técnico de Laboratório',
        permissionLevel: (formData as any).permissionLevel || 'Padrão',
        register: formData.register || `MAT-${Math.floor(1000 + Math.random() * 9000)}`,
        password: formData.password || 'comanins2026',
        mustChangePassword: true,
        auditLogs: logs
      });
      alert('Novo colaborador cadastrado com sucesso! No primeiro acesso, o colaborador deverá alterar a senha padrão.');
    }

    setShowEditModal(false);
  };

  // Add dependent helper
  const handleAddDependent = () => {
    if (!newDepName) return;
    const newDep: Dependent = {
      id: `dep_${Date.now()}`,
      name: newDepName,
      kinship: newDepKinship,
      birthDate: newDepBirthDate,
      cpf: newDepCpf
    };
    setFormData((prev) => ({
      ...prev,
      dependents: [...(prev.dependents || []), newDep]
    }));
    setNewDepName('');
    setNewDepBirthDate('');
    setNewDepCpf('');
  };

  const handleRemoveDependent = (index: number) => {
    setFormData((prev) => ({
      ...prev,
      dependents: (prev.dependents || []).filter((_, i) => i !== index)
    }));
  };

  return (
    <div className="space-y-6">
      {/* HEADER PRINCIPAL DE RH & SUB-NAVEGAÇÃO INTEGRADA */}
      <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm space-y-4">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <h2 className="text-2xl font-display font-extrabold text-slate-900 flex items-center space-x-2">
              <Users className="h-7 w-7 text-royal-blue" />
              <span>Gestão Integrada de Colaboradores & RH</span>
            </h2>
            <p className="text-xs text-slate-600 mt-1">
              Fichas completas de registro, alertas de vencimento (ASO/CNH/NRs), treinamentos e holerites com compliance LGPD.
            </p>
          </div>

          <div className="flex items-center space-x-2">
            <button
              onClick={handleOpenCreate}
              className="bg-royal-blue hover:bg-blue-700 text-white px-4 py-2.5 rounded-xl text-xs font-bold transition-colors flex items-center space-x-2 shadow-sm"
            >
              <UserPlus className="h-4 w-4" />
              <span>+ Novo Colaborador</span>
            </button>
          </div>
        </div>
      </div>

      {/* VIEW: CADASTRO E LISTA DE COLABORADORES */}
      <div className="space-y-4">
        {/* BARRA DE FILTROS E PESQUISA */}
          <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm flex flex-col md:flex-row gap-3 items-center justify-between">
            <div className="relative w-full md:w-96">
              <Search className="h-4 w-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
              <input
                type="text"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                placeholder="Buscar por nome, CPF, matrícula, cargo, setor..."
                className="w-full pl-9 pr-3 py-2 text-xs border border-slate-300 rounded-lg focus:ring-2 focus:ring-royal-blue focus:outline-none bg-slate-50"
              />
            </div>

            <div className="flex items-center space-x-2 w-full md:w-auto overflow-x-auto text-xs">
              <div className="flex items-center space-x-1">
                <Filter className="h-3.5 w-3.5 text-slate-500" />
                <span className="text-slate-600 font-semibold">Situação:</span>
                <select
                  value={statusFilter}
                  onChange={(e) => setStatusFilter(e.target.value)}
                  className="border border-slate-300 rounded-lg px-2 py-1.5 text-xs bg-slate-50 text-slate-800"
                >
                  <option value="todos">Todas as Situações</option>
                  <option value="Ativo">Ativos</option>
                  <option value="Afastado">Afastados</option>
                  <option value="Férias">Em Férias</option>
                  <option value="Desligado">Desligados</option>
                </select>
              </div>

              {departmentsList.length > 0 && (
                <div className="flex items-center space-x-1">
                  <span className="text-slate-600 font-semibold">Setor:</span>
                  <select
                    value={departmentFilter}
                    onChange={(e) => setDepartmentFilter(e.target.value)}
                    className="border border-slate-300 rounded-lg px-2 py-1.5 text-xs bg-slate-50 text-slate-800"
                  >
                    <option value="todos">Todos os Setores</option>
                    {departmentsList.map((dept) => (
                      <option key={dept} value={dept}>
                        {dept}
                      </option>
                    ))}
                  </select>
                </div>
              )}
            </div>
          </div>

          {/* TABELA DE COLABORADORES */}
          <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs border-collapse">
                <thead>
                  <tr className="bg-slate-100 text-slate-700 font-bold uppercase text-[10px] tracking-wider border-b border-slate-200">
                    <th className="p-3">Colaborador</th>
                    <th className="p-3">Matrícula / CPF</th>
                    <th className="p-3">Cargo / Setor</th>
                    <th className="p-3">Contato</th>
                    <th className="p-3">Situação</th>
                    <th className="p-3">Validade ASO</th>
                    <th className="p-3 text-right">Ações</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {filteredUsers.length === 0 ? (
                    <tr>
                      <td colSpan={7} className="p-8 text-center text-slate-500">
                        Nenhum colaborador encontrado com os filtros aplicados.
                      </td>
                    </tr>
                  ) : (
                    filteredUsers.map((emp) => {
                      const empStatus = emp.status || 'Ativo';
                      return (
                        <tr key={emp.id} className="hover:bg-slate-50 transition-colors">
                          <td className="p-3">
                            <div className="flex items-center space-x-3">
                              {emp.photoUrl ? (
                                <img
                                  src={emp.photoUrl}
                                  alt={emp.name}
                                  className="h-9 w-9 rounded-full object-cover border border-slate-200 shadow-sm"
                                />
                              ) : (
                                <div className="h-9 w-9 rounded-full bg-blue-100 text-royal-blue font-bold flex items-center justify-center text-xs border border-blue-200">
                                  {emp.name.substring(0, 2).toUpperCase()}
                                </div>
                              )}
                              <div>
                                <span className="font-bold text-slate-900 text-sm block">{emp.name}</span>
                                {emp.socialName && (
                                  <span className="text-[10px] text-slate-500 block italic">({emp.socialName})</span>
                                )}
                                <span className="text-[10px] text-royal-blue font-mono">@{emp.username}</span>
                              </div>
                            </div>
                          </td>

                          <td className="p-3">
                            <span className="font-mono text-slate-800 font-bold block">{emp.register || 'MAT-N/A'}</span>
                            <span className="text-[10px] text-slate-500 font-mono">{emp.cpf ? maskCPF(emp.cpf) : 'CPF não informado'}</span>
                          </td>

                          <td className="p-3">
                            <span className="font-semibold text-slate-800 block">{emp.role}</span>
                            <span className="text-[10px] text-slate-500 block">{emp.department || 'Geral'}</span>
                          </td>

                          <td className="p-3">
                            <span className="block text-slate-700">{emp.phone ? maskPhone(emp.phone) : 'Sem tel.'}</span>
                            <span className="text-[10px] text-slate-500 block">{emp.workEmail || emp.personalEmail || '-'}</span>
                          </td>

                          <td className="p-3">
                            <span
                              className={`px-2 py-0.5 rounded-full text-[10px] font-bold uppercase inline-block ${
                                empStatus === 'Ativo'
                                  ? 'bg-emerald-100 text-emerald-800 border border-emerald-200'
                                  : empStatus === 'Férias'
                                  ? 'bg-blue-100 text-blue-800 border border-blue-200'
                                  : empStatus === 'Afastado'
                                  ? 'bg-amber-100 text-amber-800 border border-amber-200'
                                  : 'bg-rose-100 text-rose-800 border border-rose-200'
                              }`}
                            >
                              {empStatus}
                            </span>
                          </td>

                          <td className="p-3">
                            {emp.asoValidity ? (
                              <span className="font-mono text-[11px] text-slate-700 block">
                                {new Date(emp.asoValidity).toLocaleDateString('pt-BR')}
                              </span>
                            ) : (
                              <span className="text-[10px] text-slate-400 italic">Pendente</span>
                            )}
                          </td>

                          <td className="p-3 text-right">
                            <div className="flex items-center justify-end space-x-1.5">
                              <button
                                onClick={() => handleOpenView(emp)}
                                className="p-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg transition-colors"
                                title="Ver Ficha Completa"
                              >
                                <Eye className="h-4 w-4 text-royal-blue" />
                              </button>

                              <button
                                onClick={() => onManagePayslips && onManagePayslips(emp)}
                                className="p-1.5 bg-emerald-50 hover:bg-emerald-100 text-emerald-600 rounded-lg transition-colors"
                                title="Gerenciar Contra-cheques"
                              >
                                <FileText className="h-4 w-4" />
                              </button>

                              <button
                                onClick={() => handleOpenEdit(emp)}
                                className="p-1.5 bg-blue-50 hover:bg-blue-100 text-royal-blue rounded-lg transition-colors"
                                title="Editar Cadastro"
                              >
                                <Edit className="h-4 w-4" />
                              </button>

                              {(currentUser?.role === 'Administrador' || currentUser?.username !== emp.username) && (
                                <button
                                  onClick={() => {
                                    if (requestAdminDelete) {
                                      requestAdminDelete('user', emp.username, emp.name);
                                    } else {
                                      if (confirm(`Tem certeza que deseja excluir o colaborador ${emp.name}?`)) {
                                        onDeleteInternalUser(emp.username);
                                      }
                                    }
                                  }}
                                  className="p-1.5 bg-rose-50 hover:bg-rose-100 text-rose-600 rounded-lg transition-colors"
                                  title="Excluir Colaborador"
                                 >
                                  <Trash2 className="h-4 w-4" />
                                </button>
                              )}
                            </div>
                          </td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>

      {/* MODAL: FORMULÁRIO COMPLETO DE CRIAR / EDITAR COLABORADOR (7 CATEGORIAS) */}
      {showEditModal && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-2 sm:p-4 overflow-y-auto">
          <div className={`bg-white w-full flex flex-col border border-slate-200 shadow-2xl overflow-hidden transition-all ${isMaximized ? "max-w-full h-full min-h-[100dvh] rounded-none my-0" : "rounded-2xl max-w-5xl max-h-[92vh] sm:max-h-[88vh] my-auto"}`}>
            {/* Modal Header */}
            <div className="bg-slate-900 text-white p-4 sm:p-5 flex justify-between items-center shrink-0">
              <div className="flex items-center space-x-3">
                <div className="p-2 bg-royal-blue/30 rounded-lg border border-royal-blue/50">
                  <UserPlus className="h-6 w-6 text-teal-400" />
                </div>
                <div>
                  <h3 className="font-display font-extrabold text-lg">
                    {selectedUser ? `Editar Ficha: ${selectedUser.name}` : 'Novo Cadastro de Colaborador'}
                  </h3>
                  <p className="text-xs text-slate-300">
                    Formulário completo de Recursos Humanos em conformidade com eSocial e LGPD.
                  </p>
                </div>
              </div>

              <div className="flex items-center space-x-2">
                <button
                  type="button"
                  onClick={() => setIsMaximized(!isMaximized)}
                  className="p-1 text-slate-400 hover:text-white transition-colors bg-slate-800 rounded-lg hover:bg-slate-700"
                  title={isMaximized ? "Restaurar tamanho" : "Maximizar"}
                >
                  {isMaximized ? <Minimize className="h-5 w-5" /> : <Maximize className="h-5 w-5" />}
                </button>
                <button
                  type="button"
                  onClick={() => setShowEditModal(false)}
                  className="p-1 text-slate-400 hover:text-white transition-colors bg-slate-800 rounded-lg hover:bg-red-500"
                  title="Fechar"
                >
                  <X className="h-5 w-5" />
                </button>
              </div>
            </div>

            {/* TAB HEADER (7 CATEGORIAS) */}
            <div className="bg-slate-100 border-b border-slate-200 p-2 flex overflow-x-auto space-x-1 text-xs font-semibold shrink-0">
              <button
                type="button"
                onClick={() => setActiveFormTab(1)}
                className={`px-3 py-2 rounded-lg flex items-center space-x-1.5 whitespace-nowrap transition-all ${
                  activeFormTab === 1 ? 'bg-royal-blue text-white shadow-sm font-bold' : 'text-slate-700 hover:bg-slate-200'
                }`}
              >
                <User className="h-3.5 w-3.5" />
                <span>1. Dados Pessoais</span>
              </button>

              <button
                type="button"
                onClick={() => setActiveFormTab(2)}
                className={`px-3 py-2 rounded-lg flex items-center space-x-1.5 whitespace-nowrap transition-all ${
                  activeFormTab === 2 ? 'bg-royal-blue text-white shadow-sm font-bold' : 'text-slate-700 hover:bg-slate-200'
                }`}
              >
                <Phone className="h-3.5 w-3.5" />
                <span>2. Contato e Endereço</span>
              </button>

              <button
                type="button"
                onClick={() => setActiveFormTab(3)}
                className={`px-3 py-2 rounded-lg flex items-center space-x-1.5 whitespace-nowrap transition-all ${
                  activeFormTab === 3 ? 'bg-royal-blue text-white shadow-sm font-bold' : 'text-slate-700 hover:bg-slate-200'
                }`}
              >
                <Briefcase className="h-3.5 w-3.5" />
                <span>3. Profissionais</span>
              </button>

              <button
                type="button"
                onClick={() => setActiveFormTab(4)}
                className={`px-3 py-2 rounded-lg flex items-center space-x-1.5 whitespace-nowrap transition-all ${
                  activeFormTab === 4 ? 'bg-royal-blue text-white shadow-sm font-bold' : 'text-slate-700 hover:bg-slate-200'
                }`}
              >
                <FileText className="h-3.5 w-3.5" />
                <span>4. Trabalhistas & NRs</span>
              </button>

              <button
                type="button"
                onClick={() => setActiveFormTab(5)}
                className={`px-3 py-2 rounded-lg flex items-center space-x-1.5 whitespace-nowrap transition-all ${
                  activeFormTab === 5 ? 'bg-royal-blue text-white shadow-sm font-bold' : 'text-slate-700 hover:bg-slate-200'
                }`}
              >
                <CreditCard className="h-3.5 w-3.5" />
                <span>5. Bancários & Benefícios</span>
              </button>

              <button
                type="button"
                onClick={() => setActiveFormTab(6)}
                className={`px-3 py-2 rounded-lg flex items-center space-x-1.5 whitespace-nowrap transition-all ${
                  activeFormTab === 6 ? 'bg-royal-blue text-white shadow-sm font-bold' : 'text-slate-700 hover:bg-slate-200'
                }`}
              >
                <HeartPulse className="h-3.5 w-3.5" />
                <span>6. Emergência</span>
              </button>

              <button
                type="button"
                onClick={() => setActiveFormTab(7)}
                className={`px-3 py-2 rounded-lg flex items-center space-x-1.5 whitespace-nowrap transition-all ${
                  activeFormTab === 7 ? 'bg-royal-blue text-white shadow-sm font-bold' : 'text-slate-700 hover:bg-slate-200'
                }`}
              >
                <Key className="h-3.5 w-3.5" />
                <span>7. Controle Interno</span>
              </button>
            </div>

            {/* FORM BODY */}
            <form onSubmit={handleSubmitForm} className="flex-1 flex flex-col min-h-0 overflow-hidden">
              <div className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-6 text-xs text-slate-800">
                {/* TAB 1: DADOS PESSOAIS */}
              {activeFormTab === 1 && (
                <div className="space-y-4">
                  <h4 className="font-bold text-slate-900 border-b border-slate-200 pb-2 text-sm flex items-center space-x-2">
                    <User className="h-4 w-4 text-royal-blue" />
                    <span>1. Dados Pessoais do Colaborador</span>
                  </h4>

                  {/* SEÇÃO DE FOTO DO COLABORADOR */}
                  <div className="bg-slate-50 border border-slate-200 rounded-xl p-4 flex flex-col sm:flex-row items-center space-y-3 sm:space-y-0 sm:space-x-4">
                    <div className="relative group shrink-0">
                      <div className="w-24 h-28 sm:w-28 sm:h-32 rounded-xl border-2 border-dashed border-slate-300 bg-white overflow-hidden flex items-center justify-center shadow-sm relative">
                        {formData.photoUrl ? (
                          <img
                            src={formData.photoUrl}
                            alt="Foto do Colaborador"
                            className="w-full h-full object-cover"
                          />
                        ) : (
                          <div className="text-center p-2 text-slate-400 flex flex-col items-center">
                            <Camera className="h-8 w-8 mb-1 text-slate-400" />
                            <span className="text-[10px] font-semibold">Foto 3x4</span>
                          </div>
                        )}
                      </div>
                      {formData.photoUrl && (
                        <button
                          type="button"
                          onClick={() => setFormData({ ...formData, photoUrl: '' })}
                          className="absolute -top-2 -right-2 bg-rose-600 text-white rounded-full p-1 shadow hover:bg-rose-700 transition-colors"
                          title="Remover foto"
                        >
                          <X className="h-3.5 w-3.5" />
                        </button>
                      )}
                    </div>

                    <div className="flex-1 space-y-2 text-center sm:text-left w-full">
                      <div>
                        <h5 className="font-bold text-slate-900 text-xs flex items-center justify-center sm:justify-start space-x-1.5">
                          <Camera className="h-4 w-4 text-royal-blue" />
                          <span>Foto Oficial do Colaborador (3x4 / Crachá / Perfil)</span>
                        </h5>
                        <p className="text-[11px] text-slate-500 mt-0.5">
                          Anexe uma foto do colaborador para exibição no cadastro, Ficha de Registro (FRE) e crachá institucional.
                        </p>
                      </div>

                      <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2 pt-1">
                        <label className="cursor-pointer bg-royal-blue hover:bg-blue-700 text-white px-3 py-2 rounded-lg text-xs font-semibold flex items-center justify-center space-x-1.5 transition-colors shadow-sm shrink-0">
                          <Upload className="h-3.5 w-3.5" />
                          <span>Anexar Foto do Computador</span>
                          <input
                            type="file"
                            accept="image/*"
                            className="hidden"
                            onChange={(e) => {
                              const file = e.target.files?.[0];
                              if (file) {
                                compressImageToWebResolution(file)
                                  .then((compressed) => {
                                    setFormData(prev => ({ ...prev, photoUrl: compressed }));
                                  })
                                  .catch(err => {
                                    console.error('Error compressing employee photo:', err);
                                    const reader = new FileReader();
                                    reader.onloadend = () => {
                                      setFormData(prev => ({ ...prev, photoUrl: reader.result as string }));
                                    };
                                    reader.readAsDataURL(file);
                                  });
                              }
                            }}
                          />
                        </label>

                        <span className="text-[10px] text-slate-400 font-bold text-center">OU</span>

                        <div className="flex-1">
                          <input
                            type="text"
                            value={formData.photoUrl || ''}
                            onChange={(e) => setFormData({ ...formData, photoUrl: e.target.value })}
                            placeholder="Link / URL da foto..."
                            className="w-full text-xs border border-slate-300 rounded-lg px-2.5 py-1.5 bg-white"
                          />
                        </div>
                      </div>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div className="md:col-span-2">
                      <label className="block font-semibold mb-1">Nome Completo *</label>
                      <input
                        type="text"
                        required
                        value={formData.name || ''}
                        onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                        className="w-full border border-slate-300 rounded-lg p-2 bg-slate-50"
                        placeholder="Ex: Carlos Eduardo de Oliveira"
                      />
                    </div>

                    <div>
                      <label className="block font-semibold mb-1">Nome Social (se aplicável)</label>
                      <input
                        type="text"
                        value={formData.socialName || ''}
                        onChange={(e) => setFormData({ ...formData, socialName: e.target.value })}
                        className="w-full border border-slate-300 rounded-lg p-2 bg-slate-50"
                        placeholder="Nome social preferencial"
                      />
                    </div>

                    <div>
                      <label className="block font-semibold mb-1">CPF *</label>
                      <input
                        type="text"
                        required
                        value={formData.cpf || ''}
                        onChange={(e) => setFormData({ ...formData, cpf: maskCPF(e.target.value) })}
                        className="w-full border border-slate-300 rounded-lg p-2 bg-slate-50 font-mono"
                        placeholder="000.000.000-00"
                      />
                    </div>

                    <div>
                      <label className="block font-semibold mb-1">RG - Número</label>
                      <input
                        type="text"
                        value={formData.rgNumber || ''}
                        onChange={(e) => setFormData({ ...formData, rgNumber: e.target.value })}
                        className="w-full border border-slate-300 rounded-lg p-2 bg-slate-50 font-mono"
                        placeholder="Número do RG"
                      />
                    </div>

                    <div className="grid grid-cols-2 gap-2">
                      <div>
                        <label className="block font-semibold mb-1">Órgão Emissor</label>
                        <input
                          type="text"
                          value={formData.rgIssuer || ''}
                          onChange={(e) => setFormData({ ...formData, rgIssuer: e.target.value })}
                          className="w-full border border-slate-300 rounded-lg p-2 bg-slate-50"
                          placeholder="SSP, DETRAN..."
                        />
                      </div>

                      <div>
                        <label className="block font-semibold mb-1">UF RG</label>
                        <input
                          type="text"
                          value={formData.rgUf || ''}
                          onChange={(e) => setFormData({ ...formData, rgUf: e.target.value.toUpperCase() })}
                          className="w-full border border-slate-300 rounded-lg p-2 bg-slate-50"
                          placeholder="BA"
                        />
                      </div>
                    </div>

                    <div>
                      <label className="block font-semibold mb-1">Data de Nascimento</label>
                      <input
                        type="date"
                        value={formData.birthDate || ''}
                        onChange={(e) => setFormData({ ...formData, birthDate: e.target.value })}
                        className="w-full border border-slate-300 rounded-lg p-2 bg-slate-50 font-mono"
                      />
                    </div>

                    <div>
                      <label className="block font-semibold mb-1">Sexo</label>
                      <select
                        value={formData.gender || 'Masculino'}
                        onChange={(e) => setFormData({ ...formData, gender: e.target.value })}
                        className="w-full border border-slate-300 rounded-lg p-2 bg-slate-50"
                      >
                        <option value="Masculino">Masculino</option>
                        <option value="Feminino">Feminino</option>
                        <option value="Outro">Outro</option>
                        <option value="Prefiro não informar">Prefiro não informar</option>
                      </select>
                    </div>

                    <div>
                      <label className="block font-semibold mb-1">Estado Civil</label>
                      <select
                        value={formData.maritalStatus || 'Solteiro(a)'}
                        onChange={(e) => setFormData({ ...formData, maritalStatus: e.target.value })}
                        className="w-full border border-slate-300 rounded-lg p-2 bg-slate-50"
                      >
                        <option value="Solteiro(a)">Solteiro(a)</option>
                        <option value="Casado(a)">Casado(a)</option>
                        <option value="Divorciado(a)">Divorciado(a)</option>
                        <option value="Viúvo(a)">Viúvo(a)</option>
                        <option value="União Estável">União Estável</option>
                      </select>
                    </div>

                    <div>
                      <label className="block font-semibold mb-1">Nacionalidade</label>
                      <input
                        type="text"
                        value={formData.nationality || 'Brasileira'}
                        onChange={(e) => setFormData({ ...formData, nationality: e.target.value })}
                        className="w-full border border-slate-300 rounded-lg p-2 bg-slate-50"
                      />
                    </div>

                    <div>
                      <label className="block font-semibold mb-1">Naturalidade (Cidade/UF)</label>
                      <input
                        type="text"
                        value={formData.naturalness || ''}
                        onChange={(e) => setFormData({ ...formData, naturalness: e.target.value })}
                        className="w-full border border-slate-300 rounded-lg p-2 bg-slate-50"
                        placeholder="Ex: Salvador - BA"
                      />
                    </div>

                    <div>
                      <label className="block font-semibold mb-1">Nome da Mãe</label>
                      <input
                        type="text"
                        value={formData.motherName || ''}
                        onChange={(e) => setFormData({ ...formData, motherName: e.target.value })}
                        className="w-full border border-slate-300 rounded-lg p-2 bg-slate-50"
                        placeholder="Nome completo da mãe"
                      />
                    </div>

                    <div>
                      <label className="block font-semibold mb-1">Nome do Pai</label>
                      <input
                        type="text"
                        value={formData.fatherName || ''}
                        onChange={(e) => setFormData({ ...formData, fatherName: e.target.value })}
                        className="w-full border border-slate-300 rounded-lg p-2 bg-slate-50"
                        placeholder="Nome completo do pai"
                      />
                    </div>

                    <div className="md:col-span-2">
                      <label className="block font-semibold mb-1">URL da Foto do Colaborador</label>
                      <input
                        type="text"
                        value={formData.photoUrl || ''}
                        onChange={(e) => setFormData({ ...formData, photoUrl: e.target.value })}
                        className="w-full border border-slate-300 rounded-lg p-2 bg-slate-50"
                        placeholder="https://exemplo.com/foto_colaborador.jpg"
                      />
                    </div>
                  </div>
                </div>
              )}

              {/* TAB 2: CONTATO E ENDEREÇO */}
              {activeFormTab === 2 && (
                <div className="space-y-4">
                  <h4 className="font-bold text-slate-900 border-b border-slate-200 pb-2 text-sm flex items-center space-x-2">
                    <Phone className="h-4 w-4 text-royal-blue" />
                    <span>2. Informações de Contato e Endereço</span>
                  </h4>

                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div>
                      <label className="block font-semibold mb-1">Telefone / WhatsApp</label>
                      <input
                        type="text"
                        value={formData.phone || ''}
                        onChange={(e) => setFormData({ ...formData, phone: maskPhone(e.target.value) })}
                        className="w-full border border-slate-300 rounded-lg p-2 bg-slate-50 font-mono"
                        placeholder="(71) 99999-9999"
                      />
                    </div>

                    <div>
                      <label className="block font-semibold mb-1">E-mail Pessoal</label>
                      <input
                        type="email"
                        value={formData.personalEmail || ''}
                        onChange={(e) => setFormData({ ...formData, personalEmail: e.target.value })}
                        className="w-full border border-slate-300 rounded-lg p-2 bg-slate-50"
                        placeholder="pessoal@email.com"
                      />
                    </div>

                    <div>
                      <label className="block font-semibold mb-1">E-mail Corporativo</label>
                      <input
                        type="email"
                        value={formData.workEmail || ''}
                        onChange={(e) => setFormData({ ...formData, workEmail: e.target.value })}
                        className="w-full border border-slate-300 rounded-lg p-2 bg-slate-50 font-semibold text-royal-blue"
                        placeholder="nome@comanins.com.br"
                      />
                    </div>

                    <div>
                      <label className="block font-semibold mb-1">CEP</label>
                      <input
                        type="text"
                        value={formData.cep || ''}
                        onChange={(e) => setFormData({ ...formData, cep: maskCEP(e.target.value) })}
                        className="w-full border border-slate-300 rounded-lg p-2 bg-slate-50 font-mono"
                        placeholder="42801-581"
                      />
                    </div>

                    <div className="md:col-span-2">
                      <label className="block font-semibold mb-1">Endereço (Rua / Av.)</label>
                      <input
                        type="text"
                        value={formData.address || ''}
                        onChange={(e) => setFormData({ ...formData, address: e.target.value })}
                        className="w-full border border-slate-300 rounded-lg p-2 bg-slate-50"
                        placeholder="Rua, Avenida, Alameda..."
                      />
                    </div>

                    <div>
                      <label className="block font-semibold mb-1">Número</label>
                      <input
                        type="text"
                        value={formData.addressNumber || ''}
                        onChange={(e) => setFormData({ ...formData, addressNumber: e.target.value })}
                        className="w-full border border-slate-300 rounded-lg p-2 bg-slate-50"
                        placeholder="Nº"
                      />
                    </div>

                    <div>
                      <label className="block font-semibold mb-1">Complemento</label>
                      <input
                        type="text"
                        value={formData.addressComplement || ''}
                        onChange={(e) => setFormData({ ...formData, addressComplement: e.target.value })}
                        className="w-full border border-slate-300 rounded-lg p-2 bg-slate-50"
                        placeholder="Apto, Bloco, Quadra..."
                      />
                    </div>

                    <div>
                      <label className="block font-semibold mb-1">Bairro</label>
                      <input
                        type="text"
                        value={formData.neighborhood || ''}
                        onChange={(e) => setFormData({ ...formData, neighborhood: e.target.value })}
                        className="w-full border border-slate-300 rounded-lg p-2 bg-slate-50"
                        placeholder="Bairro"
                      />
                    </div>

                    <div>
                      <label className="block font-semibold mb-1">Cidade</label>
                      <input
                        type="text"
                        value={formData.city || 'Camaçari'}
                        onChange={(e) => setFormData({ ...formData, city: e.target.value })}
                        className="w-full border border-slate-300 rounded-lg p-2 bg-slate-50"
                      />
                    </div>

                    <div>
                      <label className="block font-semibold mb-1">Estado (UF)</label>
                      <input
                        type="text"
                        value={formData.state || 'BA'}
                        onChange={(e) => setFormData({ ...formData, state: e.target.value.toUpperCase() })}
                        className="w-full border border-slate-300 rounded-lg p-2 bg-slate-50 font-bold"
                      />
                    </div>
                  </div>
                </div>
              )}

              {/* TAB 3: DADOS PROFISSIONAIS */}
              {activeFormTab === 3 && (
                <div className="space-y-4">
                  <h4 className="font-bold text-slate-900 border-b border-slate-200 pb-2 text-sm flex items-center space-x-2">
                    <Briefcase className="h-4 w-4 text-royal-blue" />
                    <span>3. Dados Profissionais e Vínculo Empregatício</span>
                  </h4>

                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div>
                      <label className="block font-semibold mb-1">Matrícula / Código *</label>
                      <input
                        type="text"
                        required
                        value={formData.register || ''}
                        onChange={(e) => setFormData({ ...formData, register: e.target.value })}
                        className="w-full border border-slate-300 rounded-lg p-2 bg-slate-50 font-mono font-bold"
                        placeholder="MAT-001"
                      />
                    </div>

                    <div>
                      <label className="block font-semibold mb-1">Empresa / Filial / Unidade</label>
                      <input
                        type="text"
                        value={formData.companyUnit || 'COMANINS - Filial Camaçari'}
                        onChange={(e) => setFormData({ ...formData, companyUnit: e.target.value })}
                        className="w-full border border-slate-300 rounded-lg p-2 bg-slate-50"
                      />
                    </div>

                    <div>
                      <label className="block font-semibold mb-1">Cargo *</label>
                      <select
                        value={formData.role || ''}
                        onChange={(e) => setFormData({ ...formData, role: e.target.value })}
                        className="w-full border border-slate-300 rounded-lg p-2 bg-slate-50 font-bold text-slate-900"
                      >
                        <option value="">Selecione...</option>
                        {dropdownOptions?.cargos?.map((cargo: string, idx: number) => (
                          <option key={idx} value={cargo}>{cargo}</option>
                        ))}
                        {formData.role && !dropdownOptions?.cargos?.includes(formData.role) && (
                          <option value={formData.role}>{formData.role}</option>
                        )}
                      </select>
                    </div>

                    <div>
                      <label className="block font-semibold mb-1">Setor / Departamento</label>
                      <input
                        type="text"
                        value={formData.department || 'Metrologia / Calibração'}
                        onChange={(e) => setFormData({ ...formData, department: e.target.value })}
                        className="w-full border border-slate-300 rounded-lg p-2 bg-slate-50"
                        placeholder="Ex: Metrologia, RH, Vendas..."
                      />
                    </div>

                    <div>
                      <label className="block font-semibold mb-1">Centro de Custo</label>
                      <input
                        type="text"
                        value={formData.costCenter || 'CC-0100'}
                        onChange={(e) => setFormData({ ...formData, costCenter: e.target.value })}
                        className="w-full border border-slate-300 rounded-lg p-2 bg-slate-50 font-mono"
                      />
                    </div>

                    <div>
                      <label className="block font-semibold mb-1">Gestor Responsável</label>
                      <input
                        type="text"
                        value={formData.manager || ''}
                        onChange={(e) => setFormData({ ...formData, manager: e.target.value })}
                        className="w-full border border-slate-300 rounded-lg p-2 bg-slate-50"
                        placeholder="Nome do gestor direto"
                      />
                    </div>

                    <div>
                      <label className="block font-semibold mb-1">Local de Trabalho</label>
                      <input
                        type="text"
                        value={formData.workplace || 'Laboratório Central / Campo'}
                        onChange={(e) => setFormData({ ...formData, workplace: e.target.value })}
                        className="w-full border border-slate-300 rounded-lg p-2 bg-slate-50"
                      />
                    </div>

                    <div>
                      <label className="block font-semibold mb-1">Tipo de Contrato</label>
                      <select
                        value={formData.contractType || 'CLT'}
                        onChange={(e) => setFormData({ ...formData, contractType: e.target.value })}
                        className="w-full border border-slate-300 rounded-lg p-2 bg-slate-50"
                      >
                        <option value="CLT">CLT (Efetivo)</option>
                        <option value="PJ">PJ (Prestador de Serviço)</option>
                        <option value="Estágio">Estágio</option>
                        <option value="Terceirizado">Terceirizado</option>
                        <option value="Jovem Aprendiz">Jovem Aprendiz</option>
                        <option value="Temporário">Temporário</option>
                      </select>
                    </div>

                    <div>
                      <label className="block font-semibold mb-1">Data de Admissão</label>
                      <input
                        type="date"
                        value={formData.admissionDate || ''}
                        onChange={(e) => setFormData({ ...formData, admissionDate: e.target.value })}
                        className="w-full border border-slate-300 rounded-lg p-2 bg-slate-50 font-mono"
                      />
                    </div>

                    <div>
                      <label className="block font-semibold mb-1">Jornada e Horário de Trabalho</label>
                      <input
                        type="text"
                        value={formData.workSchedule || '07:30 às 17:18 (Segunda a Sexta)'}
                        onChange={(e) => setFormData({ ...formData, workSchedule: e.target.value })}
                        className="w-full border border-slate-300 rounded-lg p-2 bg-slate-50"
                      />
                    </div>

                    <div>
                      <label className="block font-semibold mb-1">Regime de Trabalho</label>
                      <select
                        value={formData.workRegime || 'Presencial'}
                        onChange={(e) => setFormData({ ...formData, workRegime: e.target.value })}
                        className="w-full border border-slate-300 rounded-lg p-2 bg-slate-50"
                      >
                        <option value="Presencial">Presencial</option>
                        <option value="Externo">Externo (Campo / Clientes)</option>
                        <option value="Híbrido">Híbrido</option>
                        <option value="Remoto">Remoto</option>
                      </select>
                    </div>

                    <div>
                      <label className="block font-semibold mb-1">Situação do Colaborador</label>
                      <select
                        value={formData.status || 'Ativo'}
                        onChange={(e) =>
                          setFormData({
                            ...formData,
                            status: e.target.value as 'Ativo' | 'Afastado' | 'Férias' | 'Desligado'
                          })
                        }
                        className="w-full border border-slate-300 rounded-lg p-2 bg-slate-50 font-bold"
                      >
                        <option value="Ativo">Ativo</option>
                        <option value="Afastado">Afastado (INSS / Licença)</option>
                        <option value="Férias">Em Férias</option>
                        <option value="Desligado">Desligado</option>
                      </select>
                    </div>

                    {/* SALÁRIO (LGPD Restricted) */}
                    <div className="md:col-span-2 bg-amber-50 border border-amber-200 p-3 rounded-xl">
                      <div className="flex items-center space-x-1.5 mb-1">
                        <Lock className="h-4 w-4 text-amber-700" />
                        <label className="font-bold text-amber-900">Salário Base R$ (Dado Confidencial LGPD)</label>
                      </div>

                      {isAuthorizedRH ? (
                        <input
                          type="number"
                          step="0.01"
                          value={formData.salary || ''}
                          onChange={(e) => setFormData({ ...formData, salary: parseFloat(e.target.value) || 0 })}
                          className="w-full border border-slate-300 rounded-lg p-2 bg-white font-mono font-bold text-slate-900"
                          placeholder="R$ 0,00"
                        />
                      ) : (
                        <div className="p-2 bg-slate-200 rounded text-slate-600 font-mono italic">
                          🔒 Restrito ao RH / Administradores (Proteção de Dados LGPD)
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              )}

              {/* TAB 4: DOCUMENTOS TRABALHISTAS & NRS */}
              {activeFormTab === 4 && (
                <div className="space-y-4">
                  <h4 className="font-bold text-slate-900 border-b border-slate-200 pb-2 text-sm flex items-center space-x-2">
                    <FileText className="h-4 w-4 text-royal-blue" />
                    <span>4. Documentos Trabalhistas, Registros e NRs</span>
                  </h4>

                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div>
                      <label className="block font-semibold mb-1">PIS / NIS</label>
                      <input
                        type="text"
                        value={formData.pis || ''}
                        onChange={(e) => setFormData({ ...formData, pis: e.target.value })}
                        className="w-full border border-slate-300 rounded-lg p-2 bg-slate-50 font-mono"
                        placeholder="000.00000.00-0"
                      />
                    </div>

                    <div>
                      <label className="block font-semibold mb-1">CTPS Digital / Física</label>
                      <input
                        type="text"
                        value={formData.ctps || ''}
                        onChange={(e) => setFormData({ ...formData, ctps: e.target.value })}
                        className="w-full border border-slate-300 rounded-lg p-2 bg-slate-50"
                        placeholder="Nº da CTPS ou Digital"
                      />
                    </div>

                    <div>
                      <label className="block font-semibold mb-1">Título de Eleitor</label>
                      <input
                        type="text"
                        value={formData.voterTitle || ''}
                        onChange={(e) => setFormData({ ...formData, voterTitle: e.target.value })}
                        className="w-full border border-slate-300 rounded-lg p-2 bg-slate-50 font-mono"
                      />
                    </div>

                    <div>
                      <label className="block font-semibold mb-1">Certificado de Reservista</label>
                      <input
                        type="text"
                        value={formData.militaryCert || ''}
                        onChange={(e) => setFormData({ ...formData, militaryCert: e.target.value })}
                        className="w-full border border-slate-300 rounded-lg p-2 bg-slate-50"
                      />
                    </div>

                    <div>
                      <label className="block font-semibold mb-1">CNH (Número e Categoria)</label>
                      <div className="grid grid-cols-2 gap-2">
                        <input
                          type="text"
                          value={formData.cnhNumber || ''}
                          onChange={(e) => setFormData({ ...formData, cnhNumber: e.target.value })}
                          className="w-full border border-slate-300 rounded-lg p-2 bg-slate-50 font-mono"
                          placeholder="Nº CNH"
                        />
                        <input
                          type="text"
                          value={formData.cnhCategory || 'B'}
                          onChange={(e) => setFormData({ ...formData, cnhCategory: e.target.value.toUpperCase() })}
                          className="w-full border border-slate-300 rounded-lg p-2 bg-slate-50 font-bold"
                          placeholder="Cat. B"
                        />
                      </div>
                    </div>

                    <div>
                      <label className="block font-semibold mb-1">Validade CNH (Alerta Vencimento)</label>
                      <input
                        type="date"
                        value={formData.cnhValidity || ''}
                        onChange={(e) => setFormData({ ...formData, cnhValidity: e.target.value })}
                        className="w-full border border-slate-300 rounded-lg p-2 bg-slate-50 font-mono"
                      />
                    </div>

                    <div>
                      <label className="block font-semibold mb-1">Registro Profissional (CREA / CRT)</label>
                      <input
                        type="text"
                        value={formData.professionalReg || ''}
                        onChange={(e) => setFormData({ ...formData, professionalReg: e.target.value })}
                        className="w-full border border-slate-300 rounded-lg p-2 bg-slate-50 font-mono"
                        placeholder="Ex: CFT-BA 123456"
                      />
                    </div>

                    <div>
                      <label className="block font-semibold mb-1">Validade Anuidade Reg. Profissional</label>
                      <input
                        type="date"
                        value={formData.professionalRegValidity || ''}
                        onChange={(e) => setFormData({ ...formData, professionalRegValidity: e.target.value })}
                        className="w-full border border-slate-300 rounded-lg p-2 bg-slate-50 font-mono"
                      />
                    </div>



                    <div>
                      <label className="block font-semibold mb-1">Escolaridade / Nível de Instrução</label>
                      <select
                        value={formData.educationLevel || 'Ensino Técnico'}
                        onChange={(e) => setFormData({ ...formData, educationLevel: e.target.value })}
                        className="w-full border border-slate-300 rounded-lg p-2 bg-slate-50"
                      >
                        <option value="Ensino Médio">Ensino Médio Completo</option>
                        <option value="Ensino Técnico">Ensino Técnico / Profissionalizante</option>
                        <option value="Ensino Superior Incompleto">Ensino Superior Incompleto</option>
                        <option value="Ensino Superior Completo">Ensino Superior Completo</option>
                        <option value="Pós-Graduação / Especialização">Pós-Graduação / Especialização</option>
                      </select>
                    </div>

                    {/* SEÇÃO ESPECIAL: ASO POR CONTRATO E ÁREA */}
                    <div className="md:col-span-3 bg-blue-50/60 border border-blue-200 p-4 rounded-xl space-y-4">
                      <div className="flex items-center justify-between border-b border-blue-200 pb-2">
                        <div className="flex items-center space-x-2">
                          <Stethoscope className="h-5 w-5 text-royal-blue" />
                          <div>
                            <h5 className="font-bold text-slate-900 text-sm">
                              ASOs (Atestados de Saúde Ocupacional) Por Contrato / Unidade / Área
                            </h5>
                            <p className="text-xs text-slate-600">
                              Cadastre exames médicos específicos por área de atuação ou contrato do colaborador.
                            </p>
                          </div>
                        </div>
                        <span className="text-[11px] font-mono font-bold bg-royal-blue text-white px-2.5 py-1 rounded-full">
                          {((employeeAsos || []).filter(a => a.employeeId === (formData.id || formData.username || selectedUser?.id || selectedUser?.username)).length + (formData.asoContracts || []).length)} ASO(s) Registrado(s)
                        </span>
                      </div>

                      {/* SUB-FORMULÁRIO DE ADIÇÃO DE ASO */}
                      <div className="bg-white p-3.5 rounded-xl border border-slate-200 space-y-3">
                        <h6 className="text-xs font-bold text-slate-800 uppercase tracking-wide">
                          + Adicionar Exame ASO Por Contrato
                        </h6>

                        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-3 text-xs">
                          <div>
                            <label className="block font-semibold text-slate-700 mb-1">Contrato / Cliente *</label>
                            <input
                              type="text"
                              value={newAsoContractName}
                              onChange={(e) => setNewAsoContractName(e.target.value)}
                              placeholder="Ex: Contrato Braskem, Petrobras RNC..."
                              className="w-full border border-slate-300 rounded-lg p-2 bg-slate-50 font-bold"
                            />
                          </div>

                          <div>
                            <label className="block font-semibold text-slate-700 mb-1">Unidade / Área / Setor</label>
                            <input
                              type="text"
                              value={newAsoUnitArea}
                              onChange={(e) => setNewAsoUnitArea(e.target.value)}
                              placeholder="Ex: Unidade PVC1 / Área Industrial"
                              className="w-full border border-slate-300 rounded-lg p-2 bg-slate-50"
                            />
                          </div>

                          <div>
                            <label className="block font-semibold text-slate-700 mb-1">Tipo de Exame</label>
                            <select
                              value={newAsoExamType}
                              onChange={(e) => setNewAsoExamType(e.target.value)}
                              className="w-full border border-slate-300 rounded-lg p-2 bg-slate-50 font-semibold"
                            >
                              <option value="Admissional">Admissional</option>
                              <option value="Periódico">Periódico</option>
                              <option value="Mudança de Risco">Mudança de Risco</option>
                              <option value="Retorno ao Trabalho">Retorno ao Trabalho</option>
                              <option value="Demissional">Demissional</option>
                            </select>
                          </div>

                          <div>
                            <label className="block font-semibold text-slate-700 mb-1">Parecer Médico *</label>
                            <select
                              value={newAsoStatus}
                              onChange={(e) => setNewAsoStatus(e.target.value as any)}
                              className="w-full border border-slate-300 rounded-lg p-2 bg-slate-50 font-bold"
                            >
                              <option value="Apto">Apto</option>
                              <option value="Apto com Restrições">Apto com Restrições</option>
                              <option value="Inapto">Inapto</option>
                              <option value="Pendente">Pendente</option>
                            </select>
                          </div>

                          <div>
                            <label className="block font-semibold text-slate-700 mb-1">Data da Realização</label>
                            <input
                              type="date"
                              value={newAsoExamDate}
                              onChange={(e) => setNewAsoExamDate(e.target.value)}
                              className="w-full border border-slate-300 rounded-lg p-2 bg-slate-50 font-mono"
                            />
                          </div>

                          <div>
                            <label className="block font-semibold text-slate-700 mb-1">Validade do ASO *</label>
                            <input
                              type="date"
                              value={newAsoValidityDate}
                              onChange={(e) => setNewAsoValidityDate(e.target.value)}
                              className="w-full border border-slate-300 rounded-lg p-2 bg-slate-50 font-mono font-bold text-royal-blue"
                            />
                          </div>

                          <div>
                            <label className="block font-semibold text-slate-700 mb-1">Clínica / Médico CRM</label>
                            <input
                              type="text"
                              value={newAsoClinicDoctor}
                              onChange={(e) => setNewAsoClinicDoctor(e.target.value)}
                              placeholder="Ex: Medicina do Trabalho / CRM 12345"
                              className="w-full border border-slate-300 rounded-lg p-2 bg-slate-50"
                            />
                          </div>

                          <div>
                            <label className="block font-semibold text-slate-700 mb-1">Anexo ASO (Digitalizado)</label>
                            <input
                              type="file"
                              accept="image/*,application/pdf"
                              onChange={(e) => setNewAsoDocFile(e.target.files ? e.target.files[0] : null)}
                              className="w-full text-xs text-slate-500 file:mr-2 file:py-1 file:px-2 file:rounded-md file:border-0 file:text-xs file:font-semibold file:bg-blue-100 file:text-royal-blue hover:file:bg-blue-200 cursor-pointer"
                            />
                          </div>

                          <div className="sm:col-span-2 md:col-span-3">
                            <label className="block font-semibold text-slate-700 mb-1">Observações / Restrições Médicas</label>
                            <input
                              type="text"
                              value={newAsoNotes}
                              onChange={(e) => setNewAsoNotes(e.target.value)}
                              placeholder="Ex: Apto para trabalho em altura (NR-35) e espaço confinado (NR-33)"
                              className="w-full border border-slate-300 rounded-lg p-2 bg-slate-50"
                            />
                          </div>

                          <div className="sm:col-span-2 md:col-span-1 flex items-end">
                            <button
                              type="button"
                              onClick={handleAddAsoContract}
                              className="w-full py-2 px-3 bg-royal-blue text-white rounded-lg hover:bg-blue-700 font-bold flex items-center justify-center space-x-1.5 shadow-sm transition-colors cursor-pointer"
                            >
                              <Plus className="h-4 w-4" />
                              <span>Adicionar ASO</span>
                            </button>
                          </div>
                        </div>
                      </div>

                      {/* LISTA DE ASOs CADASTRADOS POR CONTRATO */}
                      {(() => {
                        const asoRecords = [
                          ...(formData.asoContracts || []),
                          ...(employeeAsos || []).filter(a => a.employeeId === (formData.id || formData.username || selectedUser?.id || selectedUser?.username))
                        ].filter((v,i,a) => a.findIndex(t=>(t.id === v.id))===i);
                        
                        return asoRecords.length > 0 && (
                        <div className="space-y-2">
                          <h6 className="text-xs font-bold text-slate-800 uppercase tracking-wide">
                            ASOs Ativos Cadastrados:
                          </h6>
                          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                            {asoRecords.map((asoItem, idx) => {
                              const valDate = asoItem.validityDate ? new Date(asoItem.validityDate) : null;
                              const today = new Date();
                              today.setHours(0,0,0,0);
                              const diffDays = valDate ? Math.ceil((valDate.getTime() - today.getTime()) / (1000 * 3600 * 24)) : 999;
                              const isExpired = diffDays < 0;
                              const isExpiringSoon = diffDays >= 0 && diffDays <= 30;

                              return (
                                <div
                                  key={asoItem.id || idx}
                                  className="p-3 bg-white border border-slate-200 rounded-xl flex flex-col justify-between space-y-2 shadow-xs"
                                >
                                  <div className="flex items-start justify-between gap-2">
                                    <div>
                                      <div className="flex items-center space-x-2">
                                        <h6 className="font-bold text-slate-900 text-xs">{asoItem.contractName}</h6>
                                        <span className="text-[10px] px-2 py-0.5 rounded bg-slate-100 border text-slate-700 font-semibold">
                                          {asoItem.unitArea}
                                        </span>
                                      </div>
                                      <p className="text-[11px] text-slate-500 mt-0.5">
                                        Tipo: <b>{asoItem.examType}</b> {asoItem.clinicDoctor ? `• Clínica: ${asoItem.clinicDoctor}` : ''}
                                      </p>
                                    </div>

                                    <div className="flex flex-col items-end gap-1">
                                      <span
                                        className={`text-[10px] font-extrabold px-2 py-0.5 rounded uppercase ${
                                          asoItem.status === 'Apto'
                                            ? 'bg-emerald-100 text-emerald-800 border border-emerald-300'
                                            : asoItem.status === 'Apto com Restrições'
                                            ? 'bg-amber-100 text-amber-800 border border-amber-300'
                                            : asoItem.status === 'Inapto'
                                            ? 'bg-rose-100 text-rose-800 border border-rose-300'
                                            : 'bg-slate-100 text-slate-800 border border-slate-300'
                                        }`}
                                      >
                                        {asoItem.status}
                                      </span>

                                      {isExpired ? (
                                        <span className="text-[9px] font-extrabold bg-rose-600 text-white px-1.5 py-0.5 rounded">
                                          Vencido há {Math.abs(diffDays)}d
                                        </span>
                                      ) : isExpiringSoon ? (
                                        <span className="text-[9px] font-extrabold bg-amber-500 text-white px-1.5 py-0.5 rounded">
                                          Vence em {diffDays}d
                                        </span>
                                      ) : null}
                                    </div>
                                  </div>

                                  <div className="flex items-center justify-between pt-2 border-t border-slate-100 text-[11px]">
                                    <div className="text-slate-600 font-mono">
                                      Validade: <b className={isExpired ? 'text-rose-600' : isExpiringSoon ? 'text-amber-600' : 'text-slate-900'}>{asoItem.validityDate}</b>
                                    </div>

                                    <div className="flex items-center space-x-1.5">
                                      {asoItem.docUrl && (
                                        <div className="flex items-center space-x-1">
                                          <button
                                            onClick={(e) => {
                                              e.preventDefault();
                                              if (asoItem.docUrl?.startsWith("data:")) {
                                                try {
                                                  const byteString = atob(asoItem.docUrl.split(",")[1]);
                                                  const mimeString = asoItem.docUrl.split(",")[0].split(":")[1].split(";")[0];
                                                  const ab = new ArrayBuffer(byteString.length);
                                                  const ia = new Uint8Array(ab);
                                                  for (let i = 0; i < byteString.length; i++) {
                                                    ia[i] = byteString.charCodeAt(i);
                                                  }
                                                  const blob = new Blob([ab], { type: mimeString });
                                                  const blobUrl = URL.createObjectURL(blob);
                                                  window.open(blobUrl, "_blank");
                                                } catch (err) {
                                                  console.error("Erro ao abrir ASO", err);
                                                  alert("Erro ao abrir o ASO.");
                                                }
                                              } else {
                                                window.open(asoItem.docUrl, "_blank");
                                              }
                                            }}
                                            className="p-1 text-royal-blue hover:bg-blue-50 rounded transition-colors cursor-pointer"
                                            title="Visualizar Anexo ASO"
                                          >
                                            <Eye className="h-4 w-4" />
                                          </button>
                                          <a
                                            href={asoItem.docUrl}
                                            download={`ASO_${(formData.name || 'Colaborador').replace(/\s+/g, '_')}_${asoItem.validityDate}`}
                                            className="p-1 text-emerald-600 hover:bg-emerald-50 rounded transition-colors"
                                            title="Baixar ASO"
                                          >
                                            <Download className="h-4 w-4" />
                                          </a>
                                        </div>
                                      )}
                                      <button
                                        type="button"
                                        onClick={() => handleRemoveAsoContract(asoItem.id)}
                                        className="p-1 text-rose-600 hover:bg-rose-50 rounded transition-colors cursor-pointer"
                                        title="Excluir ASO"
                                      >
                                        <Trash2 className="h-4 w-4" />
                                      </button>
                                    </div>
                                  </div>

                                  {asoItem.notes && (
                                    <p className="text-[10px] text-slate-600 bg-slate-50 p-1.5 rounded border border-slate-100 italic">
                                      Obs: {asoItem.notes}
                                    </p>
                                  )}
                                </div>
                              );
                            })}
                          </div>
                        </div>
                      );})()}
                    </div>

                    {/* SEÇÃO ESPECIAL: TREINAMENTOS DE NR, CAPACITAÇÕES E CERTIFICAÇÕES */}
                    <div className="md:col-span-3 bg-amber-50/60 border border-amber-200 p-4 rounded-xl space-y-4">
                      <div className="flex items-center justify-between border-b border-amber-200 pb-2">
                        <div className="flex items-center space-x-2">
                          <Award className="h-5 w-5 text-amber-700" />
                          <div>
                            <h5 className="font-bold text-slate-900 text-sm">
                              Treinamentos de NR, Capacitações Técnicas e Certificações
                            </h5>
                            <p className="text-xs text-slate-600">
                              Lançamento de cursos de Normas Regulamentadoras (NRs), validades de certificados e habilitações do colaborador.
                            </p>
                          </div>
                        </div>
                      </div>

                      {/* SUB-FORMULÁRIO DE LANÇAMENTO DE TREINAMENTO NR */}
                      <div className="bg-white p-3.5 rounded-xl border border-slate-200 space-y-3">
                        <h6 className="text-xs font-bold text-slate-800 uppercase tracking-wide">
                          Lançar / Registrar Novo Treinamento, Capacitação ou Reciclagem de NR
                        </h6>

                        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-3 text-xs">
                          <div className="sm:col-span-2">
                            <label className="block font-semibold text-slate-700 mb-1">Catálogo de Treinamentos / NRs *</label>
                            <select
                              value={newNrTrainingId}
                              onChange={(e) => setNewNrTrainingId(e.target.value)}
                              className="w-full border border-slate-300 rounded-lg p-2 bg-slate-50 font-bold"
                            >
                              <option value="">Selecione um curso do catálogo ou digite abaixo...</option>
                              <optgroup label="Cursos / Certificações (Perfil)">
                                {standardNrOptions.map((nr, idx) => (
                                  <option key={`std-${idx}`} value={`std-${nr}`}>{nr}</option>
                                ))}
                              </optgroup>
                              <optgroup label="Catálogo de Treinamentos (Corporativo)">
                                {(trainings || []).map((tr: any) => (
                                  <option key={tr.id} value={tr.id}>
                                    {tr.name} ({tr.workloadHours || 0}h • Validade: {tr.validityMonths ? `${tr.validityMonths}m` : 'Sem Vencimento'})
                                  </option>
                                ))}
                              </optgroup>
                              <option value="custom">Outro (Informar Nome Manualmente)</option>
                            </select>
                          </div>

                          {(!newNrTrainingId || newNrTrainingId === 'custom' || newNrTrainingId.startsWith('std-')) && (
                            <div className="sm:col-span-2">
                              <label className="block font-semibold text-slate-700 mb-1">Nome do Curso / NR (Manual) *</label>
                              <input
                                type="text"
                                value={newNrTrainingId.startsWith('std-') ? newNrTrainingId.replace('std-', '') : newNrCustomName}
                                onChange={(e) => setNewNrCustomName(e.target.value)}
                                disabled={newNrTrainingId.startsWith('std-')}
                                placeholder="Ex: NR-10 Módulo Avançado, NR-35 Prático..."
                                className="w-full border border-slate-300 rounded-lg p-2 bg-slate-50 font-bold"
                              />
                            </div>
                          )}

                          <div>
                            <label className="block font-semibold text-slate-700 mb-1">Data da Realização</label>
                            <input
                              type="date"
                              value={newNrCompletionDate}
                              onChange={(e) => setNewNrCompletionDate(e.target.value)}
                              className="w-full border border-slate-300 rounded-lg p-2 bg-slate-50 font-mono"
                            />
                          </div>

                          <div>
                            <label className="block font-semibold text-slate-700 mb-1">Data de Validade (Vencimento)</label>
                            <input
                              type="date"
                              value={newNrExpirationDate}
                              onChange={(e) => setNewNrExpirationDate(e.target.value)}
                              placeholder="Calculado auto se em branco"
                              className="w-full border border-slate-300 rounded-lg p-2 bg-slate-50 font-mono font-bold text-amber-700"
                            />
                          </div>



                          <div>
                            <label className="block font-semibold text-slate-700 mb-1">Status do Treinamento</label>
                            <select
                              value={newNrStatus}
                              onChange={(e) => setNewNrStatus(e.target.value as any)}
                              className="w-full border border-slate-300 rounded-lg p-2 bg-slate-50 font-bold text-slate-900"
                            >
                              <option value="Válido">Válido</option>
                              <option value="Agendado">Agendado</option>
                              <option value="Pendente">Pendente</option>
                              <option value="Vencido">Vencido</option>
                            </select>
                          </div>

                          <div>
                            <label className="block font-semibold text-slate-700 mb-1">Instituição / Instrutor</label>
                            <input
                              type="text"
                              value={newNrInstitution}
                              onChange={(e) => setNewNrInstitution(e.target.value)}
                              placeholder="Ex: COMANINS, SENAI..."
                              className="w-full border border-slate-300 rounded-lg p-2 bg-slate-50"
                            />
                          </div>

                          <div>
                            <label className="block font-semibold text-slate-700 mb-1">Resultado / Nota</label>
                            <input
                              type="text"
                              value={newNrResult}
                              onChange={(e) => setNewNrResult(e.target.value)}
                              placeholder="Ex: Aprovado (100%)"
                              className="w-full border border-slate-300 rounded-lg p-2 bg-slate-50 font-semibold"
                            />
                          </div>

                          <div className="sm:col-span-2">
                            <label className="block font-semibold text-slate-700 mb-1">Anexar Certificado (PDF ou Foto)</label>
                            <label className="cursor-pointer w-full bg-white border border-slate-300 rounded-lg p-2 flex items-center justify-between text-slate-600 hover:bg-slate-100 transition-colors">
                              <span className="truncate max-w-[200px] font-mono text-[11px]">
                                {newNrCertificateFile ? newNrCertificateFile.name : 'Selecionar arquivo...'}
                              </span>
                              <Upload className="h-4 w-4 text-amber-700 shrink-0 ml-1" />
                              <input
                                type="file"
                                accept=".pdf,image/*"
                                className="hidden"
                                onChange={(e) => {
                                  if (e.target.files && e.target.files[0]) {
                                    setNewNrCertificateFile(e.target.files[0]);
                                  }
                                }}
                              />
                            </label>
                          </div>

                          <div className="sm:col-span-2 md:col-span-4 flex justify-end pt-1">
                            <button
                              type="button"
                              onClick={handleAddNrTraining}
                              disabled={isSavingNrTraining}
                              className="py-2.5 px-5 bg-amber-600 hover:bg-amber-700 text-white rounded-lg font-bold flex items-center space-x-2 shadow-sm transition-all cursor-pointer disabled:opacity-50"
                            >
                              <Plus className="h-4 w-4" />
                              <span>{isSavingNrTraining ? 'Lançando...' : 'Lançar Treinamento NR'}</span>
                            </button>
                          </div>
                        </div>
                      </div>

                      {/* 3. LISTA DE TREINAMENTOS DE NR CADASTRADOS PARA ESTE COLABORADOR */}
                      {(() => {
                        const currentEmpId = formData.id || formData.username || selectedUser?.id || selectedUser?.username;
                        const currentEmpName = formData.name || selectedUser?.name;
                        const userRecords = (employeeTrainings || []).filter(
                          (t: any) =>
                            t.employeeId === currentEmpId ||
                            t.employeeId === selectedUser?.id ||
                            t.employeeId === selectedUser?.username ||
                            t.employeeName === currentEmpName
                        );

                        if (userRecords.length === 0) return null;

                        return (
                          <div className="space-y-2">
                            <h6 className="text-xs font-bold text-slate-800 uppercase tracking-wide flex items-center justify-between">
                              <span>3. Treinamentos e NRs Registrados ({userRecords.length})</span>
                            </h6>
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                              {userRecords.map((rec: any, idx: number) => {
                                const trCat = (trainings || []).find((tr: any) => tr.id === rec.trainingId);
                                const name = trCat?.name || rec.trainingName || 'Treinamento NR';
                                const status = rec.dynamicStatus || rec.status || 'Válido';

                                let badgeColor = 'bg-emerald-100 text-emerald-800 border-emerald-300';
                                if (status === 'Vencido') badgeColor = 'bg-red-100 text-red-800 border-red-300';
                                if (status === 'Próximo do vencimento' || status === 'Pendente') badgeColor = 'bg-amber-100 text-amber-800 border-amber-300';
                                if (status === 'Agendado') badgeColor = 'bg-blue-100 text-blue-800 border-blue-300';

                                return (
                                  <div key={rec.id || idx} className="p-3 bg-white border border-slate-200 rounded-xl flex flex-col justify-between space-y-2 shadow-xs">
                                    <div className="flex items-start justify-between gap-2">
                                      <div>
                                        <h6 className="font-bold text-slate-900 text-xs">{name}</h6>
                                        <p className="text-[11px] text-slate-500 mt-0.5">
                                          Instituição: <b>{rec.institution || 'COMANINS'}</b> {rec.result ? `• Result: ${rec.result}` : ''}
                                        </p>
                                      </div>
                                      <span className={`text-[10px] font-extrabold px-2 py-0.5 rounded border ${badgeColor}`}>
                                        {status}
                                      </span>
                                    </div>

                                    <div className="flex items-center justify-between pt-2 border-t border-slate-100 text-[11px]">
                                      <div className="text-slate-600 font-mono">
                                        Realização: <b>{rec.completionDate ? new Date(rec.completionDate + (rec.completionDate.includes('T') ? '' : 'T00:00:00')).toLocaleDateString('pt-BR') : '-'}</b>
                                        {rec.expirationDate && (
                                          <span className="ml-2">
                                            Validade: <b className={status === 'Vencido' ? 'text-rose-600' : 'text-slate-900'}>{new Date(rec.expirationDate + (rec.expirationDate.includes('T') ? '' : 'T00:00:00')).toLocaleDateString('pt-BR')}</b>
                                          </span>
                                        )}
                                      </div>

                                      <div className="flex items-center space-x-1.5">
                                        {rec.certificateUrl && (
                                          <div className="flex items-center space-x-1">
                                            <button
                                              onClick={(e) => {
                                                e.preventDefault();
                                                if (rec.certificateUrl?.startsWith("data:")) {
                                                  try {
                                                    const byteString = atob(rec.certificateUrl.split(",")[1]);
                                                    const mimeString = rec.certificateUrl.split(",")[0].split(":")[1].split(";")[0];
                                                    const ab = new ArrayBuffer(byteString.length);
                                                    const ia = new Uint8Array(ab);
                                                    for (let i = 0; i < byteString.length; i++) {
                                                      ia[i] = byteString.charCodeAt(i);
                                                    }
                                                    const blob = new Blob([ab], { type: mimeString });
                                                    const blobUrl = URL.createObjectURL(blob);
                                                    window.open(blobUrl, "_blank");
                                                  } catch (err) {
                                                    console.error("Erro ao abrir certificado", err);
                                                    alert("Erro ao abrir o certificado.");
                                                  }
                                                } else {
                                                  window.open(rec.certificateUrl, "_blank");
                                                }
                                              }}
                                              className="p-1 text-royal-blue hover:bg-blue-50 rounded transition-colors cursor-pointer"
                                              title="Ver Certificado"
                                            >
                                              <Eye className="h-4 w-4" />
                                            </button>
                                            <a
                                              href={rec.certificateUrl}
                                              download={`Certificado_${name.replace(/\s+/g, '_')}_${currentEmpName?.replace(/\s+/g, '_') || 'Colaborador'}`}
                                              className="p-1 text-emerald-600 hover:bg-emerald-50 rounded transition-colors"
                                              title="Baixar Certificado"
                                            >
                                              <Download className="h-4 w-4" />
                                            </a>
                                          </div>
                                        )}
                                        {isUserAdmin && (
                                          <button
                                            type="button"
                                            onClick={() => handleRemoveNrTraining(rec.id)}
                                            className="p-1 text-rose-600 hover:bg-rose-50 rounded transition-colors cursor-pointer"
                                            title="Excluir Registro de Treinamento"
                                          >
                                            <Trash2 className="h-4 w-4" />
                                          </button>
                                        )}
                                      </div>
                                    </div>
                                  </div>
                                );
                              })}
                            </div>
                          </div>
                        );
                      })()}
                    </div>
                  </div>
                </div>
              )}

              {/* TAB 5: DADOS BANCÁRIOS E BENEFÍCIOS */}
              {activeFormTab === 5 && (
                <div className="space-y-4">
                  <h4 className="font-bold text-slate-900 border-b border-slate-200 pb-2 text-sm flex items-center space-x-2">
                    <CreditCard className="h-4 w-4 text-royal-blue" />
                    <span>5. Dados Bancários, Chave Pix e Benefícios (LGPD Restrito)</span>
                  </h4>

                  {!isAuthorizedRH ? (
                    <div className="p-6 bg-amber-50 border border-amber-200 rounded-xl text-center space-y-2">
                      <Lock className="h-8 w-8 text-amber-700 mx-auto" />
                      <h5 className="font-bold text-amber-900">Acesso Restrito ao Setor de RH / Financeiro</h5>
                      <p className="text-xs text-amber-800">
                        Os dados bancários, salariais e de benefícios são sigilosos e protegidos pela LGPD (Lei nº 13.709/2018).
                      </p>
                    </div>
                  ) : (
                    <div className="space-y-4">
                      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                        <div>
                          <label className="block font-semibold mb-1">Banco</label>
                          <input
                            type="text"
                            value={formData.bank || ''}
                            onChange={(e) => setFormData({ ...formData, bank: e.target.value })}
                            className="w-full border border-slate-300 rounded-lg p-2 bg-slate-50"
                            placeholder="Ex: Banco do Brasil, Itaú..."
                          />
                        </div>

                        <div>
                          <label className="block font-semibold mb-1">Agência e Conta</label>
                          <div className="grid grid-cols-2 gap-2">
                            <input
                              type="text"
                              value={formData.bankAgency || ''}
                              onChange={(e) => setFormData({ ...formData, bankAgency: e.target.value })}
                              className="w-full border border-slate-300 rounded-lg p-2 bg-slate-50 font-mono"
                              placeholder="Agência"
                            />
                            <input
                              type="text"
                              value={formData.bankAccount || ''}
                              onChange={(e) => setFormData({ ...formData, bankAccount: e.target.value })}
                              className="w-full border border-slate-300 rounded-lg p-2 bg-slate-50 font-mono"
                              placeholder="Conta com DV"
                            />
                          </div>
                        </div>

                        <div>
                          <label className="block font-semibold mb-1">Tipo de Conta</label>
                          <select
                            value={formData.accountType || 'Corrente'}
                            onChange={(e) => setFormData({ ...formData, accountType: e.target.value })}
                            className="w-full border border-slate-300 rounded-lg p-2 bg-slate-50"
                          >
                            <option value="Corrente">Conta Corrente</option>
                            <option value="Poupança">Conta Poupança</option>
                            <option value="Salário">Conta Salário</option>
                          </select>
                        </div>

                        <div className="md:col-span-2">
                          <label className="block font-semibold mb-1">Chave Pix Institucional/Pessoal</label>
                          <input
                            type="text"
                            value={formData.pixKey || ''}
                            onChange={(e) => setFormData({ ...formData, pixKey: e.target.value })}
                            className="w-full border border-slate-300 rounded-lg p-2 bg-slate-50 font-mono"
                            placeholder="CPF, E-mail, Celular ou Chave Aleatória"
                          />
                        </div>
                      </div>

                      {/* BENEFÍCIOS */}
                      <div className="pt-2 border-t border-slate-200">
                        <h5 className="font-bold text-slate-800 mb-2">Benefícios Concedidos:</h5>
                        <div className="grid grid-cols-2 md:grid-cols-4 gap-3 bg-slate-50 p-3 rounded-xl border border-slate-200">
                          <label className="flex items-center space-x-2 font-semibold">
                            <input
                              type="checkbox"
                              checked={!!formData.transporteBenefit}
                              onChange={(e) => setFormData({ ...formData, transporteBenefit: e.target.checked })}
                              className="rounded text-royal-blue"
                            />
                            <span>Vale-Transporte</span>
                          </label>

                          <label className="flex items-center space-x-2 font-semibold">
                            <input
                              type="checkbox"
                              checked={!!formData.alimentacaoBenefit}
                              onChange={(e) => setFormData({ ...formData, alimentacaoBenefit: e.target.checked })}
                              className="rounded text-royal-blue"
                            />
                            <span>Vale-Alimentação/Refeição</span>
                          </label>

                          <label className="flex items-center space-x-2 font-semibold">
                            <input
                              type="checkbox"
                              checked={!!formData.healthPlan}
                              onChange={(e) => setFormData({ ...formData, healthPlan: e.target.checked })}
                              className="rounded text-royal-blue"
                            />
                            <span>Plano de Saúde/Odonto</span>
                          </label>

                          <label className="flex items-center space-x-2 font-semibold">
                            <input
                              type="checkbox"
                              checked={!!formData.lifeInsurance}
                              onChange={(e) => setFormData({ ...formData, lifeInsurance: e.target.checked })}
                              className="rounded text-royal-blue"
                            />
                            <span>Seguro de Vida</span>
                          </label>
                        </div>
                      </div>

                      {/* DEPENDENTES */}
                      <div className="pt-2 border-t border-slate-200 space-y-3">
                        <h5 className="font-bold text-slate-800">Dependentes (Salário Família / Imposto de Renda):</h5>

                        <div className="grid grid-cols-1 md:grid-cols-4 gap-2 bg-slate-100 p-3 rounded-xl">
                          <input
                            type="text"
                            placeholder="Nome do Dependente"
                            value={newDepName}
                            onChange={(e) => setNewDepName(e.target.value)}
                            className="border border-slate-300 rounded p-1.5 bg-white"
                          />
                          <select
                            value={newDepKinship}
                            onChange={(e) => setNewDepKinship(e.target.value)}
                            className="border border-slate-300 rounded p-1.5 bg-white"
                          >
                            <option value="Filho(a)">Filho(a)</option>
                            <option value="Cônjuge/Companheiro(a)">Cônjuge/Companheiro(a)</option>
                            <option value="Pai/Mãe">Pai/Mãe</option>
                            <option value="Outro">Outro</option>
                          </select>
                          <input
                            type="date"
                            value={newDepBirthDate}
                            onChange={(e) => setNewDepBirthDate(e.target.value)}
                            className="border border-slate-300 rounded p-1.5 bg-white font-mono"
                          />
                          <button
                            type="button"
                            onClick={handleAddDependent}
                            className="bg-royal-blue text-white font-bold rounded p-1.5 hover:bg-blue-700 transition-colors flex items-center justify-center space-x-1"
                          >
                            <Plus className="h-4 w-4" />
                            <span>Adicionar</span>
                          </button>
                        </div>

                        {formData.dependents && formData.dependents.length > 0 && (
                          <div className="divide-y divide-slate-200 border rounded-xl overflow-hidden bg-white">
                            {formData.dependents.map((dep, idx) => (
                              <div key={idx} className="p-2.5 flex items-center justify-between text-xs">
                                <div>
                                  <span className="font-bold text-slate-900">{dep.name}</span>
                                  <span className="text-slate-500 ml-2 font-mono">({dep.kinship})</span>
                                  {dep.birthDate && (
                                    <span className="text-slate-500 ml-2">Nasc: {dep.birthDate}</span>
                                  )}
                                </div>
                                <button
                                  type="button"
                                  onClick={() => handleRemoveDependent(idx)}
                                  className="text-rose-600 hover:text-rose-800 p-1"
                                >
                                  <Trash2 className="h-4 w-4" />
                                </button>
                              </div>
                            ))}
                          </div>
                        )}
                      </div>
                    </div>
                  )}
                </div>
              )}

              {/* TAB 6: EMERGÊNCIA */}
              {activeFormTab === 6 && (
                <div className="space-y-4">
                  <h4 className="font-bold text-slate-900 border-b border-slate-200 pb-2 text-sm flex items-center space-x-2">
                    <HeartPulse className="h-4 w-4 text-royal-blue" />
                    <span>6. Contatos e Ficha de Emergência</span>
                  </h4>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label className="block font-semibold mb-1">Nome do Contato de Emergência</label>
                      <input
                        type="text"
                        value={formData.emergencyContactName || ''}
                        onChange={(e) => setFormData({ ...formData, emergencyContactName: e.target.value })}
                        className="w-full border border-slate-300 rounded-lg p-2 bg-slate-50 font-bold"
                        placeholder="Nome da pessoa a ser avisada"
                      />
                    </div>

                    <div>
                      <label className="block font-semibold mb-1">Grau de Parentesco</label>
                      <input
                        type="text"
                        value={formData.emergencyKinship || ''}
                        onChange={(e) => setFormData({ ...formData, emergencyKinship: e.target.value })}
                        className="w-full border border-slate-300 rounded-lg p-2 bg-slate-50"
                        placeholder="Ex: Cônjuge, Mãe, Irmão..."
                      />
                    </div>

                    <div>
                      <label className="block font-semibold mb-1">Telefone Principal de Emergência</label>
                      <input
                        type="text"
                        value={formData.emergencyPhone || ''}
                        onChange={(e) => setFormData({ ...formData, emergencyPhone: maskPhone(e.target.value) })}
                        className="w-full border border-slate-300 rounded-lg p-2 bg-slate-50 font-mono font-bold text-rose-700"
                        placeholder="(71) 99999-9999"
                      />
                    </div>

                    <div>
                      <label className="block font-semibold mb-1">Telefone Alternativo de Emergência</label>
                      <input
                        type="text"
                        value={formData.emergencyPhoneAlt || ''}
                        onChange={(e) => setFormData({ ...formData, emergencyPhoneAlt: maskPhone(e.target.value) })}
                        className="w-full border border-slate-300 rounded-lg p-2 bg-slate-50 font-mono"
                        placeholder="(71) 98888-8888"
                      />
                    </div>

                    {/* Informações Médicas LGPD Restritas */}
                    <div className="md:col-span-2 bg-rose-50 border border-rose-200 p-4 rounded-xl space-y-2">
                      <div className="flex items-center space-x-2">
                        <Lock className="h-4 w-4 text-rose-700" />
                        <label className="font-bold text-rose-900 text-xs uppercase">
                          Informações Médicas Indispensáveis para Emergências (LGPD Restrito)
                        </label>
                      </div>

                      {isAuthorizedRH ? (
                        <textarea
                          rows={3}
                          value={formData.medicalInfo || ''}
                          onChange={(e) => setFormData({ ...formData, medicalInfo: e.target.value })}
                          className="w-full border border-slate-300 rounded-lg p-2 bg-white text-xs"
                          placeholder="Tipo sanguíneo, alergias conhecidas, uso de medicamentos contínuos, hipertensão, diabetes, observações médicas..."
                        />
                      ) : (
                        <div className="p-2 bg-slate-200 rounded text-slate-600 font-mono italic">
                          🔒 Informações médicas sensíveis com acesso restrito a RH e Médicos do Trabalho (LGPD).
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              )}

              {/* TAB 7: CONTROLE INTERNO */}
              {activeFormTab === 7 && (
                <div className="space-y-4">
                  <h4 className="font-bold text-slate-900 border-b border-slate-200 pb-2 text-sm flex items-center space-x-2">
                    <Key className="h-4 w-4 text-royal-blue" />
                    <span>7. Controle Interno, Login do Sistema e Equipamentos</span>
                  </h4>

                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div>
                      <label className="block font-semibold mb-1">Nome de Usuário (Login do Sistema) *</label>
                      <input
                        type="text"
                        required
                        value={formData.username || ''}
                        onChange={(e) => setFormData({ ...formData, username: e.target.value.toLowerCase().trim() })}
                        className="w-full border border-slate-300 rounded-lg p-2 bg-slate-50 font-mono font-bold text-royal-blue"
                        placeholder="Ex: joaosilva"
                      />
                    </div>

                    <div>
                      <label className="block font-semibold mb-1">Senha de Acesso ao Portal</label>
                      <input
                        type="text"
                        value={formData.password || ''}
                        onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                        className="w-full border border-slate-300 rounded-lg p-2 bg-slate-50 font-mono"
                        placeholder="Senha de acesso"
                      />
                    </div>

                    <div>
                      <label className="block font-semibold mb-1">Nível de Permissão no Sistema</label>
                      <select
                        value={(formData as any).permissionLevel || 'Padrão'}
                        onChange={(e) => setFormData({ ...formData, permissionLevel: e.target.value } as any)}
                        className="w-full border border-slate-300 rounded-lg p-2 bg-slate-50 font-bold"
                      >
                        <option value="Administrador">Administrador (Total)</option>
                        <option value="Padrão">Padrão (Intermediário)</option>
                        <option value="Limitado">Limitado (Restrito)</option>
                      </select>
                    </div>

                    <div className="md:col-span-3">
                      <label className="block font-semibold mb-1">Equipamentos e TI Entregues</label>
                      <input
                        type="text"
                        value={formData.deliveredEquipments || ''}
                        onChange={(e) => setFormData({ ...formData, deliveredEquipments: e.target.value })}
                        className="w-full border border-slate-300 rounded-lg p-2 bg-slate-50"
                        placeholder="Notebook, celular institucional, token, crachá..."
                      />
                    </div>

                    <div className="md:col-span-3">
                      <label className="block font-semibold mb-1">Uniformes e EPIs Entregues</label>
                      <input
                        type="text"
                        value={formData.deliveredUniformsEpi || ''}
                        onChange={(e) => setFormData({ ...formData, deliveredUniformsEpi: e.target.value })}
                        className="w-full border border-slate-300 rounded-lg p-2 bg-slate-50"
                        placeholder="Calçado de segurança, óculos, protetor auricular, jaleco..."
                      />
                    </div>

                    <div>
                      <label className="block font-semibold mb-1">Veículo Autorizado (Se aplicável)</label>
                      <input
                        type="text"
                        value={formData.authorizedVehicle || ''}
                        onChange={(e) => setFormData({ ...formData, authorizedVehicle: e.target.value })}
                        className="w-full border border-slate-300 rounded-lg p-2 bg-slate-50"
                        placeholder="Modelo / Placa"
                      />
                    </div>

                    <div className="md:col-span-2">
                      <label className="block font-semibold mb-1">Observações Administrativas Internas</label>
                      <textarea
                        rows={2}
                        value={formData.adminNotes || ''}
                        onChange={(e) => setFormData({ ...formData, adminNotes: e.target.value })}
                        className="w-full border border-slate-300 rounded-lg p-2 bg-slate-50"
                        placeholder="Anotações internas de RH..."
                      />
                    </div>

                    {/* SEÇÃO DE ANEXO DE DOCUMENTOS DIVERSOS DO COLABORADOR */}
                    <div className="md:col-span-3 pt-4 border-t border-slate-200 space-y-4">
                      <div className="flex items-center justify-between">
                        <div>
                          <h5 className="font-bold text-slate-900 text-sm flex items-center space-x-2">
                            <Paperclip className="h-4 w-4 text-royal-blue" />
                            <span>Documentos e Anexos Diversos do Colaborador</span>
                          </h5>
                          <p className="text-[11px] text-slate-500">
                            Anexe cópias digitalizadas de RG, CPF, CNH, ASO, Comprovante de Residência, Diplomas, Contratos ou Ficha de EPI.
                          </p>
                        </div>
                        <span className="bg-blue-50 text-royal-blue font-bold px-2.5 py-1 rounded-full text-xs border border-blue-200">
                          {(formData.attachedDocs || []).length} Documento(s) Anexado(s)
                        </span>
                      </div>

                      {/* Form para Adicionar Novo Documento */}
                      <div className="bg-slate-50 border border-slate-200 rounded-xl p-3.5 space-y-3">
                        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs">
                          <div>
                            <label className="block font-semibold mb-1 text-slate-700">Nome / Descrição do Documento</label>
                            <input
                              type="text"
                              value={newDocName}
                              onChange={(e) => setNewDocName(e.target.value)}
                              placeholder="Ex: CNH Digitalizada 2026, Cópia do RG..."
                              className="w-full border border-slate-300 rounded-lg p-2 bg-white"
                            />
                          </div>

                          <div>
                            <label className="block font-semibold mb-1 text-slate-700">Tipo de Documento</label>
                            <select
                              value={newDocType}
                              onChange={(e) => setNewDocType(e.target.value)}
                              className="w-full border border-slate-300 rounded-lg p-2 bg-white font-semibold"
                            >
                              <option value="RG / CPF">RG / CPF</option>
                              <option value="CNH">CNH</option>
                              <option value="ASO (Atestado Saúde)">ASO (Atestado Saúde)</option>
                              <option value="Comprovante de Residência">Comprovante de Residência</option>
                              <option value="Diploma / Certificado">Diploma / Certificado</option>
                              <option value="Contrato de Trabalho / CTPS">Contrato de Trabalho / CTPS</option>
                              <option value="Ficha de EPI">Ficha de EPI</option>
                              <option value="Outros Documentos">Outros Documentos</option>
                            </select>
                          </div>

                          <div>
                            <label className="block font-semibold mb-1 text-slate-700">Arquivo (PDF, Imagem, Word)</label>
                            <label className="cursor-pointer w-full bg-white border border-slate-300 rounded-lg p-2 flex items-center justify-between text-slate-600 hover:bg-slate-100 transition-colors">
                              <span className="truncate max-w-[180px] font-mono text-[11px]">
                                {newDocFiles.length > 0 ? `${newDocFiles.length} arquivo(s) selecionado(s)` : 'Selecionar arquivo(s).../'}
                              </span>
                              <Upload className="h-4 w-4 text-royal-blue shrink-0 ml-1" />
                              <input
                                type="file"
                                accept=".pdf,image/*,.doc,.docx"
                                className="hidden"
                                multiple
                                onChange={(e) => {
                                  const files = Array.from(e.target.files || []) as File[];
                                  if (files.length > 0) {
                                    const validFiles = files.filter(f => {
                                      if (f.size > 1000 * 1024) {
                                        alert('⚠️ ARQUIVO MUITO GRANDE!\n\nO arquivo ' + f.name + ' ultrapassa 1MB e será ignorado.');
                                        return false;
                                      }
                                      return true;
                                    });
                                    setNewDocFiles([...newDocFiles, ...validFiles]);
                                    if (!newDocName && validFiles.length > 0) {
                                      setNewDocName(validFiles[0].name.replace(/\.[^/.]+$/, ''));
                                    }
                                  }
                                }}
                              />
                            </label>
                            <p className="text-[10px] font-bold text-rose-600 mt-1.5 flex items-start space-x-1">
                              <span>⚠️</span>
                              <span>Tamanho máximo: 800KB por arquivo. Arquivos maiores não serão salvos.</span>
                            </p>
                          </div>
                        </div>

                        <div className="flex justify-end">
                          <button
                            type="button"
                            onClick={async () => {
                              if (!selectedUser) {
                                alert('Você precisa salvar o colaborador antes de anexar documentos. Crie o cadastro primeiro e depois edite para adicionar os arquivos.');
                                return;
                              }

                              if (!newDocName.trim()) {
                                alert('Por favor, informe uma descrição/nome para o documento.');
                                return;
                              }
                              if (newDocFiles.length === 0) {
                                alert('Por favor, selecione pelo menos um arquivo.');
                                return;
                              }
                              const empId = selectedUser?.id || formData.id || formData.username;
                              if (!empId) {
                                alert('Por favor, informe a Matrícula ou Nome de Usuário primeiro (aba 1 ou 7) ou salve o cadastro antes de anexar documentos.');
                                return;
                              }
                              
                              try {
                                const savedDocs = [];
                                for (let i = 0; i < newDocFiles.length; i++) {
                                  const f = newDocFiles[i];
                                  let fileUrl = "";
                                  if (f.type.startsWith('image/')) {
                                    fileUrl = await compressImageToWebResolution(f, 1200, 1200, 0.7);
                                  } else {
                                    fileUrl = await new Promise((resolve) => {
                                      const reader = new FileReader();
                                      reader.onloadend = () => resolve(reader.result as string);
                                      reader.readAsDataURL(f);
                                    });
                                  }

                                  const docName = newDocFiles.length > 1 ? `${newDocType} - ${newDocName.trim()} (${i+1})` : `${newDocType} - ${newDocName.trim()}`;
                                  const newDoc = {
                                    userId: empId,
                                    name: docName,
                                    type: newDocType,
                                    url: fileUrl,
                                    date: new Date().toLocaleDateString('pt-BR')
                                  };
                                  
                                  const savedDoc = await addEmployeeDocument(newDoc);
                                  savedDocs.push(savedDoc);
                                }
                                
                                setUserDocuments([...userDocuments, ...savedDocs]);
                                setNewDocName('');
                                setNewDocFiles([]);
                                alert('Documentos anexados com sucesso!');
                              } catch (err) {
                                alert("Erro ao salvar documento: " + err);
                              }
                            }}
                            className="bg-royal-blue hover:bg-blue-700 text-white px-4 py-2 rounded-lg text-xs font-bold transition-colors flex items-center space-x-1.5 shadow-sm"
                          >
                            <Plus className="h-4 w-4" />
                            <span>Anexar Documento</span>
                          </button>
                        </div>
                      </div>

                      {/* Lista de Documentos Anexados */}
                      <div className="space-y-2">
                        {isLoadingDocs ? (
                          <div className="flex justify-center p-4">
                             <span className="text-slate-400 text-xs">Carregando documentos...</span>
                          </div>
                        ) : userDocuments.length === 0 ? (
                          <p className="text-slate-400 italic text-[11px] text-center py-4 border border-dashed border-slate-200 rounded-xl bg-white">
                            Nenhum documento anexado ainda a este colaborador.
                          </p>
                        ) : (
                          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                            {userDocuments.map((docItem, index) => (
                              <div
                                key={docItem.id || index}
                                className="p-3 bg-white border border-slate-200 rounded-xl flex items-center justify-between hover:border-royal-blue/40 transition-colors shadow-sm"
                              >
                                <div className="flex items-center space-x-2.5 overflow-hidden pr-2">
                                  <div className="p-2 bg-blue-50 text-royal-blue rounded-lg border border-blue-100 shrink-0">
                                    <FileText className="h-4 w-4" />
                                  </div>
                                  <div className="overflow-hidden">
                                    <h6 className="font-bold text-slate-800 truncate text-xs">{docItem.name}</h6>
                                    <p className="text-[10px] text-slate-500 font-mono">Anexado em: {docItem.date || 'Hoje'}</p>
                                  </div>
                                </div>

                                <div className="flex items-center space-x-1 shrink-0">
                                  {docItem.url && (
                                    <a
                                      href={docItem.url}
                                      target="_blank"
                                      rel="noreferrer"
                                      className="p-1.5 text-royal-blue hover:bg-blue-50 rounded-lg transition-colors"
                                      title="Visualizar / Baixar Documento"
                                    >
                                      <Eye className="h-4 w-4" />
                                    </a>
                                  )}
                                  <button
                                    type="button"
                                    onClick={async () => {
                                      if (confirm('Deseja realmente excluir este anexo definitivamente?')) {
                                        try {
                                          await deleteEmployeeDocument(docItem.id);
                                          setUserDocuments(userDocuments.filter(d => d.id !== docItem.id));
                                        } catch (err) {
                                          alert("Erro ao excluir: " + err);
                                        }
                                      }
                                    }}
                                    className="p-1.5 text-rose-600 hover:bg-rose-50 rounded-lg transition-colors"
                                    title="Excluir Anexo"
                                  >
                                    <Trash2 className="h-4 w-4" />
                                  </button>
                                </div>
                              </div>
                            ))}
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              )}
              </div>

              {/* Modal Footer Buttons */}
              <div className="p-4 bg-slate-50 border-t border-slate-200 flex items-center justify-between shrink-0">
                <div className="flex space-x-2">
                  {activeFormTab > 1 && (
                    <button
                      type="button"
                      onClick={() => setActiveFormTab((prev) => prev - 1)}
                      className="px-4 py-2 border border-slate-300 rounded-xl text-slate-700 hover:bg-slate-100 font-semibold"
                    >
                      Anterior
                    </button>
                  )}
                  {activeFormTab < 7 && (
                    <button
                      type="button"
                      onClick={() => setActiveFormTab((prev) => prev + 1)}
                      className="px-4 py-2 bg-slate-800 text-white rounded-xl hover:bg-slate-900 font-semibold flex items-center space-x-1"
                    >
                      <span>Próximo Passo</span>
                      <ChevronRight className="h-4 w-4" />
                    </button>
                  )}
                </div>

                <div className="flex space-x-2">
                  <button
                    type="button"
                    onClick={() => setShowEditModal(false)}
                    className="px-4 py-2 border border-slate-300 rounded-xl text-slate-700 hover:bg-slate-100 font-semibold"
                  >
                    Cancelar
                  </button>

                  <button
                    type="submit"
                    className="px-6 py-2 bg-royal-blue text-white rounded-xl hover:bg-blue-700 font-extrabold flex items-center space-x-1.5 shadow-md"
                  >
                    <Check className="h-4 w-4" />
                    <span>Salvar Colaborador</span>
                  </button>
                </div>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL: FICHA COMPLETA DO COLABORADOR (VISUALIZAÇÃO E IMPRESSÃO DE FRE) */}
      {showViewModal && selectedUser && (
        <div className="fixed inset-0 z-50 bg-slate-900/70 backdrop-blur-sm flex items-center justify-center p-2 sm:p-4 overflow-y-auto">
          <div className="bg-white rounded-2xl max-w-4xl w-full max-h-[92vh] sm:max-h-[88vh] flex flex-col border border-slate-200 shadow-2xl overflow-hidden my-auto print:max-h-none print:my-0 print:border-none print:shadow-none">
            {/* Action Bar */}
            <div className="bg-slate-900 text-white p-4 flex justify-between items-center shrink-0 print:hidden">
              <div className="flex items-center space-x-2">
                <FileText className="h-5 w-5 text-teal-400" />
                <span className="font-extrabold text-sm">Ficha de Registro de Empregado (FRE)</span>
              </div>

              <div className="flex space-x-2">
                <button
                  type="button"
                  onClick={() => window.print()}
                  className="bg-white text-slate-800 font-bold px-3 py-1.5 rounded-lg text-xs hover:bg-slate-100 transition-colors flex items-center space-x-1"
                >
                  <Printer className="h-4 w-4 text-royal-blue" />
                  <span>Imprimir Ficha</span>
                </button>

                <button
                  type="button"
                  onClick={() => setShowViewModal(false)}
                  className="bg-slate-800 text-slate-300 hover:text-white px-3 py-1.5 rounded-lg text-xs"
                >
                  Fechar
                </button>
              </div>
            </div>

            {/* Printable Body */}
            <div className="flex-1 overflow-y-auto p-4 sm:p-8 space-y-6 text-xs text-slate-800 print:overflow-visible print:p-0">
              {/* Header Box */}
              <div className="border-2 border-slate-900 p-4 rounded-xl flex justify-between items-center">
                <div className="space-y-1">
                  <h3 className="font-extrabold text-base text-slate-900 uppercase">
                    COMANINS CALIBRAÇÃO E MANUTENÇÃO INDUSTRIAL DE INSTRUMENTOS
                  </h3>
                  <p className="text-[10px] text-slate-600">
                    CNPJ: 02.401.101/0001-08 • Filial Camaçari - BA • Telefone: (71) 3621-0311
                  </p>
                  <span className="inline-block bg-slate-100 text-slate-800 border border-slate-300 text-[10px] font-bold px-2.5 py-0.5 rounded uppercase mt-1">
                    FICHA DE REGISTRO INDIVIDUAL DO COLABORADOR
                  </span>
                </div>

                {selectedUser.photoUrl ? (
                  <img
                    src={selectedUser.photoUrl}
                    alt={selectedUser.name}
                    className="h-20 w-20 rounded-xl object-cover border-2 border-slate-800 shadow-sm"
                  />
                ) : (
                  <div className="h-20 w-20 rounded-xl bg-slate-100 border-2 border-slate-800 flex items-center justify-center font-bold text-xl text-slate-600">
                    {selectedUser.name.substring(0, 2).toUpperCase()}
                  </div>
                )}
              </div>

              {/* Section 1: Dados Pessoais */}
              <div className="border border-slate-300 rounded-xl p-4 space-y-2 bg-slate-50/50">
                <h4 className="font-bold text-slate-900 uppercase border-b border-slate-300 pb-1 text-xs text-royal-blue">
                  1. DADOS PESSOAIS
                </h4>
                <div className="grid grid-cols-3 gap-2 text-[11px]">
                  <div><b>Nome Completo:</b> {selectedUser.name}</div>
                  <div><b>Nome Social:</b> {selectedUser.socialName || 'N/A'}</div>
                  <div><b>CPF:</b> <span className="font-mono">{selectedUser.cpf ? maskCPF(selectedUser.cpf) : 'N/A'}</span></div>
                  <div><b>RG:</b> <span className="font-mono">{selectedUser.rgNumber || 'N/A'}</span> ({selectedUser.rgIssuer || 'SSP'}/{selectedUser.rgUf || 'BA'})</div>
                  <div><b>Data Nascimento:</b> {selectedUser.birthDate || 'N/A'}</div>
                  <div><b>Sexo:</b> {selectedUser.gender || 'N/A'}</div>
                  <div><b>Estado Civil:</b> {selectedUser.maritalStatus || 'N/A'}</div>
                  <div><b>Nacionalidade:</b> {selectedUser.nationality || 'Brasileira'}</div>
                  <div><b>Naturalidade:</b> {selectedUser.naturalness || 'N/A'}</div>
                  <div><b>Nome da Mãe:</b> {selectedUser.motherName || 'N/A'}</div>
                  <div><b>Nome do Pai:</b> {selectedUser.fatherName || 'N/A'}</div>
                </div>
              </div>

              {/* Section 2: Contato e Endereço */}
              <div className="border border-slate-300 rounded-xl p-4 space-y-2 bg-slate-50/50">
                <h4 className="font-bold text-slate-900 uppercase border-b border-slate-300 pb-1 text-xs text-royal-blue">
                  2. CONTATO E ENDEREÇO
                </h4>
                <div className="grid grid-cols-3 gap-2 text-[11px]">
                  <div><b>Telefone:</b> {selectedUser.phone ? maskPhone(selectedUser.phone) : 'N/A'}</div>
                  <div><b>E-mail Pessoal:</b> {selectedUser.personalEmail || 'N/A'}</div>
                  <div><b>E-mail Corporativo:</b> {selectedUser.workEmail || 'N/A'}</div>
                  <div><b>CEP:</b> {selectedUser.cep || 'N/A'}</div>
                  <div className="col-span-2"><b>Endereço:</b> {selectedUser.address || 'N/A'}, Nº {selectedUser.addressNumber || 'S/N'} {selectedUser.addressComplement || ''}</div>
                  <div><b>Bairro:</b> {selectedUser.neighborhood || 'N/A'}</div>
                  <div><b>Cidade/UF:</b> {selectedUser.city || 'Camaçari'} - {selectedUser.state || 'BA'}</div>
                </div>
              </div>

              {/* Section 3: Dados Profissionais */}
              <div className="border border-slate-300 rounded-xl p-4 space-y-2 bg-slate-50/50">
                <h4 className="font-bold text-slate-900 uppercase border-b border-slate-300 pb-1 text-xs text-royal-blue">
                  3. DADOS PROFISSIONAIS
                </h4>
                <div className="grid grid-cols-3 gap-2 text-[11px]">
                  <div><b>Matrícula:</b> <span className="font-mono font-bold">{selectedUser.register}</span></div>
                  <div><b>Cargo:</b> {selectedUser.role}</div>
                  <div><b>Setor:</b> {selectedUser.department || 'N/A'}</div>
                  <div><b>Centro de Custo:</b> {selectedUser.costCenter || 'N/A'}</div>
                  <div><b>Gestor:</b> {selectedUser.manager || 'N/A'}</div>
                  <div><b>Contrato:</b> {selectedUser.contractType || 'CLT'}</div>
                  <div><b>Admissão:</b> {selectedUser.admissionDate || 'N/A'}</div>
                  <div><b>Regime:</b> {selectedUser.workRegime || 'Presencial'}</div>
                  <div><b>Situação:</b> <span className="font-bold uppercase text-emerald-700">{selectedUser.status || 'Ativo'}</span></div>

                  <div className="col-span-3 bg-amber-50 p-2 rounded border border-amber-200 mt-1">
                    <b>Salário Base: </b>
                    {isAuthorizedRH ? (
                      <span className="font-mono font-bold text-slate-900">
                        {selectedUser.salary ? `R$ ${selectedUser.salary.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}` : 'Não informado'}
                      </span>
                    ) : (
                      <span className="italic text-slate-600">🔒 Acesso Restrito (Proteção LGPD)</span>
                    )}
                  </div>
                </div>
              </div>

              {/* Section 4: Documentos Trabalhistas, Registros e NRs */}
              <div className="border border-slate-300 rounded-xl p-4 space-y-3 bg-slate-50/50">
                <h4 className="font-bold text-slate-900 uppercase border-b border-slate-300 pb-1 text-xs text-royal-blue flex items-center justify-between">
                  <span>4. DADOS TRABALHISTAS, REGISTROS, ASO E TREINAMENTOS NR</span>
                  <Award className="h-3.5 w-3.5 text-royal-blue" />
                </h4>
                <div className="grid grid-cols-3 gap-2 text-[11px]">
                  <div><b>PIS/NIS:</b> {selectedUser.pis || 'N/A'}</div>
                  <div><b>CTPS:</b> {selectedUser.ctps || 'N/A'}</div>
                  <div><b>Título Eleitor:</b> {selectedUser.voterTitle || 'N/A'}</div>
                  <div><b>CNH:</b> {selectedUser.cnhNumber || 'N/A'} (Cat: {selectedUser.cnhCategory || 'B'})</div>
                  <div><b>Validade CNH:</b> {selectedUser.cnhValidity || 'N/A'}</div>
                  <div><b>Reg. Profissional:</b> {selectedUser.professionalReg || 'N/A'}</div>
                  <div><b>Validade Reg. Profissional:</b> {selectedUser.professionalRegValidity || 'N/A'}</div>
                  <div><b>Escolaridade:</b> {selectedUser.educationLevel || 'N/A'}</div>
                </div>

                {/* Badges de Certificados e NRs Habilitadas */}
                {selectedUser.certificatesList && selectedUser.certificatesList.length > 0 && (
                  <div className="pt-2 border-t border-slate-200 space-y-1">
                    <span className="text-[10px] font-bold text-slate-700 uppercase tracking-wider block">
                      Certificações e NRs Habilitadas no Perfil:
                    </span>
                    <div className="flex flex-wrap gap-1.5">
                      {selectedUser.certificatesList.map((cert: string, idx: number) => (
                        <span key={idx} className="bg-royal-blue/10 text-royal-blue border border-royal-blue/20 text-[10px] font-bold px-2.5 py-0.5 rounded-full flex items-center gap-1">
                          <CheckCircle className="w-3 h-3 text-royal-blue" />
                          {cert}
                        </span>
                      ))}
                    </div>
                  </div>
                )}

                {/* Tabela de Treinamentos NRs do Colaborador */}
                {(() => {
                  const userTrainings = (employeeTrainings || []).filter(
                    (t: any) =>
                      t.employeeId === selectedUser.id ||
                      t.employeeId === selectedUser.username ||
                      t.employeeName === selectedUser.name
                  );

                  if (userTrainings.length === 0) return null;

                  return (
                    <div className="pt-2 border-t border-slate-200">
                      <span className="font-bold text-slate-800 text-[11px] block mb-1">
                        Histórico de Treinamentos de NR Cadastrados:
                      </span>
                      <div className="border border-slate-300 rounded-lg overflow-hidden bg-white text-[10px]">
                        <table className="w-full text-left border-collapse">
                          <thead className="bg-slate-100 text-slate-700 font-bold uppercase border-b border-slate-300">
                            <tr>
                              <th className="p-1.5">Treinamento / Curso</th>
                              <th className="p-1.5">Realização</th>
                              <th className="p-1.5">Validade</th>
                              <th className="p-1.5">Status</th>
                              <th className="p-1.5 text-center">Certificado</th>
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-slate-200">
                            {userTrainings.map((rec: any, idx: number) => {
                              const trCatalog = (trainings || []).find((tr: any) => tr.id === rec.trainingId);
                              const name = trCatalog?.name || rec.trainingName || 'Treinamento';
                              const status = rec.dynamicStatus || rec.status || 'Válido';

                              let badgeStyle = 'bg-emerald-50 text-emerald-800 border-emerald-200';
                              if (status === 'Vencido') badgeStyle = 'bg-red-50 text-red-800 border-red-200';
                              if (status === 'Próximo do vencimento' || status === 'Pendente') badgeStyle = 'bg-amber-50 text-amber-800 border-amber-200';
                              if (status === 'Agendado') badgeStyle = 'bg-blue-50 text-blue-800 border-blue-200';

                              return (
                                <tr key={rec.id || idx}>
                                  <td className="p-1.5 font-bold text-slate-900">
                                    {name}
                                    {trCatalog?.workloadHours ? (
                                      <span className="text-[9px] text-slate-500 block font-normal">
                                        Carga: {trCatalog.workloadHours}h • {rec.institution || trCatalog.institution || 'COMANINS'}
                                      </span>
                                    ) : null}
                                  </td>
                                  <td className="p-1.5 text-slate-700 font-mono">
                                    {rec.completionDate ? new Date(rec.completionDate + (rec.completionDate.includes('T') ? '' : 'T00:00:00')).toLocaleDateString('pt-BR') : rec.scheduledDate ? `Agendado: ${new Date(rec.scheduledDate + (rec.scheduledDate.includes('T') ? '' : 'T00:00:00')).toLocaleDateString('pt-BR')}` : '-'}
                                  </td>
                                  <td className="p-1.5 font-mono font-bold text-slate-800">
                                    {rec.expirationDate ? new Date(rec.expirationDate + (rec.expirationDate.includes('T') ? '' : 'T00:00:00')).toLocaleDateString('pt-BR') : '-'}
                                  </td>
                                  <td className="p-1.5">
                                    <span className={`px-2 py-0.5 rounded-full border font-bold text-[9px] ${badgeStyle}`}>
                                      {status}
                                    </span>
                                  </td>
                                  <td className="p-1.5 text-center">
                                    {rec.certificateUrl ? (
                                      <button
                                        type="button"
                                        onClick={(e) => {
                                          e.preventDefault();
                                          window.open(rec.certificateUrl, '_blank');
                                        }}
                                        className="bg-royal-blue/10 hover:bg-royal-blue/20 text-royal-blue px-2 py-0.5 rounded font-bold text-[9px] inline-flex items-center gap-1 print:hidden"
                                      >
                                        <FileText className="w-3 h-3" />
                                        <span>Ver</span>
                                      </button>
                                    ) : (
                                      <span className="text-slate-400 italic text-[9px]">-</span>
                                    )}
                                  </td>
                                </tr>
                              );
                            })}
                          </tbody>
                        </table>
                      </div>
                    </div>
                  );
                })()}

                {/* TABELA DE ASOs POR CONTRATO */}
                {(() => {
                  const asoRecords = [
                    ...(selectedUser.asoContracts || []),
                    ...(employeeAsos || []).filter(a => a.employeeId === selectedUser?.id || a.employeeId === selectedUser?.username)
                  ].filter((v,i,a) => a.findIndex(t=>(t.id === v.id))===i);
                  
                  return asoRecords.length > 0 && (
                  <div className="pt-2 border-t border-slate-200">
                    <span className="font-bold text-slate-800 text-[11px] block mb-1.5">
                      ASOs Específicos por Contrato / Unidade / Área:
                    </span>
                    <div className="border border-slate-300 rounded-lg overflow-hidden bg-white text-[10px]">
                      <table className="w-full text-left border-collapse">
                        <thead className="bg-slate-100 text-slate-700 font-bold uppercase border-b border-slate-300">
                          <tr>
                            <th className="p-1.5">Contrato / Cliente</th>
                            <th className="p-1.5">Unidade / Área</th>
                            <th className="p-1.5">Tipo</th>
                            <th className="p-1.5">Parecer</th>
                            <th className="p-1.5">Validade</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-200">
                          {asoRecords.map((aso, idx) => (
                            <tr key={aso.id || idx}>
                              <td className="p-1.5 font-bold text-slate-900">{aso.contractName}</td>
                              <td className="p-1.5">{aso.unitArea}</td>
                              <td className="p-1.5">{aso.examType}</td>
                              <td className="p-1.5">
                                <span className={`font-bold px-1.5 py-0.5 rounded ${
                                  aso.status === 'Apto' ? 'text-emerald-700 bg-emerald-50' : 'text-amber-700 bg-amber-50'
                                }`}>
                                  {aso.status}
                                </span>
                              </td>
                              <td className="p-1.5 font-mono font-bold text-slate-800">{aso.validityDate}</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>
                );})()}
              </div>

              {/* Section 5: Dados Bancários (Confidencial LGPD) */}
              <div className="border border-slate-300 rounded-xl p-4 space-y-2 bg-slate-50/50">
                <h4 className="font-bold text-slate-900 uppercase border-b border-slate-300 pb-1 text-xs text-royal-blue flex items-center justify-between">
                  <span>5. DADOS BANCÁRIOS E BENEFÍCIOS</span>
                  <Lock className="h-3.5 w-3.5 text-slate-500" />
                </h4>

                {isAuthorizedRH ? (
                  <div className="grid grid-cols-3 gap-2 text-[11px]">
                    <div><b>Banco:</b> {selectedUser.bank || 'N/A'}</div>
                    <div><b>Agência/Conta:</b> {selectedUser.bankAgency || 'N/A'} / {selectedUser.bankAccount || 'N/A'}</div>
                    <div><b>Tipo:</b> {selectedUser.accountType || 'Corrente'}</div>
                    <div className="col-span-2"><b>Chave Pix:</b> <span className="font-mono">{selectedUser.pixKey || 'N/A'}</span></div>
                    <div><b>Dependentes:</b> {selectedUser.dependents?.length || 0} cadastrado(s)</div>
                  </div>
                ) : (
                  <div className="p-2 bg-slate-200 rounded text-slate-600 italic">
                    🔒 Informações financeiras restritas ao setor de RH e Financeiro em compliance com a LGPD.
                  </div>
                )}
              </div>

              {/* Section 6: Emergência */}
              <div className="border border-slate-300 rounded-xl p-4 space-y-2 bg-slate-50/50">
                <h4 className="font-bold text-slate-900 uppercase border-b border-slate-300 pb-1 text-xs text-royal-blue">
                  6. EMERGÊNCIA
                </h4>
                <div className="grid grid-cols-2 gap-2 text-[11px]">
                  <div><b>Contato de Emergência:</b> {selectedUser.emergencyContactName || 'N/A'} ({selectedUser.emergencyKinship || 'Parentes'})</div>
                  <div><b>Telefones:</b> {selectedUser.emergencyPhone ? maskPhone(selectedUser.emergencyPhone) : 'N/A'} / {selectedUser.emergencyPhoneAlt ? maskPhone(selectedUser.emergencyPhoneAlt) : ''}</div>
                </div>
              </div>

              {/* Section 7: Documentos e Anexos Diversos */}
              <div className="border border-slate-300 rounded-xl p-4 space-y-2 bg-slate-50/50">
                <h4 className="font-bold text-slate-900 uppercase border-b border-slate-300 pb-1 text-xs text-royal-blue flex items-center justify-between">
                  <span>7. DOCUMENTOS E ANEXOS DIVERSOS DO COLABORADOR</span>
                  <span className="font-normal normal-case text-[10px] text-slate-500">
                    {userDocuments.length} anexo(s)
                  </span>
                </h4>
                {isLoadingDocs ? (
                  <span className="text-slate-500 italic text-[11px]">Carregando documentos...</span>
                ) : userDocuments.length === 0 ? (
                  <p className="text-slate-500 italic text-[11px]">Nenhum documento anexado a este colaborador.</p>
                ) : (
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 pt-1">
                    {userDocuments.map((docItem, index) => (
                      <div key={docItem.id || index} className="p-2 bg-white border border-slate-200 rounded-lg flex items-center justify-between text-[11px]">
                        <div className="flex items-center space-x-2 truncate pr-2">
                          <FileText className="h-4 w-4 text-royal-blue shrink-0" />
                          <span className="font-semibold text-slate-800 truncate">{docItem.name}</span>
                        </div>
                        {docItem.url && (
                          <a
                            href={docItem.url}
                            target="_blank"
                            rel="noreferrer"
                            className="bg-blue-50 hover:bg-blue-100 text-royal-blue px-2 py-1 rounded text-[10px] font-bold flex items-center space-x-1 shrink-0 print:hidden"
                          >
                            <Eye className="h-3 w-3" />
                            <span>Abrir</span>
                          </a>
                        )}
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* LGPD Audit Footer */}
              <div className="border-t-2 border-slate-900 pt-4 text-[9px] text-slate-500 space-y-1">
                <p className="font-bold uppercase text-slate-700">REGISTRO DE AUDITORIA E COMPLIANCE LGPD (LEI Nº 13.709/2018):</p>
                <p>
                  Documento gerado para fins de controle de RH. O acesso e consulta a este cadastro foram autenticados e registrados sob responsabilidade do usuário <b>{currentUser?.name}</b> (@{currentUser?.username}) em <b>{new Date().toLocaleString('pt-BR')}</b>.
                </p>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
