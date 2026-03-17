# 🏫 Especificação de Requisitos — SCAE
> **SCAE** (Sistema de Controle de Acesso Escolar)  
> Plataforma voltada para gestão de frequência, segurança e monitoramento de alunos em ambiente escolar.

---

## 1. VISÃO GERAL
O SCAE é um sistema **white label** e **multi-tenant** projetado para atender escolas públicas e privadas. O objetivo central é fornecer um controle rigoroso de entrada e saída de alunos, utilizando QR Codes criptografados, feedback em tempo real para porteiros e notificações para responsáveis, tudo sob as diretrizes da **LGPD** (foco em dados de menores).

---

## 2. ARQUITETURA E STACK TÉCNICA
- **Frontend:** React + TypeScript + Tailwind CSS + Lucide Icons.
- **Backend:** Cloudflare Workers (API) + D1 (Banco de Dados SQL).
- **Autenticação:** Firebase Auth (Google OAuth).
- **Persistência Offline:** IndexedDB (via Dexie.js) para funcionamento ininterrupto da portaria.
- **Segurança QR:** ECDSA (Assinatura digital P-256) validada localmente no tablet.
- **Infraestrutura:** Cloudflare Pages (Hosting) + R2 (Logs imutáveis).

---

## 3. FUNCIONALIDADES PRINCIPAIS (MÓDULOS)

### 3.1. Gestão de Escolas (Multi-tenant)
- Isolamento total de dados por `tenant_id` (slug da escola na URL).
- Customização visual (identidade visual, cores e logos por escola).
- Configuração de domínios de e-mail permitidos para login institucional.

### 3.2. Controle de Acesso (Módulo Quiosque/Tablet)
- **Leitor de QR Code:** Câmera ativa para leitura contínua.
- **Validação Offline-First:** Validação criptográfica (ECDSA) ocorre no tablet sem depender de rede.
- **Feedback Visual e Sonoro:** Telas coloridas (Verde/Autorizado, Vermelho/Negado) e síntese de voz (TTS).
- **Cor do Dia:** Algoritmo de segurança que muda a cor da moldura do QR/Terminal diariamente para evitar fotos de códigos antigos.
- **Fila de Sincronização:** Registros salvos localmente e enviados ao servidor assim que houver conexão.

### 3.3. Gestão Acadêmica
- **Alunos:** Cadastro de matrícula (SIGE), nome, data de nascimento e vínculo com turma.
- **Turmas:** Gestão de turmas por ano letivo, série, letra e turno (Matutino/Vespertino/Noturno/Integral).
- **Importação:** Suporte a importação de dados de alunos via arquivos externos.

### 3.4. Risco de Abandono (Evasão Silenciosa)
- **Monitoramento:** Detecção automática de 3 faltas consecutivas em dias letivos.
- **Calendário Letivo:** Consideração de feriados e recessos para evitar falsos positivos.
- **Painel do Orientador:** Área para acompanhamento e resolução de alertas de risco.

### 3.5. Portal do Aluno/Responsável (PWA)
- **Cartão Digital:** Geração de QR Code (Fixo ou Dinâmico) para o aluno utilizar no portão.
- **Histórico de Acessos:** Consulta de horários de entrada e saída (exclusivo para os próprios dados).
- **Autocadastro:** Interface simplificada para o responsável vincular-se ao aluno.

---

## 4. REQUISITOS NÃO FUNCIONAIS (RNF)
1.  **Desempenho:** A leitura do QR Code e feedback no tablet deve ocorrer em menos de 1 segundo.
2.  **Disponibilidade:** O módulo da portaria deve funcionar 100% offline para registros de entrada/saída.
3.  **Segurança:** Chaves privadas de assinatura de QR Code nunca são expostas ao frontend.
4.  **Usabilidade:** Interface otimizada para tablets em modo quiosque (sem menus de navegação, botões grandes).
5.  **Acessibilidade:** Feedback sonoro via TTS para suporte ao porteiro.

---

## 5. REGRAS DE NEGÓCIO CRÍTICAS
- **Isolamento de Dados:** Nenhuma query ao banco de dados pode ser feita sem o filtro de `escola_id`.
- **Validação de Menores:** Dados de alunos (ECA/LGPD) são tratados com restrição máxima; fotos e biometria são proibidas no escopo atual.
- **Logs de Auditoria:** Toda ação administrativa (alterar notas, cadastros, exclusões) deve gerar um log imutável no R2.
- **Idempotência:** O reenvio de registros offline não pode criar duplicatas no servidor (uso de UUID v4).

---

## 6. JURISDIÇÃO E CONFORMIDADE
- **Localização:** UTC no banco, `America/Sao_Paulo` na exibição.
- **Moeda/Formatos:** Padrão brasileiro (BRL, DD/MM/AAAA, CPF/CNPJ).
- **Marco Civil:** Retenção de logs de acesso por no mínimo 6 meses.
- **LGPD:** Coleta mínima (Princípio da Necessidade) e anonimização de dados após 30 dias do desligamento.
