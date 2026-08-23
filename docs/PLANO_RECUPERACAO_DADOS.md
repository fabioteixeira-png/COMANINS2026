# COMANINS — Plano de recuperação e continuidade de dados

## Recursos de produção

- Projeto Google Cloud/Firebase: `aqueous-mile-rzp2g`
- Firestore database: `ai-studio-comaninsexcelnci-f5355530-a4e5-4359-8c99-de3da14e5882`
- Storage bucket: `aqueous-mile-rzp2g.firebasestorage.app`

## Proteções obrigatórias

### 1. Delete Protection do Firestore

```bash
gcloud firestore databases update \
  --project=aqueous-mile-rzp2g \
  --database=ai-studio-comaninsexcelnci-f5355530-a4e5-4359-8c99-de3da14e5882 \
  --delete-protection
```

### 2. Point-in-Time Recovery (PITR)

Ativar pelo Google Cloud Console em Firestore > Databases > selecionar o banco > Disaster Recovery > Enable point-in-time recovery.

Depois confirmar:

```bash
gcloud firestore databases describe \
  --project=aqueous-mile-rzp2g \
  --database=ai-studio-comaninsexcelnci-f5355530-a4e5-4359-8c99-de3da14e5882
```

O resultado deve indicar `POINT_IN_TIME_RECOVERY_ENABLED` e `DELETE_PROTECTION_ENABLED`.

### 3. Backup agendado diário

Criar pelo Google Cloud Console em Firestore > Databases > Disaster Recovery > Scheduled backups.

Política COMANINS recomendada:

- frequência: diária;
- retenção: 14 semanas.

### 4. Soft Delete do Cloud Storage

Política COMANINS recomendada: 30 dias.

```bash
gcloud storage buckets update \
  gs://aqueous-mile-rzp2g.firebasestorage.app \
  --soft-delete-duration=30d
```

## Política de exclusão da aplicação

Dados operacionais críticos não devem ser excluídos fisicamente pelo portal. A exclusão funcional passa a ser arquivamento lógico (`isDeleted`, `deletedAt`, `deletedBy`).

Exclusão física deve ocorrer apenas em processo excepcional e documentado de manutenção.

## Política de arquivos

Novos arquivos grandes devem ser gravados no Cloud Storage. Firestore deve armazenar apenas metadados, URL e caminho do objeto.

Durante as migrações, conteúdo legado em Base64 não deve ser removido automaticamente. O fluxo é:

1. gravar novo objeto no Storage;
2. validar upload;
3. gravar URL/path no Firestore;
4. manter o Base64 legado como fallback;
5. migrar históricos em lotes;
6. comparar quantitativos e hashes;
7. remover Base64 somente em etapa futura, após período de estabilidade e backup confirmado.

## Recuperação

Em incidente de gravação/exclusão incorreta:

1. suspender novas alterações no módulo afetado;
2. registrar horário aproximado do incidente;
3. usar PITR para localizar o estado imediatamente anterior;
4. recuperar somente os documentos necessários quando possível;
5. para incidentes mais antigos, restaurar backup em um novo database e comparar os dados antes de reintroduzir em produção;
6. para arquivos excluídos, recuperar via Soft Delete do Storage.
