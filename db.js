import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.SUPABASE_URL || 'https://kilqyvpuchunjipzjdye.supabase.co';
const supabaseKey = process.env.SUPABASE_PUBLISHABLE_KEY || process.env.SUPABASE_ANON_KEY || 'sb_publishable_xt1OHzxtFz35wkpzmXeqOA_qNdbu-G4';

export const supabase = createClient(supabaseUrl, supabaseKey);

// Função para testar a conexão com a tabela do Supabase
export async function checkConnection(tableName = 'documents') {
  try {
    const { data, error } = await supabase.from(tableName).select('count', { count: 'exact', head: true });
    if (error) {
      console.warn(`[Supabase] Aviso ao conectar com a tabela ${tableName}:`, error.message);
      return { success: false, error: error.message };
    }
    console.log(`[Supabase] Conexão bem-sucedida com a tabela ${tableName}!`);
    return { success: true, data };
  } catch (err) {
    console.error('[Supabase] Erro ao testar conexão:', err);
    return { success: false, error: err };
  }
}
