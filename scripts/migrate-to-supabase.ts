import fs from 'fs';
import path from 'path';
import { createClient } from '@supabase/supabase-js';
import { db } from '../src/db/index.js';
import { documents } from '../src/db/schema.js';

const supabaseUrl = process.env.SUPABASE_URL || 'https://kilqyvpuchunjipzjdye.supabase.co';
const supabaseKey = process.env.SUPABASE_PUBLISHABLE_KEY || process.env.SUPABASE_ANON_KEY || 'sb_publishable_xt1OHzxtFz35wkpzmXeqOA_qNdbu-G4';

const supabase = createClient(supabaseUrl, supabaseKey);

export async function runMigration() {
  console.log('🚀 Iniciando cópia de dados para o Supabase PostgreSQL...');

  const rowsToInsert: Array<{ collection_name: string; id: string; data: any }> = [];
  const addedKeys = new Set<string>();

  const addRow = (collectionName: string, id: string, data: any) => {
    const key = `${collectionName}::${id}`;
    if (!addedKeys.has(key) && collectionName && id) {
      addedKeys.add(key);
      rowsToInsert.push({
        collection_name: collectionName,
        id: String(id),
        data: data !== undefined ? data : {}
      });
    }
  };

  // 1. Try reading from active Database
  try {
    console.log('🔍 Buscando dados do banco de dados local...');
    const dbDocs = await db.select().from(documents);
    console.log(`✅ ${dbDocs.length} documentos encontrados no banco local.`);
    for (const d of dbDocs) {
      addRow(d.collectionName, d.id, d.data);
    }
  } catch (err: any) {
    console.warn('⚠️ Não foi possível ler diretamente do Pool local:', err?.message || err);
  }

  // 2. Try reading from backup_clean.json
  const backupCleanPath = path.join(process.cwd(), 'backup_clean.json');
  if (fs.existsSync(backupCleanPath)) {
    try {
      const raw = fs.readFileSync(backupCleanPath, 'utf-8');
      const parsed = JSON.parse(raw);
      for (const [col, items] of Object.entries(parsed)) {
        if (Array.isArray(items)) {
          for (const item of items) {
            if (item && item.id) {
              addRow(col, item.id, item.data !== undefined ? item.data : item);
            }
          }
        }
      }
      console.log('✅ Dados de backup_clean.json lidos.');
    } catch (e) {
      console.warn('⚠️ Erro ao ler backup_clean.json:', e);
    }
  }

  // 3. Try reading from db.json
  const dbJsonPath = path.join(process.cwd(), 'db.json');
  if (fs.existsSync(dbJsonPath)) {
    try {
      const raw = fs.readFileSync(dbJsonPath, 'utf-8');
      const parsed = JSON.parse(raw);
      for (const [col, items] of Object.entries(parsed)) {
        if (Array.isArray(items)) {
          for (const item of items) {
            if (item && item.id) {
              addRow(col, item.id, item.data !== undefined ? item.data : item);
            }
          }
        }
      }
      console.log('✅ Dados de db.json lidos.');
    } catch (e) {
      console.warn('⚠️ Erro ao ler db.json:', e);
    }
  }

  console.log(`📊 Total de ${rowsToInsert.length} documentos preparados para sincronizar.`);

  if (rowsToInsert.length === 0) {
    console.log('ℹ️ Nenhum dado para migrar.');
    return { success: true, count: 0 };
  }

  // Connect & Insert into Supabase
  console.log('🔌 Conectando ao Supabase (URL: ' + supabaseUrl + ')...');
  const { error: testError } = await supabase.from('documents').select('id').limit(1);

  if (testError) {
    console.error('❌ Erro de acesso à tabela "documents" no Supabase:', testError.message);
    return {
      success: false,
      error: testError.message,
      instructions: `Crie a tabela 'documents' no SQL Editor do Supabase executando o comando SQL informado.`
    };
  }

  // Upload in chunks of 50
  const batchSize = 50;
  let successCount = 0;
  let errorCount = 0;

  for (let i = 0; i < rowsToInsert.length; i += batchSize) {
    const chunk = rowsToInsert.slice(i, i + batchSize);
    const { error } = await supabase.from('documents').upsert(chunk, { onConflict: 'collection_name,id' });

    if (error) {
      console.error(`❌ Erro no lote ${i + 1}-${i + chunk.length}:`, error.message);
      errorCount += chunk.length;
    } else {
      successCount += chunk.length;
      console.log(`✅ Lote enviado: ${successCount}/${rowsToInsert.length} documentos.`);
    }
  }

  console.log(`\n🎉 Processo concluído! Sucesso: ${successCount}, Falhas: ${errorCount}`);
  return { success: true, count: successCount, total: rowsToInsert.length, errorCount };
}

if (process.argv[1] && process.argv[1].includes('migrate-to-supabase')) {
  runMigration().then(res => {
    if (!res.success) {
      console.log('\n======================================================');
      console.log('SQL DDL para criar a tabela no Supabase (se necessário):');
      console.log(`
CREATE TABLE IF NOT EXISTS public.documents (
  collection_name text NOT NULL,
  id text NOT NULL,
  data jsonb NOT NULL,
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now(),
  CONSTRAINT documents_pkey PRIMARY KEY (collection_name, id)
);
CREATE INDEX IF NOT EXISTS collection_idx ON public.documents (collection_name);

ALTER TABLE public.documents ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Permitir leitura/escrita na tabela documents" ON public.documents FOR ALL USING (true) WITH CHECK (true);
      `);
      console.log('======================================================\n');
    }
    process.exit(0);
  });
}
