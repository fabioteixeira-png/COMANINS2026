const fs = require('fs');

// 1. Update FieldService.tsx
let fsContent = fs.readFileSync('src/components/FieldService.tsx', 'utf-8');

fsContent = fsContent.replace(
  "interface FieldServiceProps {\n  onPrintCertificate?: (instId: string, equipmentData: string) => void;\n}",
  "interface FieldServiceProps {\n  onPrintCertificate?: (instId: string, tagData: string, equipmentData: string) => void;\n}"
);

fsContent = fsContent.replace(
  "const matchingInst = instruments.find(i => i.tag && record.tag && i.tag.toLowerCase() === record.tag.toLowerCase());",
  "const matchingInst = instruments.find(i => i.certificateNumber && record.certificate && i.certificateNumber.toLowerCase() === record.certificate.toLowerCase());"
);

fsContent = fsContent.replace(
  "onClick={() => onPrintCertificate(matchingInst.id, record.equipamento || '')}",
  "onClick={() => onPrintCertificate(matchingInst.id, record.tag || '', record.equipamento || '')}"
);

fs.writeFileSync('src/components/FieldService.tsx', fsContent);


// 2. Update InternalPortal.tsx
let ipContent = fs.readFileSync('src/components/InternalPortal.tsx', 'utf-8');

ipContent = ipContent.replace(
  'const [fieldServiceEquip, setFieldServiceEquip] = useState<string>("");',
  'const [fieldServiceEquip, setFieldServiceEquip] = useState<string>("");\n  const [fieldServiceTag, setFieldServiceTag] = useState<string>("");'
);

ipContent = ipContent.replace(
  '{activeTab === "field_service" && <FieldService onPrintCertificate={(instId, equipmentData) => { setSelectedCertificateId(instId); setFieldServiceEquip(equipmentData); setActiveTab("certificados"); }} />}',
  '{activeTab === "field_service" && <FieldService onPrintCertificate={(instId, tagData, equipmentData) => { setSelectedCertificateId(instId); setFieldServiceTag(tagData); setFieldServiceEquip(equipmentData); setActiveTab("certificados"); }} />}'
);

const oldTagLine = `                              <p>
                                <span className="font-bold">Tag Cliente:</span>{" "}
                                {inst.tag || "—"}
                              </p>`;
const newTagLine = `                              <p>
                                <span className="font-bold">Tag Cliente:</span>{" "}
                                {fieldServiceTag || inst.tag || "—"}
                              </p>`;
ipContent = ipContent.replace(oldTagLine, newTagLine);

ipContent = ipContent.replace(
  'setSelectedCertificateId("");\n                  setFieldServiceEquip("");',
  'setSelectedCertificateId("");\n                  setFieldServiceTag("");\n                  setFieldServiceEquip("");'
);

fs.writeFileSync('src/components/InternalPortal.tsx', ipContent);

console.log("Patched both files successfully.");
