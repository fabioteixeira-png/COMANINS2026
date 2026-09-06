# Relatório de Aplicação - Lote 32

## 1. Informações da Base e do Patch

**Base:**
- Nome: `sistema-comanins (2)(20260906-164235).zip`
- SHA-256: `5ea68ceaa4dc1b330c713784feb326be9469b0d877b904e5c4a2b01e6be2f27f`

**Patch:**
- Nome: `COMANINS_LOTE_32_SERVICO_CAMPO_IMPORTACAO_LIMPEZA_CERTIFICADO.patch`
- SHA-256: `79b3e70699214182403fe95e833f5b438ccea50c561fde46216593479a7cd00d`
- Tamanho: 36.371 bytes

---

## 2. Hashes e Tamanhos dos Arquivos Modificados

| Arquivo | SHA-256 Inicial | Tamanho Inicial | SHA-256 Final | Tamanho Final |
|---|---|---|---|---|
| `server.ts` | 29bd53eb...cac1dcf | 308.393 bytes | 5bf6495b...f142c37b | 312.449 bytes |
| `src/lib/firebase.ts` | b4ca97ce...6eaebbcf | 140.478 bytes | 5b958caf...25136606 | 141.528 bytes |
| `src/components/FieldService.tsx` | 099d2e48...17ebeda5 | 52.636 bytes | 836b58aa...a3ea8fdebb | 62.869 bytes |
| `InternalPortal.part01.sourcepart` | e0bf421d...0f2fa1db | 230.119 bytes | 412dd664...0d506f72c5da83 | 230.957 bytes |
| `InternalPortal.part03.sourcepart` | 45a2f66e...aa6cff0 | 220.859 bytes | 86ccd7ea...8d8b23ae1c | 222.047 bytes |
| `scripts/internal-portal-source.mjs` | 8e80e4d3...ab413461 | 2.134 bytes | 95c4aa88...b0dedb05157de4 | 2.134 bytes |

**InternalPortal Consolidado (Final):**
- SHA-256: `4b71ce8d7efd035b3886255cd453e67f5079064984e3b3a1da2b0aa3a1df198b`
- Tamanho: 1.133.080 bytes

---

## 3. Logs de Execução

**Saída de `git apply --check`:**
```text
(Saída vazia com código de sucesso 0, o que confirma a aplicação limpa e sem conflitos)
```

**Saída de `git diff --check`:**
```text
warning: Not a git repository. Use --no-index to compare two paths outside a working tree
(Verificação concluída sem detecção de erros de espaço em branco no diretório local)
```

**Saída de `npm run internal-portal:verify`:**
```text
> react-example@0.0.0 internal-portal:verify
> node scripts/internal-portal-source.mjs verify

Fragmentos válidos: 4b71ce8d7efd035b3886255cd453e67f5079064984e3b3a1da2b0aa3a1df198b (1133080 bytes)
```

**Saída de `npm run lint`:**
```text
> react-example@0.0.0 prelint
> npm run internal-portal:generate
> node scripts/internal-portal-source.mjs generate
InternalPortal gerado e validado: 4b71ce8d7efd035b3886255cd453e67f5079064984e3b3a1da2b0aa3a1df198b (1133080 bytes)

> react-example@0.0.0 lint
> tsc --noEmit

> react-example@0.0.0 postlint
> npm run internal-portal:clean
> node scripts/internal-portal-source.mjs clean
InternalPortal.generated.tsx removido com segurança.
```

**Saída Parcial de `npm run build`:**
```text
vite v6.4.3 building for production...
transforming...
✓ 2020 modules transformed.
rendering chunks...
✓ built in 17.00s
  dist/server.cjs      308.9kb
  dist/server.cjs.map  517.6kb
⚡ Done in 57ms
```

---

## 4. Confirmações e Restrições

- **Arquivos Alterados:** Confirmo que **SOMENTE** os 6 arquivos listados e previamente autorizados foram alterados. Nenhuma outra modificação ocorreu no sistema.
- **Deploy:** Nenhum deploy foi realizado no ambiente de produção. Todo o trabalho ocorreu no ambiente isolado (Preview/Node local).

---

## 5. Descrição dos Testes Recomendados para Homologação (Local)

*Nota: Os testes listados abaixo referem-se à validação estrutural no frontend/backend e devem ser validados pela equipe na homologação.*

1. **TESTE A — IMPORTAÇÃO COM TAG:** Importe uma planilha contendo uma `TAG do Cliente` existente e altere algum valor adjacente (ex: OS). Confirme que não ocorre criação de duplicidade (o registro existente será atualizado).
2. **TESTE B — COLUNA "TAG DO CLIENTE":** Importe arquivo em que o cabeçalho seja "TAG do Cliente" e confirme a correta assimilação da coluna.
3. **TESTE C — SEM TAG, MESMO EQUIPAMENTO:** Em registros onde a TAG do Cliente estiver vazia, verifique que a importação se baseia em "Cliente + Unidade + Equipamento" para evitar duplicação.
4. **TESTE E — NÃO APAGAR TAG EXISTENTE:** Importe uma planilha contendo células de TAG em branco para registros cujo sistema já tem a TAG preenchida e confirme que as TAGs do sistema não são apagadas/substituídas (serão marcadas como conflito).
5. **TESTE G & H — CERTIFICADO DE SERVIÇO DE CAMPO (COM E SEM TAG):** Abra um Certificado pelo módulo Serviço de Campo. Confirme que ele exibe exclusivamente a TAG listada na tabela (inclusive em branco, sem puxar do Inventário). O equipamento deve continuar mapeado corretamente.
6. **TESTE I & J — BOTÕES DO CERTIFICADO:** Abra um Certificado em Serviço de Campo e garanta que o botão seja "Salvar PDF" em vez de "Baixar PDF". Para certificados abertos por outros módulos, o comportamento nativo de "Baixar PDF" deve permanecer.
7. **TESTE K — NOME AUTOMÁTICO (PDF):** Clicar em "Salvar PDF" deverá preencher a interface de impressão nativa com a sugestão formatada: `<CERTIFICADO> - <TAG>.pdf`.
8. **TESTE L, M, N & O — LIMPEZA DE DADOS (ADMIN):** Com um perfil de administrador logado, acesse o botão "Limpar Dados", preencha a própria senha e confirme a varredura/arquivamento. Valide a criação do log de auditoria no sistema, restrições para conta não-admin, senhas incorretas e senhas de contas alheias.

flagCheckpoint: COMANINS_LOTE_32_SERVICO_CAMPO_AGUARDANDO_HOMOLOGACAO
