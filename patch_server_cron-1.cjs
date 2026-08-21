const fs = require('fs');
let code = fs.readFileSync('server.ts', 'utf8');

const startMarker = "// ------------------- CRON JOB (NOTIFICAÇÕES E ALERTAS) -------------------";
const endMarker = 'app.post("/api/clients"';

const startIndex = code.indexOf(startMarker);
const endIndex = code.indexOf(endMarker);

if (startIndex === -1 || endIndex === -1) {
  console.error("Markers not found");
  process.exit(1);
}

const replacement = `// ------------------- CRON JOB (NOTIFICAÇÕES E ALERTAS) -------------------

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
    const bdaySnapshot = await getDocs(collection(firestoreDb, 'employeeBirthdays'));
    bdaySnapshot.forEach(doc => {
      const b = doc.data();
      if (!b.day || !b.month) return;
      let bdayThisYear = new Date(today.getFullYear(), b.month - 1, b.day);
      if (bdayThisYear < today) {
        bdayThisYear = new Date(today.getFullYear() + 1, b.month - 1, b.day);
      }
      const days = Math.ceil((bdayThisYear.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
      if (days === 1) {
        upcomingBdays.push({ name: b.name, date: \`\${String(b.day).padStart(2, '0')}/\${String(b.month).padStart(2, '0')}\` });
      }
    });

    // B. Buscar de portalUsers (birthDate: YYYY-MM-DD)
    const usersSnapshot = await getDocs(collection(firestoreDb, 'portalUsers'));
    const internalUsers = [];
    usersSnapshot.forEach(doc => {
      const u = { id: doc.id, ...doc.data() };
      internalUsers.push(u);
      if (u.birthDate) {
        const [y, m, d] = u.birthDate.split('-');
        let bdayThisYear = new Date(today.getFullYear(), parseInt(m) - 1, parseInt(d));
        if (bdayThisYear < today) {
          bdayThisYear = new Date(today.getFullYear() + 1, parseInt(m) - 1, parseInt(d));
        }
        const days = Math.ceil((bdayThisYear.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
        if (days === 1) {
          const dateStr = \`\${String(d).padStart(2, '0')}/\${String(m).padStart(2, '0')}\`;
          if (!upcomingBdays.find(b => b.name === u.name && b.date === dateStr)) {
            upcomingBdays.push({ name: u.name, date: dateStr });
          }
        }
      }
    });

    // 2. Verificar Treinamentos (EXATAMENTE 10 dias antes)
    const upcomingTrainings = [];
    const trSnapshot = await getDocs(collection(firestoreDb, 'trainings'));
    const trainings = [];
    trSnapshot.forEach(doc => trainings.push({ id: doc.id, ...doc.data() }));
    
    const empTrSnapshot = await getDocs(collection(firestoreDb, 'employeeTrainings'));
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
            expirationDate: \`\${String(expirationDate.getDate()).padStart(2, '0')}/\${String(expirationDate.getMonth() + 1).padStart(2, '0')}/\${expirationDate.getFullYear()}\`
          });
        }
      }
    });

    // 3. Verificar ASO (EXATAMENTE 10 dias antes)
    const upcomingASO = [];
    const asoSnapshot = await getDocs(collection(firestoreDb, 'medical_exams'));
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
            expirationDate: \`\${String(day).padStart(2, '0')}/\${String(month).padStart(2, '0')}/\${year}\`
          });
        }
      }
    });

    // 4. Verificar Padrões (EXATAMENTE 10 dias antes)
    const upcomingStandards = [];
    const stSnapshot = await getDocs(collection(firestoreDb, 'referenceStandards'));
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
            expirationDate: \`\${String(day).padStart(2, '0')}/\${String(month).padStart(2, '0')}/\${year}\`
          });
        }
      }
    });

    if (upcomingBdays.length > 0 || upcomingTrainings.length > 0 || upcomingASO.length > 0 || upcomingStandards.length > 0) {
      const { SMTP_HOST, SMTP_USER, SMTP_PASS } = process.env;
      
      if (SMTP_HOST && SMTP_USER && SMTP_PASS) {
        const transporter = nodemailer.createTransport({
          service: 'gmail',
          auth: {
            user: SMTP_USER,
            pass: SMTP_PASS
          }
        });

        let htmlBody = \`<p>Olá Equipe,</p><p>Aqui está o resumo diário de notificações e alertas do painel COMANINS:</p>\`;
        let textBody = \`Olá Equipe,\n\nAqui está o resumo diário de notificações e alertas do painel COMANINS:\n\n\`;

        if (upcomingBdays.length > 0) {
          htmlBody += \`<h3>🎂 Aniversariantes de Amanhã</h3><ul>\`;
          textBody += \`--- ANIVERSARIANTES DE AMANHÃ ---\n\`;
          upcomingBdays.forEach(b => {
            htmlBody += \`<li><b>\${b.name}</b> - \${b.date}</li>\`;
            textBody += \`- \${b.name} - \${b.date}\n\`;
          });
          htmlBody += \`</ul>\`;
        }

        if (upcomingTrainings.length > 0) {
          htmlBody += \`<h3>⚠️ Treinamentos Vencendo em 10 dias</h3><ul>\`;
          textBody += \`\n--- TREINAMENTOS VENCENDO EM 10 DIAS ---\n\`;
          upcomingTrainings.forEach(t => {
            htmlBody += \`<li><b>\${t.trainingName}</b> - \${t.employeeName} (Vencimento: \${t.expirationDate})</li>\`;
            textBody += \`- \${t.trainingName} (\${t.employeeName}) - Vencimento: \${t.expirationDate}\n\`;
          });
          htmlBody += \`</ul>\`;
        }

        if (upcomingASO.length > 0) {
          htmlBody += \`<h3>🩺 ASO / Exames Vencendo em 10 dias</h3><ul>\`;
          textBody += \`\n--- ASO / EXAMES VENCENDO EM 10 DIAS ---\n\`;
          upcomingASO.forEach(a => {
            htmlBody += \`<li><b>\${a.examType}</b> - \${a.employeeName} (Vencimento: \${a.expirationDate})</li>\`;
            textBody += \`- \${a.examType} (\${a.employeeName}) - Vencimento: \${a.expirationDate}\n\`;
          });
          htmlBody += \`</ul>\`;
        }

        if (upcomingStandards.length > 0) {
          htmlBody += \`<h3>📏 Padrões de Referência Vencendo em 10 dias</h3><ul>\`;
          textBody += \`\n--- PADRÕES VENCENDO EM 10 DIAS ---\n\`;
          upcomingStandards.forEach(s => {
            htmlBody += \`<li><b>\${s.name}</b> (Cert: \${s.cert}) - Vencimento: \${s.expirationDate}</li>\`;
            textBody += \`- \${s.name} (Cert: \${s.cert}) - Vencimento: \${s.expirationDate}\n\`;
          });
          htmlBody += \`</ul>\`;
        }

        htmlBody += \`<br/><p>Acesse o portal para mais detalhes ou para regularizar as pendências.</p><p>Atenciosamente,<br/>COMANINS Metrology Suite</p>\`;
        textBody += \`\nAcesse o portal para mais detalhes.\n\nAtenciosamente,\nCOMANINS Metrology Suite\`;

        // Destinatários solicitados
        const recipients = "comercial@comanins.com.br, fabio.teixeira@comanins.com.br, manutencao@comanins.com.br";

        const info = await transporter.sendMail({
          from: \`"COMANINS Notificações" <\${SMTP_USER}>\`,
          to: recipients,
          subject: \`Notificações COMANINS - Dia \${String(today.getDate()).padStart(2, '0')}/\${String(today.getMonth() + 1).padStart(2, '0')}/\${today.getFullYear()}\`,
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

app.post("/api/test-notifications", async (req, res) => {
  await runDailyNotifications();
  res.json({ success: true, message: "Notificações verificadas." });
});

app.post("/api/generate-birthday-message", async (req, res) => {
  const { name } = req.body;
  if (!name) return res.status(400).json({ error: "Nome não fornecido" });
  
  const genAI = getGeminiClient();
  if (!genAI) {
    return res.json({ message: \`Feliz Aniversário, \${name}! A equipe COMANINS deseja a você um excelente dia, com muita saúde, paz e sucesso.\` });
  }

  try {
    const prompt = \`Você é a inteligência artificial do sistema COMANINS Metrology. Hoje é o aniversário do colaborador \${name}. Escreva uma mensagem curta (máximo 3 frases), calorosa, amigável e profissional de feliz aniversário para ele, que aparecerá quando ele fizer login no sistema. Não use aspas na resposta.\`;
    const result = await genAI.models.generateContent({
      model: "gemini-2.5-flash",
      contents: prompt
    });
    return res.json({ message: result.text || \`Feliz Aniversário, \${name}!\` });
  } catch (error) {
    console.error("Erro ao gerar mensagem de aniversário:", error);
    return res.json({ message: \`Feliz Aniversário, \${name}! A equipe COMANINS deseja a você um dia incrível!\` });
  }
});

`;

const newCode = code.substring(0, startIndex) + replacement + code.substring(endIndex);
fs.writeFileSync('server.ts', newCode);
console.log("Updated server.ts successfully");
