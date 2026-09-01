const fs = require('fs');
let content = fs.readFileSync('src/lib/firebase.ts', 'utf8');

content = content.replace(
  "payload: { responsibleClient: string; responsibleClientDocument?: string; notes?: string; date?: string; items: Array<{ assetId: string; condition: string; notes?: string }> },",
  "payload: { responsibleClient: string; responsibleClientDocument?: string; attachments?: string[]; notes?: string; date?: string; items: Array<{ assetId: string; condition: string; notes?: string }> },"
);

const uploadFunc = `
export async function uploadRentalAttachment(rentalId: string, file: File): Promise<string> {
  const path = \`rental-attachments/\${safeStorageSegment(rentalId)}/\${Date.now()}_\${safeStorageSegment(file.name)}\`;
  const storageRef = ref(storage, path);
  await uploadBytes(storageRef, file, { contentType: file.type || 'application/octet-stream' });
  return await getDownloadURL(storageRef);
}
`;

content += uploadFunc;

fs.writeFileSync('src/lib/firebase.ts', content);
