# RELATÓRIO DE EXECUÇÃO — LOTE 12 REV1
## Correção das Permissões Visualizar/Editar + Isolamento de savedIntakes
**COMANINS — Sistema Ativo em Produção**

---

### 1. IDENTIFICAÇÃO E DATA/HORA
- **Data e Hora de Execução**: 2026-08-25T13:24:30-07:00 (20:24:30 UTC)
- **Ambiente**: Google AI Studio / Cloud Run Container Node.js Runtime
- **Firebase Project ID**: `aqueous-mile-rzp2g`
- **Firestore Database**: `ai-studio-comaninsexcelnci-f5355530-a4e5-4359-8c99-de3da14e5882`
- **Bucket Storage**: `aqueous-mile-rzp2g.firebasestorage.app` (referenciado no config)
- **Ferramental**: Node.js 20+, TypeScript 5+, Vite 6+, esbuild

---

### 2. INTEGRIDADE DO PATCH
- **Patch**: `COMANINS_EXCELENCIA_LOTE_12_REV1_CORRECAO_PERMISSOES_E_ISOLAMENTO_ENTRADA.patch`
- **SHA-256 Calculado**: `4829d9b4f2a6370d7654f0df80c2bedd51a44a5baf4ae047cca9dd911d718837`
- **SHA-256 Esperado**: `4829d9b4f2a6370d7654f0df80c2bedd51a44a5baf4ae047cca9dd911d718837` (**COINCIDÊNCIA EXATA**)

---

### 3. HASHES PRÉ-APLICAÇÃO (BASE LOTE 12)
Os hashes da base conferem 100% com o Lote 12:

| Arquivo | SHA-256 Base Esperado | SHA-256 Base Obtido | Status |
| :--- | :--- | :--- | :---: |
| `firestore.rules` | `7729d05d3c066b2ecadfd5d58f2bab07455a4ba56c17a96818e5573722915f24` | `7729d05d3c066b2ecadfd5d58f2bab07455a4ba56c17a96818e5573722915f24` | ✅ VÁLIDO |
| `storage.rules` | `029ab42be148043f30e81ef45cef4b3ff89ad7badf66756fb40465370b66a876` | `029ab42be148043f30e81ef45cef4b3ff89ad7badf66756fb40465370b66a876` | ✅ VÁLIDO |
| `src/components/InternalPortal.tsx` | `8ec9887c3f3a75cb2201ed2375cc05579021fb9394f3fc0e281d7041e5eb62fc` | `8ec9887c3f3a75cb2201ed2375cc05579021fb9394f3fc0e281d7041e5eb62fc` | ✅ VÁLIDO |
| `src/components/FieldService.tsx` | `97921c50ca1a1af12b0c7db845de2f47d6ed2813a10490ba02bc811c1f7d45ee` | `97921c50ca1a1af12b0c7db845de2f47d6ed2813a10490ba02bc811c1f7d45ee` | ✅ VÁLIDO |
| `src/components/HealthProgramManagement.tsx` | `a32331ff135028807a3c131528be71b6603630655d1c33a1b8bc9fad69bafd2f` | `a32331ff135028807a3c131528be71b6603630655d1c33a1b8bc9fad69bafd2f` | ✅ VÁLIDO |
| `src/components/MySignature.tsx` | `5129954d4bbd9183066e280bf6300d3b3a1d134ab15f618cfbd52f5e3a43bae6` | `5129954d4bbd9183066e280bf6300d3b3a1d134ab15f618cfbd52f5e3a43bae6` | ✅ VÁLIDO |

---

### 4. EXECUÇÃO DO PATCH (GIT APPLY)
- **`git apply --check`**: Executado com sucesso (código de saída 0).
- **`git apply --verbose`**: Aplicado limpo em todos os 5 arquivos de diff.
- **`git diff --check`**: 0 conflitos, 0 espaços espúrios.

---

### 5. ARQUIVOS ALTERADOS
1. `firestore.rules`
2. `src/components/InternalPortal.tsx`
3. `src/components/FieldService.tsx`
4. `src/components/HealthProgramManagement.tsx`
5. `src/components/MySignature.tsx`

*(Nota: `storage.rules` foi preservado inalterado pelo patch, mantendo os hashes do Lote 12).*

---

### 6. HASHES PÓS-APLICAÇÃO
Todos os 6 arquivos conferem com exatidão matemática aos valores esperados pelo REV1:

| Arquivo | SHA-256 Esperado | SHA-256 Obtido | Status |
| :--- | :--- | :--- | :---: |
| `firestore.rules` | `92d20532f5feae86684a4852d25939f480bc674f190ff0ad00562422b4d50583` | `92d20532f5feae86684a4852d25939f480bc674f190ff0ad00562422b4d50583` | ✅ VÁLIDO |
| `storage.rules` | `029ab42be148043f30e81ef45cef4b3ff89ad7badf66756fb40465370b66a876` | `029ab42be148043f30e81ef45cef4b3ff89ad7badf66756fb40465370b66a876` | ✅ VÁLIDO |
| `src/components/InternalPortal.tsx` | `8dd3f316e1f43ab8568f20eaa1acb404d125bce5f935ab3b9a137e9553c78dd8` | `8dd3f316e1f43ab8568f20eaa1acb404d125bce5f935ab3b9a137e9553c78dd8` | ✅ VÁLIDO |
| `src/components/FieldService.tsx` | `9b2c8794dcb02dc49a095967df626b8e946b084d5a0775a633b62c2d9c152055` | `9b2c8794dcb02dc49a095967df626b8e946b084d5a0775a633b62c2d9c152055` | ✅ VÁLIDO |
| `src/components/HealthProgramManagement.tsx` | `8cd772deae8892f62117b7020b67f8e1c06d6539efb90c21154872f8bb64a1fb` | `8cd772deae8892f62117b7020b67f8e1c06d6539efb90c21154872f8bb64a1fb` | ✅ VÁLIDO |
| `src/components/MySignature.tsx` | `65c629b7e1e84e27b724f1c43212aa569ea322f8154c1d017fc00cd0dc250347` | `65c629b7e1e84e27b724f1c43212aa569ea322f8154c1d017fc00cd0dc250347` | ✅ VÁLIDO |

---

### 7. LINT E BUILD
- **`npm run lint` (`tsc --noEmit`)**: Aprovado com 0 erros e 0 warnings.
- **`npm run build`**:
  - Compilação do cliente Vite para `dist/` aprovada.
  - Backend empacotado em `dist/server.cjs` via esbuild aprovado.
- **`node --check dist/server.cjs`**: Validação de sintaxe aprovada (código 0).

---

### 8. TESTES DE COMPORTAMENTO POR MÓDULO (OBJETIVOS 1 A 5)

#### A. Clientes em Modo Visualizar (`clients = view`)
- **Permitido**: Leitura, busca e consulta da lista de clientes.
- **Bloqueado/Ocultado**: Botão "Cadastrar Cliente", formulário de cadastro, botões "Editar" e "Excluir".
- **Defesa de Handlers**: `handleClientSubmit` e `handleEditClient` alertam que o perfil possui somente permissão de visualização e cancelam a operação.
- **Regras Firestore**: `match /clients/{clientId}` exige `hasEditModule('clients')` para create, update, delete.

#### B. Controle de Estoque em Modo Visualizar (`inventory = view`)
- **Permitido**: Consulta de itens, saldos e movimentações.
- **Bloqueado/Ocultado**: Botões "Novo Item", "Movimentar Estoque", "Editar Item", "Excluir Item", modais de inserção/movimentação.
- **Defesa de Handlers**: `handleInventoryFileChange`, submit do item e submit da transação bloqueiam mutações e limpam o input.
- **Regras Backend**: Rotas `/api/inventory/items` e `/api/inventory/move` exigem `requireEditModule('inventory')`.

#### C. Serviço de Campo em Modo Visualizar (`field_service = view`)
- **Permitido**: Leitura, filtros, ordenação, paginação, download do modelo de planilha, exportação Excel, impressão/redirecionamento de certificado.
- **Bloqueado/Ocultado**: "Importar Planilha", "Anexar Foto (IA)", "Novo Registro", edição inline (células clicáveis perdem hover e cursor de edição), "Editar Formulário", "Excluir".
- **Defesa de Handlers**: `handleInlineSave`, `handleDeleteRecord`, `handleExcelImport`, `handleImageUpload`, `handleSaveRecord` validam `canEdit=false` e interrompem a ação.
- **Regras Firestore**: `match /fieldServiceRecords/{recordId}` exige `hasEditModule('field_service')` para create/update/delete.

#### D. Programas de Saúde em Modo Visualizar (`health_programs = view`)
- **Permitido**: Listagem de documentos PGR/PCMSO, filtros, download/visualização de arquivos autenticados.
- **Bloqueado/Ocultado**: "Novo Documento", "Editar Documento", "Notificar por E-mail", botão "Arquivar Documento", upload de novos arquivos.
- **Defesa de Handlers**: `handleOpenModal`, `handleFileUpload`, `handleSubmit`, `handleRequestDelete`, `handleConfirmDelete`, `handleSendEmailAlert` cancelam a ação e avisam o usuário.
- **Regras Backend**: `POST /api/send-health-program-alert` exige `requireEditModule('health_programs')`; `uploadCorporateFile` (`purpose=health-program`) exige edição em `health_programs`.

#### E. Minha Assinatura em Modo Visualizar (`digital_signature = view`)
- **Permitido**: Visualização da assinatura já cadastrada e data da versão.
- **Bloqueado/Ocultado**: Botão "Substituir Assinatura", SignaturePad / Canvas de desenho.
- **Sem Assinatura Prévia**: Exibe card informativo informando que nenhuma assinatura está cadastrada e que o perfil é de somente visualização (sem abrir canvas).
- **Defesa de Handlers**: `handleSaveSignature` rejeita salvamento se `canEdit=false`.
- **Regras Storage e Firestore**: Upload de assinatura no Storage e escrita no usuário bloqueados pelas regras se `digital_signature` não for editável.

---

### 9. ISOLAMENTO DE `savedIntakes` (`material_intake` vs `calibration`)
O Lote 12 REV1 implementou a função restritiva `isCalibrationScopedIntakeUpdate()` em `firestore.rules`:

```javascript
function isCalibrationScopedIntakeUpdate() {
  return request.resource.data.diff(resource.data).affectedKeys().hasOnly([
    'devolutionGeneratedAt',
    'devolutionGeneratedBy',
    'devolutionRows',
    'photoDevolution',
    'deliveryInstrumentPhotos',
    'deliveryFormPhotos',
    'deliveryFinalizedAt',
    'deliveryFinalizedBy',
    'deliveryLocked'
  ]);
}
```

#### Matriz de Acesso a `savedIntakes`:
| Permissão `material_intake` | Permissão `calibration` | Criar Guia | Editar Dados Operacionais da Guia (itens, contato, cliente, datas) | Atualizar Campos de Devolução e Finalizar Entrega |
| :---: | :---: | :---: | :---: | :---: |
| **Editar** | **Visualizar** | ✅ (Via Backend) | ✅ (Via Firestore) | ✅ (Via Firestore) |
| **Visualizar** | **Editar** | ❌ Negado | ❌ **NEGADO (Protegido por whitelist)** | ✅ **PERMITIDO (Apenas campos da whitelist)** |
| **Editar** | **Editar** | ✅ (Via Backend) | ✅ (Via Firestore) | ✅ (Via Firestore) |
| **Visualizar** | **Visualizar** | ❌ Negado | ❌ Negado | ❌ Negado |

#### Testes de Mutação em `savedIntakes`:
- **Tentativa de alterar campos cadastrais com `calibration=edit` + `material_intake=view`**:
  - Alteração de `clientId`, `clientName`, `contato`, `dataEntrada`, `dataPrevistaSaida`, `rows`, `photos`, `numEntrada`: ❌ **NEGADA (Permission Denied)**.
- **Tentativa de atualizar devolução e entrega com `calibration=edit` + `material_intake=view`**:
  - Gravação de `devolutionRows`, `photoDevolution`, `deliveryInstrumentPhotos`, `deliveryFormPhotos`, `deliveryFinalizedAt`, `deliveryLocked`: ✅ **PERMITIDA**.

---

### 10. PRESERVAÇÃO INTEGRAL DO LOTE 12
- ✅ Criação atômica via rota backend `POST /api/internal/intakes` mantida.
- ✅ Coleção `intakeNumberLocks` preservada e protegida contra escrita direta.
- ✅ Bloqueio de duplicidade HTTP 409 `INTAKE_NUMBER_ALREADY_EXISTS` mantido.
- ✅ Normalização de Nº de Entrada mantida.
- ✅ Deduplicação não-destrutiva de leitura mantida (nenhum dado histórico apagado).
- ✅ Trilha de auditoria `systemAuditLogs` mantida.

---

### 11. REPLICAÇÃO DAS REGRAS FIREBASE
- **Projeto Alvo**: `aqueous-mile-rzp2g` (projeto único de produção).
- **Banco Firestore**: `ai-studio-comaninsexcelnci-f5355530-a4e5-4359-8c99-de3da14e5882`.
- **Deploy Executado**: Regras de segurança Firestore atualizadas com sucesso via `deploy_firebase`.
- **Integridade de Infraestrutura**: Nenhum projeto novo, banco ou bucket Storage foi criado.

---

### 12. FLUXO DE PUBLICAÇÃO DO CÓDIGO (IMPORTANTE)
- **O Google AI Studio NÃO realizou deploy do aplicativo/site em produção.**
- O código-fonte validado neste lote está pronto no repositório local.
- O deploy do aplicativo em produção será realizado posteriormente pelo responsável através do pipeline:
  $$\text{CÓDIGO VALIDADO} \longrightarrow \text{GITHUB} \longrightarrow \text{HOSTINGER}$$

---

### 13. CLASSIFICAÇÃO FINAL

# **APTO PARA GITHUB/HOSTINGER E REGRAS FIREBASE REPLICADAS COM SUCESSO**
