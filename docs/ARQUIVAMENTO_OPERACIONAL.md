# COMANINS — Arquivamento operacional e rastreabilidade

## Escopo

O arquivamento lógico permanece ativo nas coleções:

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

RNCs e padrões já vinculados a históricos permanecem preservados. O arquivamento afeta somente a exibição operacional corrente.

## Exceção administrativa — certificado com erro

`calibrationReports` não utiliza mais o arquivamento lógico quando o Administrador confirma a exclusão de um certificado para correção e reemissão. O backend autenticado executa atomicamente:

- exclusão física somente do relatório de calibração selecionado;
- retorno do instrumento para `Aguardando Calibração`;
- limpeza das datas e condições ambientais pertencentes à calibração removida;
- preservação do cadastro, fotos, entrada e evidências de entrega;
- criação de evento imutável em `systemAuditLogs`, contendo apenas identificação, ator e motivo da ação.

A entrada já finalizada continua bloqueada e apresentada como entregue. O registro de auditoria não é uma cópia arquivada do certificado removido.

## Regras de produção

- O navegador não pode escrever campos de arquivamento.
- O navegador não pode excluir fisicamente registros das coleções deste lote.
- Registros de tempo de calibração são append-only no navegador.
- Somente o Administrador pode solicitar o arquivamento operacional.
- A exclusão física permanece proibida no navegador. A única exceção operacional é o endpoint administrativo de remoção de certificado para correção e reemissão, com trilha de auditoria.

## Compatibilidade

Nenhum registro existente é alterado durante a publicação das regras ou do código. Documentos sem `isDeleted` continuam ativos. Não há migração automática nem limpeza de dados.
