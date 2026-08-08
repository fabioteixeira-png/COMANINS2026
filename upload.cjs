const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');

const url = process.env.SUPABASE_URL || 'https://kilqyvpuchunjipzjdye.supabase.co';
const key = process.env.SUPABASE_PUBLISHABLE_KEY || 'sb_publishable_xt1OHzxtFz35wkpzmXeqOA_qNdbu-G4';
const supabase = createClient(url, key);

async function upload() {
  console.log('Verificando acesso à tabela "documents" no Supabase...');
  const { data: testData, error: testError } = await supabase.from('documents').select('id').limit(1);

  if (testError) {
    console.error('ERRO:', testError.message);
    return;
  }

  console.log('Tabela "documents" encontrada com sucesso! Preparando envio de dados...');
  const rows = [];
  const added = new Set();

  function add(col, id, data) {
    const k = `${col}::${id}`;
    if (!added.has(k) && col && id) {
      added.add(k);
      rows.push({ collection_name: col, id: String(id), data: data || {} });
    }
  }

  if (fs.existsSync('backup_clean.json')) {
    const parsed = JSON.parse(fs.readFileSync('backup_clean.json', 'utf8'));
    for (const [col, items] of Object.entries(parsed)) {
      if (Array.isArray(items)) {
        items.forEach(i => i && i.id && add(col, i.id, i.data !== undefined ? i.data : i));
      }
    }
  }

  if (fs.existsSync('db.json')) {
    const parsed = JSON.parse(fs.readFileSync('db.json', 'utf8'));
    for (const [col, items] of Object.entries(parsed)) {
      if (Array.isArray(items)) {
        items.forEach(i => i && i.id && add(col, i.id, i.data !== undefined ? i.data : i));
      }
    }
  }

  console.log(`Enviando ${rows.length} documentos para o Supabase...`);
  
  const batchSize = 50;
  let success = 0;
  for (let i = 0; i < rows.length; i += batchSize) {
    const chunk = rows.slice(i, i + batchSize);
    const { error } = await supabase.from('documents').upsert(chunk, { onConflict: 'collection_name,id' });
    if (error) {
      console.error(`Erro no lote ${i}:`, error.message);
    } else {
      success += chunk.length;
      console.log(`Progresso: ${success}/${rows.length} documentos enviados!`);
    }
  }

  console.log(`\nDONE! ${success} de ${rows.length} documentos salvos com sucesso no Supabase!`);
}

upload();
