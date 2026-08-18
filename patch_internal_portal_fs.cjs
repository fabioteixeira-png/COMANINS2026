const fs = require('fs');

let content = fs.readFileSync('src/components/InternalPortal.tsx', 'utf-8');

// 1. Add state fieldServiceEquip
content = content.replace(
  'const [selectedCertificateId, setSelectedCertificateId] = useState<any>("");',
  'const [selectedCertificateId, setSelectedCertificateId] = useState<any>("");\n  const [fieldServiceEquip, setFieldServiceEquip] = useState<string>("");'
);

// 2. Add the equipment line in the certificate
const oldTagLine = `                              <p>
                                <span className="font-bold">Tag Cliente:</span>{" "}
                                {inst.tag || "—"}
                              </p>`;
const newTagLine = `                              <p>
                                <span className="font-bold">Tag Cliente:</span>{" "}
                                {inst.tag || "—"}
                              </p>
                              {fieldServiceEquip && (
                                <p>
                                  <span className="font-bold">Equipamento:</span>{" "}
                                  {fieldServiceEquip}
                                </p>
                              )}`;
content = content.replace(oldTagLine, newTagLine);

// 3. Update FieldService mount
const oldFsMount = `{activeTab === "field_service" && <FieldService />}`;
const newFsMount = `{activeTab === "field_service" && <FieldService onPrintCertificate={(instId, equipmentData) => { setSelectedCertificateId(instId); setFieldServiceEquip(equipmentData); setActiveTab("certificados"); }} />}`;
content = content.replace(oldFsMount, newFsMount);

fs.writeFileSync('src/components/InternalPortal.tsx', content);
console.log("Patched InternalPortal.tsx successfully.");
