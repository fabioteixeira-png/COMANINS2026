import express from "express";
import path from "path";
import dotenv from "dotenv";
dotenv.config();
import fs from "fs";
import { createServer as createViteServer } from "vite";
import { GoogleGenAI } from "@google/genai";
import { requireAuth } from './src/middleware/auth.ts';
import type { AuthRequest } from './src/middleware/auth.ts';
import { db } from './src/db/index.ts';
import { users } from './src/db/schema.ts';
import { getOrCreateUser } from './src/db/users.ts';
import cron from 'node-cron';
import nodemailer from 'nodemailer';
import { adminAuth, adminDb } from './src/lib/firebase-admin.ts';
import { initializeApp as initClientApp } from 'firebase/app';
import { getFirestore as getClientFirestore, collection as getClientCollection, getDocs as getClientDocs } from 'firebase/firestore';

const firebaseConfig = JSON.parse(
  fs.readFileSync(path.join(process.cwd(), 'firebase-applet-config.json'), 'utf-8')
);

const clientApp = initClientApp(firebaseConfig);
const clientDb = getClientFirestore(clientApp);

const firestoreDb = adminDb;

const normalizeAccessValue = (value: unknown) => String(value || '').trim().toLowerCase();

const isAdministratorProfile = (profile: any): boolean => {
  const permissionLevel = normalizeAccessValue(profile?.permissionLevel);
  if (permissionLevel) {
    return permissionLevel === 'administrador';
  }
  const role = normalizeAccessValue(profile?.role);
  return ['administrador', 'admin', 'master', 'diretor', 'diretoria'].includes(role);
};

const findPortalUserForAuth = async (decoded: any) => {
  const usersRef = firestoreDb.collection('portalUsers');

  const byUid = await usersRef.where('authUid', '==', decoded.uid).limit(1).get();
  if (!byUid.empty) {
    const doc = byUid.docs[0];
    return { id: doc.id, ...doc.data() };
  }

  const email = String(decoded.email || '').trim().toLowerCase();
  const username = email.endsWith('@comanins.internal')
    ? email.slice(0, -'@comanins.internal'.length)
    : email.split('@')[0];

  if (!username) return null;

  const snapshot = await usersRef.get();
  const match = snapshot.docs.find((doc) =>
    String(doc.data()?.username || '').trim().toLowerCase() === username
  );
  return match ? { id: match.id, ...match.data() } : null;
};


const app = express();

// Temporary migration/admin seed routes removed after Firebase Auth rollout.


const PORT = 3000;

app.use(express.json({ limit: "50mb" }));
app.use(express.urlencoded({ limit: "50mb", extended: true }));

// In-Memory Database State with File Persistence
const DB_FILE = path.join(process.cwd(), "db.json");

const initialClients: any[] = [
  { id: "c1", name: "Petrobras S.A. - Refinaria Capuava", cnpj: "33.000.167/0001-56", email: "instrumentacao@petrobras.com.br", phone: "(11) 4344-8000", city: "Mauá - SP", password: "123456" },
  { id: "c2", name: "Cervejaria Ambev - Unidade Jundiaí", cnpj: "07.526.557/0001-89", email: "manutencao.jundiai@ambev.com.br", phone: "(11) 4589-9200", city: "Jundiaí - SP", password: "123456" },
  { id: "c3", name: "Braskem Química S.A.", cnpj: "42.150.391/0001-22", email: "metrologia@braskem.com.br", phone: "(11) 4434-2000", city: "Santo André - SP", password: "123456" },
];

const initialInstruments: any[] = [
  {
    id: "i1",
    tag: "PI-101",
    description: "Manômetro Analógico",
    brand: "WIKA",
    model: "213.53",
    serialNumber: "W9843212",
    category: "pressure" as const,
    rangeMin: 0,
    rangeMax: 10,
    unit: "bar",
    mpe: 0.1, // +-0.1 bar tolerance
    lastCalibrationDate: "2025-07-15",
    nextCalibrationDate: "2026-07-15",
    status: "Aguardando Triagem" as const,
    clientId: "c1",
  },
  {
    id: "i2",
    tag: "TI-201",
    description: "Transmissor de Temperatura PT100",
    brand: "Rosemount",
    model: "3144P",
    serialNumber: "RM772635",
    category: "temperature" as const,
    rangeMin: 0,
    rangeMax: 200,
    unit: "°C",
    mpe: 0.2, // +-0.2 °C tolerance
    lastCalibrationDate: "2025-05-10",
    nextCalibrationDate: "2026-05-10",
    status: "Em Calibração" as const,
    clientId: "c1",
  },
  {
    id: "i3",
    tag: "PT-302",
    description: "Transmissor de Pressão Hart",
    brand: "Smar",
    model: "LD301",
    serialNumber: "SM449201",
    category: "pressure" as const,
    rangeMin: 0,
    rangeMax: 100,
    unit: "bar",
    mpe: 0.25, // +-0.25 bar tolerance
    lastCalibrationDate: "2025-08-01",
    nextCalibrationDate: "2026-08-01",
    status: "Calibrado" as const,
    clientId: "c3",
  },
  {
    id: "i4",
    tag: "TE-401",
    description: "Termômetro Digital Industrial",
    brand: "Incoterm",
    model: "T-Globo",
    serialNumber: "INC22039",
    category: "temperature" as const,
    rangeMin: -50,
    rangeMax: 150,
    unit: "°C",
    mpe: 0.5, // +-0.5 °C tolerance
    lastCalibrationDate: "2026-02-12",
    nextCalibrationDate: "2027-02-12",
    status: "Entregue" as const,
    clientId: "c2",
  },
];

const initialCalibrationReports: any[] = [
  {
    id: "r1",
    instrumentId: "i3",
    technicianName: "Eng. Carlos Moreira",
    date: "2025-08-01",
    points: [
      { id: "p1", nominalValue: 0, standardValue: 0.00, instrumentValue: 0.02, error: 0.02, mpe: 0.25, pass: true },
      { id: "p2", nominalValue: 25, standardValue: 25.00, instrumentValue: 25.05, error: 0.05, mpe: 0.25, pass: true },
      { id: "p3", nominalValue: 50, standardValue: 50.00, instrumentValue: 50.08, error: 0.08, mpe: 0.25, pass: true },
      { id: "p4", nominalValue: 75, standardValue: 75.00, instrumentValue: 74.95, error: -0.05, mpe: 0.25, pass: true },
      { id: "p5", nominalValue: 100, standardValue: 100.00, instrumentValue: 100.12, error: 0.12, mpe: 0.25, pass: true },
    ],
    maxError: 0.12,
    maxRelativeError: 0.12,
    approved: true,
    observations: "Instrumento calibrado em conformidade com o erro máximo admissível. Apresenta excelente estabilidade.",
  }
];

const initialContactMessages: any[] = [
  {
    id: "m1",
    name: "Mariana Costa",
    company: "Laticínios Sul de Minas",
    email: "marianacosta@suldeminas.com.br",
    phone: "(35) 3456-7890",
    message: "Gostaria de solicitar um orçamento para calibração de 12 termômetros industriais e 5 manômetros de vapor.",
    category: "calibracao" as const,
    date: "2026-07-19",
    status: "pendente" as const,
  }
];

let clients: any[] = [];
let instruments: any[] = [];
let calibrationReports: any[] = [];
let contactMessages: any[] = [];

function saveDatabase() {
  try {
    const data = {
      clients,
      instruments,
      calibrationReports,
      contactMessages,
    };
    fs.writeFileSync(DB_FILE, JSON.stringify(data, null, 2), "utf-8");
  } catch (err) {
    console.error("Erro ao salvar o banco de dados no arquivo:", err);
  }
}

function loadDatabase() {
  try {
    if (fs.existsSync(DB_FILE)) {
      const data = JSON.parse(fs.readFileSync(DB_FILE, "utf-8"));
      clients = data.clients || [...initialClients];
      instruments = data.instruments || [...initialInstruments];
      calibrationReports = data.calibrationReports || [...initialCalibrationReports];
      contactMessages = data.contactMessages || [...initialContactMessages];
    } else {
      clients = [...initialClients];
      instruments = [...initialInstruments];
      calibrationReports = [...initialCalibrationReports];
      contactMessages = [...initialContactMessages];
      saveDatabase();
    }
  } catch (err) {
    console.error("Erro ao carregar o banco de dados do arquivo, usando valores padrões:", err);
    clients = [...initialClients];
    instruments = [...initialInstruments];
    calibrationReports = [...initialCalibrationReports];
    contactMessages = [...initialContactMessages];
  }
}

// Inicializar banco de dados
loadDatabase();

// Clean up any test/imported client named "Manometros - Entrada de Dados" or similar if they exist
const beforeCleanCount = clients.length;
clients = clients.filter((c: any) => {
  const nameLower = String(c.name || '').toLowerCase();
  return !(nameLower.includes("manometros") && nameLower.includes("entrada")) && 
         !nameLower.includes("manometros - entrada") && 
         !nameLower.includes("manômetros - entrada de dados");
});

if (clients.length !== beforeCleanCount) {
  const clientIds = new Set(clients.map((c: any) => c.id));
  instruments = instruments.filter((i: any) => clientIds.has(i.clientId));
  const instIds = new Set(instruments.map((i: any) => i.id));
  calibrationReports = calibrationReports.filter((r: any) => instIds.has(r.instrumentId));
  saveDatabase();
}

// Lazy initialize Gemini API to handle missing keys gracefully
let ai: GoogleGenAI | null = null;
function getGeminiClient(): GoogleGenAI | null {
  if (ai) return ai;
  const key = process.env.GEMINI_API_KEY;

  if (!key || key === "MY_GEMINI_API_KEY" || key.trim() === "") {
    return null;
  }
  try {
    ai = new GoogleGenAI({
      apiKey: key,
      httpOptions: {
        headers: {
          "User-Agent": "aistudio-build",
        },
      },
    });
    return ai;
  } catch (err) {
    console.error("Falha ao inicializar GoogleGenAI SDK:", err);
    return null;
  }
}


// ------------------- CRON JOB (NOTIFICAÇÕES E ALERTAS) -------------------

async function runDailyNotifications() {
  try {
    console.log("Executando verificação diária de notificações e alertas...");
    
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    // Funções auxiliares para cálculo de dias
    const diffInDays = (targetDate) => {
      const target = new Date(targetDate);
      target.setHours(0, 0, 0, 0);
      const diffTime = target.getTime() - today.getTime();
      return Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    };

    // 1. Verificar Aniversários (EXATAMENTE 1 dia antes)
    const upcomingBdays = [];
    
    // A. Buscar de employeeBirthdays
    const bdaySnapshot = await firestoreDb.collection('employeeBirthdays').get();
    bdaySnapshot.forEach(doc => {
      const b = doc.data();
      if (!b.day || !b.month) return;
      let bdayThisYear = new Date(today.getFullYear(), b.month - 1, b.day);
      if (bdayThisYear < today) {
        bdayThisYear = new Date(today.getFullYear() + 1, b.month - 1, b.day);
      }
      const days = Math.ceil((bdayThisYear.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
      if (days === 1) {
        upcomingBdays.push({ name: b.name, date: `${String(b.day).padStart(2, '0')}/${String(b.month).padStart(2, '0')}` });
      }
    });

    // B. Buscar de portalUsers (birthDate: YYYY-MM-DD)
    const usersSnapshot = await firestoreDb.collection('portalUsers').get();
    const internalUsers = [];
    usersSnapshot.forEach(doc => {
      const u = { id: doc.id, ...doc.data() } as any;
      internalUsers.push(u);
      if (u.birthDate) {
        const [y, m, d] = u.birthDate.split('-');
        let bdayThisYear = new Date(today.getFullYear(), parseInt(m) - 1, parseInt(d));
        if (bdayThisYear < today) {
          bdayThisYear = new Date(today.getFullYear() + 1, parseInt(m) - 1, parseInt(d));
        }
        const days = Math.ceil((bdayThisYear.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
        if (days === 1) {
          const dateStr = `${String(d).padStart(2, '0')}/${String(m).padStart(2, '0')}`;
          if (!upcomingBdays.find(b => b.name === u.name && b.date === dateStr)) {
            upcomingBdays.push({ name: u.name, date: dateStr });
          }
        }
      }
    });

    // 2. Verificar Treinamentos (EXATAMENTE 10 dias antes)
    const upcomingTrainings = [];
    const trSnapshot = await firestoreDb.collection('trainings').get();
    const trainings = [];
    trSnapshot.forEach(doc => trainings.push({ id: doc.id, ...doc.data() }));
    
    const empTrSnapshot = await firestoreDb.collection('employeeTrainings').get();
    empTrSnapshot.forEach(doc => {
      const record = doc.data();
      const user = internalUsers.find(u => u.id === record.employeeId);
      const training = trainings.find(t => t.id === record.trainingId);
      
      if (record.completionDate && training && training.validityMonths > 0) {
        const [year, month, day] = record.completionDate.split('-');
        const completionDateObj = new Date(parseInt(year), parseInt(month) - 1, parseInt(day));
        const expirationDate = new Date(completionDateObj);
        expirationDate.setMonth(expirationDate.getMonth() + training.validityMonths);
        
        const days = diffInDays(expirationDate);
        if (days === 10) {
          upcomingTrainings.push({
            employeeName: user?.name || 'Desconhecido',
            trainingName: training.name,
            expirationDate: `${String(expirationDate.getDate()).padStart(2, '0')}/${String(expirationDate.getMonth() + 1).padStart(2, '0')}/${expirationDate.getFullYear()}`
          });
        }
      }
    });

    // 3. Verificar ASO (EXATAMENTE 10 dias antes)
    const upcomingASO = [];
    const asoSnapshot = await firestoreDb.collection('medical_exams').get();
    asoSnapshot.forEach(doc => {
      const aso = doc.data();
      if (aso.nextExamDate) {
        const [year, month, day] = aso.nextExamDate.split('-');
        const examDateObj = new Date(parseInt(year), parseInt(month) - 1, parseInt(day));
        const days = diffInDays(examDateObj);
        if (days === 10) {
          const user = internalUsers.find(u => u.id === aso.employeeId);
          upcomingASO.push({
            employeeName: user?.name || 'Desconhecido',
            examType: aso.examType || 'ASO',
            expirationDate: `${String(day).padStart(2, '0')}/${String(month).padStart(2, '0')}/${year}`
          });
        }
      }
    });

    // 4. Verificar Padrões (EXATAMENTE 10 dias antes)
    const upcomingStandards = [];
    const stSnapshot = await firestoreDb.collection('referenceStandards').get();
    stSnapshot.forEach(doc => {
      const std = doc.data();
      if (std.expirationDate) {
        const [year, month, day] = std.expirationDate.split('-');
        const expDateObj = new Date(parseInt(year), parseInt(month) - 1, parseInt(day));
        const days = diffInDays(expDateObj);
        if (days === 10) {
          upcomingStandards.push({
            name: std.instrumentType || std.identification || 'Padrão Desconhecido',
            cert: std.certificateNumber || '-',
            expirationDate: `${String(day).padStart(2, '0')}/${String(month).padStart(2, '0')}/${year}`
          });
        }
      }
    });

    // 5. Verificar Programas de Saúde (PGR, PCMSO, LTCAT, etc.) - 30 dias antes ou vencidos
    const upcomingHealthDocs = [];
    try {
      const hpSnapshot = await firestoreDb.collection('health_program_docs').get();
      hpSnapshot.forEach(doc => {
        const hp = doc.data();
        if (hp.expirationDate) {
          const [year, month, day] = hp.expirationDate.split('-');
          const expDateObj = new Date(parseInt(year), parseInt(month) - 1, parseInt(day));
          const days = diffInDays(expDateObj);
          if (days <= 30) {
            upcomingHealthDocs.push({
              title: hp.title || 'Programa de Saúde',
              docType: hp.docType || 'Documento',
              days,
              expirationDate: `${String(day).padStart(2, '0')}/${String(month).padStart(2, '0')}/${year}`
            });
          }
        }
      });
    } catch (hpErr) {
      console.error("Erro ao verificar documentos de programas de saúde:", hpErr);
    }

    if (upcomingBdays.length > 0 || upcomingTrainings.length > 0 || upcomingASO.length > 0 || upcomingStandards.length > 0 || upcomingHealthDocs.length > 0) {
      const { SMTP_HOST, SMTP_USER, SMTP_PASS } = process.env;
      
      if (SMTP_HOST && SMTP_USER && SMTP_PASS) {
        const transporter = nodemailer.createTransport({
          service: 'gmail',
          auth: {
            user: SMTP_USER,
            pass: SMTP_PASS
          }
        });

        let htmlBody = `<p>Olá Equipe,</p><p>Aqui está o resumo diário de notificações e alertas do painel COMANINS:</p>`;
        let textBody = `Olá Equipe,

Aqui está o resumo diário de notificações e alertas do painel COMANINS:

`;

        if (upcomingBdays.length > 0) {
          htmlBody += `<h3>🎂 Aniversariantes de Amanhã</h3><ul>`;
          textBody += `--- ANIVERSARIANTES DE AMANHÃ ---
`;
          upcomingBdays.forEach(b => {
            htmlBody += `<li><b>${b.name}</b> - ${b.date}</li>`;
            textBody += `- ${b.name} - ${b.date}
`;
          });
          htmlBody += `</ul>`;
        }

        if (upcomingTrainings.length > 0) {
          htmlBody += `<h3>⚠️ Treinamentos Vencendo em 10 dias</h3><ul>`;
          textBody += `
--- TREINAMENTOS VENCENDO EM 10 DIAS ---
`;
          upcomingTrainings.forEach(t => {
            htmlBody += `<li><b>${t.trainingName}</b> - ${t.employeeName} (Vencimento: ${t.expirationDate})</li>`;
            textBody += `- ${t.trainingName} (${t.employeeName}) - Vencimento: ${t.expirationDate}
`;
          });
          htmlBody += `</ul>`;
        }

        if (upcomingASO.length > 0) {
          htmlBody += `<h3>🩺 ASO / Exames Vencendo em 10 dias</h3><ul>`;
          textBody += `
--- ASO / EXAMES VENCENDO EM 10 DIAS ---
`;
          upcomingASO.forEach(a => {
            htmlBody += `<li><b>${a.examType}</b> - ${a.employeeName} (Vencimento: ${a.expirationDate})</li>`;
            textBody += `- ${a.examType} (${a.employeeName}) - Vencimento: ${a.expirationDate}
`;
          });
          htmlBody += `</ul>`;
        }

        if (upcomingStandards.length > 0) {
          htmlBody += `<h3>📏 Padrões de Referência Vencendo em 10 dias</h3><ul>`;
          textBody += `
--- PADRÕES VENCENDO EM 10 DIAS ---
`;
          upcomingStandards.forEach(s => {
            htmlBody += `<li><b>${s.name}</b> (Cert: ${s.cert}) - Vencimento: ${s.expirationDate}</li>`;
            textBody += `- ${s.name} (Cert: ${s.cert}) - Vencimento: ${s.expirationDate}
`;
          });
          htmlBody += `</ul>`;
        }

        if (upcomingHealthDocs.length > 0) {
          htmlBody += `<h3>🛡️ Programas de Saúde (PGR, PCMSO, LTCAT) Vencendo em até 30 dias ou Vencidos</h3><ul>`;
          textBody += `
--- PROGRAMAS DE SAÚDE (PGR, PCMSO) VENCENDO EM ATÉ 30 DIAS OU VENCIDOS ---
`;
          upcomingHealthDocs.forEach(h => {
            const statusLabel = h.days < 0 ? `VENCIDO HÁ ${Math.abs(h.days)} DIAS` : h.days === 0 ? 'VENCE HOJE' : `Vence em ${h.days} dias`;
            htmlBody += `<li><b>[${h.docType}] ${h.title}</b> - ${statusLabel} (Validade: ${h.expirationDate})</li>`;
            textBody += `- [${h.docType}] ${h.title} - ${statusLabel} (Validade: ${h.expirationDate})
`;
          });
          htmlBody += `</ul>`;
        }

        htmlBody += `<br/><p>Acesse o portal para mais detalhes ou para regularizar as pendências.</p><p>Atenciosamente,<br/>COMANINS Metrology Suite</p>`;
        textBody += `
Acesse o portal para mais detalhes.

Atenciosamente,
COMANINS Metrology Suite`;

        // Destinatários solicitados
        const recipients = "comercial@comanins.com.br, fabio.teixeira@comanins.com.br, financeiro@comanins.com.br, manutencao@comanins.com.br, isidro.teixeira@comanins.com.br";

        const info = await transporter.sendMail({
          from: `"COMANINS Notificações" <${SMTP_USER}>`,
          to: recipients,
          subject: `Notificações COMANINS - Dia ${String(today.getDate()).padStart(2, '0')}/${String(today.getMonth() + 1).padStart(2, '0')}/${today.getFullYear()}`,
          text: textBody,
          html: htmlBody
        });
        
        console.log("Email de notificações enviado: %s", info.messageId);
      } else {
        console.log("Configurações SMTP ausentes. O email não foi enviado.");
      }
    } else {
      console.log("Nenhuma notificação programada para hoje.");
    }
  } catch (error) {
    console.error("Erro na rotina de notificações diárias:", error);
  }
}

cron.schedule('0 8 * * *', runDailyNotifications);

app.post("/api/send-health-program-alert", async (req, res) => {
  const { docs } = req.body;
  const HEALTH_RECIPIENTS = "comercial@comanins.com.br, fabio.teixeira@comanins.com.br, financeiro@comanins.com.br, manutencao@comanins.com.br, isidro.teixeira@comanins.com.br";

  const { SMTP_HOST, SMTP_USER, SMTP_PASS } = process.env;

  let htmlDocsList = "";
  let textDocsList = "";

  if (Array.isArray(docs) && docs.length > 0) {
    htmlDocsList = docs.map((d: any) => `
      <tr style="border-bottom: 1px solid #e2e8f0;">
        <td style="padding: 10px; font-weight: bold; color: #1e293b;">${d.title} (${d.docType})</td>
        <td style="padding: 10px; color: #64748b;">${d.issueDate ? new Date(d.issueDate + 'T00:00:00').toLocaleDateString('pt-BR') : '-'}</td>
        <td style="padding: 10px; font-weight: bold; color: ${d.daysRemaining < 0 ? '#dc2626' : '#d97706'};">${d.expirationDate ? new Date(d.expirationDate + 'T00:00:00').toLocaleDateString('pt-BR') : '-'}</td>
        <td style="padding: 10px;">
          <span style="background-color: ${d.daysRemaining < 0 ? '#fef2f2' : '#fffbe2'}; color: ${d.daysRemaining < 0 ? '#991b1b' : '#854d0e'}; padding: 4px 8px; border-radius: 4px; font-weight: bold; font-size: 12px;">
            ${d.daysRemaining < 0 ? `Vencido há ${Math.abs(d.daysRemaining)} dias` : d.daysRemaining === 0 ? 'Vence Hoje' : `Vence em ${d.daysRemaining} dias`}
          </span>
        </td>
      </tr>
    `).join('');

    textDocsList = docs.map((d: any) => `- ${d.title} (${d.docType}) | Validade: ${d.expirationDate} | Status: ${d.daysRemaining < 0 ? 'VENCIDO' : 'A VENCER'}`).join('\n');
  } else {
    htmlDocsList = `<tr><td colspan="4" style="padding: 12px; text-align: center; color: #64748b;">Nenhum documento com vencimento próximo.</td></tr>`;
  }

  const htmlBody = `
    <div style="font-family: Arial, sans-serif; max-width: 650px; margin: 0 auto; border: 1px solid #cbd5e1; border-radius: 8px; padding: 24px; background-color: #ffffff; color: #0f172a;">
      <div style="border-bottom: 2px solid #2563eb; padding-bottom: 12px; margin-bottom: 20px;">
        <h2 style="color: #1e40af; margin: 0; font-size: 20px;">🛡️ Alerta de Validade: Programas de Saúde e Segurança (SST)</h2>
        <p style="color: #64748b; font-size: 13px; margin: 4px 0 0 0;">COMANINS Metrology Suite - Sistema de Controle de Documentos Regulatórios</p>
      </div>

      <p>Atenção Gestão e Comercial,</p>
      <p>Este é um alerta referente ao controle de validade dos documentos de <b>Programa de Saúde e Segurança do Trabalho (PGR, PCMSO, LTCAT, etc.)</b> da empresa.</p>

      <div style="margin: 20px 0; overflow-x: auto;">
        <table style="width: 100%; border-collapse: collapse; font-size: 13px; text-align: left;">
          <thead>
            <tr style="background-color: #f1f5f9; color: #334155;">
              <th style="padding: 10px;">Documento</th>
              <th style="padding: 10px;">Emissão</th>
              <th style="padding: 10px;">Validade</th>
              <th style="padding: 10px;">Situação</th>
            </tr>
          </thead>
          <tbody>
            ${htmlDocsList}
          </tbody>
        </table>
      </div>

      <p style="font-size: 13px; color: #475569; background-color: #f8fafc; padding: 12px; border-radius: 6px; border-left: 4px solid #2563eb;">
        <b>Destinatários Notificados:</b><br/>
        comercial@comanins.com.br<br/>
        fabio.teixeira@comanins.com.br<br/>
        financeiro@comanins.com.br<br/>
        manutencao@comanins.com.br<br/>
        isidro.teixeira@comanins.com.br
      </p>

      <br/>
      <p style="font-size: 12px; color: #94a3b8; text-align: center; border-top: 1px solid #e2e8f0; padding-top: 12px;">
        Notificação automática gerada pelo sistema COMANINS Metrology Suite.
      </p>
    </div>
  `;

  if (SMTP_HOST && SMTP_USER && SMTP_PASS) {
    try {
      const transporter = nodemailer.createTransport({
        service: 'gmail',
        auth: {
          user: SMTP_USER,
          pass: SMTP_PASS
        }
      });

      await transporter.sendMail({
        from: `"COMANINS Segurança e Saúde" <${SMTP_USER}>`,
        to: HEALTH_RECIPIENTS,
        subject: `[ALERTA COMANINS] Controle de Validade - Programas de Saúde (PGR/PCMSO)`,
        html: htmlBody,
        text: `Alerta COMANINS - Programas de Saúde:\n\n${textDocsList}\n\nDestinatários: ${HEALTH_RECIPIENTS}`
      });

      return res.json({ success: true, emailSent: true, recipients: HEALTH_RECIPIENTS });
    } catch (err: any) {
      console.error("[HEALTH ALERT] Erro ao enviar e-mail via SMTP:", err);
      return res.json({ success: false, error: err.message, emailSent: false });
    }
  } else {
    console.log("[HEALTH ALERT] SMTP não configurado. Notificação enviada em modo de teste para:", HEALTH_RECIPIENTS);
    return res.json({ success: true, emailSent: false, smtpNotConfigured: true, recipients: HEALTH_RECIPIENTS });
  }
});


app.post("/api/test-notifications", async (req, res) => {
  await runDailyNotifications();
  res.json({ success: true, message: "Notificações verificadas." });
});

app.post("/api/generate-birthday-message", async (req, res) => {
  const { name } = req.body;
  if (!name) return res.status(400).json({ error: "Nome não fornecido" });
  
  const genAI = getGeminiClient();
  if (!genAI) {
    return res.json({ message: `Feliz Aniversário, ${name}! A equipe COMANINS deseja a você um excelente dia, com muita saúde, paz e sucesso.` });
  }

  try {
    const prompt = `Você é a inteligência artificial do sistema COMANINS Metrology. Hoje é o aniversário do colaborador ${name}. Escreva uma mensagem curta (máximo 3 frases), calorosa, amigável e profissional de feliz aniversário para ele, que aparecerá quando ele fizer login no sistema. Não use aspas na resposta.`;
    const result = await genAI.models.generateContent({
      model: "gemini-2.5-flash",
      contents: prompt
    });
    return res.json({ message: result.text || `Feliz Aniversário, ${name}!` });
  } catch (error) {
    console.error("Erro ao gerar mensagem de aniversário:", error);
    return res.json({ message: `Feliz Aniversário, ${name}! A equipe COMANINS deseja a você um dia incrível!` });
  }
});





app.post("/api/auth/create-user", requireAuth, async (req: AuthRequest, res) => {
  try {
    const requesterProfile = await findPortalUserForAuth(req.user);
    if (!requesterProfile || !isAdministratorProfile(requesterProfile)) {
      return res.status(403).json({ error: 'FORBIDDEN' });
    }

    const email = String(req.body?.email || '').trim().toLowerCase();
    const password = String(req.body?.password || '');

    if (!email.endsWith('@comanins.internal')) {
      return res.status(400).json({ error: 'INVALID_INTERNAL_EMAIL' });
    }
    if (password.length < 10) {
      return res.status(400).json({ error: 'WEAK_TEMP_PASSWORD' });
    }

    try {
      const created = await adminAuth.createUser({
        email,
        password,
        emailVerified: false,
        disabled: false,
      });
      return res.json({ success: true, uid: created.uid });
    } catch (error: any) {
      if (error?.code === 'auth/email-already-exists') {
        return res.status(400).json({ error: 'EMAIL_EXISTS' });
      }
      throw error;
    }
  } catch (error) {
    console.error('Create user error:', error);
    return res.status(500).json({ error: 'INTERNAL_SERVER_ERROR' });
  }
});

app.post("/api/auth/verify-admin", requireAuth, async (req: AuthRequest, res) => {
  try {
    const username = String(req.body?.username || '').trim().toLowerCase();
    const password = String(req.body?.password || '');

    if (!username || !password) {
      return res.json({ valid: false });
    }

    const email = username.includes('@')
      ? username
      : `${username}@comanins.internal`;

    if (!email.endsWith('@comanins.internal')) {
      return res.json({ valid: false });
    }

    const response = await fetch(
      `https://identitytoolkit.googleapis.com/v1/accounts:signInWithPassword?key=${firebaseConfig.apiKey}`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password, returnSecureToken: true }),
      },
    );

    if (!response.ok) {
      return res.json({ valid: false });
    }

    const data: any = await response.json();
    if (!data?.idToken) {
      return res.json({ valid: false });
    }

    const decodedAdmin = await adminAuth.verifyIdToken(data.idToken);
    const requestedEmail = String(decodedAdmin.email || '').trim().toLowerCase();
    if (requestedEmail !== email) {
      return res.json({ valid: false });
    }

    const adminProfile = await findPortalUserForAuth(decodedAdmin);
    if (!adminProfile || !isAdministratorProfile(adminProfile)) {
      return res.json({ valid: false });
    }

    return res.json({ valid: true, username: adminProfile.username || username });
  } catch (error) {
    console.error('Verify admin error:', error);
    return res.status(500).json({ error: 'INTERNAL_SERVER_ERROR' });
  }
});

app.post("/api/auth/legacy-login", async (req, res) => {
  try {
    const { username, cnpj, password, type } = req.body;
    
    if (type === 'internal') {
      const usersRef = getClientCollection(clientDb, "portalUsers");
      const snap = await getClientDocs(usersRef);
      const user = snap.docs.find(d => {
        const u = d.data();
        return (u.username || '').toLowerCase() === username.toLowerCase();
      });
      
      if (!user) return res.json({ valid: false });
      
      const userData = user.data();
      if (userData.password === password) {
        return res.json({ valid: true, user: { id: user.id, ...userData } });
      }
      return res.json({ valid: false });
      
    } else if (type === 'client') {
      const clientsRef = getClientCollection(clientDb, "clients");
      const snap = await getClientDocs(clientsRef);
      const cleanCnpj = cnpj.replace(/\D/g, '');
      const client = snap.docs.find(d => {
        const c = d.data();
        return (c.cnpj || '').replace(/\D/g, '') === cleanCnpj;
      });
      
      if (!client) return res.json({ valid: false });
      
      const clientData = client.data();
      if (clientData.password === password) {
        return res.json({ valid: true, user: { id: client.id, ...clientData } });
      }
      return res.json({ valid: false });
    }
    
    res.json({ valid: false });
  } catch (error: any) {
    console.error("Legacy login error:", error);
    if (error.code === 7 || (error.message && error.message.includes('PERMISSION_DENIED'))) {
        console.error("\n\n[ERRO CRÍTICO DE PERMISSÃO]");
        console.error("O servidor Node.js não possui permissão para ler o banco de dados.");
        console.error("Você precisa configurar as variáveis de ambiente: FIREBASE_ADMIN_PROJECT_ID, FIREBASE_ADMIN_CLIENT_EMAIL e FIREBASE_ADMIN_PRIVATE_KEY");
        console.error("com o JSON da conta de serviço (Service Account) do Firebase.\n\n");
    }
    res.status(500).json({ error: "Erro de servidor ao validar credencial antiga." });
  }
});

app.post("/api/clients", (req, res) => {
  const { name, cnpj, email, phone, city, password } = req.body;
  if (!name || !cnpj) {
    return res.status(400).json({ error: "Nome e CNPJ são obrigatórios." });
  }
  const newClient = {
    id: "c_" + Date.now(),
    name,
    cnpj,
    email: email || "",
    phone: phone || "",
    city: city || "",
    password: password || "123456"
  };
  clients.push(newClient);
  saveDatabase();
  res.status(201).json(newClient);
});

app.post("/api/clients/bulk", (req, res) => {
  const { list } = req.body;
  if (!list || !Array.isArray(list)) {
    return res.status(400).json({ error: "Lista de clientes inválida ou vazia." });
  }

  const added: any[] = [];
  list.forEach((item: any, i: number) => {
    const { name, cnpj, email, phone, city, password } = item;
    if (name && cnpj) {
      const newClient = {
        id: "c_" + (Date.now() + i),
        name: String(name).trim(),
        cnpj: String(cnpj).trim(),
        email: String(email || "").trim(),
        phone: String(phone || "").trim(),
        city: String(city || "").trim(),
        password: String(password || "123456").trim()
      };
      clients.push(newClient);
      added.push(newClient);
    }
  });

  if (added.length > 0) {
    saveDatabase();
  }
  res.status(201).json({ success: true, count: added.length, list: added });
});

app.delete("/api/clients/:id", (req, res) => {
  const { id } = req.params;
  const index = clients.findIndex(item => item.id === id);
  if (index === -1) {
    return res.status(404).json({ error: "Cliente não encontrado." });
  }
  clients.splice(index, 1);
  instruments = instruments.filter(i => i.clientId !== id);
  const instIds = new Set(instruments.map(i => i.id));
  calibrationReports = calibrationReports.filter(r => instIds.has(r.instrumentId));
  saveDatabase();
  res.json({ success: true });
});

// Instruments endpoints
app.get("/api/instruments", (req, res) => {
  res.json(instruments);
});

app.post("/api/instruments", (req, res) => {
  const { tag, description, brand, model, serialNumber, category, rangeMin, rangeMax, unit, mpe, clientId } = req.body;
  if (!tag || !description || !category || clientId === undefined) {
    return res.status(400).json({ error: "Tag, descrição, grandeza e cliente são obrigatórios." });
  }
  const newInstrument = {
    id: "i_" + Date.now(),
    tag,
    description,
    brand: brand || "",
    model: model || "",
    serialNumber: serialNumber || "",
    category: category as "pressure" | "temperature",
    rangeMin: Number(rangeMin) || 0,
    rangeMax: Number(rangeMax) || 100,
    unit: unit || "",
    mpe: Number(mpe) || 0.1,
    lastCalibrationDate: "",
    nextCalibrationDate: "",
    status: "Aguardando Triagem" as const,
    clientId,
  };
  instruments.push(newInstrument);
  saveDatabase();
  res.status(201).json(newInstrument);
});

app.post("/api/instruments/bulk", (req, res) => {
  const { list } = req.body;
  if (!list || !Array.isArray(list)) {
    return res.status(400).json({ error: "Lista de instrumentos inválida." });
  }

  const added: any[] = [];
  list.forEach((item: any, i: number) => {
    const { tag, description, brand, model, serialNumber, category, rangeMin, rangeMax, unit, mpe, clientId } = item;
    if (tag && description && category && clientId) {
      const normCat = (String(category).toLowerCase().includes("temp") || String(category).toLowerCase() === "t") ? "temperature" : "pressure";
      const newInstrument = {
        id: "i_" + (Date.now() + i),
        tag: String(tag).trim(),
        description: String(description).trim(),
        brand: String(brand || "").trim(),
        model: String(model || "").trim(),
        serialNumber: String(serialNumber || "").trim(),
        category: normCat as "pressure" | "temperature",
        rangeMin: Number(rangeMin) || 0,
        rangeMax: Number(rangeMax) || 100,
        unit: String(unit || "").trim(),
        mpe: Number(mpe) || 0.1,
        lastCalibrationDate: "",
        nextCalibrationDate: "",
        status: "Aguardando Triagem" as const,
        clientId: String(clientId).trim(),
      };
      instruments.push(newInstrument);
      added.push(newInstrument);
    }
  });

  if (added.length > 0) {
    saveDatabase();
  }
  res.status(201).json({ success: true, count: added.length, list: added });
});

app.put("/api/instruments/:id", (req, res) => {
  const { id } = req.params;
  const index = instruments.findIndex(item => item.id === id);
  if (index === -1) {
    return res.status(404).json({ error: "Instrumento não encontrado." });
  }
  
  const current = instruments[index];
  const updated = {
    ...current,
    ...req.body,
    // Garanta cast de valores numéricos
    rangeMin: req.body.rangeMin !== undefined ? Number(req.body.rangeMin) : current.rangeMin,
    rangeMax: req.body.rangeMax !== undefined ? Number(req.body.rangeMax) : current.rangeMax,
    mpe: req.body.mpe !== undefined ? Number(req.body.mpe) : current.mpe,
  };
  
  instruments[index] = updated;
  saveDatabase();
  res.json(updated);
});

app.delete("/api/instruments/:id", (req, res) => {
  const { id } = req.params;
  const index = instruments.findIndex(item => item.id === id);
  if (index === -1) {
    return res.status(404).json({ error: "Instrumento não encontrado." });
  }
  instruments.splice(index, 1);
  saveDatabase();
  res.json({ success: true });
});

// Calibration reports endpoints
app.get("/api/calibrations", (req, res) => {
  res.json(calibrationReports);
});

app.post("/api/calibrations", (req, res) => {
  const { instrumentId, technicianName, points, observations } = req.body;
  if (!instrumentId || !points || !Array.isArray(points)) {
    return res.status(400).json({ error: "Dados de calibração incompletos." });
  }

  const inst = instruments.find(item => item.id === instrumentId);
  if (!inst) {
    return res.status(404).json({ error: "Instrumento não encontrado." });
  }

  // Calculate error and check with MPE
  let maxError = 0;
  const processedPoints = points.map((p: any) => {
    const error = Number((Number(p.instrumentValue) - Number(p.standardValue)).toFixed(4));
    const absError = Math.abs(error);
    if (absError > maxError) maxError = absError;
    const pass = absError <= inst.mpe;
    return {
      id: p.id || "p_" + Math.random().toString(36).substring(2, 9),
      nominalValue: Number(p.nominalValue),
      standardValue: Number(p.standardValue),
      instrumentValue: Number(p.instrumentValue),
      error,
      mpe: inst.mpe,
      pass,
    };
  });

  const span = inst.rangeMax - inst.rangeMin;
  const maxRelativeError = span > 0 ? Number(((maxError / span) * 100).toFixed(4)) : 0;
  const approved = processedPoints.every(p => p.pass);

  const newReport = {
    id: "r_" + Date.now(),
    instrumentId,
    technicianName: technicianName || "Técnico Geral",
    date: new Date().toISOString().split("T")[0],
    points: processedPoints,
    maxError,
    maxRelativeError,
    approved,
    observations: observations || "",
  };

  calibrationReports.push(newReport);

  // Update original instrument state
  inst.status = "Calibrado";
  inst.lastCalibrationDate = newReport.date;
  const nextDate = new Date();
  nextDate.setFullYear(nextDate.getFullYear() + 1); // Default calibration period is 12 months
  inst.nextCalibrationDate = nextDate.toISOString().split("T")[0];

  saveDatabase();
  res.status(201).json({ report: newReport, instrument: inst });
});

// Contact / Quote requests endpoints
app.get("/api/contacts", (req, res) => {
  res.json(contactMessages);
});

app.post("/api/contacts", (req, res) => {
  const { name, company, email, phone, message, category } = req.body;
  if (!name || !email || !message) {
    return res.status(400).json({ error: "Nome, e-mail e mensagem são campos obrigatórios." });
  }

  const newMessage = {
    id: "msg_" + Date.now(),
    name,
    company: company || "",
    email,
    phone: phone || "",
    message,
    category: (category || "calibracao") as "calibracao" | "manutencao" | "vendas" | "outros",
    date: new Date().toISOString().split("T")[0],
    status: "pendente" as const,
  };

  contactMessages.push(newMessage);
  saveDatabase();
  res.status(201).json(newMessage);
});

app.put("/api/contacts/:id", (req, res) => {
  const { id } = req.params;
  const msg = contactMessages.find(item => item.id === id);
  if (!msg) {
    return res.status(404).json({ error: "Mensagem não encontrada." });
  }
  msg.status = req.body.status || "respondido";
  saveDatabase();
  res.json(msg);
});

// Helper function to invoke Gemini API with Exponential Backoff Retry for 429 Rate Limits
async function callGeminiWithRetry(fn: () => Promise<any>, maxRetries = 3, initialDelay = 1000): Promise<any> {
  let attempt = 0;
  let delay = initialDelay;
  while (attempt <= maxRetries) {
    try {
      return await fn();
    } catch (err: any) {
      const errStr = String(err?.message || err);
      const isRateLimit =
        errStr.includes("429") ||
        errStr.includes("Rate exceeded") ||
        errStr.includes("RESOURCE_EXHAUSTED") ||
        errStr.includes("Quota");

      if (isRateLimit && attempt < maxRetries) {
        attempt++;
        const jitter = Math.random() * 250;
        console.warn(`[Gemini API] HTTP 429 Rate Exceeded detectado. Tentativa ${attempt}/${maxRetries}. Aguardando ${delay + jitter}ms...`);
        await new Promise((r) => setTimeout(r, delay + jitter));
        delay *= 2;
        continue;
      }
      throw err;
    }
  }
}

// AI Portal Assistant - Using Gemini API
app.post("/api/chat", async (req, res) => {
  const { messages } = req.body;
  if (!messages || !Array.isArray(messages)) {
    return res.status(400).json({ error: "Mensagens inválidas." });
  }

  const gemini = getGeminiClient();

  if (!gemini) {
    // Elegant Offline Fallback
    const lastUserMessage = messages[messages.length - 1]?.text || "";
    let reply = "";

    // Simulated technician responses based on query
    const textLower = lastUserMessage.toLowerCase();
    if (textLower.includes("pressão") || textLower.includes("pressure") || textLower.includes("manometro") || textLower.includes("bar")) {
      reply = "**[Modo Demo - Resposta Automática COMANINS]**\n\nIdentifiquei que sua dúvida é sobre grandezas de **Pressão**.\n\nNa calibração de manômetros e transmissores de pressão, nós utilizamos padrões com rastreabilidade RBC (Inmetro). Seguem boas práticas recomendadas:\n1. **Estabilização de temperatura**: Deixe o instrumento na sala climatizada (geralmente 20 ± 2°C) por pelo menos 4 horas antes de calibrar.\n2. **Pontos de teste**: Recomenda-se realizar leituras em 5 pontos ascendentes e 5 descendentes (0%, 25%, 50%, 75% e 100% da faixa de medição) para avaliar histerese.\n3. **Cálculo de erro**: $Erro = Valor\\_{Lido} - Valor\\_{Padrao}$. Se o maior erro absoluto for menor que o Erro Máximo Tolerado (EMT ou MPE), o instrumento é aprovado.\n\n*Nota: Insira uma chave Gemini válida nas configurações de Secrets para obter respostas analíticas detalhadas do nosso assistente de IA.*";
    } else if (textLower.includes("temperatura") || textLower.includes("termopar") || textLower.includes("pt100") || textLower.includes("grau")) {
      reply = "**[Modo Demo - Resposta Automática COMANINS]**\n\nIdentifiquei que sua dúvida é sobre grandezas de **Temperatura**.\n\nPara sensores térmicos como PT100 (RTD) ou Termopares (K, J, T):\n1. **PT100**: Segue a norma IEC 60751. A resistência padrão a 0 °C é exatamente 100.00 $\\Omega$. Para calcular a temperatura a partir da resistência, utilize a fórmula Callendar-Van Dusen:\n   $R_t = R_0 \\cdot (1 + A \\cdot t + B \\cdot t^2)$\n2. **Termopares**: Exigem cabo de compensação correto e compensação de junta fria (CJC) ativa no calibrador.\n3. **Pontos de Teste**: Geralmente calibrados em banho termostático líquido ou bloco seco industrial.\n\n*Nota: Configure sua GEMINI_API_KEY no painel de Secrets para ativar a inteligência artificial completa e interagir dinamicamente.*";
    } else if (textLower.includes("incerteza") || textLower.includes("uncertainty") || textLower.includes("fórmula") || textLower.includes("calcular")) {
      reply = "**[Modo Demo - Resposta Automática COMANINS]**\n\nPara o cálculo da incerteza expandida de medição ($U$):\n1. **Incerteza Tipo A**: Avaliação estatística por repetitividade (desvio padrão das medições dividido por $\\sqrt{n}$).\n2. **Incerteza Tipo B**: Resolução do instrumento sob teste (distribuição retangular: $res / \\sqrt{12}$), incerteza do padrão calibrado ($U_{padrão} / k$), deriva térmica do padrão, etc.\n3. **Incerteza Combinada ($u_c$)**: Soma quadrática das componentes: $u_c = \\sqrt{u_{TipoA}^2 + u_{TipoB1}^2 + u_{TipoB2}^2}$\n4. **Incerteza Expandida ($U$)**: $U = k \\cdot u_c$, onde geralmente se adota o fator de abrangência $k = 2$ para 95.45% de nível de confiança.\n\n*Dica: Conecte o modelo Gemini em produção via Secrets para obter cálculos automáticos estruturados passo a passo.*";
    } else {
      reply = `**[Modo Demo - Assistente Técnico COMANINS]**\n\nOlá! Sou o assistente técnico especializado em metrologia industrial da COMANINS.\n\nPosso auxiliar você com:\n- Fórmulas de conversão de pressão (bar, psi, mmHg, Pa) e temperatura (°C, °F, K);\n- Normas técnicas (IEC 60751, ASME B40.100, Portarias Inmetro);\n- Dicas sobre calibração de instrumentos industriais;\n- Orientações de cálculo de erro máximo tolerado (MPE) e incerteza de medição.\n\n_Como o servidor está operando atualmente sem uma chave GEMINI_API_KEY ativa (Modo Demonstração), respondo a partir de diretrizes locais predefinidas. Adicione a chave no painel do AI Studio para obter a IA generativa completa!_`;
    }

    return res.json({ text: reply });
  }

  try {
    // Prepare prompt with background guidelines so Gemini responds exactly as a Metrology Expert
    const promptHistory = messages.map(m => {
      return `${m.sender === "user" ? "Usuário" : "Assistente"}: ${m.text}`;
    }).join("\n");

    const systemInstruction = `Você é o "Assistente Técnico de Metrologia da COMANINS", um especialista altamente qualificado em calibração, manutenção de instrumentos industriais, metrologia científica e industrial, focado nas grandezas de Pressão e Temperatura.
Seus usuários são técnicos de calibração que trabalham em laboratório ou em campo, bem como clientes industriais.

Suas diretrizes:
1. Responda em português de forma clara, profissional, precisa e técnica.
2. Seja prestativo com fórmulas matemáticas, conversão de unidades (como bar para psi, °C para °F ou K), e padrões de calibração de acordo com as normas brasileiras e internacionais (Inmetro, ASTM, IEC 60751 para PT100, ASME B40.100 para manômetros).
3. Ao fornecer fórmulas matemáticas, você pode utilizar notação científica legível ou markdown padrão.
4. Mantenha as respostas focadas e evite respostas extremamente longas desnecessariamente, a menos que solicitado um passo a passo do cálculo de incerteza de medição ou detalhamento técnico.
5. Nunca cite segredos internos ou que você está rodando sob uma plataforma artificial. Mostre-se como o assistente metrológico oficial da COMANINS.`;

    const response = await callGeminiWithRetry(() =>
      gemini.models.generateContent({
        model: "gemini-2.5-flash",
        contents: [
          { text: promptHistory }
        ],
        config: {
          systemInstruction,
          temperature: 0.7,
        }
      })
    );

    res.json({ text: response.text });
  } catch (err: any) {
    console.error("Erro na chamada da API Gemini:", err);
    res.json({
      text: "O assistente técnico de IA da COMANINS está temporariamente com alta demanda. As orientações da base local de metrologia permanecem totalmente disponíveis."
    });
  }
});

// Endpoint para Gerar Análise de Não Conformidade (RNC) com IA
app.post("/api/generate-rnc", async (req, res) => {
  const { instrumentTag, instrumentDescription, coma, clientName, reason, technicianName, range } = req.body;
  const gemini = getGeminiClient();

  if (!gemini) {
    const fallbackText = `ANÁLISE TÉCNICA E RECOMENDAÇÃO (Metrologia COMANINS):\n\n` +
      `1. DIAGNÓSTICO DO DEFEITO:\nO instrumento ${instrumentTag || 'analisado'} (${instrumentDescription || 'Medidor'}) apresentou a seguinte anormalidade durante a calibração: "${reason || 'Falha técnica'}".\n\n` +
      `2. IMPACTO METROLÓGICO:\nA falha descrita impede a rastreabilidade metrológica RBC e compromete a exatidão das medições no processo do cliente (${clientName || 'Cliente'}). O instrumento não atende aos critérios de aceitação.\n\n` +
      `3. AÇÃO CORRETIVA RECOMENDADA:\n- Encaminhar o instrumento para manutenção técnica/ajuste ou substituição de componentes.\n- Realizar nova calibração na bancada após o reparo.\n- Se o reparo for inviável, recomenda-se a baixa e descarte do equipamento.`;
    return res.json({ analysis: fallbackText });
  }

  try {
    const prompt = `Você é um Engenheiro Metrologista Sênior e Especialista em Qualidade (ABNT NBR ISO/IEC 17025) do laboratório COMANINS.
Sua tarefa é gerar uma Análise Técnica e Recomendação de Não Conformidade (RNC) extremamente detalhada, técnica e embasada para ser apresentada aos clientes corporativos/industriais.

Dados do Instrumento Submetido à Análise:
- TAG: ${instrumentTag || 'N/A'}
- Descrição: ${instrumentDescription || 'N/A'}
- COMA/Certificado: ${coma || 'N/A'}
- Cliente: ${clientName || 'N/A'}
- Faixa de Medição/Capacidade: ${range || 'N/A'}
- Técnico/Metrologista Responsável: ${technicianName || 'N/A'}
- Defeito ou Motivo apontado no laboratório: "${reason || 'Falha na calibração'}"

DIRETRIZES DE GERAÇÃO:
- Utilize terminologia técnica avançada de metrologia, calibração e instrumentação (ex: histerese, repetitividade, erro fiduciário, incerteza de medição, desvio, tolerância, VVC).
- O relatório deve transmitir alta credibilidade técnica, embasamento normativo e rigor científico.
- O texto não deve ser genérico. Aprofunde-se na provável mecânica, eletrônica ou física do erro apontado ("${reason}").

Forneça a análise obrigatoriamente estruturada nas seguintes 4 seções detalhadas:

1. DIAGNÓSTICO METROLÓGICO E DESCRIÇÃO TÉCNICA DA ANOMALIA
(Explique tecnicamente o que o defeito apontado significa na prática para a física ou eletrônica do instrumento. Detalhe como essa falha ocorre e quais os mecanismos internos ou externos que podem ter causado este desvio ou quebra de conformidade).

2. AVALIAÇÃO DE IMPACTO NO PROCESSO E RISCO DE QUALIDADE
(Explique detalhadamente as consequências do uso deste instrumento no estado atual. Como a falha afeta a incerteza da medição, a rastreabilidade e quais os riscos para o processo produtivo ou controle de qualidade do cliente).

3. FUNDAMENTAÇÃO NORMATIVA E GESTÃO DE QUALIDADE (ISO/IEC 17025)
(Mencione o impacto na garantia de resultados válidos, enfatizando a justificativa técnica para a reprovação do item ensaiado e a suspensão imediata de seu uso para proteger a conformidade do cliente).

4. AÇÕES CORRETIVAS E RECOMENDAÇÕES DIRETAS
(Liste recomendações rigorosas: indique se é cabível manutenção corretiva, ajuste e posterior recalibração, ou se a melhor conduta técnica e econômica é o descarte e substituição do equipamento).

Sua resposta deve ser entregue em texto contínuo bem formatado, utilizando jargão técnico adequado, linguagem corporativa formal e em Português do Brasil. O resultado final será impresso no certificado oficial do cliente.`;

    const response = await callGeminiWithRetry(() =>
      gemini.models.generateContent({
        model: 'gemini-2.5-flash',
        contents: prompt,
      })
    );

    res.json({ analysis: response.text || 'Análise concluída.' });
  } catch (err: any) {
    console.error("Erro ao gerar RNC com Gemini:", err);
    res.json({
      analysis: `ANÁLISE TÉCNICA DE NÃO CONFORMIDADE:\n\n1. DIAGNÓSTICO: O instrumento ${instrumentTag || ''} apresentou a seguinte inconsistência: "${reason}".\n2. IMPACTO: Impossibilidade de validação de incerteza metrológica.\n3. AÇÃO CORRETIVA: Manutenção corretiva ou substituição do equipamento.`
    });
  }
});

// Endpoint to send contact emails
// Generic email endpoint
app.post("/api/send-email", async (req, res) => {
  const { to, subject, html } = req.body;
  if (!to || !subject || !html) {
    return res.status(400).json({ error: "Dados incompletos para envio de e-mail." });
  }

  const { SMTP_HOST, SMTP_PORT, SMTP_USER, SMTP_PASS } = process.env;
  
  if (SMTP_HOST && SMTP_USER && SMTP_PASS) {
    try {
      const transporter = nodemailer.createTransport({
        service: 'gmail',
        auth: {
          user: SMTP_USER,
          pass: SMTP_PASS
        }
      });

      await transporter.sendMail({
        from: `"COMANINS Portal" <${SMTP_USER}>`,
        to: to,
        subject: subject,
        html: html
      });
      
      return res.json({ success: true, emailSent: true });
    } catch (err) {
      console.error("[EMAIL] Erro ao enviar e-mail via SMTP:", err);
      return res.json({ success: false, error: err.message });
    }
  } else {
    console.log("[EMAIL] SMTP não configurado. Dados:", { to, subject });
    return res.json({ success: true, emailSent: false, smtpNotConfigured: true });
  }
});

app.post("/api/send-contact-email", async (req, res) => {
  const { name, company, email, phone, message, category } = req.body;

  if (!name || !email || !message) {
    return res.status(400).json({ error: "Dados incompletos para envio de e-mail de contato." });
  }

  const { SMTP_HOST, SMTP_PORT, SMTP_USER, SMTP_PASS } = process.env;

  const emailSubject = `[SITE COMANINS] Contato: ${category || 'Geral'} - ${company || name}`;
  
  const emailHtml = `
    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; border: 1px solid #e2e8f0; border-radius: 8px; padding: 24px; background-color: #ffffff; color: #1e293b;">
      <div style="text-align: center; border-bottom: 2px solid #2563eb; padding-bottom: 16px; margin-bottom: 24px;">
        <h2 style="color: #2563eb; margin: 0; font-size: 20px;">Contato pelo Site - COMANINS</h2>
      </div>
      
      <div style="background-color: #f8fafc; border: 1px solid #e2e8f0; border-radius: 6px; padding: 16px; margin: 20px 0;">
        <table style="width: 100%; border-collapse: collapse; font-size: 13px;">
          <tr>
            <td style="padding: 6px 0; color: #64748b; font-weight: bold; width: 35%;">Nome:</td>
            <td style="padding: 6px 0; color: #0f172a; font-weight: bold;">${name}</td>
          </tr>
          <tr>
            <td style="padding: 6px 0; color: #64748b; font-weight: bold;">Empresa:</td>
            <td style="padding: 6px 0; color: #0f172a;">${company || 'Não informada'}</td>
          </tr>
          <tr>
            <td style="padding: 6px 0; color: #64748b; font-weight: bold;">E-mail:</td>
            <td style="padding: 6px 0; color: #0f172a;">${email}</td>
          </tr>
          <tr>
            <td style="padding: 6px 0; color: #64748b; font-weight: bold;">Telefone:</td>
            <td style="padding: 6px 0; color: #0f172a;">${phone || 'Não informado'}</td>
          </tr>
          <tr>
            <td style="padding: 6px 0; color: #64748b; font-weight: bold;">Categoria:</td>
            <td style="padding: 6px 0; color: #0f172a;">${category || 'Outros'}</td>
          </tr>
        </table>
      </div>
      
      <div style="margin-top: 20px;">
        <h3 style="color: #64748b; font-size: 14px; margin-bottom: 10px;">Mensagem:</h3>
        <p style="background-color: #f1f5f9; padding: 16px; border-radius: 6px; font-size: 14px; line-height: 1.6; white-space: pre-wrap;">${message}</p>
      </div>
    </div>
  `;

  if (SMTP_HOST && SMTP_USER && SMTP_PASS) {
    try {
      const transporter = nodemailer.createTransport({
        service: 'gmail',
        auth: {
          user: SMTP_USER,
          pass: SMTP_PASS
        }
      });

      await transporter.sendMail({
        from: `"${name}" <${SMTP_USER}>`,
        replyTo: email,
        to: "comercial@comanins.com.br",
        subject: emailSubject,
        html: emailHtml,
        text: `Nome: ${name}\nEmpresa: ${company}\nE-mail: ${email}\nTelefone: ${phone}\n\nMensagem:\n${message}`
      });
      
      return res.json({ success: true, emailSent: true });
    } catch (err: any) {
      console.error("[CONTACT EMAIL] Erro ao enviar e-mail via SMTP:", err);
      return res.json({ success: false, error: err.message });
    }
  } else {
    console.log("[CONTACT EMAIL] SMTP não configurado. Dados recebidos:", { name, company, email, phone, message });
    return res.json({ success: true, emailSent: false, smtpNotConfigured: true });
  }
});

// Endpoint de notificação de visualização de contra-cheque com compliance LGPD
app.post("/api/send-document-notification", async (req, res) => {
  const { employeeName, employeeRegister, month, visualizedAt, ip, userAgent, documentType } = req.body;
  if (!employeeName || !month) {
    return res.status(400).json({ error: "Dados incompletos para envio da notificação." });
  }

  const { SMTP_HOST, SMTP_PORT, SMTP_USER, SMTP_PASS } = process.env;

  const docTypeLabel = documentType || "Contra-cheque";
  const emailSubject = `[COMPROVANTE LGPD] Visualização de ${docTypeLabel} - ${employeeName} (${month})`;
  const emailHtml = `
    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; border: 1px solid #e2e8f0; border-radius: 8px; padding: 24px; background-color: #ffffff; color: #1e293b;">
      <div style="text-align: center; border-bottom: 2px solid #2563eb; padding-bottom: 16px; margin-bottom: 24px;">
        <h2 style="color: #2563eb; margin: 0; font-size: 20px;">COMANINS INSTRUMENTAÇÃO</h2>
        <span style="font-size: 11px; text-transform: uppercase; letter-spacing: 1px; color: #64748b; font-weight: bold; display: block; margin-top: 4px;">Comprovante Oficial de Visualização (LGPD)</span>
      </div>
      
      <p style="font-size: 14px; line-height: 1.6; color: #334155;">
        Confirmamos que o colaborador abaixo visualizou seu(ua) <b>${docTypeLabel}</b> correspondente ao mês de referência <b>${month}</b>.
      </p>
      
      <div style="background-color: #f8fafc; border: 1px solid #e2e8f0; border-radius: 6px; padding: 16px; margin: 20px 0;">
        <table style="width: 100%; border-collapse: collapse; font-size: 13px;">
          <tr>
            <td style="padding: 6px 0; color: #64748b; font-weight: bold; width: 35%;">Colaborador:</td>
            <td style="padding: 6px 0; color: #0f172a; font-weight: bold;">${employeeName}</td>
          </tr>
          <tr>
            <td style="padding: 6px 0; color: #64748b; font-weight: bold;">Matrícula / Registro:</td>
            <td style="padding: 6px 0; color: #0f172a; font-family: monospace;">${employeeRegister || 'Não informado'}</td>
          </tr>
          <tr>
            <td style="padding: 6px 0; color: #64748b; font-weight: bold;">Mês de Referência:</td>
            <td style="padding: 6px 0; color: #0f172a; font-weight: bold;">${month}</td>
          </tr>
          <tr>
            <td style="padding: 6px 0; color: #64748b; font-weight: bold;">Data e Hora de Acesso:</td>
            <td style="padding: 6px 0; color: #0f172a;">${visualizedAt}</td>
          </tr>
          <tr>
            <td style="padding: 6px 0; color: #64748b; font-weight: bold;">Endereço de IP:</td>
            <td style="padding: 6px 0; color: #0f172a; font-family: monospace;">${ip || 'Client Side Connection'}</td>
          </tr>
          <tr>
            <td style="padding: 6px 0; color: #64748b; font-weight: bold;">Dispositivo / Browser:</td>
            <td style="padding: 6px 0; color: #0f172a; font-size: 11px; line-height: 1.4;">${userAgent || 'Desconhecido'}</td>
          </tr>
        </table>
      </div>
      
      <div style="border-top: 1px solid #e2e8f0; padding-top: 16px; font-size: 11px; color: #64748b; line-height: 1.5; text-align: justify;">
        <p><b>Aviso Legal (LGPD):</b> Este e-mail é uma notificação automática e serve como trilha de auditoria para fins de compliance com a Lei Geral de Proteção de Dados (LGPD). O acesso aos dados de folha de pagamento do respectivo colaborador foi registrado com o seu consentimento explícito em nosso portal interno de Recursos Humanos. As informações de IP e dispositivo foram coletadas exclusivamente para garantir a integridade da segurança da informação e prevenção de fraudes.</p>
      </div>
      
      <div style="text-align: center; margin-top: 24px; font-size: 10px; color: #94a3b8; border-top: 1px dashed #e2e8f0; padding-top: 12px;">
        © ${new Date().getFullYear()} COMANINS Metrologia Industrial • Todos os direitos reservados.
      </div>
    </div>
  `;

  console.log(`[PAYSLIP COMPLIANCE] Notificação de visualização de ${docTypeLabel} criada para ${employeeName} (${month})`);

  if (SMTP_HOST && SMTP_USER && SMTP_PASS) {
    try {
      const transporter = nodemailer.createTransport({
        service: 'gmail',
        auth: {
          user: SMTP_USER,
          pass: SMTP_PASS
        }
      });

      await transporter.sendMail({
        from: `"${SMTP_USER}" <${SMTP_USER}>`,
        to: "financeiro@comanins.com.br",
        subject: emailSubject,
        html: emailHtml,
        text: `Comprovante de Visualização de ${docTypeLabel}\n\nColaborador: ${employeeName}\nMatrícula: ${employeeRegister}\nMês: ${month}\nData/Hora: ${visualizedAt}\nIP: ${ip}\nDispositivo: ${userAgent}\n\nEste registro foi gerado em conformidade com as diretrizes da LGPD.`
      });

      console.log(`[PAYSLIP COMPLIANCE] E-mail de notificação enviado com sucesso para financeiro@comanins.com.br.`);
      return res.json({ success: true, emailSent: true });
    } catch (err: any) {
      console.error(`[PAYSLIP COMPLIANCE] Erro ao enviar e-mail via SMTP:`, err);
      return res.json({ success: true, emailSent: false, error: err.message });
    }
  } else {
    console.log(`[PAYSLIP COMPLIANCE] SMTP não configurado. Comprovante impresso no console:\nSubject: ${emailSubject}\nTo: financeiro@comanins.com.br`);
    return res.json({ success: true, emailSent: false, smtpNotConfigured: true });
  }
});

// Download dist.zip endpoint
app.get("/api/download-dist", (req, res) => {
  const zipPath = path.join(process.cwd(), "public", "dist.zip");
  if (fs.existsSync(zipPath)) {
    res.download(zipPath, "comanins-dist.zip");
  } else {
    res.status(404).json({ error: "Arquivo dist.zip não encontrado" });
  }
});

// Start server using an async wrapper to prevent top-level await in CommonJS bundling
async function startServer() {
  // Vite Setup (Development vs. Production)

  app.post("/api/parse-field-service-image", async (req, res) => {
    try {
      const { imageBase64 } = req.body;
      if (!imageBase64) {
        return res.status(400).json({ error: "No image provided." });
      }

      const aiClient = getGeminiClient();
      if (!aiClient) {
        return res.status(503).json({ error: "Gemini API key is missing or invalid." });
      }

      // Prepare image for Gemini Vision
      const base64Data = imageBase64.replace(/^data:image\/\w+;base64,/, "");
      
      const prompt = `
You are an expert data entry assistant. Analyze this image of a handwritten or printed field service form/certificate.
Extract the following information and return ONLY a JSON object with these keys (no markdown formatting, just pure JSON). If a field is not found or unreadable, set its value to an empty string.

Required JSON format:
{
  "tag": "String - Equipment Tag/ID",
  "equipamento": "String - Nome do equipamento",
  "localizacao": "String - Localização",
  "certificate": "String - Certificate number (very important)",
  "interventionDate": "String - Date of intervention (DD/MM/YYYY se possível)",
  "technician": "String - Name of technician / Técnico",
  "area": "String - Área",
  "range": "String - Range ou Faixa",
  "operacao": "String - Operação",
  "unidadeMedida": "String - Unidade de medida",
  "categoria": "String - Categoria",
  "emissaoPdf": "String - Emissão PDF (ex: Sim/Não)",
  "ordemServico": "String - Ordem de serviço / OS",
  "tipoServico": "String - Tipo de serviço",
  "observacao": "String - Observação",
  "cliente": "String - Cliente",
  "unidade": "String - Unidade (local)"
}
`;

      const response = await aiClient.models.generateContent({
        model: "gemini-2.5-flash",
        contents: [
          { role: "user", parts: [
              { text: prompt },
              { inlineData: { mimeType: "image/jpeg", data: base64Data } }
            ] 
          }
        ],
        config: {
            temperature: 0.2,
            responseMimeType: "application/json"
        }
      });

      const textOutput = response.text;
      let parsedData = {};
      try {
          parsedData = JSON.parse(textOutput);
      } catch (e) {
          // Fallback if there is a problem parsing
          const jsonMatch = textOutput.match(/\{.*\}/s);
          if (jsonMatch) {
              parsedData = JSON.parse(jsonMatch[0]);
          } else {
              throw new Error("Could not parse AI response as JSON");
          }
      }

      res.json(parsedData);
    } catch (err: any) {
      console.error("Error processing field service image:", err);
      res.status(500).json({ error: err.message });
    }
  });

  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), "dist");
    app.use(express.static(distPath));
    app.get("*", (req, res) => {
      res.sendFile(path.join(distPath, "index.html"));
    });
  }

  // Start server
  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Servidor COMANINS rodando na porta ${PORT}`);
  });
}

startServer();
