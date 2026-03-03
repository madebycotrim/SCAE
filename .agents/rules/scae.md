---
trigger: always_on
---

# 🏫 REGRA DE PROJETO — SCAE
> Sistema de Controle de Acesso Escolar | Multi-tenant | LGPD reforçada (menores)
> **Localização:** raiz do repositório `scae/` → `regra-scae.md`
> **Leia também:** `regra-global.md` (contexto do desenvolvedor + regras universais)
> Este arquivo complementa a regra global — não repete o que já está lá.

---

## IDENTIDADE

Sistema **white label** multi-tenant de controle de acesso escolar. Piloto: CEM 03 de Taguatinga (SEEDF/DF). Licença: GNU AGPL v3.0 — gratuito para escolas públicas, comercial para privadas.

**Três superfícies completamente separadas:**
- `/:slug/quiosque` → tablet da portaria (fullscreen, modo quiosque)
- `/:slug/admin/*` → painel administrativo (coordenadores/direção)
- `/:slug/responsavel/cadastro` → autocadastro público (sem login)

---

## MULTI-TENANT

Escola identificada pelo **slug na URL** (`seuapp.com/cem03-taguatinga`). O interceptor Axios injeta `tenant_id` automaticamente em toda requisição — não passar manualmente nos serviços.

```typescript
// ✅ SELECT * FROM alunos WHERE matricula = ? AND tenant_id = ?
// ❌ SELECT * FROM alunos WHERE matricula = ?
// Toda query no D1 filtra por tenant_id — sem exceção. RLS configurado.
```

CSS variables do tema → `var(--cor-primaria)`, `var(--cor-secundaria)` — nunca hardcode de cor.

---

## AUTENTICAÇÃO

- Firebase Auth com Google OAuth — inicializar **apenas** em `firebase.config.ts`. Nunca em outro arquivo.
- Todo login passa por `validadorEmail.ts` — domínio inválido → `signOut()` imediato
- Domínios SEEDF: `@edu.se.df.gov.br` | `@se.df.gov.br`
- Tablet usa `indexedDBLocalPersistence` — sessão **nunca** expira. **Nunca** force logout no tablet.

**Ordem dos providers — nunca alterar:**
```tsx
<ProvedorTenant>       {/* 1. quem é a escola */}
  <ProvedorAuth>       {/* 2. quem é o usuário */}
    <RouterProvider /> {/* 3. para onde vai */}
  </ProvedorAuth>
</ProvedorTenant>
```

---

## TABLET / QUIOSQUE — REGRAS CRÍTICAS

O quiosque é uma superfície completamente diferente do painel admin. Tratar como apps separados que compartilham o codebase.

```
✅ Fullscreen — sem navbar, sidebar ou menus de navegação
✅ Câmera ativa continuamente (html5-qrcode)
✅ Offline-first — funciona 100% sem rede para leitura e registro
✅ Feedback visual fullscreen: verde (autorizado) / vermelho (negado) / amarelo (atenção)
✅ TTS: speechSynthesis.cancel() SEMPRE antes de nova fala
✅ Cor do Dia: hash da data → cor da moldura (muda diariamente)
❌ Sem menus de navegação na TelaQuiosque
❌ Sem requisições síncronas que bloqueiem a câmera
❌ Sem redirect para /login se sessão estiver ativa
```

### Performance — princípios (valores configuráveis por escola, não fixos aqui)

- **Câmera:** parar o scan imediatamente após leitura bem-sucedida, reiniciar após feedback
- **Debounce:** mesmo QR Code não pode ser lido duas vezes seguidas dentro do cooldown configurado
- **ECDSA:** validação via `crypto.subtle` (async) — nunca versão síncrona que bloqueia o render
- **Chave pública:** importada uma vez na inicialização e mantida em cache de memória — nunca reimportada a cada leitura
- **TTS:** `speechSynthesis.cancel()` antes de cada nova fala — sem acúmulo de falas na fila
- **Cache:** lista de alunos e revogações em `Map/Set` — zero I/O durante leitura ativa
- **Portões simultâneos:** Durable Object separado por portão — nunca compartilhado entre portões

### Fila offline (IndexedDB)

- Todo registro salvo **primeiro** no IndexedDB — depois enviado ao servidor
- UUID v4 por registro → sincronização idempotente (reenvio nunca cria duplicata)
- Ao reconectar: 1) corrigir clock drift, 2) sincronizar fila pendente, 3) atualizar lista de revogações

### QR Code ECDSA P-256

- Validação ocorre **localmente** no tablet, sem rede
- Nunca aceitar QR sem verificar assinatura ECDSA
- Nunca armazenar chave privada no frontend
- Verificar `qr_revogado` no cache antes de aceitar

---

## LGPD — PROTEÇÃO REFORÇADA (DADOS DE MENORES)

> Este projeto processa dados de crianças a partir de 6 anos.
> Art. 14 LGPD + ECA Art. 17 se aplicam. As regras abaixo são mais restritivas que a Regra Global.

### Dados coletados — lista fechada (não adicionar sem justificativa documentada)

```typescript
// ✅ PERMITIDO — mínimo necessário
matricula        // identificador institucional (SIGE)
nome_completo    // necessário para TTS e notificações
turma_id         // vínculo institucional
timestamp_acesso // finalidade principal do sistema
tipo_movimentacao // ENTRADA | SAIDA
metodo_leitura   // qr_celular | qr_carteirinha | manual

// ❌ PROIBIDO — independente de pedidos futuros
foto_aluno       // exigiria consentimento específico dos pais
localizacao_gps  // monitoramento de menor — proibido sem base legal
biometria        // dado sensível — Art. 11 LGPD
comportamento    // perfil comportamental de menor — fora da finalidade
dado_saude       // dado sensível — Art. 11 LGPD
```

### Controle de acesso por role

- `PORTEIRO` → vê nome + status QR na tela durante a leitura. **Nunca** histórico, dados do responsável ou alertas.
- `RESPONSAVEL` → vê apenas dados do **próprio filho**. Nunca dados de outros alunos.
- `ADMIN_ESCOLA` → todos os alunos da própria escola. **Nunca** dados de outro tenant.
- `SEEDF` → apenas **dados agregados** (totais por turma). Nunca nome, matrícula ou timestamp individual.

### Compartilhamento com SEEDF

O acesso da SEEDF é compartilhamento com terceiro (Art. 39 LGPD). Antes de implementar:
- Formalizar Acordo de Operação de Dados com a Procuradoria do DF
- Endpoint exclusivo com token separado (nunca o mesmo token do admin)
- Resposta: apenas `{ turma, total_alunos, presencas, faltas, percentual }` — nunca dado individual
- Todo acesso logado imutavelmente no Cloudflare R2

### Retenção de dados

| Dado | Prazo | O que acontece |
|---|---|---|
| Registros de acesso | 2 anos letivos | Mantidos para auditoria/frequência |
| Dados do aluno após desligamento | 30 dias | Anonimizar: matrícula → hash SHA-256, nome → NULL |
| Dados do responsável após desvinculação | 30 dias | Excluir |
| Logs de auditoria administrativa | 5 anos | Imutável no R2 (obrigação para órgão público) |

### Proibições absolutas neste projeto

```
❌ console.log com nome, matrícula ou qualquer dado de aluno
❌ Dados de alunos em URLs públicas ou parâmetros de rota visíveis
❌ Dados individuais enviados à SEEDF — apenas agregados
❌ Analytics externos (Google Analytics, Hotjar, Sentry com PII, etc.)
❌ Dados trafegando para servidores fora do Brasil
❌ Porteiro com acesso a histórico de qualquer aluno
```

---

## MÓDULO DE EVASÃO SILENCIOSA

**Escopo deliberadamente enxuto.** O sistema detecta e registra. O orientador age fora do sistema.

**Critério único:** 3 ou mais faltas **consecutivas em dias letivos** sem justificativa registrada. Não implementar outros critérios sem validação pedagógica — falso positivo em dado de menor tem consequência institucional séria.

- Job roda **uma vez por dia** via Cloudflare Cron — nunca em tempo real
- Sem calendário letivo configurado → job **não roda** (melhor não alertar que gerar falso positivo)
- Alerta visível **apenas** no painel interno do orientador — nunca ao responsável via push
- Painel: sem campo de observações, sem exportação de lista, sem acesso do porteiro
- Alerta arquivado automaticamente quando aluno volta (sequência quebrada)
- Não expandir este escopo sem validação pedagógica e revisão de LGPD

---

## PENDÊNCIAS QUE EXIGEM AÇÃO HUMANA (não resolvem com código)

```
⚠️ RIPD — SEEDF deve elaborar antes do deploy em larga escala (exigência ANPD)
⚠️ DPO — SEEDF deve indicar formalmente o Encarregado de Dados (Art. 41 LGPD)
⚠️ Aviso aos pais — incluir info sobre o SCAE na ficha de matrícula
⚠️ Acordo SEEDF — formalizar antes de dar acesso à Secretaria
⚠️ Escolas privadas — Termo de Consentimento Parental específico antes de qualquer implantação
```

---

## CHECKLIST SCAE PRÉ-DEPLOY

**Arquitetura:**
- [ ] Toda query no D1 filtra por `tenant_id`
- [ ] Firebase inicializado apenas em `firebase.config.ts`
- [ ] Axios centralizado em `compartilhado/servicos/api.ts` — sem segunda instância
- [ ] Quiosque fullscreen sem menus de navegação

**LGPD — dados de menores:**
- [ ] Nenhum dado fora da lista fechada coletado
- [ ] Sem `console.log` com dado de aluno em nenhum ambiente
- [ ] Sem dados de alunos em URLs públicas
- [ ] Porteiro não consegue acessar histórico
- [ ] Acesso a histórico de aluno gera log de auditoria no R2
- [ ] Endpoints com dados de aluno protegidos por GuardaRota com role correto
- [ ] SEEDF recebe apenas agregados — nunca dado individual

**Tablet:**
- [ ] Câmera para após leitura bem-sucedida
- [ ] Debounce implementado — mesmo QR não aceito duas vezes seguidas
- [ ] ECDSA via `crypto.subtle` com chave em cache de memória
- [ ] Registros offline com UUID (idempotência garantida)
- [ ] Reconexão: clock drift → fila → revogações (nessa ordem)