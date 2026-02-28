# AGENTS.md — SCAE (Sistema de Controle de Acesso Escolar)

> Este arquivo orienta agentes de IA (Claude Code, Cursor, Copilot, etc.)
> sobre o projeto. Leia-o **completamente** antes de qualquer ação.
> Em caso de conflito com outro arquivo, este tem prioridade.

---

## 🧭 O QUE É ESTE PROJETO

Sistema **white label** de controle de acesso escolar com suporte a
múltiplas escolas (multi-tenant). Cada escola acessa via slug na URL:
`seuapp.com/cem03-taguatinga`.

**Projeto piloto:** Centro de Ensino Médio 03 de Taguatinga (SEEDF/DF).
**Licença:** GNU AGPL v3.0 — gratuito para escolas públicas, comercial
para escolas privadas.

---

## 🗺️ MAPA MENTAL DO SISTEMA

O sistema tem **três superfícies** completamente separadas:

```
seuapp.com/:slug/quiosque        → Tablet da portaria (modo quiosque)
seuapp.com/:slug/admin/*         → Painel administrativo (coordenadores)
seuapp.com/:slug/responsavel/cadastro → Autocadastro público (responsáveis)
```

E **dois tipos de usuário com fluxos distintos:**

```
Admin/Coordenador → login Google institucional → painel admin
Tablet portaria   → admin loga 1x, sessão permanente → quiosque fullscreen
Responsável       → sem login, usa código do aluno → vincula dispositivo
```

---

## 🏗️ ARQUITETURA — REGRAS QUE NUNCA DEVEM SER QUEBRADAS

### 1. Estrutura de pastas (feature-based)

```
src/
├── tenant/                        # Camada multi-tenant — carrega ANTES de tudo
│   ├── provedorTenant.tsx         # Context Provider raiz
│   ├── resolverTenant.ts          # Extrai slug da URL
│   ├── temasEscola.ts             # CSS variables por escola
│   ├── validadorEmail.ts          # Bloqueia emails fora do domínio da escola
│   └── index.ts
│
├── funcionalidades/               # Módulos de domínio — cada um ISOLADO
│   ├── autenticacao/
│   ├── portaria/                  # SUPERFÍCIE DO TABLET
│   ├── alunos/
│   ├── responsaveis/
│   ├── notificacoes/
│   ├── dashboard/
│   ├── evasao/
│   └── configuracaoEscola/
│
├── compartilhado/                 # Apenas o que é usado por 2+ funcionalidades
│   ├── componentes/
│   ├── hooks/
│   ├── servicos/
│   │   └── api.ts                 # Axios central — NÃO duplicar instâncias
│   └── autorizacao/
│       ├── GuardaRota.tsx         # Protege rotas do painel admin
│       ├── GuardaQuiosque.tsx     # Protege rota do tablet
│       └── roles.ts
│
├── configuracoes/
│   ├── rotas.ts                   # Definição CENTRAL de todas as rotas
│   ├── tema.ts
│   └── ambiente.ts
│
└── principal/
    ├── App.tsx                    # ORDEM: ProvedorTenant > AuthProvider > Router
    └── index.tsx
```

### 2. Regras de isolamento (INVIOLÁVEIS)

- Uma feature **NUNCA** importa diretamente de outra feature
- Comunicação entre features ocorre **APENAS** via `compartilhado/`
- Cada feature tem `index.ts` com exportações explícitas (barrel exports)
- Se um arquivo é usado por apenas 1 feature → fica **dentro** dessa feature
- Se é usado por 2 ou mais → vai para `compartilhado/`

### 3. Ordem dos providers em App.tsx

```tsx
// NUNCA altere esta ordem — cada camada depende da anterior
<ProvedorTenant>        {/* 1. quem é a escola */}
  <ProvedorAuth>        {/* 2. quem é o usuário */}
    <RouterProvider />  {/* 3. para onde vai */}
  </ProvedorAuth>
</ProvedorTenant>
```

---

## 🔐 AUTENTICAÇÃO — REGRAS CRÍTICAS

### Firebase Auth com Google OAuth

```
Arquivo principal: src/funcionalidades/autenticacao/servicos/firebase.config.ts
NÃO inicialize o Firebase em nenhum outro arquivo.
NÃO chame initializeApp() fora desse arquivo.
```

### Validação de domínio de email

Todo login passa por `src/tenant/validadorEmail.ts` **antes** de ser aceito.
Se o email não terminar com o domínio da escola, chama `signOut()` imediatamente.

```ts
// Domínios da SEEDF (escolas públicas do DF):
// @edu.se.df.gov.br
// @se.df.gov.br

// Escolas privadas: domínio configurado no cadastro do tenant
```

### Sessão do tablet (quiosque)

```ts
// O tablet usa indexedDBLocalPersistence — sessão NUNCA expira
// NÃO use browserLocalStorage no tablet
// NÃO force logout no tablet a não ser por ação explícita do admin
import { setPersistence, indexedDBLocalPersistence } from 'firebase/auth'
await setPersistence(auth, indexedDBLocalPersistence)
```

---

## 🏷️ MULTI-TENANT — COMO FUNCIONA

### Identificação da escola

```ts
// Escola identificada pelo SLUG na URL:
// seuapp.com/cem03-taguatinga → slug = "cem03-taguatinga"
// src/tenant/resolverTenant.ts extrai esse slug
```

### Injeção automática do tenant_id

```ts
// src/compartilhado/servicos/api.ts
// Interceptor do Axios injeta tenant_id em TODA requisição
// NÃO passe tenant_id manualmente nos serviços — ele é injetado automaticamente
config.headers['X-Tenant-ID'] = sessionStorage.getItem('tenant_id')
```

### CSS variables do tema

```ts
// As cores da escola são injetadas pelo ProvedorTenant via:
document.documentElement.style.setProperty('--cor-primaria', data.corPrimaria)
document.documentElement.style.setProperty('--cor-secundaria', data.corSecundaria)
// Use sempre var(--cor-primaria) no CSS — nunca hardcode cores
```

---

## 📱 TABLET DA PORTARIA — REGRAS ESPECIAIS

O quiosque é uma **superfície completamente diferente** do painel admin.
Trate-os como apps separados que compartilham o mesmo codebase.

```
✅ TelaQuiosque.tsx é fullscreen, sem navbar, sem sidebar, sem menus
✅ Câmera ativa continuamente (html5-qrcode)
✅ Otimizado para toque — botões grandes, texto legível a distância
✅ Deve funcionar OFFLINE — toda lógica crítica roda localmente
✅ Feedback visual em tela cheia: verde / vermelho / amarelo
✅ Feedback sonoro TTS: window.speechSynthesis anuncia o nome do aluno
✅ Cor do Dia: hash da data atual → cor da moldura (muda diariamente)

❌ NÃO adicione menus de navegação na TelaQuiosque
❌ NÃO faça requisições síncronas que bloqueiem a câmera
❌ NÃO redirecione o tablet para /login se a sessão estiver ativa
```

### Fila offline (IndexedDB)

```ts
// src/funcionalidades/portaria/servicos/filaOffline.service.ts
// Todo registro de acesso é salvo PRIMEIRO no IndexedDB
// Depois enviado ao servidor (online) ou sincronizado depois (offline)
// Cada registro tem UUID — sincronização é idempotente (sem duplicatas)
```

### Detecção de entrada/saída

```ts
// src/funcionalidades/portaria/hooks/useTipoAcesso.ts
// NÃO pergunte ao porteiro se é entrada ou saída
// O sistema determina pelo horário atual vs. janelas configuradas pela escola
// Se fora de qualquer janela → retorna 'INDEFINIDO' → porteiro decide manualmente
```

---

## 🔑 QR CODE — SEGURANÇA ECDSA P-256

```
Algoritmo: ECDSA P-256 (ES256)
Payload:   matricula + timestamp_emissao + assinatura
Validação: ocorre LOCALMENTE no tablet (sem rede)
TTL:       365 dias por padrão (configurável por escola)
Revogação: lista de matrículas bloqueadas no IndexedDB do tablet
```

**NUNCA:**
- Valide QR Codes sem verificar a assinatura ECDSA
- Aceite QR Codes com timestamp_emissao além do TTL configurado
- Armazene a chave privada no frontend (ela é offline/segura)

**SEMPRE:**
- Verifique `qr_revogado = true` no banco antes de aceitar
- Ajuste o timestamp pelo clock drift antes de registrar

---

## 🗄️ BANCO DE DADOS — CLOUDFLARE D1

### Tabelas existentes

| Tabela | Chave | Observação |
|--------|-------|-----------|
| `tenants` | `id` (slug) | Config de cada escola |
| `alunos` | `matricula` + `tenant_id` | Código SIGE |
| `turmas` | `id` + `tenant_id` | Vínculo com alunos |
| `registros_acesso` | `id` (UUID) + `tenant_id` | Log de entradas/saídas |
| `responsaveis` | `id` + `tenant_id` | Vinculados aos alunos |
| `vinculos_responsavel_aluno` | composta | N:N responsável ↔ aluno |
| `alertas_evasao` | `id` + `tenant_id` | Padrões de falta detectados |

### Regras de query

```sql
-- SEMPRE filtre por tenant_id em TODA query
-- NUNCA faça SELECT sem WHERE tenant_id = ?
-- O D1 tem Row-Level Security configurado — queries sem tenant_id são bloqueadas

-- ✅ CORRETO
SELECT * FROM alunos WHERE matricula = ? AND tenant_id = ?

-- ❌ ERRADO
SELECT * FROM alunos WHERE matricula = ?
```

---

## 📣 NOTIFICAÇÕES

```
Canal atual:  Firebase Cloud Messaging (FCM) — push notification
Status:       Módulo preparado, implementação de PWA pendente
Canal futuro: WhatsApp (Twilio / Z-API) — fase 5 do roadmap

NÃO implemente o canal de push sem confirmação do desenvolvedor.
O módulo src/funcionalidades/notificacoes/ está preparado mas desacoplado.
O backend dispara as notificações — o frontend apenas envia o payload.
```

---

## ⚡ PERFORMANCE — MODO FILA (CRÍTICO)

### Contexto real de uso

```
Escola: 1000+ alunos
Portões: 3 simultâneos
Janela de saída: ~15 minutos
Throughput necessário: 1 aluno a cada 2,7 segundos por portão

Qualquer gargalo acima de 2s por leitura gera fila visível.
Qualquer gargalo acima de 5s por leitura colapsa o fluxo.
```

---

### 1. Câmera — parar scan imediatamente após leitura

```ts
// src/funcionalidades/portaria/hooks/useLeitorQR.ts

// ❌ ERRADO — continua tentando decodificar frames após leitura
// câmera continua rodando, CPU desperdiçada tentando reler o mesmo QR

// ✅ CORRETO — para o scan instantaneamente ao detectar um QR válido
const onSucesso = async (qrCode: string) => {
  await html5QrCode.stop()          // para câmera IMEDIATAMENTE
  await processarLeitura(qrCode)    // processa
  await html5QrCode.start(...)      // reinicia após cooldown
}

// Configuração otimizada para velocidade:
const configCamera = {
  fps: 15,                // 15fps suficiente — acima disso desperdiça CPU
  qrbox: { width: 280, height: 280 }, // área menor = decodificação mais rápida
  aspectRatio: 1.0,       // quadrado — QR Code é quadrado
  disableFlip: true,      // desativa flip — economia de processamento
  experimentalFeatures: {
    useBarCodeDetectorIfSupported: true // API nativa do browser (2-3x mais rápido)
  }
}
```

---

### 2. Debounce — mesmo QR não pode ser lido duas vezes seguidas

```ts
// src/funcionalidades/portaria/hooks/useLeitorQR.ts

const COOLDOWN_MS = 2500 // 2,5 segundos — configurável por escola

const ultimaLeitura = useRef<{ qrCode: string; timestamp: number } | null>(null)

function qrJaFoiLidoRecentemente(qrCode: string): boolean {
  if (!ultimaLeitura.current) return false
  const mesmoQR       = ultimaLeitura.current.qrCode === qrCode
  const dentroDoTempo = Date.now() - ultimaLeitura.current.timestamp < COOLDOWN_MS
  return mesmoQR && dentroDoTempo
}

const onSucesso = async (qrCode: string) => {
  if (qrJaFoiLidoRecentemente(qrCode)) return // ignora silenciosamente
  ultimaLeitura.current = { qrCode, timestamp: Date.now() }
  await processarLeitura(qrCode)
}
```

---

### 3. Feedback visual — duração curta e não bloqueante

```ts
// Durações configuráveis por modo:
const DURACOES = {
  autorizado_normal: 2500,
  autorizado_fila:   1200,  // ativado automaticamente no horário de pico
  negado:            3500,  // porteiro precisa ver
  fora_horario:      3000,
} as const

// O feedback NÃO bloqueia a câmera
// A câmera reinicia em paralelo enquanto o overlay ainda está visível
const processarLeitura = async (qrCode: string) => {
  const resultado = await validarQR(qrCode)
  mostrarFeedback(resultado)                      // exibe overlay
  reiniciarCameraApos(duracaoFeedback * 0.6)      // câmera volta antes do overlay sumir
}
```

---

### 4. Validação ECDSA — obrigatoriamente assíncrona e não bloqueante

```ts
// src/funcionalidades/portaria/utilitarios/validarQR.ts

// ✅ Web Crypto API — roda na thread de crypto, não bloqueia o render
async function verificarAssinaturaECDSA(
  payload: string,
  assinatura: string,
  chavePublica: CryptoKey
): Promise<boolean> {
  const encoder  = new TextEncoder()
  const dados    = encoder.encode(payload)
  const assinBuf = base64ParaArrayBuffer(assinatura)

  return await crypto.subtle.verify(
    { name: 'ECDSA', hash: 'SHA-256' },
    chavePublica,
    assinBuf,
    dados
  )
}

// A chave pública deve ser importada UMA VEZ na inicialização
// e reutilizada em memória — NÃO reimporte a cada leitura
let _chavePublicaCache: CryptoKey | null = null

export async function obterChavePublica(): Promise<CryptoKey> {
  if (_chavePublicaCache) return _chavePublicaCache
  _chavePublicaCache = await crypto.subtle.importKey(
    'spki',
    base64ParaArrayBuffer(CHAVE_PUBLICA_BASE64),
    { name: 'ECDSA', namedCurve: 'P-256' },
    false,
    ['verify']
  )
  return _chavePublicaCache
}
```

---

### 5. TTS — cancelar fala anterior antes de iniciar nova

```ts
// src/funcionalidades/portaria/utilitarios/anunciarNome.ts

export function anunciarNome(nomeAluno: string): void {
  if (!window.speechSynthesis) return

  // SEMPRE cancela fala em andamento — sem isso falas se acumulam
  window.speechSynthesis.cancel()

  const primeiroNome = nomeAluno.split(' ')[0] // só o primeiro nome — mais rápido
  const fala = new SpeechSynthesisUtterance(`Bem vindo, ${primeiroNome}`)
  fala.lang   = 'pt-BR'
  fala.rate   = 1.3   // ligeiramente mais rápido que o padrão
  fala.volume = 0.9
  fala.pitch  = 1.0

  window.speechSynthesis.speak(fala)
}

// No modo fila TTS é desativado automaticamente
// configuracaoEscola.ttsAtivado = false nos horários de pico
```

---

### 6. Modo Fila — ativação automática por horário

```ts
// src/funcionalidades/portaria/hooks/useModoFila.ts
// Ativado automaticamente nos horários de pico configurados pela escola

interface ConfigModoFila {
  ativo: boolean
  duracaoFeedbackMs: number
  ttsAtivado: boolean
  animacoesAtivadas: boolean
  fps: number
}

export function useModoFila(): ConfigModoFila {
  const { horarios } = useHorariosEscola()
  const emPico = horarios.some(h =>
    h.tipo === 'pico' &&
    Date.now() >= converterHora(h.inicio) &&
    Date.now() <= converterHora(h.fim)
  )

  if (emPico) return {
    ativo: true,
    duracaoFeedbackMs: 1200,
    ttsAtivado: false,        // silêncio no pico — mais rápido
    animacoesAtivadas: false, // menos CSS transitions = menos CPU
    fps: 10,
  }

  return {
    ativo: false,
    duracaoFeedbackMs: 2500,
    ttsAtivado: true,
    animacoesAtivadas: true,
    fps: 15,
  }
}
```

---

### 7. Múltiplos portões — Durable Object por portão

```ts
// Com 3+ portões simultâneos, cada tablet é independente
// NUNCA use um único Durable Object para múltiplos portões
// Isso cria gargalo de concorrência no pico

// Nomenclatura: portao-{tenantId}-{portaoId}
// Ex: portao-cem03-taguatinga-portao-1
//     portao-cem03-taguatinga-portao-2
//     portao-cem03-taguatinga-portao-3

// O dashboard recebe eventos de TODOS os portões via:
// WebSocket canal: ws://api/eventos/{tenantId}
```

---

### 8. Cache em memória — sem I/O durante leitura

```ts
// src/funcionalidades/portaria/servicos/cacheMemoria.ts
// Carregado UMA VEZ ao iniciar o tablet — atualizado periodicamente

interface CachePortaria {
  alunosAtivos:  Map<string, DadosAluno>  // matricula → dados (lookup O(1))
  qrsRevogados:  Set<string>              // set de matrículas revogadas (O(1))
  ultimaAtualizacao: number
}

// Durante leitura: zero I/O, zero async, resultado instantâneo
function alunoEstaRevogado(matricula: string): boolean {
  return cacheMemoria.qrsRevogados.has(matricula) // O(1)
}

// Cache atualizado:
// - ao inicializar o tablet
// - ao reconectar após offline
// - a cada 30 minutos se online
// - NUNCA durante leitura ativa
```

---

### 9. Checklist de performance — obrigatório antes de qualquer PR no tablet

```
[ ] html5-qrcode para imediatamente após leitura bem-sucedida
[ ] Debounce de 2,5s por QR Code implementado
[ ] Validação ECDSA usa crypto.subtle (async) — sem versão síncrona
[ ] Chave pública importada uma vez — cache em memória (_chavePublicaCache)
[ ] speechSynthesis.cancel() chamado antes de cada nova fala
[ ] Modo fila desativa animações CSS (transition, animation)
[ ] Cache de alunos/revogações em Map/Set — sem I/O durante leitura
[ ] Durable Object separado por portão — sem concorrência entre portões
[ ] Câmera reinicia em paralelo ao feedback visual (não bloqueante)
[ ] fps: 10 no modo fila, 15 no modo normal
```

---

## 📡 COMPORTAMENTO OFFLINE — REGRAS CRÍTICAS

O tablet da portaria deve funcionar **100% offline**. Esta é uma
exigência não negociável — escolas têm redes instáveis.

### Princípio: Offline-First

```
Todo registro de acesso é salvo PRIMEIRO no IndexedDB.
Depois enviado ao servidor se online, ou enfileirado se offline.
NUNCA dependa de rede para registrar uma entrada ou saída.
```

### O que funciona em cada cenário

| Funcionalidade | Online | Offline | Observação |
|----------------|--------|---------|-----------|
| Leitura do QR Code | ✅ | ✅ | Câmera é local |
| Validação ECDSA do crachá | ✅ | ✅ | Chave pública embutida no tablet |
| Verificação de QR revogado | ✅ | ✅ | Lista sincronizada no IndexedDB |
| Registro de entrada/saída | ✅ | ✅ | Fila local no IndexedDB |
| Feedback visual/sonoro | ✅ | ✅ | Totalmente local |
| Push ao responsável | ✅ | ❌ | Enviado ao reconectar |
| Dashboard tempo real | ✅ | ❌ | Atualiza ao reconectar |
| Alerta de evasão | ✅ | ❌ | Processado ao reconectar |
| Sincronização de revogações | ✅ | ❌ | Risco: ver nota abaixo |

### Fila offline — implementação

```ts
// src/funcionalidades/portaria/servicos/filaOffline.service.ts

// Cada registro DEVE ter:
// - id: UUID v4 gerado no tablet (garante idempotência na sincronização)
// - timestamp_local: horário do tablet NO MOMENTO da leitura
// - timestamp_ajustado: recalculado após correção do clock drift
// - sincronizado: false até confirmação do servidor

// Sincronização é IDEMPOTENTE:
// O servidor usa o UUID como chave — reenviar o mesmo registro
// nunca cria duplicata no banco.
```

### Clock Drift — obrigatório tratar

```ts
// src/funcionalidades/portaria/servicos/clockDrift.service.ts
// Deve ser criado se não existir.

// AO RECONECTAR:
// 1. Busca horário atual do servidor (NTP Cloudflare: time.cloudflare.com)
// 2. Calcula diferença: desvio = horaServidor - horaTablet
// 3. Se Math.abs(desvio) <= 5 minutos:
//    → aplica correção em todos os timestamps da fila offline
// 4. Se Math.abs(desvio) > 5 minutos:
//    → NÃO sincroniza automaticamente
//    → gera alerta no painel admin: "Relógio do tablet descompassado"
//    → aguarda correção manual pelo administrador
//
// Isso garante validade jurídica dos horários registrados offline.
```

### Sincronização de revogações — risco documentado

```
⚠️ RISCO CONHECIDO:
Se um aluno é desligado/transferido e o tablet fica offline
por um período prolongado sem sincronizar a lista de revogações,
o crachá desse aluno ainda será aceito localmente.

MITIGAÇÃO implementada:
- Lista de revogações sincronizada a cada reconexão
- Lista sincronizada também em intervalos regulares quando online
- Intervalo máximo recomendado: 30 minutos
- O tablet exibe aviso visual se a lista tiver mais de 24h sem sincronizar

IMPLEMENTAÇÃO:
src/funcionalidades/portaria/hooks/useFilaOffline.ts
→ ao detectar reconexão (window online event):
   1. Sincroniza fila de registros pendentes
   2. Baixa lista atualizada de revogações
   3. Corrige clock drift
   4. Atualiza timestamp da última sincronização
```

### Indicador de status de conexão

```tsx
// src/funcionalidades/portaria/componentes/StatusConexao.tsx
// DEVE exibir claramente no tablet:
// 🟢 Online — sincronizado
// 🟡 Online — X registros pendentes de sincronização
// 🔴 Offline — X registros na fila local
// ⚠️  Lista de revogações desatualizada (> 24h)
//
// Posicionamento: canto superior da TelaQuiosque, sempre visível
// Tamanho: legível a distância sem interação do porteiro
```

### Hook de reconexão — padrão obrigatório

```ts
// Padrão para detectar mudança de conectividade:
useEffect(() => {
  const aoFicarOnline = async () => {
    await corrigirClockDrift()          // 1. corrige relógio
    await sincronizarFilaPendente()     // 2. envia registros offline
    await atualizarListaRevogacoes()    // 3. baixa revogações novas
  }

  window.addEventListener('online', aoFicarOnline)
  return () => window.removeEventListener('online', aoFicarOnline)
}, [])
```

---



```ts
// ✅ CORRETO — use os aliases configurados no tsconfig e vite.config
import { useTenant } from '@compartilhado/hooks/useTenant'
import { TelaQuiosque } from '@funcionalidades/portaria/componentes/TelaQuiosque'
import { ProvedorTenant } from '@tenant/provedorTenant'
import { roteador } from '@configuracoes/rotas'

// ❌ ERRADO — nunca use caminhos relativos longos
import { useTenant } from '../../../compartilhado/hooks/useTenant'
```

```ts
// tsconfig.json / vite.config.ts — aliases registrados:
'@tenant'          → './src/tenant'
'@funcionalidades' → './src/funcionalidades'
'@compartilhado'   → './src/compartilhado'
'@configuracoes'   → './src/configuracoes'
```

---

## ✍️ NOMENCLATURA — PT-BR OBRIGATÓRIO

| Elemento | Regra | Exemplo |
|----------|-------|---------|
| Variáveis / estados | camelCase PT | `listaAlunos`, `definirListaAlunos` |
| Funções | Verbo + Substantivo PT | `processarSincronizacao()` |
| Componentes React | PascalCase PT | `<LeitorQRCode />`, `<TelaQuiosque />` |
| Pastas de features | kebab-case PT | `controle-acesso/`, `registros-offline/` |
| Arquivos de serviço | kebab + sufixo | `portaria.api.ts`, `aluno.tipos.ts` |
| Comentários no código | Português | `// Verifica TTL do crachá` |
| Mensagens de erro/log | Português | `'Matrícula não encontrada'` |
| Commits | Conventional Commits EN | `feat: adiciona leitor QR offline` |

**Exceções técnicas (inglês permitido):**
`hooks`, `index.ts`, `App.tsx`, `api.ts`, `types`, `utils`, `props`

---

## 🚦 ROTAS — ESTRUTURA OBRIGATÓRIA

```ts
// src/configuracoes/rotas.ts — três grupos distintos:

'/:slugEscola/login'                 // público — TelaLogin
'/:slugEscola/responsavel/cadastro'  // público — TelaAutocadastro (sem login)
'/:slugEscola/quiosque'              // GuardaQuiosque — sessão permanente tablet
'/:slugEscola/admin/*'               // GuardaRota — login Google + role
```

```ts
// Lazy loading OBRIGATÓRIO em todas as páginas:
const TelaQuiosque = lazy(() => import('@funcionalidades/portaria/componentes/TelaQuiosque'))

// GuardaQuiosque verifica sessão permanente do Firebase (indexedDB)
// GuardaRota verifica login ativo + role do usuário + tenant ativo
```

---

## 🛡️ LGPD — OBRIGAÇÕES NO CÓDIGO

> ⚠️ ATENÇÃO MÁXIMA: O SCAE processa dados de crianças a partir de 6 anos.
> O Art. 14 da LGPD + ECA Art. 17 se aplicam em toda sua força.
> Qualquer dado de menor tem proteção reforçada — não existe "dado irrelevante" aqui.

---

### Base legal aplicável

```
Art. 7º, III  — execução de políticas públicas (escolas públicas SEEDF)
Art. 7º, II   — cumprimento de obrigação legal (dever de guarda da escola)
Art. 14       — proteção de dados de crianças e adolescentes
ECA Art. 17   — proteção da imagem e privacidade do menor
ECA Art. 70   — dever de prevenção (justifica o controle de acesso)
```

---

### Dados coletados — lista fechada (não adicione sem aprovação)

```ts
// PERMITIDO — mínimo necessário para o funcionamento do sistema
matricula        // código SIGE — identificador institucional
nome_completo    // nome oficial — necessário para TTS e notificações
turma_id         // vínculo institucional
timestamp_acesso // horário de entrada/saída — finalidade principal
tipo_movimentacao // ENTRADA | SAIDA
metodo_leitura   // qr_celular | qr_carteirinha | manual

// NÃO COLETE — independente de pedidos futuros
foto_aluno       // não implementado — exigiria consentimento específico dos pais
localização_gps  // PROIBIDO — monitoramento de menor
biometria        // PROIBIDO — dado sensível (Art. 11 LGPD)
comportamento    // PROIBIDO — perfil comportamental de menor
dado_saude       // PROIBIDO — dado sensível (Art. 11 LGPD)
```

---

### Consentimento e base legal por tipo de escola

```
ESCOLA PÚBLICA (SEEDF):
  Base legal: Art. 7º, III (política pública) + Art. 7º, II (obrigação legal)
  → NÃO exige consentimento dos pais para operação básica
  → Exige INFORMAÇÃO clara aos pais (aviso no ato da matrícula)
  → Exige RIPD elaborado pela SEEDF antes do deploy em larga escala

ESCOLA PRIVADA:
  Base legal: Art. 7º, I (consentimento) para dados do responsável
              Art. 14 (consentimento específico dos pais para dados do menor)
  → EXIGE termo de consentimento assinado pelos pais/responsáveis
  → Consentimento deve ser específico, destacado e em linguagem clara
  → Responsável pode revogar consentimento a qualquer momento
  → Sistema DEVE ter mecanismo de revogação implementado
```

---

### Retenção e exclusão de dados — prazos obrigatórios

```ts
// src/funcionalidades/retencao/politicaRetencao.ts

const PRAZOS_RETENCAO = {
  // Registros de acesso: 2 anos letivos após o evento
  // Justificativa: prazo para eventual questionamento judicial/administrativo
  registros_acesso: 2 * 365, // dias

  // Dados do aluno ativo: enquanto durar o vínculo + 90 dias
  aluno_ativo: 'enquanto_matriculado',

  // Dados após desligamento/transferência:
  // Anonimizar em 30 dias — manter apenas estatísticas agregadas
  apos_desligamento: 30, // dias

  // Dados de responsáveis: excluir em 30 dias após desvinculação
  responsavel_desvinculado: 30, // dias

  // Logs de auditoria administrativa: 5 anos (obrigação legal pública)
  logs_auditoria: 5 * 365, // dias
} as const

// PROCESSO DE ANONIMIZAÇÃO (não é exclusão total — dados viram estatística):
// matricula      → hash irreversível (SHA-256)
// nome_completo  → removido
// turma_id       → mantido (dado agregado)
// timestamp      → mantido (dado de frequência)
// tenant_id      → mantido (dado institucional)
```

---

### Acesso aos dados — controle estrito por role

```ts
// src/compartilhado/autorizacao/roles.ts

// Quem pode ver O QUÊ:
const PERMISSOES = {
  ADMIN_ESCOLA: {
    // Direção/coordenação — acesso completo à sua escola
    pode_ver: ['todos_alunos', 'historico_completo', 'alertas', 'relatorios'],
    restricao: 'apenas_proprio_tenant', // NUNCA dados de outra escola
  },

  PORTEIRO: {
    // Vê apenas o necessário para operar o quiosque
    pode_ver: ['nome_aluno', 'foto_aluno', 'status_qr'],
    nao_pode_ver: ['historico_acessos', 'dados_responsavel', 'alertas_evasao'],
    // Porteiro vê o nome na tela do tablet mas NÃO acessa o histórico
  },

  RESPONSAVEL: {
    // Pai/mãe — vê APENAS dados do próprio filho
    pode_ver: ['historico_proprio_filho', 'alertas_proprio_filho'],
    nao_pode_ver: ['dados_outros_alunos', 'dados_turma', 'relatorios_escola'],
  },

  SEEDF: {
    // Secretaria de Educação — apenas dados agregados/estatísticos
    // NUNCA dados individuais identificáveis
    pode_ver: ['estatisticas_agregadas', 'taxas_frequencia_por_turma'],
    nao_pode_ver: ['dados_individuais', 'nome_aluno', 'historico_individual'],
    // Compartilhamento com SEEDF = operação de dados com terceiro
    // Exige Acordo de Operação de Dados (Art. 39 LGPD)
  },
}
```

---

### Compartilhamento com SEEDF — regras obrigatórias

```
O acesso da SEEDF aos dados é compartilhamento com TERCEIRO (Art. 39 LGPD).

OBRIGAÇÕES ANTES DE IMPLEMENTAR:
1. Acordo de Operação de Dados entre escola e SEEDF (documento jurídico)
2. SEEDF só recebe dados AGREGADOS — nunca individuais identificáveis
3. API da SEEDF deve ter endpoint separado com resposta anonimizada
4. Todo acesso da SEEDF deve ser logado no Cloudflare R2
5. SEEDF não pode repassar os dados a terceiros sem nova base legal

IMPLEMENTAÇÃO NO CÓDIGO:
- Endpoint exclusivo: GET /api/seedf/estatisticas/:tenantId
- Resposta: apenas { turma, total_presencas, total_faltas, percentual }
- SEM: nome, matricula, timestamp individual, dados do responsável
- Autenticação: token separado para SEEDF — não usa login Google da escola
```

---

### Portal do Titular — direitos dos alunos e responsáveis

```ts
// O sistema DEVE implementar os direitos do Art. 18 da LGPD:

// 1. ACESSO — responsável pode ver todos os dados do filho
//    GET /api/titular/meus-dados → retorna tudo que existe sobre o aluno

// 2. CORREÇÃO — responsável pode solicitar correção de dados
//    PATCH /api/titular/solicitar-correcao → abre ticket para o admin

// 3. EXCLUSÃO — responsável pode solicitar exclusão
//    DELETE /api/titular/solicitar-exclusao → inicia processo de anonimização
//    (prazo: 15 dias úteis para confirmar a exclusão — Art. 18, §3º)

// 4. PORTABILIDADE — responsável pode exportar os dados
//    GET /api/titular/exportar → retorna JSON/CSV com todo o histórico

// 5. REVOGAÇÃO DE CONSENTIMENTO (escolas privadas)
//    POST /api/titular/revogar-consentimento → bloqueia acesso imediatamente

// Rota no frontend:
// seuapp.com/:slug/portal-titular  → pública, acesso por CPF + código do aluno
```

---

### Logs de auditoria — obrigatório para toda ação administrativa

```ts
// src/compartilhado/servicos/auditoria.ts
// Todo acesso administrativo a dados de alunos DEVE ser registrado
// Logs são imutáveis no Cloudflare R2 — não podem ser editados ou deletados

interface LogAuditoria {
  id: string            // UUID
  tenant_id: string
  usuario_email: string // quem fez a ação
  acao: string          // 'visualizou_historico' | 'exportou_relatorio' | etc.
  recurso: string       // 'aluno:matricula' | 'turma:id' | etc.
  timestamp: string     // ISO 8601
  ip_origem: string     // IP da requisição
  resultado: 'sucesso' | 'negado'
}

// Ações que OBRIGATORIAMENTE geram log:
// - visualizar histórico de qualquer aluno
// - exportar relatório com dados individuais
// - alterar dados cadastrais de aluno
// - acessar dados de responsável
// - qualquer ação da SEEDF
// - tentativas de acesso negadas
```

---

### Notificações aos responsáveis — regras de conteúdo

```ts
// Notificação push/WhatsApp para responsáveis:

// ✅ PERMITIDO no conteúdo da notificação:
// "João entrou na escola às 07h32"
// "João saiu da escola às 17h15"
// "João não registrou entrada hoje"

// ❌ PROIBIDO no conteúdo da notificação:
// Dados de saúde ou comportamento
// Informações de outros alunos
// Dados que permitam inferir situação familiar
// Links com token de acesso exposto na URL

// Notificação deve ser entregue APENAS ao responsável vinculado
// Sistema deve verificar vínculo ativo antes de cada envio
// Responsável pode desativar notificações a qualquer momento
```

---

### Incidente de segurança — protocolo obrigatório

```
Se dados de menores forem expostos (vazamento, acesso não autorizado):

PRAZO LEGAL: 72 horas para notificar a ANPD (Art. 48 LGPD)
OBRIGAÇÃO:   Notificar também os responsáveis pelos alunos afetados

IMPLEMENTAR:
1. Mecanismo de detecção de acesso anômalo (tentativas repetidas, IP estranho)
2. Bloqueio automático de conta após X tentativas falhas
3. Alerta imediato ao admin da escola
4. Template de notificação à ANPD já preparado (docs/incidente-anpd.md)
5. Log imutável de todos os eventos do incidente no R2
```

---

### Proibições absolutas — NUNCA implemente isso

```
❌ NÃO colete foto, biometria ou localização GPS de alunos
❌ NÃO crie perfil comportamental ou de aprendizado com dados de acesso
❌ NÃO compartilhe dados individuais com a SEEDF — apenas agregados
❌ NÃO envie dados de menores para serviços de analytics (Google Analytics, etc.)
❌ NÃO use dados de acesso para fins publicitários ou comerciais
❌ NÃO armazene dados além do prazo de retenção definido
❌ NÃO permita que porteiros vejam histórico de acessos de alunos
❌ NÃO exponha matrícula ou nome de aluno em URLs públicas
❌ NÃO registre dados de acesso em logs de erro (ex: Sentry, console.log)
❌ NÃO transfira dados para servidores fora do Brasil sem base legal (Art. 33)
```

---

## ⚠️ O QUE NUNCA FAZER

```
❌ Nunca inicialize o Firebase fora de firebase.config.ts
❌ Nunca crie uma segunda instância do Axios fora de compartilhado/servicos/api.ts
❌ Nunca importe de uma feature dentro de outra feature
❌ Nunca faça query no D1 sem filtrar por tenant_id
❌ Nunca force logout no tablet (quiosque tem sessão permanente)
❌ Nunca adicione menus ou navegação na TelaQuiosque
❌ Nunca hardcode cores — use var(--cor-primaria) e var(--cor-secundaria)
❌ Nunca delete arquivos sem confirmar com o desenvolvedor
❌ Nunca quebre funcionalidade existente sem documentar o motivo
❌ Nunca use caminhos relativos longos (../../../) — use os aliases
```

---

## ✅ CHECKLIST ANTES DE QUALQUER PR

### Arquitetura
- [ ] Imports usam path aliases (`@funcionalidades/`, `@compartilhado/`, etc.)
- [ ] Nenhuma feature importa diretamente de outra feature
- [ ] Toda query no D1 filtra por `tenant_id`
- [ ] Novos componentes do quiosque são fullscreen e sem menus
- [ ] Nomenclatura em PT-BR (exceto exceções técnicas listadas)
- [ ] Sem `any` sem justificativa no TypeScript
- [ ] Sem novas instâncias de `axios.create()` fora de `api.ts`
- [ ] Sem `initializeApp()` fora de `firebase.config.ts`
- [ ] Registros offline têm UUID e sincronização idempotente

### LGPD — dados de menores (obrigatório)
- [ ] Nenhum dado novo coletado além da lista fechada (matricula, nome, turma, timestamp, tipo, método)
- [ ] Sem `console.log` com nome, matrícula ou qualquer dado de aluno
- [ ] Sem dados de alunos em URLs públicas ou parâmetros de rota visíveis
- [ ] Sem envio de dados individuais para SEEDF — apenas agregados
- [ ] Acesso a histórico de aluno gera log de auditoria no R2
- [ ] Porteiro não consegue visualizar histórico de acesso de alunos
- [ ] Notificação ao responsável contém apenas: nome + horário + tipo (entrada/saída)
- [ ] Responsável só acessa dados do próprio filho — nunca de outros alunos
- [ ] Novo endpoint com dados de aluno tem GuardaRota com role correto
- [ ] Sem integração com serviços de analytics externos (Google Analytics, Hotjar, etc.)
- [ ] Dados não trafegam para servidores fora do Brasil sem verificação

### Performance (tablet)
- [ ] html5-qrcode para após leitura bem-sucedida
- [ ] Debounce de 2,5s por QR Code implementado
- [ ] Validação ECDSA usa `crypto.subtle` (async)
- [ ] Chave pública em cache de memória — não reimportada a cada leitura
- [ ] `speechSynthesis.cancel()` chamado antes de cada nova fala
- [ ] Cache de alunos/revogações em Map/Set — sem I/O durante leitura

---

## 🚨 MÓDULO DE EVASÃO SILENCIOSA — ESPECIFICAÇÃO COMPLETA

> Escopo deliberadamente enxuto: **um critério, um destino, sem fluxo interno.**
> O sistema detecta e registra. O orientador age fora do sistema.
> NÃO expanda este escopo sem validação pedagógica e revisão de LGPD.

---

### Critério único de disparo

```ts
// src/funcionalidades/evasao/servicos/detectarEvasao.ts
//
// ÚNICO critério implementado:
// Aluno com 3 ou mais faltas CONSECUTIVAS sem justificativa registrada
//
// "Consecutiva" = dias letivos seguidos em que o aluno deveria estar presente
// mas não há registro de ENTRADA no sistema
//
// NÃO implementar outros critérios sem decisão formal da coordenação pedagógica.
// Falso positivo em dado de menor tem consequência institucional séria.

const FALTAS_CONSECUTIVAS_LIMITE = 3 // imutável — só muda com validação pedagógica

interface CriterioEvasao {
  alunoMatricula: string
  tenantId: string
  faltasConsecutivas: number      // sempre >= 3 quando alerta é gerado
  dataPrimeiraFalta: string       // ISO 8601 — início da sequência
  dataUltimaFalta: string         // ISO 8601 — data mais recente
  diasLetivosVerificados: string[] // lista dos dias que contaram como falta
}
```

---

### O que conta como "falta" para o módulo

```ts
// Falta = dia letivo sem registro de ENTRADA para aquele aluno
//
// ✅ Conta como falta:
//    - Dia letivo sem nenhum registro no sistema
//    - Dia letivo com apenas SAÍDA registrada (sem entrada correspondente)
//
// ❌ NÃO conta como falta:
//    - Fim de semana
//    - Feriados cadastrados na configuração da escola
//    - Dias fora do calendário letivo configurado
//    - Dias em que a escola estava fechada (recesso, greve registrada)
//    - Faltas com justificativa registrada pelo admin
//
// O calendário letivo e feriados são configurados em:
// src/funcionalidades/configuracaoEscola/servicos/calendarioLetivo.ts
// Sem calendário configurado → módulo de evasão NÃO roda (evita falso positivo)
```

---

### Job de detecção — quando roda

```ts
// src/funcionalidades/evasao/servicos/jobDeteccao.ts
//
// Roda UMA VEZ por dia — preferencialmente às 18h (fim do dia letivo)
// via Cloudflare Cron Trigger — NÃO roda em tempo real
//
// Motivo: detecção em tempo real de padrão de falta não faz sentido
// pedagógico e desperdiçaria recursos sem nenhum ganho.
//
// Configuração no wrangler.toml:
// [triggers]
// crons = ["0 21 * * 1-5"]  # 18h BRT (UTC-3) de segunda a sexta

async function executarDeteccaoDiaria(tenantId: string): Promise<void> {
  const hoje = obterDataLetiva()                        // ignora fins de semana
  if (!ehDiaLetivo(hoje, tenantId)) return              // não roda em feriados

  const alunos = await buscarAlunosAtivos(tenantId)

  for (const aluno of alunos) {
    const sequencia = await calcularFaltasConsecutivas(aluno.matricula, tenantId)

    if (sequencia >= FALTAS_CONSECUTIVAS_LIMITE) {
      await criarOuAtualizarAlerta(aluno.matricula, tenantId, sequencia)
      // NÃO dispara notificação push/email — orientador vê no painel
    }
  }
}
```

---

### Alerta — o que é criado e onde aparece

```ts
// src/funcionalidades/evasao/tipos/evasao.tipos.ts

type StatusAlerta = 'ATIVO' | 'VISUALIZADO' | 'ARQUIVADO'
// ATIVO      → aparece destacado no painel do orientador
// VISUALIZADO → orientador abriu o alerta (marca automática ao visualizar)
// ARQUIVADO  → orientador arquivou manualmente (não é "resolvido" — o sistema não sabe)

interface AlertaEvasao {
  id: string                    // UUID
  tenant_id: string
  aluno_matricula: string
  aluno_nome: string            // desnormalizado para exibição — evita JOIN no painel
  turma_id: string
  faltas_consecutivas: number   // número no momento da criação/atualização
  data_primeira_falta: string
  data_ultima_falta: string
  status: StatusAlerta
  criado_em: string
  visualizado_em: string | null
  arquivado_em: string | null
  // SEM: campo "resolvido", "atendido", "observações" — fora do escopo
}

// REGRA IMPORTANTE: se o aluno aparecer depois de estar em alerta,
// o alerta muda para ARQUIVADO automaticamente — sequência foi quebrada.
// NÃO delete o alerta — mantenha para histórico e LGPD.
```

---

### Painel do orientador — o que exibir e o que NÃO exibir

```tsx
// src/funcionalidades/evasao/componentes/PainelAlertas.tsx
//
// Rota: /:slug/admin/evasao
// Acesso: apenas ADMIN_ESCOLA e ORIENTADOR — NÃO para porteiro ou responsável

// ✅ EXIBIR no painel:
// - Nome do aluno
// - Turma
// - Quantidade de faltas consecutivas
// - Data da primeira e última falta
// - Status do alerta (ATIVO / VISUALIZADO / ARQUIVADO)
// - Botão "Arquivar" (única ação disponível no sistema)

// ❌ NÃO EXIBIR / NÃO IMPLEMENTAR:
// - Campo de observações ou anotações (fora do escopo)
// - Histórico de atendimentos
// - Contato com responsável pelo sistema
// - Qualquer inferência sobre o motivo da falta
// - Comparação entre alunos ("top 10 mais faltosos")
// - Exportação de lista de alunos em alerta (risco LGPD)

// ORDENAÇÃO padrão: faltas_consecutivas DESC (mais crítico primeiro)
// FILTRO disponível: por turma, por status
```

---

### Restrições de LGPD específicas para este módulo

```
Este módulo cria PERFIL DE COMPORTAMENTO de menor — nível de sensibilidade alto.

✅ PERMITIDO:
   Detectar ausência com base em dados já coletados (timestamps de acesso)
   Alertar orientador interno da escola
   Arquivar alertas após resolução externa

❌ PROIBIDO:
   Notificar o responsável sobre o alerta de evasão via push/WhatsApp
   (o responsável já recebe push de entrada/saída — o SCAE não é sistema disciplinar)

   Exportar lista de alunos em situação de evasão
   (risco de exposição indevida de dado comportamental de menor)

   Cruzar dados de evasão com qualquer outra fonte externa
   (notas, ocorrências, dados socioeconômicos)

   Tornar o alerta visível para o porteiro
   (porteiro não tem papel pedagógico)

   Manter alertas arquivados visíveis por mais de 2 anos letivos
   (mesmo prazo de retenção dos registros de acesso)

BASE LEGAL para este módulo:
   Art. 7º, II — cumprimento de obrigação legal
   (Lei de Diretrizes e Bases — Art. 12, VIII: escola deve notificar faltas)
   NÃO use "legítimo interesse" como base — é menor de idade.
```

---

### Calendário letivo — pré-requisito obrigatório

```ts
// O módulo de evasão SÓ funciona se o calendário letivo estiver configurado.
// Sem calendário → job não roda → nenhum alerta é gerado.
// Isso é intencional: melhor não alertar do que gerar falso positivo.

// O admin da escola configura em:
// /:slug/admin/configuracoes/calendario

// Configuração mínima necessária:
interface CalendarioLetivo {
  tenant_id: string
  ano_letivo: number
  data_inicio: string           // início do ano letivo
  data_fim: string              // fim do ano letivo
  dias_sem_aula: string[]       // feriados + recessos (array de datas ISO)
  dias_letivos_semana: number[] // [1,2,3,4,5] = seg a sex (0=dom, 6=sab)
}
```

---

### Checklist específico do módulo de evasão

```
[ ] Job roda apenas em dias letivos (verificar calendário antes de executar)
[ ] Critério: exatamente 3 faltas consecutivas — nem mais nem menos critérios
[ ] "Consecutiva" usa calendário letivo — não dias corridos
[ ] Alerta não notifica responsável — apenas painel interno do orientador
[ ] Painel não tem campo de observações ou fluxo de atendimento
[ ] Alerta arquivado automaticamente quando aluno volta (sequência quebrada)
[ ] Alertas não são exportáveis
[ ] Porteiro não tem acesso ao painel de alertas
[ ] Logs de visualização de alerta geram log de auditoria no R2
[ ] Alertas retidos pelo mesmo prazo dos registros de acesso (2 anos letivos)
```

---

## 🗺️ ROADMAP RESUMIDO

| Fase | Escopo | Status |
|------|--------|--------|
| 1 | Piloto CEM 03 — tablet, QR, painel admin | **Em desenvolvimento** |
| 2 | Multi-tenant SEEDF — outras escolas públicas do DF | Planejado |
| 3 | PWA para responsáveis — push nativo instalável | Planejado |
| 4 | Escolas privadas — licença comercial AGPL | Futuro |
| 5 | WhatsApp — notificações via API | Futuro |

---

## 📁 ARQUIVOS DE REFERÊNCIA

| Arquivo | Conteúdo |
|---------|----------|
| `docs/arquitetura.md` | Decisões de arquitetura (ADRs) |
| `LGPD.md` | Política completa de privacidade, direitos dos titulares, protocolo de incidente |
| `docs/multi-tenant.md` | Como onboarding de novas escolas funciona |
| `CHANGELOG.md` | Histórico de versões |
| `.env.exemplo` | Todas as variáveis necessárias documentadas |
| `SCAE-documentacao-tecnica.docx` | Documentação técnica completa |

---

*SCAE v3.0 — GNU AGPL v3.0 — Atualizado: Fevereiro de 2026*