import fs from 'node:fs';
const file = 'src/components/internal-portal/InternalPortal.part01.sourcepart';
let code = fs.readFileSync(file, 'utf8');

const oldFunc = `  const handleCertificatePrint = () => {
    const printableArea = document.getElementById("certificate-printable-area") as HTMLElement | null;
    if (!printableArea) {
      alert("Não foi possível localizar o certificado para impressão.");
      return;
    }

    void printCertificateDomOnly(printableArea).catch((error: any) => {
      console.error("Erro ao imprimir somente o certificado:", error);
      alert(
        \`Não foi possível preparar a impressão do certificado.\\n\\n\${error?.message || "Falha ao isolar o certificado."}\`,
      );
    });
  };`;

const newFunc = `  const handleCertificatePrint = (certificateNumber: unknown, clientTag: unknown) => {
    const printableArea = document.getElementById("certificate-printable-area") as HTMLElement | null;
    if (!printableArea) {
      alert("Não foi possível localizar o certificado para impressão.");
      return;
    }

    const safeFilePart = (value: unknown, fallback: string) =>
      String(value || fallback)
        .trim()
        .replace(/[\\\\/:*?"<>|]+/g, "-")
        .replace(/\\s+/g, " ");
    const fileName =
      \`\${safeFilePart(certificateNumber, "SEM CERTIFICADO")} - \` +
      \`\${safeFilePart(clientTag, "SEM TAG")}.pdf\`;

    void printCertificateDomOnly(printableArea, fileName).catch((error: any) => {
      console.error("Erro ao imprimir somente o certificado:", error);
      alert(
        \`Não foi possível preparar a impressão do certificado.\\n\\n\${error?.message || "Falha ao isolar o certificado."}\`,
      );
    });
  };`;

code = code.replace(oldFunc, newFunc);
fs.writeFileSync(file, code);
