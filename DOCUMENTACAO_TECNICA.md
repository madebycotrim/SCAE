# 🏫 SCAE — Sistema de Controle de Acesso Escolar (BETA)

**Documentação Técnica, Institucional e Protocolo de Governança**

📍 **Unidade Alvo:** Centro de Ensino Médio 03 de Taguatinga
🏛️ **Órgão Vinculado:** Secretaria de Estado de Educação do Distrito Federal (SEEDF)
🛡️ **Base Legal:** Conformidade estrita com a LGPD (Lei 13.709/2018)
🚀 **Tecnologia:** Edge Computing (Cloudflare) & Inteligência Preditiva

---

## 📝 1. Visão Geral e Missão

O **SCAE v3.0** não é apenas um leitor de QR Codes, mas uma **Plataforma de Governança Inteligente**.

Ele foi projetado para garantir a segurança dos estudantes do **CEM 03**, fornecendo dados em tempo real para a coordenação, ferramentas preditivas para a redução da evasão escolar e relatórios exportáveis (CSV), operando com resiliência total em cenários sem conectividade.

---

## 🏗️ 2. Arquitetura e Tecnologias

### 2.1 Pilha Tecnológica (Stack)

* **Frontend:** React.js (Vite) + Tailwind CSS (Interface reativa e ultra-leve)
* **Edge Computing:** Cloudflare Pages Functions (Processamento serverless na borda)
* **Banco de Dados Central:** Cloudflare D1 (SQL Distribuído)
* **Persistência Local:** IndexedDB (via biblioteca `idb`) para operação 100% offline
* **Estado Real-time:** Cloudflare Durable Objects (Sincronização instantânea entre múltiplos portões)
* **Armazenamento de Arquivos:** Cloudflare R2 (Fotos e logs de auditoria imutáveis)

---

### 2.2 Diagrama de Fluxo (Arquitetura de Borda)

```text
[Estudante] -> [Leitor/Tablet Portaria] -> [Validação Local IndexedDB]
                                     |
                         (Se Online) | (Se Offline)
                                     v
                 [Cloudflare Durable Objects] -> [Fila de Sincronia Local]
                                     |
                         [Cloudflare D1 SQL]
```

---

## 📊 3. Inteligência de Gestão (v3.0)

### 3.1 Alerta de Evasão Silenciosa

Algoritmo que monitora o banco de dados em busca de anomalias de frequência:

* **Detecção:** identifica quando um aluno altera seu padrão de entrada

  * Ex: faltas em dias específicos
  * Ex: aumento do atraso médio semanal

* **Ação:** dispara um alerta no painel da Orientação Educacional para intervenção preventiva

---

### 3.2 Mapa de Calor de Fluxo

Interface gráfica que demonstra os horários de maior saturação nos portões, auxiliando a direção no escalonamento de saídas e organização da equipe de pátio.

---

## ⚡ 4. Funcionalidades Operacionais Avançadas

### 4.1 Resiliência Offline-First & Clock Drift

Para garantir a validade jurídica dos horários registrados offline:

* **Desvio de Relógio:** calcula a diferença entre o tablet e o servidor e ajusta o timestamp automaticamente
* **Sincronização Idempotente:** registros enviados múltiplas vezes nunca são duplicados no banco

---

### 4.2 Feedback Sonoro (TTS) e Visual

* **Voz (TTS):** o sistema anuncia o nome do aluno ao validar ("Bom dia, João")
* **Visual:** feedbacks de cor em tela cheia (Verde/Vermelho/Amarelo)
* **Cor do Dia:** moldura colorida dinâmica que muda diariamente, servindo como validação rápida contra prints antigos

---

## 🔐 5. Segurança e Antifraude

### 5.1 QR Code Assinado (ECDSA P-256)

O SCAE v3.0 utiliza assinaturas criptográficas assimétricas de alta segurança:

*   **Algoritmo:** ECDSA P-256 (ES256)
*   **Chaves:**
    *   **Privada:** Mantida offline/segura (gera o crachá)
    *   **Pública:** Embutida no leitor (valida o crachá)
*   **Payload:** `matricula` + `timestamp` + `assinatura`
*   **Segurança:** Impossível forjar crachás sem a chave privada. O Leitor verifica a assinatura offline.

---

### 5.2 Login Institucional Restrito

Autenticação obrigatória via Google Workspace SEEDF:

* **Domínios autorizados:**

  * `@edu.se.df.gov.br`
  * `@se.df.gov.br`

* **Proteção:** middleware bloqueia qualquer conta pessoal externa

---

## 🗄️ 6. Modelo de Dados (Padrão PT-BR)

### Tabela: `alunos`

| Coluna        | Tipo      | Descrição            |
| ------------- | --------- | -------------------- |
| matricula     | TEXT (PK) | Código SIGE do aluno |
| nome_completo | TEXT      | Nome institucional   |
| turma_id      | TEXT (FK) | Vínculo com a turma  |
| status        | TEXT      | Status da matrícula  |
| foto_url      | TEXT      | URL da foto (opc)    |

---

### Tabela: `registros_acesso`

| Coluna            | Tipo      | Descrição                       |
| ----------------- | --------- | ------------------------------- |
| id                | TEXT (PK) | Identificador único do registro |
| aluno_matricula   | TEXT (FK) | Matrícula do aluno              |
| tipo_movimentacao | TEXT      | ENTRADA / SAIDA                 |
| timestamp         | DATETIME  | Data/Hora do registro           |
| sincronizado      | BOOLEAN   | Status de sync                  |
| autorizado_por    | TEXT      | Responsável (se manual)         |

---

## 📐 7. Padrões de Desenvolvimento (Código em PT-BR)

Para facilitar a manutenção técnica pela SEEDF, todo o código deve seguir nomenclatura oficial em Português.

| Item              | Regra                | Exemplo                                                  |
| ----------------- | -------------------- | -------------------------------------------------------- |
| Variáveis/Estados | camelCase em PT      | `const [listaAlunos, definirListaAlunos] = useState([])` |
| Funções           | Verbo + Substantivo  | `async function processarSincronizacao()`                |
| Componentes       | PascalCase em PT     | `<MenuLateral />`, `<LeitorPortaria />`                  |
| Commits           | Conventional Commits | `feat: adiciona alerta de evasao silenciosa`             |

---

## 📄 8. Conformidade LGPD

O SCAE v3.0 é um sistema de interesse público (**Art. 7º, III da LGPD**).

* **Minimização:** apenas dados necessários para identificação e segurança
* **Transparência:** Portal do Aluno permite visualizar seus próprios dados
* **Auditoria:** acessos administrativos são logados de forma imutável no Cloudflare R2

---

## 🚀 9. Configuração e Instalação

### Requisitos

* Node.js v18+
* Wrangler CLI:

```bash
npm install -g wrangler
```

* Conta Cloudflare com D1 e Durable Objects ativos

---

### Comandos de Inicialização

```bash
# 1. Clonar repositório
git clone https://github.com/usuario/scae-v3.git

# 2. Instalar dependências
npm install

# 3. Aplicar migrações ao banco remoto
npm run db:setup:remote

# 5. Modos de Desenvolvimento

O projeto suporta 3 modos de desenvolvimento:

### Modo 1: Local Completo (Recomendado para novas features)
Frontend local + Backend local + Banco local.
1. Iniciar Backend: `npm run dev:api:local`
2. Iniciar Frontend: `npm run dev:local`

### Modo 2: Live (Frontend apenas)
Frontend local + **Backend Produção**.
1. Iniciar: `npm run dev:live`
*Nota: Requer autenticação Google válida.*

# 6. Deploy da aplicação
npm run build
npx wrangler pages deploy dist
```

---

## 📝 10. Termo de Responsabilidade

O **SCAE v3.0** é uma ferramenta de apoio à segurança e gestão do **CEM 03 de Taguatinga**.

O uso das credenciais de acesso é pessoal e intransferível.

A manipulação de dados sem autorização da Direção Escolar é passível de sanções administrativas e penais.

---

📌 **Última Atualização:** Fevereiro de 2026
**Equipe de Desenvolvimento SCAE**
