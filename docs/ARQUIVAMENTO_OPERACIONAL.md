# COMANINS — Arquivamento operacional e rastreabilidade

## Escopo

Este lote substitui a exclusão física pelo arquivamento lógico nas coleções:

- `calibrationReports`
- `savedIntakes`
- `rncReports`
- `referenceStandards`
- `calibrationAuditLogs`
- `internal_tickets`

Clientes e usuários não fazem parte deste lote. O encerramento de contas exige um fluxo próprio que também trate autenticação e eventual reativação.

## Comportamento

A ação administrativa chama o backend autenticado. Em uma transação do Firestore, o registro recebe:

- `isDeleted: true`
- `deletedAt`
- `deletedBy`
- `deletedByUid`
- `updatedAt`

Na mesma transação é criado um evento imutável em `systemAuditLogs` com a coleção, o identificador, o ator e os principais vínculos do registro.

Os registros arquivados não aparecem nas listas operacionais nem no Portal do Cliente. O conteúdo permanece no Firestore para recuperação e auditoria.

## Evidências e documentos

Arquivar uma Entrada de Material não remove fotografias, formulários assinados nem outros objetos do Cloud Storage. Nenhum objeto antigo é apagado por este lote.

Certificados, RNCs e padrões já vinculados a históricos permanecem preservados. O arquivamento afeta somente a exibição operacional corrente.

## Regras de produção

- O navegador não pode escrever campos de arquivamento.
- O navegador não pode excluir fisicamente registros das coleções deste lote.
- Registros de tempo de calibração são append-only no navegador.
- Somente o Administrador pode solicitar o arquivamento operacional.
- Restauração ou exclusão física exigem processo posterior, documentado e com backup/PITR confirmado.

## Compatibilidade

Nenhum registro existente é alterado durante a publicação das regras ou do código. Documentos sem `isDeleted` continuam ativos. Não há migração automática nem limpeza de dados.
