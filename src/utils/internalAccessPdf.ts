import type { jsPDF } from 'jspdf';

export interface InternalAccessCredentials {
  collaboratorName: string;
  username: string;
  temporaryPassword: string;
  siteUrl: string;
  generatedAt?: Date;
}

const BRAND_BLUE: [number, number, number] = [10, 53, 122];
const BRAND_GREEN: [number, number, number] = [5, 150, 105];
const SLATE_900: [number, number, number] = [15, 23, 42];
const SLATE_600: [number, number, number] = [71, 85, 105];
const SLATE_200: [number, number, number] = [226, 232, 240];

const safeFilePart = (value: string): string =>
  value
    .normalize('NFKD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-zA-Z0-9_-]+/g, '_')
    .replace(/^_+|_+$/g, '')
    .slice(0, 80) || 'colaborador';

const drawStep = (doc: jsPDF, number: number, title: string, description: string, y: number) => {
  doc.setFillColor(...BRAND_BLUE);
  doc.circle(20, y, 4, 'F');
  doc.setTextColor(255, 255, 255);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(9);
  doc.text(String(number), 20, y + 1.2, { align: 'center' });

  doc.setTextColor(...SLATE_900);
  doc.setFontSize(10);
  doc.text(title, 28, y - 0.5);
  doc.setTextColor(...SLATE_600);
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8.5);
  doc.text(description, 28, y + 4.2);
};

export const createInternalAccessCredentialsPdf = async (data: InternalAccessCredentials): Promise<jsPDF> => {
  const { jsPDF } = await import('jspdf');
  const doc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' });
  const generatedAt = data.generatedAt || new Date();
  const formattedDate = new Intl.DateTimeFormat('pt-BR', {
    dateStyle: 'short',
    timeStyle: 'short',
  }).format(generatedAt);
  const siteUrl = data.siteUrl.replace(/\/$/, '');

  doc.setFillColor(...BRAND_BLUE);
  doc.rect(0, 0, 210, 29, 'F');
  doc.setTextColor(255, 255, 255);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(21);
  doc.text('COMANINS', 15, 14);
  doc.setFontSize(8);
  doc.setFont('helvetica', 'normal');
  doc.text('COMÉRCIO E MANUTENÇÃO DE INSTRUMENTOS LTDA.', 15, 20);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(8.5);
  doc.text('DOCUMENTO CONFIDENCIAL', 195, 16, { align: 'right' });

  doc.setTextColor(...SLATE_900);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(18);
  doc.text('Credenciais de acesso', 15, 43);
  doc.setTextColor(...BRAND_BLUE);
  doc.setFontSize(11);
  doc.text('Portal Interno COMANINS', 15, 50);

  doc.setTextColor(...SLATE_600);
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(9);
  doc.text('Colaborador', 15, 61);
  doc.setTextColor(...SLATE_900);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(11);
  doc.text(data.collaboratorName || 'Colaborador COMANINS', 15, 67);
  doc.setTextColor(...SLATE_600);
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8);
  doc.text(`Emitido em ${formattedDate}`, 195, 66, { align: 'right' });

  doc.setFillColor(247, 250, 252);
  doc.setDrawColor(...SLATE_200);
  doc.roundedRect(15, 75, 180, 54, 4, 4, 'FD');

  doc.setTextColor(...SLATE_600);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(8);
  doc.text('USUÁRIO', 23, 87);
  doc.text('SENHA TEMPORÁRIA', 23, 104);
  doc.text('ENDEREÇO DE ACESSO', 23, 121);

  doc.setTextColor(...SLATE_900);
  doc.setFont('courier', 'bold');
  doc.setFontSize(12);
  doc.text(data.username, 73, 87);
  doc.text(data.temporaryPassword, 73, 104);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(...BRAND_BLUE);
  doc.setFontSize(10);
  doc.text(siteUrl, 73, 121);

  doc.setTextColor(...SLATE_900);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(12);
  doc.text('Como acessar', 15, 145);

  drawStep(doc, 1, 'Abra o site da COMANINS', `Acesse ${siteUrl} pelo computador ou celular.`, 157);
  drawStep(doc, 2, 'Entre no Portal Interno', 'No topo do site, selecione o botão “Portal Interno”.', 173);
  drawStep(doc, 3, 'Informe as credenciais acima', 'Digite o usuário e a senha temporária exatamente como apresentados.', 189);
  drawStep(doc, 4, 'Crie sua senha pessoal', 'No primeiro acesso, o sistema solicitará a troca obrigatória da senha.', 205);

  doc.setFillColor(236, 253, 245);
  doc.setDrawColor(167, 243, 208);
  doc.roundedRect(15, 218, 180, 29, 4, 4, 'FD');
  doc.setTextColor(...BRAND_GREEN);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(9.5);
  doc.text('REQUISITOS DA NOVA SENHA', 23, 228);
  doc.setTextColor(6, 95, 70);
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8.5);
  const passwordRules = doc.splitTextToSize(
    'Use no mínimo 10 caracteres, incluindo letra maiúscula, letra minúscula, número e caractere especial.',
    160,
  );
  doc.text(passwordRules, 23, 236);

  doc.setFillColor(255, 247, 237);
  doc.setDrawColor(253, 186, 116);
  doc.roundedRect(15, 255, 180, 18, 4, 4, 'FD');
  doc.setTextColor(154, 52, 18);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(8.5);
  doc.text('Segurança:', 23, 263);
  doc.setFont('helvetica', 'normal');
  doc.text('envie este documento somente ao colaborador identificado e não compartilhe a senha.', 41, 263);
  doc.text('Após o primeiro acesso, descarte esta credencial temporária de forma segura.', 23, 268);

  doc.setDrawColor(...SLATE_200);
  doc.line(15, 283, 195, 283);
  doc.setTextColor(...SLATE_600);
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(7.5);
  doc.text('Em caso de dificuldade, contate o administrador do sistema COMANINS.', 15, 289);
  doc.text('Portal Interno • acesso individual e intransferível', 195, 289, { align: 'right' });

  return doc;
};

export const downloadInternalAccessCredentialsPdf = async (data: InternalAccessCredentials): Promise<string> => {
  const fileName = `Acesso_Portal_COMANINS_${safeFilePart(data.username)}.pdf`;
  const doc = await createInternalAccessCredentialsPdf(data);
  doc.save(fileName);
  return fileName;
};
