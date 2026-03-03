---
trigger: always_on
---


Agents · MD
Copiar

# AGENTS.md — SCAE (Sistema de Controle de Acesso Escolar)

> Leia **completamente** antes de qualquer ação. Em caso de conflito com outro arquivo, este tem prioridade.

---

## 🧭 O QUE É ESTE PROJETO

Sistema **white label** de controle de acesso escolar com suporte a múltiplas escolas (multi-tenant). Cada escola acessa via slug: `seuapp.com/cem03-taguatinga`.

**Piloto:** Centro de Ensino Médio 03 de Taguatinga (SEEDF/DF). **Licença:** GNU AGPL v3.0 — gratuito para escolas públicas, comercial para privadas.

---

## 🗺️ TRÊS SUPERFÍCIES DO SISTEMA

```
/:slug/quiosque              → Tablet da portaria (modo quiosque, fullscreen)
/:slug/admin/*               → Painel administrativo (coordenadores)
/:slug/responsavel/cadastro  → Autocadastro público (responsáveis)
```

**Dois fluxos de autenticação:**
- Admin/Coordenador → login Google institucional → painel admin
- Tablet → admin loga 1x, sessão permanente (indexedDB) → quiosque fullscreen
- Responsável → sem login, usa código do aluno → vincula dispositivo
---

## 🏗️ ARQUITETURA — REGRAS INVIOLÁVEIS

### Estrutura de pastas (feature-based)

```
src/
├── tenant/           # Carrega ANTES de tudo (slug, tema, validação email)
├── funcionalidades/  # Módulos isolados: autenticacao/ portaria/ alunos/
│                     # responsaveis/ notificacoes/ dashboard/ evasao/
│                     # configuracaoEscola/
├── compartilhado/    # Só o que é usado por 2+ features
│   ├── componentes/ hooks/
│   ├── servicos/api.ts      # Axios central — NÃO duplicar instâncias
│   └── autorizacao/ (GuardaRota, GuardaQuiosque, roles)
├── configuracoes/
│   └── rotas.ts      # Definição CENTRAL de todas as rotas
└── principal/App.tsx # ORDEM: ProvedorTenant > AuthProvider > Router
```

### Regras de isolamento

- Feature **NUNCA** importa diretamente de outra feature
- Comunicação entre features: **apenas** via `compartilhado/`
- Cada feature tem `index.ts` com barrel exports
- Arquivo usado por 1 feature → fica dentro dela; por 2+ → vai para `compartilhado/`

### Ordem dos providers (NUNCA altere)

```tsx
     {/* 1. quem é a escola */}
       {/* 2. quem é o usuário */}
    {/* 3. para onde vai */}
  

```

---

## 🔐 AUTENTICAÇÃO

- Firebase Auth com Google OAuth. **Inicializar APENAS em** `autenticacao/servicos/firebase.config.ts`. Nunca chame `initializeApp()` em outro arquivo.
- Todo login passa por `tenant/validadorEmail.ts` — se email não for do domínio da escola, chama `signOut()` imediatamente.
- Domínios SEEDF: `@edu.se.df.gov.br` e `@se.df.gov.br`.
- Tablet usa `indexedDBLocalPersistence` — sessão **nunca** expira. **Não force logout no tablet.**

---

## 🏷️ MULTI-TENANT

- Escola identificada pelo **slug na URL** via `tenant/resolverTenant.ts`.
- Interceptor do Axios em `compartilhado/servicos/api.ts` injeta `tenant_id` em **toda** requisição automaticamente via `X-Tenant-ID`. **Não passe manualmente nos serviços.**
- Cores da escola injetadas pelo `ProvedorTenant` via CSS variables. **Use sempre `var(--cor-primaria)` — nunca hardcode cores.**

---

## 📱 TABLET DA PORTARIA — REGRAS ESPECIAIS

O quiosque é uma superfície completamente diferente do painel admin.

✅ Deve ter: fullscreen sem navbar/sidebar, câmera contínua (html5-qrcode), botões grandes para toque, funcionamento **100% offline**, feedback visual em tela cheia (verde/vermelho/amarelo), TTS (`window.speechSynthesis`), Cor do Dia (hash da data → cor da moldura).

❌ Nunca: adicionar menus de navegação, requisições síncronas que bloqueiem câmera, redirecionar para `/login` se sessão ativa.

### Fila offline (IndexedDB)

Todo registro salvo **primeiro** no IndexedDB, depois enviado ao servidor. Cada registro tem UUID — sincronização é idempotente. Ao reconectar: (1) corrigir clock drift, (2) sincronizar fila, (3) atualizar lista de revogações.

### Detecção de entrada/saída

Determinada pelo horário atual vs. janelas configuradas pela escola. **Não pergunte ao porteiro.** Se fora de qualquer janela → `'INDEFINIDO'` → porteiro decide manualmente.

---

## 🔑 QR CODE — SEGURANÇA ECDSA P-256

- **Algoritmo:** ECDSA P-256 (ES256). **Payload:** matrícula + timestamp_emissao + assinatura.
- Validação ocorre **localmente** no tablet, sem rede. TTL: 365 dias (configurável).
- Chave pública importada **uma vez** na inicialização e reutilizada em memória (`_chavePublicaCache`). Nunca reimporte a cada leitura.
- Verificar `qr_revogado = true` antes de aceitar. Lista de revogações em Set no IndexedDB (lookup O(1)).
- **Nunca** valide sem verificar assinatura ECDSA. **Nunca** aceite QR além do TTL. **Nunca** armazene chave privada no frontend.

---

## 🗄️ BANCO — CLOUDFLARE D1

**Tabelas:** `tenants`, `alunos`, `turmas`, `registros_acesso`, `responsaveis`, `vinculos_responsavel_aluno`, `alertas_evasao`.

```sql
-- SEMPRE filtre por tenant_id em TODA query
SELECT * FROM alunos WHERE matricula = ? AND tenant_id = ?  -- ✅
SELECT * FROM alunos WHERE matricula = ?                    -- ❌ BLOQUEADO
```

---

## ⚡ PERFORMANCE DO TABLET — CHECKLIST OBRIGATÓRIO

1. **Câmera:** parar scan imediatamente após leitura; reiniciar em paralelo ao feedback (não bloqueante). Config: `fps: 15`, `qrbox: 280x280`, `disableFlip: true`, `useBarCodeDetectorIfSupported: true`.
2. **Debounce:** mesmo QR ignorado por 2,5s (`COOLDOWN_MS = 2500`).
3. **Feedback:** duração curta — normal: 2500ms, modo fila: 1200ms, negado: 3500ms. Câmera reinicia em 60% da duração do feedback.
4. **ECDSA:** usar `crypto.subtle.verify` (async, não bloqueia render).
5. **TTS:** sempre chamar `speechSynthesis.cancel()` antes de nova fala. Apenas o primeiro nome. Rate: 1.3, lang: pt-BR.
6. **Modo Fila** (horário de pico): `fps: 10`, TTS desativado, animações CSS desativadas, feedback: 1200ms.
7. **Cache:** alunos e revogações em `Map`/`Set` — zero I/O durante leitura. Atualizado a cada 30min e ao reconectar, **nunca** durante leitura ativa.
8. **Múltiplos portões:** Durable Object separado por portão. Nomenclatura: `portao-{tenantId}-{portaoId}`.

---

## 📡 COMPORTAMENTO OFFLINE

O tablet deve funcionar **100% offline** — escolas têm redes instáveis.

| Funcionalidade | Online | Offline |
|---|---|---|
| Leitura QR + validação ECDSA | ✅ | ✅ |
| Verificação de revogação | ✅ | ✅ (IndexedDB) |
| Registro de entrada/saída | ✅ | ✅ (fila local) |
| Push/dashboard/alertas | ✅ | ❌ (envia ao reconectar) |

**Clock Drift:** ao reconectar, calcular `desvio = horaServidor - horaTablet`. Se `|desvio| ≤ 5min` → corrigir timestamps da fila. Se `> 5min` → não sincronizar, gerar alerta no painel admin.

**Indicador de status** (sempre visível no tablet): 🟢 Online sincronizado / 🟡 X registros pendentes / 🔴 Offline / ⚠️ Revogações > 24h desatualizadas.

---

## 🛡️ LGPD — DADOS DE MENORES (ATENÇÃO MÁXIMA)

O SCAE processa dados de crianças a partir de 6 anos. Art. 14 LGPD + ECA Art. 17 aplicam-se em toda sua força.

### Dados coletados — lista fechada

```
✅ PERMITIDO: matricula, nome_completo, turma_id, timestamp_acesso,
              tipo_movimentacao, metodo_leitura

❌ PROIBIDO: foto, localização GPS, biometria, comportamento, dado_saude
```

### Controle de acesso por role

- **ADMIN_ESCOLA:** acesso completo, apenas ao próprio tenant.
- **PORTEIRO:** vê nome + status QR. **Nunca** acessa histórico.
- **RESPONSAVEL:** vê apenas dados do próprio filho.
- **SEEDF:** apenas estatísticas agregadas — nunca dados individuais.

### Proibições absolutas

```
❌ Foto, biometria ou GPS de alunos
❌ Perfil comportamental com dados de acesso
❌ Dados individuais para SEEDF (apenas agregados)
❌ Analytics externos (Google Analytics, Hotjar etc.)
❌ console.log com nome, matrícula ou qualquer dado de aluno
❌ Dados de alunos em URLs públicas
❌ Transferência para servidores fora do BR sem base legal (Art. 33)
❌ Porteiro visualizando histórico de acessos
❌ Exportação de lista de alunos em alerta de evasão
```

### Retenção: registros de acesso 2 anos letivos · aluno ativo enquanto matriculado + 90 dias · após desligamento anonimizar em 30 dias · responsável desvinculado excluir em 30 dias · logs de auditoria 5 anos.

### Portal do Titular (Art. 18 LGPD)

Rota pública `/:slug/portal-titular` (CPF + código do aluno). Implementar: acesso, correção, exclusão, portabilidade e revogação de consentimento (escolas privadas).

---

## 🚨 MÓDULO DE EVASÃO SILENCIOSA

> Escopo enxuto e deliberado. **Não expanda sem validação pedagógica e revisão de LGPD.**

**Critério único:** 3 ou mais faltas consecutivas (em dias letivos) sem justificativa. "Consecutiva" usa calendário letivo — não dias corridos.

**Job:** roda 1x/dia às 18h via Cloudflare Cron (`0 21 * * 1-5`). Não roda em feriados. Não roda sem calendário letivo configurado.

**Alerta:** status `ATIVO → VISUALIZADO → ARQUIVADO`. Arquivado automaticamente se aluno volta. Nunca deletar — manter para histórico e LGPD.

**Painel** (`/:slug/admin/evasao`): exibe nome, turma, faltas consecutivas, datas, status, botão "Arquivar". **Não implementar:** observações, fluxo de atendimento, notificação ao responsável, exportação de lista, comparação entre alunos.

---

## 🚦 ROTAS

```ts
'/:slugEscola/login'                 // público
'/:slugEscola/responsavel/cadastro'  // público — sem login
'/:slugEscola/quiosque'              // GuardaQuiosque — sessão permanente tablet
'/:slugEscola/admin/*'               // GuardaRota — login Google + role
```

Lazy loading obrigatório em todas as páginas.

---

## ✍️ NOMENCLATURA (PT-BR obrigatório)

| Elemento | Regra | Exemplo |
|---|---|---|
| Variáveis/estados | camelCase PT | `listaAlunos` |
| Funções | Verbo + Substantivo PT | `processarSincronizacao()` |
| Componentes React | PascalCase PT | `<TelaQuiosque />` |
| Pastas features | kebab-case PT | `controle-acesso/` |
| Arquivos serviço | kebab + sufixo | `portaria.api.ts` |
| Commits | Conventional Commits EN | `feat: adiciona leitor QR offline` |

**Exceções (inglês OK):** `hooks`, `index.ts`, `App.tsx`, `api.ts`, `types`, `utils`, `props`.

**Imports:** sempre use path aliases — nunca caminhos relativos longos.
```ts
import { useTenant } from '@compartilhado/hooks/useTenant'  // ✅
import { useTenant } from '../../../compartilhado/...'       // ❌
```

---

## ⚠️ NUNCA FAZER

```
❌ initializeApp() fora de firebase.config.ts
❌ Segunda instância de Axios fora de compartilhado/servicos/api.ts
❌ Feature importando diretamente de outra feature
❌ Query no D1 sem filtrar por tenant_id
❌ Forçar logout no tablet
❌ Menus ou navegação na TelaQuiosque
❌ Hardcode de cores (use var(--cor-primaria))
❌ Deletar arquivos sem confirmar com o desenvolvedor
❌ Caminhos relativos longos (../../../) — use aliases
```

---

## ✅ CHECKLIST ANTES DE QUALQUER PR

**Arquitetura:** imports com aliases · nenhuma feature importa de outra · toda query filtra por `tenant_id` · quiosque fullscreen sem menus · nomenclatura PT-BR · sem `any` injustificado · sem `axios.create()` fora de `api.ts` · sem `initializeApp()` fora de `firebase.config.ts` · registros offline com UUID e idempotência.

**LGPD:** nenhum dado além da lista fechada · sem `console.log` com dados de aluno · sem dados de aluno em URLs · sem dados individuais para SEEDF · acesso a histórico gera log no R2 · porteiro não acessa histórico · notificação: nome + horário + tipo apenas · responsável acessa só dados do próprio filho · sem analytics externos.

**Performance (tablet):** câmera para após leitura · debounce 2,5s · ECDSA via `crypto.subtle` · chave pública em cache · `speechSynthesis.cancel()` antes de nova fala · cache Map/Set sem I/O durante leitura.

---