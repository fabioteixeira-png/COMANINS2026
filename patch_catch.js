import fs from 'fs';
let code = fs.readFileSync('server.ts', 'utf-8');

const regex = /  \} catch \(error\) \{\n    console\.error\("Legacy login error:", error\);\n    res\.status\(500\)\.json\(\{ error: "Internal server error" \}\);\n  \}/;

const replacement = `  } catch (error: any) {
    console.error("Legacy login error:", error);
    if (error.code === 7 || (error.message && error.message.includes('PERMISSION_DENIED'))) {
        console.error("\\n\\n[ERRO CRÍTICO DE PERMISSÃO]");
        console.error("O servidor Node.js não possui permissão para ler o banco de dados.");
        console.error("Você precisa configurar a variável de ambiente: FIREBASE_SERVICE_ACCOUNT_KEY");
        console.error("com o JSON da conta de serviço (Service Account) do Firebase.\\n\\n");
    }
    res.status(500).json({ error: "Erro de servidor ao validar credencial antiga." });
  }`;

code = code.replace(regex, replacement);

fs.writeFileSync('server.ts', code);
