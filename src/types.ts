export type InstrumentCategory = 'pressure' | 'temperature';

export type InstrumentType = 'manometro' | 'termometro' | 'transmissor' | 'pressostato' | 'termostato' | 'manovacuometro';

export type CalibrationStatus = 'Aguardando Triagem' | 'Aguardando Calibração' | 'Em Calibração' | 'Calibrado' | 'Aguardando Emissão de Certificado' | 'Entregue' | 'Não Conforme' | 'Disponível para Retirada' | 'RNC';

export interface Client {
  passwordChangeRequired?: boolean;
  id: string;
  name: string;
  cnpj: string;
  email: string;
  phone: string;
  city: string;
  password?: string;
  isFieldService?: boolean;
}

export interface Instrument {
  id: string;
  tag: string; // Client TAG (can be repeated)
  certificateNumber: string; // Sequential Unique Certificate Number (was COMA)
  coma: string; // Legacy / secondary internal ID
  description: string;
  brand: string;
  model: string;
  serialNumber: string;
  category: InstrumentCategory;
  typeSpec?: InstrumentType;
  metrologicalNorm?: string;
  sensorType?: string;
  outputSignal?: string;
  setPoint?: number;
  contactType?: string;
  thermalMedium?: string;
  hasteLength?: string;
  rangeMin: number;
  rangeMax: number;
  unit: string;
  unitNegative?: string;
  rangeMin2?: number;
  rangeMax2?: number;
  unit2?: string;
  accuracyClass?: string;
  escala?: string;
  escala2?: string;
  unidade2?: string;
  material?: string;
  conexao?: string;
  diametro?: string;
  condicao?: string;
  observacoes?: string;
  dataEntrada?: string;
  mpe?: number; 
  lastCalibrationDate?: string;
  nextCalibrationDate?: string;
  status: CalibrationStatus;
  clientId: string;
  numeroDaEntrada?: string;
  condicaoDeEntrada?: string[];
  materialDeRetorno?: string;
  dataDeRetorno?: string;
  photoRegistration?: string;
  photoCalibrated?: string;
  hasRnc?: boolean;
  rncNumber?: string;
  rncDate?: string;
  rncReason?: string;
  rncAiAnalysis?: string;
  rncTechnician?: string;
  temperature?: number;
  humidity?: number;
}

export interface RncReport {
  id: string;
  rncNumber: string;
  instrumentId: string;
  instrumentTag: string;
  instrumentDescription: string;
  coma?: string;
  clientName?: string;
  technicianName: string;
  date: string;
  reason: string;
  aiAnalysis?: string;
  status: 'Não Conforme' | 'Em Análise' | 'Concluído';
  calibrationReportId?: string;
  certNumber?: string;
  pointsRecorded?: any[];
}

export interface CalibrationPoint {
  id: string;
  nominalValue: number;
  standardValue?: number; // legacy
  instrumentValue?: number; // legacy
  error?: number; // legacy
  standardAscending?: number;
  instrumentAscending?: number;
  errorAscending?: number;
  standardDescending?: number;
  instrumentDescending?: number;
  errorDescending?: number;
  hysteresis?: number;
  mpe: number;
  pass: boolean;
}

export interface SwitchCalibrationPoint {
  repeat: number;
  pSetAsc: string | number;
  pResetDesc: string | number;
  deadband: number;
  errSet: number;
  pass: boolean;
}

export interface TransmitterCalibrationPoint {
  percent: number;
  nominalPv: number;
  expectedMa: number;
  measuredMaAsc: string | number;
  measuredMaDesc: string | number;
  errMa: number;
  errPercentSpan: number;
  pass: boolean;
}

export interface ReferenceStandard {
  id: string;
  certificateNumber: string;
  instrumentType: string;
  expirationDate: string;
  rbcLab: string;
  identification?: string;
  range?: string;
}

export interface CalibrationReport {
  certNumber?: string;
  authKey?: string;
  id: string;
  instrumentId: string;
  technicianName: string;
  technicianId?: string;
  signatureVersion?: number;
  signaturePath?: string;
  emitterUser?: string;
  date: string;
  instrumentType?: InstrumentType;
  metrologicalNorm?: string;
  sensorType?: string;
  outputSignal?: string;
  setPoint?: number;
  contactType?: string;
  points: CalibrationPoint[];
  switchPoints?: SwitchCalibrationPoint[];
  transmitterPoints?: TransmitterCalibrationPoint[];
  maxError: number;
  maxRelativeError: number;
  maxHysteresis?: number;
  maxDeadband?: number;
  approved: boolean;
  observations: string;
  temperature?: number;
  humidity?: number;
  curveCount?: number;
  referenceStandardIds?: string[];
  referenceStandards?: ReferenceStandard[];
  rncNumber?: string;
  rncData?: RncReport;
}

export interface CalibrationAuditLog {
  id: string;
  certNumber: string;
  coma?: string;
  instrumentId?: string;
  instrumentTag: string;
  instrumentDescription: string;
  technicianName: string;
  startTime: string; // ISO timestamp
  endTime: string;   // ISO timestamp
  durationSeconds: number;
  durationFormatted: string;
  date: string; // YYYY-MM-DD
}

export interface ContactMessage {
  id: string;
  name: string;
  company: string;
  email: string;
  phone: string;
  message: string;
  category: 'calibracao' | 'manutencao' | 'vendas' | 'outros';
  date: string;
  status: 'pendente' | 'respondido';
}

export interface EmployeeBirthday {
  id: string;
  name: string;
  day: number;
  month: number;
}

export interface ChatMessage {
  sender: 'user' | 'bot';
  text: string;
  timestamp: string;
}

export interface Training {
  id: string;
  name: string;
  description?: string;
  validityMonths: number; // 0 means it does not expire
  workloadHours: number;
  institution: string;
  mandatoryRoles: string[];
  modality?: 'Presencial' | 'Online';
}

export type TrainingStatus = 'Agendado' | 'Válido' | 'Próximo do vencimento' | 'Vencido';

export interface EmployeeTrainingRecord {
  id: string;
  employeeId: string; // references PortalUser id
  trainingId: string; // references Training id
  completionDate?: string;
  expirationDate?: string;
  result?: string;
  certificateUrl?: string; // We can just store a text string or file link
  status: TrainingStatus;
  scheduledDate?: string;
}

export interface DropdownOptions {
  descricao: string[];
  unidade: string[];
  material: string[];
  conexao: string[];
  diametro: string[];
  estoqueCategoria?: string[];
  fabricante?: string[];
  condicaoDeEntrada?: string[];
  tiposExame?: string[];
  cargos?: string[];
}

export interface InventoryItem {
  id: string;
  name: string;
  description: string;
  category: string;
  quantity: number;
  minQuantity: number;
  unit: string;
  rangeMin2?: number;
  rangeMax2?: number;
  unit2?: string;
  accuracyClass?: string;
  location: string;
  attachments?: string[];
}

export interface InventoryTransaction {
  id: string;
  itemId: string;
  type: 'entrada' | 'saida';
  quantity: number;
  date: string;
  reason: string;
  responsible: string;
  employeeId?: string;
  attachments?: string[];
}

export interface ExamTypeItem {
  id: string;
  name: string;
  description: string;
  validityMonths?: number;
}

export interface MedicalExam {
  id: string;
  employeeId: string;
  examType: string;
  examDate: string;
  status: 'Apto' | 'Inapto' | 'Pendente';
  nextExamDate?: string;
  notes?: string;
}

export interface PayslipItem {
  code: string;
  description: string;
  reference: string;
  type: 'vencimento' | 'desconto';
  value: number;
}

export interface FinanceTransaction {
  id: string;
  type: 'receita' | 'despesa';
  description: string;
  amount: number;
  date: string;
  dueDate: string;
  status: 'pendente' | 'pago' | 'atrasado' | 'cancelado';
  category: string;
  costCenter: string;
  contractId?: string;
  contractNumber?: string;
  contractClientName?: string;
  bankAccount: string;
  paymentMethod: string;
  contactName: string; // Fornecedor ou Cliente
  contactDocument: string; // CNPJ/CPF
  documentNumber: string; // NF
  installments?: number;
  currentInstallment?: number;
  recurrence?: 'none' | 'monthly' | 'yearly';
  attachments?: string[];
  notes?: string;
  createdAt: string;
  updatedAt: string;
  createdBy: string;
}

export interface FinanceContract {
  id: string;
  clientId: string;
  clientName: string;
  contractNumber: string;
  description: string;
  value: number;
  startDate: string;
  endDate: string;
  status: 'ativo' | 'encerrado' | 'suspenso';
  costCenter: string;
}

export interface FinanceCostCenter {
  id: string;
  name: string;
  description: string;
  type: 'sede' | 'contrato';
}

export interface Payslip {
  id: string;
  employeeId: string;     // references PortalUser id
  employeeName: string;
  employeeRegister: string; // e.g. "CFT-BA 123456"
  employeeCpf: string;      // masked / unmasked in UI adhering to LGPD
  employeeRole: string;
  month: string;           // e.g. "07/2026"
  baseSalary?: number;
  grossSalary?: number;     // total vencimentos
  liquidSalary?: number;    // valor líquido
  totalDescontos?: number;  // total descontos
  fgtsBase?: number;
  fgtsValue?: number;
  irpfBase?: number;
  inssBase?: number;
  createdAt: string;
  items?: PayslipItem[];
  
  pdfBase64?: string;       // Base64 string of the uploaded PDF file
  pdfName?: string;         // Name of the uploaded PDF file
  documentType?: "holerite" | "alimentacao" | "transporte" | "espelho_ponto";
  
  // LGPD audit trails
  lgpdConsentAccepted: boolean;
  lgpdConsentDate?: string;
  visualized: boolean;
  visualizedAt?: string;
  emailSent7Days?: boolean;
  emailSent10Days?: boolean;
  visualizedIp?: string;
  visualizedUserAgent?: string;
}


export interface FinanceMeasurement {
  id: string;
  contractId: string;
  contractNumber: string;
  clientName: string;
  period: string; // e.g. '01/07 a 31/07'
  type: string; // 'Calibração', 'Manutenção', etc.
  value: number;
  status: 'em_analise' | 'aprovada' | 'faturada' | 'cancelada';
  sendDate: string;
  invoiceNumber?: string;
  createdAt: string;
  updatedAt: string;
}


export interface InternalTicket {
  id: string;
  creatorId: string;
  creatorName: string;
  creatorEmail: string;
  title: string;
  description: string;
  status: "aberto" | "respondido" | "finalizado";
  createdAt: string;
  updatedAt: string;
  attachments?: string[];
  messages: TicketMessage[];
}

export interface TicketMessage {
  id: string;
  senderId: string;
  senderName: string;
  text: string;
  createdAt: string;
  attachments?: string[];
}

export interface AccessAuditLog {
  id: string;
  date: string;
  user: string;
  action: string;
  details: string;
  authorizedBy?: string;
}

export type HealthProgramDocType = 'PGR' | 'PCMSO' | 'LTCAT' | 'PPP' | 'AET' | 'APR' | 'DIR' | 'Outro';

export interface HealthProgramDocument {
  id: string;
  title: string;              // e.g. "PGR 2026 - Programa de Gerenciamento de Riscos"
  docType: HealthProgramDocType;
  issueDate: string;          // YYYY-MM-DD
  expirationDate: string;     // YYYY-MM-DD
  responsibleCompany?: string; // e.g. "SST Consultoria & Engenharia"
  responsibleTechnical?: string; // e.g. "Eng. Responsável - CREA/MTE"
  fileUrl?: string;           // Base64 data or external link
  fileName?: string;
  fileType?: string;
  notes?: string;
  createdAt: string;
  updatedAt: string;
  createdBy?: string;
}

