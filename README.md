# COMANINS - Sistema Metrológico e Portal de Calibração

Sistema completo de gestão metrológica, portal do cliente para certificados, controle de instrumentos, fluxo laboratorial NBR ISO/IEC 17025 e portal interno.

---

## 🛠️ Tecnologias Utilizadas

- **Frontend:** React 19, TypeScript, Tailwind CSS, Lucide React, Motion
- **Backend:** Node.js, Express, ESBuild
- **Banco de Dados:** Firebase Firestore & Auth / PostgreSQL (opcional)
- **Exportação/Relatórios:** XLSX, QRCode

---

## 🚀 Como Executar Localmente

### 1. Clonar o Repositório
```bash
git clone https://github.com/SEU_USUARIO/comanins-app.git
cd comanins-app
```

### 2. Instalar as Dependências
```bash
npm install
```

### 3. Configurar Variáveis de Ambiente
Crie um arquivo `.env` baseado no `.env.example`:
```bash
cp .env.example .env
```

### 4. Iniciar o Servidor de Desenvolvimento
```bash
npm run dev
```
Acesse a aplicação em `http://localhost:3000`.

---

## 📦 Como Gerar a Build para Produção

Para compilar a aplicação e gerar a pasta de publicação `dist/`:
```bash
npm run build
```
Esse comando gera:
- **`dist/index.html` e ativos estáticos** (HTML, CSS, JS, imagens)
- **`dist/.htaccess`** (regra de roteamento SPA e HTTPS para servidores Apache/Hostinger)
- **`dist/server.cjs`** (servidor Node.js Express embutido se for rodar em VPS/Node.js)

---

## 🌐 Publicação na Hostinger

Se você estiver publicando o site na **Hostinger** (Hospedagem de Sites / cPanel / hPanel):

### 1. Corrigindo o Erro `ERR_SSL_PROTOCOL_ERROR`:
O erro **`ERR_SSL_PROTOCOL_ERROR`** indica que o navegador tentou acessar `https://comanins.com.br`, mas o certificado SSL não está ativo ou instalado no seu domínio na Hostinger.

**Passos para Resolver na Hostinger:**
1. Acesse o **hPanel da Hostinger** (`hpanel.hostinger.com`).
2. Vá em **Segurança** -> **SSL**.
3. Verifique se o Certificado SSL Grátis (Let's Encrypt) está **Ativo** para `comanins.com.br` e `www.comanins.com.br`.
4. Caso esteja pendente ou inativo, clique em **Instalar SSL / Reinstalar SSL**.
5. No menu **Site** -> **Forçar HTTPS**, ative a chave para redirecionar automaticamente todo tráfego de HTTP para HTTPS.
6. Aguarde alguns minutos para a propagação do SSL e do DNS.

### 2. Como Enviar os Arquivos para a Hostinger:
1. Execute `npm run build` localmente.
2. Acesse o **Gerenciador de Arquivos** no hPanel da Hostinger (ou use FTP/FileZilla).
3. Navegue até a pasta **`public_html`**.
4. Copie **TODOS OS ARQUIVOS DENTRO DA PASTA `dist/`** (incluindo o arquivo `.htaccess`) para a raiz da **`public_html`**.
5. Teste o acesso ao site em `https://comanins.com.br`.

---

## 🐙 Como Subir o Projeto para o GitHub

1. Inicialize o repositório Git (se ainda não o fez):
   ```bash
   git init
   git add .
   git commit -m "feat: preparar projeto para producao e github"
   ```
2. Conecte ao seu repositório no GitHub:
   ```bash
   git branch -M main
   git remote add origin https://github.com/SEU_USUARIO/comanins-app.git
   git push -u origin main
   ```

---

## 📄 Licença

Este projeto é de propriedade exclusiva da **COMANINS - Manutenção e Instrumentação**. Todos os direitos reservados.
