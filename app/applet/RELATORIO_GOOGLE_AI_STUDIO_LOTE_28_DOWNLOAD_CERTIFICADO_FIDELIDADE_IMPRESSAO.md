# Relatório de Aplicação: LOTE 28 - DOWNLOAD DO CERTIFICADO COM FIDELIDADE DE IMPRESSÃO

## 1. Identificação da Base
- **Nome do Arquivo Inicial:** `sistema-comanins(20260905-231300).zip`
- **SHA-256 Inicial da Base:** `e04125042df55eb30584771d3f94539bda500dc76df5eb815dc13dfb76e2cd26`

## 2. Identificação do Patch
- **Nome:** `COMANINS_LOTE_28_DOWNLOAD_CERTIFICADO_FIDELIDADE_IMPRESSAO.patch`
- **SHA-256:** `86914f4547762ac120bf70b06a75551e42dab9dcbeaf7280a3c249a2571f4523`
- **Tamanho:** `9951 bytes`

## 3. Arquivos Alterados
- `src/utils/certificateDomPdf.ts`

## 4. Hash e Tamanho de `src/utils/certificateDomPdf.ts`
- **Inicial (Lote 27 aplicado):**
  - SHA-256: `9eb3ca71e3fffbf49441076a58757460f7ef2297c07e13817328b136fea3f70d`
  - Tamanho: `27371 bytes`
- **Final (Lote 28 aplicado):**
  - SHA-256: `b8573eeef44764d37ccdd99255dd3fc838801257cbc2410ae14cdd41794a37d9`
  - Tamanho: `25847 bytes`

## 5. Resultados dos Comandos de Validação

**`git apply --check --whitespace=error-all COMANINS_LOTE_28_DOWNLOAD_CERTIFICADO_FIDELIDADE_IMPRESSAO.patch`**
```
(Sem erros de saída, código 0 retornado)
```

**`npm run internal-portal:verify`**
```
> react-example@0.0.0 internal-portal:verify
> node scripts/internal-portal-source.mjs verify

Fragmentos válidos: cb31e02f3e252d5342327b1fafab815983c135aa3440c31a646ace63d6b384a9 (1130629 bytes)
```

**`npm run lint`**
```
> react-example@0.0.0 prelint
> npm run internal-portal:generate

> react-example@0.0.0 internal-portal:generate
> node scripts/internal-portal-source.mjs generate

InternalPortal gerado e validado: cb31e02f3e252d5342327b1fafab815983c135aa3440c31a646ace63d6b384a9 (1130629 bytes)

> react-example@0.0.0 lint
> tsc --noEmit

> react-example@0.0.0 postlint
> npm run internal-portal:clean

> react-example@0.0.0 internal-portal:clean
> node scripts/internal-portal-source.mjs clean

InternalPortal.generated.tsx removido com segurança.
```

**`npm run build`**
```
> react-example@0.0.0 prebuild
> npm run internal-portal:generate

> react-example@0.0.0 internal-portal:generate
> node scripts/internal-portal-source.mjs generate

InternalPortal gerado e validado: cb31e02f3e252d5342327b1fafab815983c135aa3440c31a646ace63d6b384a9 (1130629 bytes)

> react-example@0.0.0 build
> vite build && esbuild server.ts --bundle --platform=node --format=cjs --packages=external --sourcemap --outfile=dist/server.cjs && node --check dist/server.cjs

vite v6.4.3 building for production...
transforming...
✓ 2020 modules transformed.
rendering chunks...
✓ built in 16.70s
  dist/server.cjs      305.2kb
  dist/server.cjs.map  511.1kb
⚡ Done in 71ms

> react-example@0.0.0 postbuild
> npm run internal-portal:clean

> react-example@0.0.0 internal-portal:clean
> node scripts/internal-portal-source.mjs clean

InternalPortal.generated.tsx removido com segurança.
```

## 6. Confirmações de Restrição e Autenticidade
- **LOTES 26 E 27 PRESERVADOS:**
  - O `InternalPortal` testado atestou o exato hash `cb31e02f...`, garantindo que a pesquisa de estoque do Lote 26 e os novos mecanismos visuais de "Baixar PDF" no próprio certificado aberto (Lote 27) não sofreram nenhuma avaria.
- **DEPENDÊNCIAS E COMPONENTES INTACTOS:** 
  - Confirmo explicitamente que nenhum pacote, `package.json`, layout nativo JSX ou regra de `@media print` no CSS foi editado. Somente a estratégia de captura DOM via clonagem (`certificateDomPdf.ts`) foi alterada no diretório utilitário.
- **SEGURANÇA DE DEPLOY:**
  - Confirmo explicitamente que nenhum push ou deploy (Firebase/Hostinger) foi realizado. As operações correram estritamente no ambiente de sandbox.

flagCheckpoint: COMANINS_LOTE_28_DOWNLOAD_CERTIFICADO_FIDELIDADE_AGUARDANDO_HOMOLOGACAO
