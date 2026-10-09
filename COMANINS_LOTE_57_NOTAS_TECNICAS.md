# COMANINS — LOTE 57
## Validação simples e determinística da faixa dos padrões de calibração

### Objetivo
Remover totalmente o Gemini/IA da validação dos padrões A/B/C e impedir falsos bloqueios na ficha de calibração.

### Causa raiz encontrada
O LOTE 56 ainda mantinha dois mecanismos que podiam bloquear uma calibração correta:

1. Padrões auxiliares que não eram classificados deterministicamente eram enviados ao Gemini e podiam voltar como `REVIEW`, impedindo o salvamento.
2. O parser de unidade usava limites de palavra (`\\b`) para várias unidades. Em textos como `0/10000PSI`, o `PSI` está colado ao número. Como números e letras são considerados caracteres de palavra pela expressão regular, não existia limite de palavra entre `0` e `P`; portanto a unidade não era reconhecida.

O mesmo risco existia em formatos legados sem espaço entre valor e unidade.

### Regra nova
A validação de padrões é 100% determinística.

- Não existe chamada ao Gemini em `/api/validate-calibration-standards`.
- Não existe mais resultado `REVIEW` para padrões.
- A resposta é somente `PASS` ou `BLOCK`.
- Padrão com faixa maior que a do instrumento é permitido.
- Padrão com faixa inferior à necessária é bloqueado.
- As unidades são convertidas para uma base comum antes da comparação.
- A faixa deve conter integralmente a faixa do instrumento: limite inferior do padrão <= limite inferior do instrumento e limite superior do padrão >= limite superior do instrumento.
- Para transmissores, B/C elétrico pode ser comparado ao sinal de saída, por exemplo 4–20 mA.
- O Padrão A nunca é tratado como padrão de saída: ele deve cobrir a grandeza/faixa principal do instrumento.
- Se C for utilizado, recebe a mesma regra de faixa de B.

### Regra corporativa preservada
O requisito do LOTE 55 permanece:

- Padrão A obrigatório;
- Padrão A com Laboratório RBC/Origem preenchido;
- Padrão A não pode ser COMANINS;
- COMANINS continua permitido em B/C;
- o mesmo padrão não pode ocupar dois slots;
- padrão arquivado/inativo não é aceito.

### Correções do parser
Passaram a ser reconhecidos, inclusive sem espaço:

- `0/10000PSI`
- `0/10000psi`
- `0/1Kgf/cm²`
- `0/1kgf/cm2`
- `0-10bar`
- `0/1000mbar`
- `4-20mA`
- demais unidades já suportadas: bar, psi, kPa, MPa, Pa, kgf/cm², mmHg, inHg, mmH2O, cmH2O, mH2O, inH2O, atm, torr, °C, °F, K, mA, A, mV, V e resistência.

### Caso informado pelo usuário
Instrumento:
- 0 a 0,4 kgf/cm²
- normalizado: 0 a 0,392266 bar

Padrão A:
- 0 a 10000 psi
- normalizado: 0 a 689,475729 bar
- resultado: PASS

Padrão B:
- 0 a 1 kgf/cm²
- normalizado: 0 a 0,980665 bar
- resultado: PASS

Caso de controle:
- Padrão 0 a 0,2 kgf/cm²
- normalizado: 0 a 0,196133 bar
- resultado: BLOCK para instrumento 0 a 0,4 kgf/cm²

### Alterações estruturais
- `server.ts`: rota de validação reescrita sem IA e parser de unidades corrigido.
- `InternalPortal.part01.sourcepart`: mensagens simplificadas e variável alterada para `standardRangeValidation`.
- `src/lib/firebase.ts`: a persistência exige somente validação determinística PASS; removida dependência de `standardAiValidation` para novos registros.
- `src/types.ts`: `standardRangeValidation` adicionado; `standardAiValidation` mantido apenas para compatibilidade com relatórios antigos.
- `scripts/internal-portal-source.mjs`: hash atualizado.

### Integridade
SHA-256 dos fragmentos do InternalPortal:

`6660a3fc6b98f43e5a81c2479dd5ae409cd5ddddca793e237c386d539959febb`

`node scripts/internal-portal-source.mjs verify` passou.

### Validação executada
Validação sintática com TypeScript 5.8.3 passou para:
- `server.ts`
- `src/lib/firebase.ts`
- `src/types.ts`
- `InternalPortal.generated.tsx` durante a geração de teste

`npm ci` foi tentado, mas expirou no ambiente antes de concluir. Portanto `npm run lint` e `npm run build` devem ser executados no Google AI Studio/ambiente de implantação antes da publicação.
