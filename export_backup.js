import { db } from './src/db/index.js';
import { documents } from './src/db/schema.js';
import fs from 'fs';

async function main() {
  try {
    const allDocs = await db.select().from(documents);
    console.log(`Total de documentos encontrados na tabela 'documents': ${allDocs.length}`);
    
    const byCollection = {};
    for (const doc of allDocs) {
      if (!byCollection[doc.collectionName]) {
        byCollection[doc.collectionName] = [];
      }
      byCollection[doc.collectionName].push({
        id: doc.id,
        data: doc.data,
        createdAt: doc.createdAt,
        updatedAt: doc.updatedAt
      });
    }

    fs.writeFileSync('backup_database_complete.json', JSON.stringify(byCollection, null, 2));
    console.log('BACKUP COMPLETO REALIZADO E SALVO EM backup_database_complete.json');
    process.exit(0);
  } catch (err) {
    console.error('Erro ao realizar backup:', err);
    process.exit(1);
  }
}

main();
