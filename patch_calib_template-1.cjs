const fs = require('fs');

let content = fs.readFileSync('src/components/InternalPortal.tsx', 'utf-8');

const targetStr = `  const handleDownloadCalibrationsTemplate = () => {
    const data = [
      {
        TAG: "PI-101",
        COMA: "CM-001",
        Descricao: "Manômetro Analógico 0-10 bar",
        Marca: "WIKA",
        Modelo: "213.53",
        Serie: "W9843212",
        Grandeza: "Pressão",
        Faixa_Min: 0,
        Faixa_Max: 10,
        Unidade: "bar",
        Tolerancia: 0.1,
        CNPJ_Cliente: "33.000.167/0001-56",
        Data_Calibracao: "2025-07-15",
        Proxima_Calibracao: "2026-07-15",
        Status: "Calibrado",
        Numero_Certificado: "CERT-2025-001",
        Tecnico: "Eng. Carlos Moreira",
        Observacoes:
          "Instrumento em conformidade de acordo com a ABNT NBR ISO/IEC 17025.",
      },
    ];`;

const newStr = `  const handleDownloadCalibrationsTemplate = () => {
    const data = [
      {
        TAG: "PI-101",
        COMA: "CM-001",
        Descricao: "Manômetro Analógico 0-10 bar",
        Marca: "WIKA",
        Modelo: "213.53",
        Serie: "W9843212",
        Grandeza: "Pressão",
        Faixa_Min: 0,
        Faixa_Max: 10,
        Unidade: "bar",
        Tolerancia: 0.1,
        CNPJ_Cliente: "33.000.167/0001-56",
        Data_Calibracao: "2025-07-15",
        Proxima_Calibracao: "2026-07-15",
        Status: "Calibrado",
        Numero_Certificado: "CERT-2025-001",
        Tecnico: "Eng. Carlos Moreira",
        Observacoes: "Instrumento em conformidade de acordo com a ABNT NBR ISO/IEC 17025.",
        Padroes_Utilizados: "CERT-PADRAO-01, CERT-PADRAO-02",
        P1_Nominal: 0,
        P1_Padrao: 0.01,
        P1_Instrumento: 0.05,
        P2_Nominal: 5,
        P2_Padrao: 5.01,
        P2_Instrumento: 5.02,
        P3_Nominal: 10,
        P3_Padrao: 10.02,
        P3_Instrumento: 10.05,
        P4_Nominal: "",
        P4_Padrao: "",
        P4_Instrumento: "",
        P5_Nominal: "",
        P5_Padrao: "",
        P5_Instrumento: "",
      },
    ];`;

content = content.replace(targetStr, newStr);

fs.writeFileSync('src/components/InternalPortal.tsx', content);
console.log("Patched download calibrations template");
