# COMANINS — Arquitetura de arquivos corporativos

## Objetivo

Separar dados estruturados de arquivos binários sem apagar o legado existente.

- Firestore: metadados, vínculos, status, hashes e caminhos.
- Cloud Storage: PDF, imagens, Word, Excel e demais anexos.
- Backend autenticado: upload/download de documentos sensíveis de RH e Financeiro.
- `systemAuditLogs`: registro autoritativo de upload e arquivamento.

## Caminhos privados

Os documentos sensíveis ficam em `secure-documents/` e não possuem URL pública permanente.
O navegador não recebe token de download do Firebase Storage.

Exemplos:

- `secure-documents/hr/employees/{employeeId}/employee-document/...`
- `secure-documents/hr/employees/{employeeId}/employee-aso/...`
- `secure-documents/hr/employees/{employeeId}/employee-training/...`
- `secure-documents/hr/employees/{employeeId}/payslip/...`
- `secure-documents/hr/health-programs/{documentId}/...`
- `secure-documents/finance/{entityId}/...`

## Metadados mínimos

Cada novo upload retorna e deve guardar no Firestore, conforme o módulo:

- `storagePath`
- nome original normalizado
- MIME type
- tamanho em bytes
- SHA-256
- versão/identificador temporal

O objeto no Storage também recebe metadados com finalidade, entidade, usuário responsável e data do upload.

Nos documentos de Programa de Saúde, quando um arquivo do Storage é substituído, o caminho anterior é mantido em `fileHistory`. Arquivos legados em Base64/URL não são apagados durante a substituição; permanecem preservados até a migração histórica controlada.

## Compatibilidade com legado

Este lote não apaga Base64 ou URLs antigas já gravadas. A leitura possui fallback para o formato legado.
Novos documentos passam a usar Storage privado. A migração histórica deve ocorrer em lote posterior com conferência de quantidade e hash antes de remover qualquer Base64 antigo.

## Arquivamento

Registros críticos de RH e Financeiro não são mais excluídos fisicamente pelo navegador.
A ação de exclusão operacional chama o backend, que grava:

- `isDeleted: true`
- `deletedAt`
- `deletedBy`
- `deletedByUid`

A mesma transação cria evento em `systemAuditLogs`. Documentos arquivados ficam fora das listas normais e tornam-se imutáveis pelas regras do Firestore.

## Recuperação

Nenhuma rotina deste lote remove objetos antigos do Storage. Não executar limpeza automática de objetos órfãos enquanto a política de retenção e o processo de backup/PITR não estiverem formalmente validados.
