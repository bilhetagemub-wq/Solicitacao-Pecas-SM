# Controle de Peças — São Miguel

Sistema de solicitação de peças entre Almoxarifado e Funcionários, com dashboard da frota,
aba de solicitação, aba do comprador, aba de configurações e login com controle de acesso
por função (Comprador, Encarregado, Gerente, Developer). Alertas automáticos por e-mail
para peças atrasadas.

Este guia assume que você **nunca usou Firebase nem Vercel**. Siga na ordem.
Vai levar cerca de 40-50 minutos na primeira vez.

---

## Visão geral das funções (roles)

| Função | Abas que enxerga |
|---|---|
| **Comprador** | Dashboard + Aba do Comprador |
| **Encarregado** | Dashboard + Solicitar Peça + Relatório |
| **Gerente** | Dashboard + Solicitar Peça + Comprador + Atualizações + Relatório |
| **Developer** | Todas as abas, incluindo Configurações |

A aba **Configurações** (só Developer) é onde se cadastra os e-mails que recebem alerta,
se ajusta o prazo de alerta, e se cria/edita/exclui os usuários do sistema — tudo pela
própria interface, sem precisar mexer em código depois da configuração inicial.

---

## Prioridade da peça

⚠️ **Se você já tinha publicado as regras do Firestore antes desta atualização, republique-as**
(Firebase Console > Firestore Database > Regras > cole o conteúdo atualizado de
`firestore.rules` > Publicar) — a regra que impede o Comprador de alterar prioridade só
funciona depois disso.

Quem define a prioridade (Baixa/Média/Alta) agora é o **solicitante**, no momento de
preencher o pedido na aba Solicitar Peça. O Comprador **não pode mais alterar** a
prioridade depois — nem pela interface, nem por fora dela (as regras do Firestore
bloqueiam essa alteração especificamente para a função Comprador). Gerente e Developer
continuam podendo alterar qualquer campo, caso seja necessário fazer um ajuste.

## Dashboard interativo

A aba Dashboard agora lista **todas** as peças já solicitadas, com um campo de busca por
peça ou nº de frota. Os cards do topo (Alertas de atraso, Pendentes, Em cotação, Já em
estoque) funcionam como **filtros clicáveis** — clique em um card pra ver só aquela
situação na tabela abaixo, clique de novo (ou no botão "Limpar filtro") pra voltar a ver
tudo.

## Teste de envio de e-mail

Na aba Configurações, o botão **"✉ Enviar e-mail de teste"** dispara imediatamente um
e-mail de teste para os endereços cadastrados na lista de alertas — útil pra confirmar que
o envio (Gmail ou Resend, o que estiver configurado) está funcionando, sem precisar esperar
o cron diário.

## Relatório de peças pendentes (aba Relatório)

Disponível para **Encarregado, Gerente e Developer**. Gera um arquivo **.csv** com o resumo
das solicitações — pensado para ser importado em outra ferramenta (ex: um sistema que gera
alertas ou dashboards próprios). Traz filtros para incluir ou não peças já resolvidas, e para
mostrar somente as atrasadas. As colunas exportadas são: data da solicitação, nº da frota,
fabricante, peça, quantidade, status, prioridade, matrícula do solicitante, matrícula do
encarregado, dias em aberto, se está atrasada, e observações. Nenhuma configuração adicional
é necessária — o botão "Baixar relatório" já funciona assim que o app estiver no ar.

## Comprovante em PDF da solicitação

Toda vez que uma solicitação é enviada pela aba **Solicitar Peça**, o sistema gera e baixa
automaticamente um **comprovante em PDF**, com:
- Número do pedido, data/hora, veículo, peça, quantidade e observações.
- Duas linhas de assinatura: uma para o **solicitante** e outra para o **encarregado**,
  cada uma já identificada pela matrícula correspondente, prontas para impressão e coleta
  da assinatura física.

Se precisar gerar de novo o comprovante de um pedido já enviado (por exemplo, se a impressora
travou), há um botão **🖨 Comprovante** ao lado de cada linha na tabela "Últimas solicitações
enviadas", na própria aba Solicitar Peça.

Essa funcionalidade não depende de nenhuma configuração externa — funciona direto no
navegador, sem precisar de servidor ou serviço de terceiros.

---

## Parte 1 — Criar o projeto no Firebase (banco de dados)

1. Acesse **https://console.firebase.google.com** e faça login com uma conta Google.
2. Clique em **"Criar projeto"**. Dê um nome, ex: `sao-miguel-controle-pecas`.
3. Pode desativar o Google Analytics (não é necessário). Clique em **Criar projeto**.
4. No menu lateral, clique em **Compilação > Firestore Database**.
5. Clique em **Criar banco de dados**.
   - Escolha a localização mais próxima (ex: `southamerica-east1` — São Paulo).
   - Selecione **Iniciar no modo de produção**.
6. Depois de criado, vá na aba **Regras** dentro do Firestore e substitua o conteúdo pelo
   arquivo `firestore.rules` que está nesta pasta. Clique em **Publicar**.

### 1.1 Ativar o login por e-mail e senha

1. No menu lateral, clique em **Compilação > Authentication**.
2. Clique em **Começar** (ou **Get started**).
3. Na lista de provedores, clique em **E-mail/senha**, ative o primeiro interruptor
   ("E-mail/senha") e clique em **Salvar**.

### 1.2 Pegar a configuração do app (para o `.env.local`)

1. No menu lateral, clique no ícone de engrenagem > **Configurações do projeto**.
2. Role até **Seus aplicativos** e clique no ícone **`</>`** (Web).
3. Dê um apelido (ex: `web`) e clique em **Registrar app**.
4. Vai aparecer um bloco `firebaseConfig` com várias chaves (`apiKey`, `authDomain`, etc).
   Você vai usar esses valores no passo 4 deste guia.

### 1.3 Gerar a chave de serviço (para o cron de e-mail e para criar usuários)

1. Ainda em **Configurações do projeto**, vá na aba **Contas de serviço**.
2. Clique em **Gerar nova chave privada** > confirme o download. Um arquivo `.json` será
   baixado — **guarde-o com cuidado, ele dá acesso total ao projeto (banco de dados e
   usuários)**.
3. Esse arquivo `.json` tem várias linhas e caracteres especiais (a `private_key` é enorme).
   Colar esse conteúdo direto numa variável de ambiente é a maior fonte de erro deste guia —
   editores de texto como Word, Notas ou até alguns navegadores trocam aspas retas (`"`) por
   aspas curvas (`" "`), o que quebra o JSON e gera o erro
   `Expected property name or '}' in JSON`. Por isso, **converta o arquivo para base64**
   antes de colar — base64 usa só letras, números, `+`, `/` e `=`, então não tem como
   corromper.

   **No Mac ou Linux**, abra o terminal na pasta onde o arquivo foi baixado e rode:
   ```bash
   base64 -i nome-do-arquivo.json | tr -d '\n' | pbcopy
   ```
   (no Linux sem `pbcopy`, troque por `base64 -i nome-do-arquivo.json | tr -d '\n' > chave.txt`
   e abra `chave.txt` para copiar o conteúdo).

   **No Windows**, abra o PowerShell na pasta do arquivo e rode:
   ```powershell
   [Convert]::ToBase64String([IO.File]::ReadAllBytes("nome-do-arquivo.json")) | Set-Clipboard
   ```

   O valor gerado (uma sequência longa numa linha só) já fica copiado — cole ele na variável
   `FIREBASE_SERVICE_ACCOUNT_BASE64` no passo 4 deste guia e na Vercel (Parte 5).

---

## Parte 2 — Configurar o envio de e-mail

Escolha **uma** das duas opções abaixo.

### Opção 1 (recomendada): Gmail SMTP

Mais simples — não exige verificar domínio, e funciona pra qualquer destinatário desde já.

1. Use a conta Gmail que vai aparecer como remetente dos alertas (pode ser uma conta pessoal
   ou de uma conta compartilhada da empresa, tipo `almoxarifado.saomiguel@gmail.com`).
2. Essa conta precisa ter a **verificação em duas etapas** ativada. Se ainda não tem:
   acesse **myaccount.google.com/security** → **Verificação em duas etapas** → ative.
3. Depois de ativar, acesse **myaccount.google.com/apppasswords** (ou busque "Senhas de app"
   nas configurações de segurança da conta Google).
4. Em "Nome do app", digite algo como `Controle de Peças` e clique em **Criar**.
5. O Google mostra uma senha de 16 caracteres (tipo `abcd efgh ijkl mnop`) — copie ela
   **sem os espaços**.
6. Use essas duas variáveis de ambiente:
   - `GMAIL_USER` → o e-mail Gmail completo (ex: `bilhetagem.ub@gmail.com`)
   - `GMAIL_APP_PASSWORD` → a senha de 16 caracteres gerada (sem espaços)

Pronto — com essas duas variáveis preenchidas, o sistema já usa o Gmail automaticamente pra
mandar os alertas e o comprovante (o Resend nem precisa estar configurado).

**Limite**: contas Gmail pessoais podem enviar até ~500 e-mails/dia, o que é bem mais do que
o suficiente pra esse uso. Contas Google Workspace (empresa) têm limite maior.

### Opção 2: Resend

Exige um domínio próprio verificado pra enviar a destinatários além do e-mail da conta.

1. Acesse **https://resend.com** e crie uma conta gratuita.
2. No painel, vá em **API Keys** > **Create API Key**. Copie a chave (começa com `re_...`).
3. Sem verificar domínio, o Resend só permite enviar para o **e-mail com o qual você criou
   a conta** — útil só pra um teste rápido, não pra uso real com vários destinatários.
4. Para enviar a qualquer destinatário, vá em **Domains** → **Add Domain**, adicione o
   domínio de e-mail da empresa (ex: `saomiguel.com.br`) e siga as instruções de DNS
   (adicionar os registros TXT/CNAME mostrados no painel, no provedor onde o domínio está
   registrado). Depois de verificado, use `alertas@saomiguel.com.br` (ou similar) como
   `ALERT_FROM_EMAIL`.
5. Use as variáveis `RESEND_API_KEY` e `ALERT_FROM_EMAIL` — mas deixe `GMAIL_USER` e
   `GMAIL_APP_PASSWORD` em branco, já que o Gmail tem prioridade se ambos estiverem
   preenchidos.

---


## Parte 3 — Rodar o projeto localmente (opcional, mas recomendado para testar antes)

Requer [Node.js](https://nodejs.org) instalado (versão 18 ou superior).

```bash
cd sao-miguel-app
npm install
cp .env.local.example .env.local
```

Abra o `.env.local` e preencha:
- As 6 variáveis `NEXT_PUBLIC_FIREBASE_*` com os valores do passo 1.2.
- `FIREBASE_SERVICE_ACCOUNT_BASE64`: o valor gerado no passo 1.3 (a sequência longa em base64).
- `GMAIL_USER` e `GMAIL_APP_PASSWORD` (ou `RESEND_API_KEY`): conforme a opção escolhida no passo 2.
- `CRON_SECRET`: qualquer string aleatória (ex: gere uma em https://www.uuidgenerator.net).

Depois:
```bash
npm run dev
```
Abra **http://localhost:3000** no navegador. Você vai cair na tela de login — siga para a
Parte 4 abaixo para criar o primeiro usuário antes de conseguir entrar.

---

## Parte 4 — Criando o primeiro usuário (Developer)

Como ninguém ainda existe no sistema, o primeiro usuário Developer precisa ser criado
manualmente no console do Firebase (só dessa primeira vez — todos os próximos usuários
você cria direto pela aba Configurações do próprio sistema).

1. No **Firebase Console > Authentication > Users**, clique em **Add user**.
2. Preencha seu e-mail e uma senha, clique em **Add user**.
3. Copie o **User UID** que aparece na lista (uma sequência de letras/números).
4. Vá em **Firestore Database > Dados** e clique em **Iniciar coleção**.
   - ID da coleção: `usuarios`
   - ID do documento: **cole o User UID copiado no passo 3**
   - Adicione os campos:
     - `email` (string) → seu e-mail
     - `role` (string) → `developer`
     - `criadoEm` (string) → qualquer data, ex: `2026-01-01`
   - Clique em **Salvar**.
5. Pronto — agora entre no sistema (local ou depois de publicado) com esse e-mail e senha.
   Você verá todas as abas, incluindo **Configurações**, de onde poderá criar os próximos
   usuários (Comprador, Encarregado, Gerente ou outros Developers) normalmente.

---

## Parte 5 — Publicar no Vercel

1. Acesse **https://vercel.com** e crie uma conta (pode entrar com GitHub, GitLab ou e-mail).
2. Suba este projeto para um repositório no **GitHub** (crie um repositório novo e faça push
   da pasta `sao-miguel-app`). Se nunca usou Git, o próprio painel do GitHub tem um botão
   "uploading an existing file" que aceita arrastar a pasta toda.
3. No painel da Vercel, clique em **Add New > Project**, escolha o repositório que você
   acabou de criar e clique em **Import**.
4. Antes de clicar em **Deploy**, abra a seção **Environment Variables** e adicione
   **cada uma** das variáveis que estão no seu `.env.local` (mesmos nomes, mesmos valores).
5. Clique em **Deploy**. Em 1-2 minutos o site estará no ar em um endereço tipo
   `https://sao-miguel-controle-pecas.vercel.app`.
6. (Opcional) Em **Settings > Domains**, você pode ligar um domínio próprio da empresa.
7. No **Firebase Console > Authentication > Settings > Authorized domains**, adicione o
   domínio da Vercel (ex: `sao-miguel-controle-pecas.vercel.app`) — sem isso, o login não
   funciona no site publicado.

### Ativando o alerta automático diário

O arquivo `vercel.json` já configura um **Vercel Cron Job** que roda todo dia às 12:00 UTC
(09:00 no horário de Brasília) e chama `/api/check-alerts`, que verifica peças atrasadas e
envia o e-mail de alerta para os destinatários cadastrados na aba **Configurações**. Isso é
ativado automaticamente no deploy — só garanta que as variáveis de e-mail (`GMAIL_USER` +
`GMAIL_APP_PASSWORD`, ou `RESEND_API_KEY` + `ALERT_FROM_EMAIL`), `FIREBASE_SERVICE_ACCOUNT_BASE64`
e `CRON_SECRET` estejam preenchidos na Vercel, e que pelo menos um e-mail esteja cadastrado na
aba Configurações (ou em `ALERT_TO_EMAILS` como alternativa).

Para mudar o horário, edite o campo `"schedule"` em `vercel.json` (formato cron: minuto hora * * *,
sempre em UTC) e faça um novo deploy.

Para testar manualmente sem esperar o cron:
```bash
curl -H "Authorization: Bearer SEU_CRON_SECRET" https://SEU-PROJETO.vercel.app/api/check-alerts
```

---

## Gerenciando usuários pelo sistema (depois do primeiro Developer)

Na aba **Configurações**:
- **Adicionar usuário**: preencha e-mail, uma senha temporária (peça para o usuário trocar
  depois, se quiser — este sistema não tem tela de "esqueci minha senha" pronta; troque
  direto pelo Firebase Console > Authentication se precisar redefinir) e a função.
- **Mudar função**: use o seletor na tabela de usuários — a mudança é instantânea.
- **Excluir usuário**: remove o acesso ao sistema (Firebase Authentication) e o registro
  de função. Não é possível excluir a própria conta logada por lá, por segurança.

---

## Sobre a segurança deste sistema

Diferente da versão anterior (que usava uma senha única compartilhada), agora o sistema
usa **Firebase Authentication de verdade** com **regras do Firestore que checam a função
de cada usuário no servidor** — ou seja, mesmo que alguém tente acessar o banco de dados
por fora do site, as regras (`firestore.rules`) bloqueiam qualquer leitura/escrita de quem
não estiver logado com a função correta. Isso é uma proteção real, não apenas uma tela
bonita na frente.

Pontos de atenção:
- Guarde o valor de `FIREBASE_SERVICE_ACCOUNT_BASE64` com cuidado — ele
  não deve aparecer em nenhum lugar público (não vai para o GitHub, graças ao `.gitignore`).
- As rotas `/api/admin/*` (criar/editar/excluir usuário) verificam no servidor que quem
  chamou é realmente um Developer autenticado — não é possível burlar isso pelo navegador.

---

## Estrutura do projeto

```
app/
  page.js                       → tela principal, conecta ao Firestore em tempo real
  layout.js                     → layout raiz (fontes, título)
  globals.css                    → estilos e paleta de cores da marca
  api/check-alerts/route.js      → rota chamada pelo Vercel Cron para enviar alertas por e-mail
  api/admin/create-user/route.js → cria usuário (Auth + Firestore), só Developer
  api/admin/update-role/route.js → muda a função de um usuário, só Developer
  api/admin/delete-user/route.js → exclui um usuário, só Developer
components/
  Sidebar.js             → menu lateral (filtrado por função)
  LoginGate.js            → tela de login + contexto de usuário/função
  DashboardTab.js          → aba Dashboard
  SolicitarTab.js           → aba Solicitar Peça (gera comprovante em PDF ao enviar)
  CompradorTab.js            → aba do Comprador
  AtualizacoesTab.js          → aba Atualizações (upload de planilha)
  RelatorioTab.js               → aba Relatório (exporta CSV)
  ConfiguracoesTab.js          → aba Configurações (só Developer)
lib/
  firebaseClient.js  → conexão com Firestore + Auth (navegador)
  firebaseAdmin.js   → conexão com Firestore + Auth (servidor)
  adminAuth.js       → verifica se quem chamou a API é Developer
  adminApi.js        → funções do navegador que chamam as rotas /api/admin/*
  roles.js           → definição das funções e quais abas cada uma acessa
  pdfReceipt.js      → gera o comprovante em PDF da solicitação
  mailer.js          → envia e-mail via Gmail SMTP (ou Resend como alternativa)
  utils.js           → funções auxiliares
firestore.rules      → regras de segurança do banco (checam a função do usuário)
vercel.json          → configuração do Cron Job diário
```

---

## Dúvidas comuns

**"Expected property name or '}' in JSON..." ao criar/editar usuário ou nos alertas** →
a credencial do Firebase Admin está corrompida. Se você usou `FIREBASE_SERVICE_ACCOUNT_JSON`
(colando o JSON puro), troque para `FIREBASE_SERVICE_ACCOUNT_BASE64` seguindo a Parte 1.3 —
isso elimina o problema de vez, porque base64 não pode ser corrompido por aspas curvas ou
quebra de linha. Depois de trocar a variável na Vercel, faça um novo deploy (Redeploy).

**Não consigo entrar / "Acesso não configurado"** → seu usuário existe no Authentication
mas não tem um documento correspondente na coleção `usuarios` do Firestore (ou o Developer
ainda não te cadastrou pela aba Configurações). Veja a Parte 4 para o primeiro usuário, ou
peça para o Developer te cadastrar.

**"Erro ao carregar a frota do Firebase"** ao abrir o site → confira se as 6 variáveis
`NEXT_PUBLIC_FIREBASE_*` estão certas e se as regras do Firestore foram publicadas.

**O e-mail não chega** → use o botão "✉ Enviar e-mail de teste" na aba Configurações — ele
mostra o erro exato. As causas mais comuns: se estiver usando Gmail, confira se
`GMAIL_USER`/`GMAIL_APP_PASSWORD` estão certos e se a senha de app não expirou; se estiver
usando Resend sem domínio verificado, ele só envia para o e-mail da própria conta Resend
(veja a Parte 2 para configurar um dos dois corretamente).

**Login não funciona no site publicado, mas funciona local** → adicione o domínio da Vercel
em Firebase Console > Authentication > Settings > Authorized domains (Parte 5, passo 7).

**Quero mudar o prazo de alerta ou os e-mails que recebem alerta** → isso é feito na aba
Configurações (só Developer vê essa aba), sem precisar mexer no código.
