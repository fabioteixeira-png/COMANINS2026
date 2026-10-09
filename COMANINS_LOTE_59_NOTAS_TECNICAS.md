# COMANINS — LOTE 59
## Carregamento imediato do Portal / Fast Cache + Stale-While-Revalidate

### Objetivo
Eliminar a sensação de portal “vazio” após login, F5 ou reentrada, principalmente no Dashboard e na área de Calibração, exibindo imediatamente o último snapshot autorizado existente no navegador e sincronizando Firestore/API em segundo plano.

### Diagnóstico encontrado
O Serviço de Campo já possuía uma estratégia eficiente: snapshot persistente local + sincronização/delta posterior. Os demais módulos não seguiam o mesmo padrão.

Os principais gargalos encontrados eram:

1. `instruments` mantinha cache apenas em memória. Em um F5 o `Map` nascia vazio e a interface esperava a paginação do Firestore.
2. `calibrationReports` estava explicitamente com `persistCache: false`.
3. Clientes e diretório interno aguardavam as APIs `/api/internal/clients` e `/api/internal/portal-users` antes de apresentar dados.
4. Vários módulos de RH, Financeiro e Locação dependiam do primeiro `onSnapshot` do Firestore para preencher o React.
5. Algumas coleções já tinham cache local, mas os estados do `InternalPortal` iniciavam vazios e só eram hidratados depois do primeiro `useEffect`.
6. O primeiro evento local do Firestore poderia ser vazio e substituir um snapshot local útil antes da resposta autoritativa do servidor.

### Arquitetura implementada
Foi criada uma camada `src/lib/portalFastCache.ts` usando IndexedDB.

Características:

- cache persistente por `Firebase UID`;
- chave no formato `uid::dataset`;
- validade padrão de 7 dias, renovada sempre que chega snapshot autoritativo;
- Firestore/API continuam sendo a fonte oficial;
- falha do IndexedDB não impede o sistema de funcionar;
- payloads Base64 muito grandes são removidos do cache para não degradar a abertura do navegador;
- nenhum dado de um usuário é utilizado como fast cache de outro usuário.

O modelo adotado é `stale-while-revalidate`:

1. login autenticado;
2. leitura local do último snapshot autorizado;
3. React recebe os dados antes da abertura do portal, quando aplicável;
4. portal aparece preenchido;
5. Firestore/API sincronizam em segundo plano;
6. resposta autoritativa substitui o cache e atualiza a tela;
7. novo snapshot é persistido para a próxima abertura.

### Dashboard e Calibração — primeira pintura
Antes de `setViewMode('portal')`, o `App.tsx` hidrata em paralelo:

- `instruments`;
- `calibrationReports`;
- `internalClients`;
- `internalPortalUsers`.

Isso foi feito porque esses conjuntos alimentam os principais contadores, tabelas e relacionamentos do Dashboard e da Calibração.

Se já existir cache válido, o usuário entra no portal com esses dados presentes no primeiro render visível.

### Instrumentos
`syncInstruments()` passou a:

- hidratar IndexedDB antes da carga paginada;
- manter cache isolado por UID;
- persistir o `Map` consolidado com debounce;
- manter listener incremental durante a atualização;
- remover, após a carga completa autoritativa, registros antigos que existiam apenas no cache;
- preservar alterações novas recebidas pelo listener enquanto a paginação ocorre.

Assim o cache não se torna um segundo banco de dados: ele é reconciliado com o Firestore.

### Fichas / relatórios de calibração
`syncReports()` deixou de utilizar `persistCache: false` e passou a usar IndexedDB por usuário.

Um snapshot local do Firestore não substitui indevidamente um snapshot rápido já disponível. O primeiro snapshot confirmado pelo servidor passa a ser a referência autoritativa e atualiza o cache.

### Clientes e usuários internos
As rotas protegidas continuam sendo utilizadas, preservando autorização no backend.

Agora:

- o último resultado autorizado é lido do IndexedDB;
- o cache é separado por UID;
- a API é chamada em seguida;
- em caso de lentidão/offline, a tela mantém o snapshot previamente autorizado em vez de zerar a lista;
- em novo sucesso da API, o snapshot é substituído e persistido.

### Outros módulos convertidos para fast cache IndexedDB
Foram migradas as sincronizações de:

- mensagens;
- treinamentos;
- ASO;
- treinamentos por colaborador;
- exames médicos;
- contracheques, com chave separada para “todos” ou colaborador específico;
- documentos PGR/PCMSO;
- serviços de locação;
- ativos de locação;
- contratos de locação;
- faturas de locação;
- movimentações de locação;
- configurações de locação;
- transações financeiras;
- contratos financeiros;
- medições financeiras;
- coleções financeiras auxiliares;
- operações financeiras;
- extratos/conciliação financeira.

### Caches locais já existentes
Foram aproveitados imediatamente quando já existiam no sistema, incluindo dados operacionais como:

- entradas de material;
- RNC;
- aniversários;
- padrões de referência;
- estoque e movimentações;
- auditoria de calibração;
- auditoria de acesso;
- opções de dropdown;
- sequencial de certificado;
- sequencial de entrada;
- tipos de exames;
- configurações da empresa.

O `InternalPortal` passou a inicializar alguns desses estados diretamente do cache, evitando um primeiro render vazio desnecessário.

### `createSharedSync()`
A infraestrutura compartilhada agora suporta:

- `localStorage`;
- `indexedDB`;
- `none`;
- idade máxima do cache;
- isolamento por usuário;
- distinção entre snapshot Firestore local e snapshot autoritativo do servidor.

Os canais ativos também ficam segregados por UID para impedir reutilização acidental de um canal de outro usuário no mesmo navegador.

### Limite técnico importante
Em um navegador/dispositivo que nunca carregou o sistema, não existe snapshot local para exibir. Portanto, a primeira carga absoluta precisa baixar os dados uma vez.

Depois que o snapshot inicial foi criado, login, reentrada e F5 podem utilizar o fast cache imediatamente e atualizar em segundo plano.

### O que NÃO foi alterado
Este lote não modifica:

- regra de validação dos padrões do LOTE 57;
- correção de permissão de Nova Ficha Admin do LOTE 58;
- Firestore Rules do LOTE 58;
- regras metrológicas;
- cálculo de calibração;
- emissão de certificados;
- RNC com IA;
- validação de foto pós-laboratório;
- permissões de módulos;
- regras de exclusão administrativa;
- dados persistidos no Firestore.

### Segurança
O novo IndexedDB não é global entre usuários. Os snapshots adicionados por este lote utilizam o UID do Firebase na chave.

Não foi utilizado cache compartilhado de dados protegidos entre contas.

O cache nunca concede permissão. A autorização continua sendo controlada por Firebase Auth, Firestore Rules e endpoints protegidos do backend.

### Validações executadas
- `node scripts/internal-portal-source.mjs verify`: OK.
- SHA-256 dos fragmentos do InternalPortal: `e27071891de6a464ab293ffb5de110991a55683d18937648db1751bf946862e9`.
- Validação sintática via TypeScript 5.8.3 (`transpileModule`) de:
  - `src/App.tsx`: OK;
  - `src/lib/firebase.ts`: OK;
  - `src/lib/portalFastCache.ts`: OK;
  - `InternalPortal.generated.tsx`: OK.
- `tsc --noEmit` completo não pôde ser concluído no ambiente porque o ZIP não contém `node_modules`; os erros restantes são de módulos/tipos ausentes.
- tentativa de `npm ci --ignore-scripts --no-audit --no-fund` excedeu o tempo disponível no ambiente e não foi considerada uma validação concluída.

### Testes obrigatórios após implantação
1. Entrar no portal em um navegador sem cache e aguardar a primeira sincronização completa.
2. Fazer logout/login e confirmar que Dashboard e Calibração aparecem preenchidos imediatamente.
3. Executar F5/reabrir e confirmar o mesmo comportamento.
4. Simular rede lenta no DevTools e confirmar que o snapshot anterior aparece antes da rede.
5. Desconectar a internet após uma sincronização válida e confirmar que os dados em cache continuam visíveis, sem permitir que o cache seja confundido com confirmação de gravação.
6. Alterar um instrumento em outro navegador e confirmar que o primeiro navegador mostra o cache e depois recebe a atualização autoritativa.
7. Excluir/arquivar um instrumento e confirmar que ele deixa de existir no fast cache após a reconciliação autoritativa.
8. Entrar com dois usuários internos diferentes no mesmo navegador e confirmar isolamento de cache por UID.
9. Validar Dashboard, Calibração, RH, Financeiro e Locação.
10. Executar `npm ci`, `npm run internal-portal:verify`, `npm run lint` e `npm run build`.
