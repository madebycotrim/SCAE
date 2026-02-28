# LGPD.md — Política de Privacidade e Proteção de Dados
# SCAE — Sistema de Controle de Acesso Escolar
# Versão: 1.0 | Fevereiro de 2026

> Este documento define as obrigações legais, técnicas e operacionais
> do SCAE em relação à Lei 13.709/2018 (LGPD), ao ECA e às diretrizes
> da ANPD para sistemas que tratam dados de crianças e adolescentes.
>
> **Leitura obrigatória para: desenvolvedores, administradores de sistema,
> gestores escolares e qualquer pessoa com acesso ao painel administrativo.**

---

## 1. Por Que Este Sistema Tem Proteção Reforçada

O SCAE não é um sistema comum. Ele processa dados de **crianças a partir
de 6 anos de idade** em ambiente escolar. Isso aciona três camadas de
proteção simultâneas:

**Art. 14 da LGPD** — proteção específica para dados de crianças e
adolescentes. Exige consentimento parental específico (escolas privadas)
ou base legal de política pública muito bem fundamentada (escolas públicas).

**ECA — Arts. 17 e 70** — proteção da imagem, privacidade e dignidade
do menor. O dever de prevenção justifica o controle de acesso, mas não
autoriza coleta além do necessário.

**ANPD — Resolução CD/ANPD nº 2/2022** — sistemas de monitoramento de
menores exigem RIPD (Relatório de Impacto à Proteção de Dados) antes
da implantação em larga escala.

---

## 2. Bases Legais por Tipo de Escola

### 2.1 Escolas Públicas da SEEDF

| Operação | Base Legal | Artigo |
|----------|-----------|--------|
| Registro de entrada/saída | Execução de política pública | Art. 7º, III |
| Controle de frequência | Cumprimento de obrigação legal | Art. 7º, II |
| Notificação ao responsável | Legítimo interesse (segurança do menor) | Art. 7º, IX |
| Compartilhamento com SEEDF | Execução de política pública | Art. 7º, III |

**Não é necessário consentimento dos pais para a operação básica.**
É necessário, porém, **informar** os pais no ato da matrícula sobre
o sistema, seus dados coletados e seus direitos.

### 2.2 Escolas Privadas

| Operação | Base Legal | Exigência |
|----------|-----------|----------|
| Registro de entrada/saída | Consentimento específico | Termo assinado pelos pais |
| Notificação ao responsável | Consentimento | Incluído no termo |
| Todos os dados do menor | Art. 14 — consentimento parental | Linguagem clara, destacada |

**Consentimento deve ser:**
- Específico para cada finalidade
- Em linguagem simples, sem juridiquês
- Destacado — não pode estar enterrado em contrato geral
- Revogável a qualquer momento
- Registrado com data, hora e identificação do responsável

---

## 3. Inventário de Dados (o que o sistema coleta)

### 3.1 Dados dos Alunos

| Dado | Finalidade | Retenção | Compartilhado com |
|------|-----------|---------|------------------|
| Matrícula (SIGE) | Identificação | 2 anos após desligamento | Escola, SEEDF (agregado) |
| Nome completo | TTS, notificações | 2 anos após desligamento | Escola, Responsável |
| Turma | Organização | 2 anos após desligamento | Escola, SEEDF (agregado) |
| Timestamp de acesso | Finalidade principal | 2 anos letivos | Escola, Responsável, SEEDF (agregado) |
| Tipo de movimentação | Finalidade principal | 2 anos letivos | Escola, Responsável |
| Método de leitura | Auditoria técnica | 2 anos letivos | Escola |

**Dados que NÃO são coletados (e nunca devem ser):**

| Dado | Motivo da proibição |
|------|-------------------|
| Foto do aluno | Exigiria consentimento específico + risco de uso indevido |
| Localização GPS | Monitoramento de menor — proibido sem base legal específica |
| Biometria | Dado sensível (Art. 11 LGPD) — proteção máxima |
| Comportamento em aula | Fora da finalidade do sistema |
| Dados de saúde | Dado sensível (Art. 11 LGPD) |
| Situação socioeconômica | Sem finalidade no controle de acesso |

### 3.2 Dados dos Responsáveis

| Dado | Finalidade | Retenção |
|------|-----------|---------|
| Nome | Identificação do vínculo | 30 dias após desvinculação |
| Telefone | Notificações WhatsApp (futuro) | 30 dias após desvinculação |
| FCM Token | Push notifications | 30 dias após desvinculação |
| Código de vínculo | Autocadastro (uso único) | Excluído após uso |

### 3.3 Dados Administrativos

| Dado | Finalidade | Retenção |
|------|-----------|---------|
| Email institucional (admin) | Autenticação e auditoria | Enquanto durar o vínculo |
| Logs de acesso administrativo | Auditoria imutável | 5 anos (obrigação legal) |
| IP de acesso | Segurança e auditoria | 5 anos |

---

## 4. Controle de Acesso por Perfil

A regra é simples: **cada perfil vê apenas o mínimo necessário
para exercer sua função.**

### ADMIN_ESCOLA (Direção / Coordenação)
- ✅ Todos os alunos da própria escola
- ✅ Histórico completo de acessos da escola
- ✅ Alertas de evasão
- ✅ Relatórios exportáveis
- ✅ Gestão de responsáveis vinculados
- ❌ Dados de outras escolas (isolamento de tenant)
- ❌ Dados individuais para exportação à SEEDF

### PORTEIRO (Quiosque)
- ✅ Nome do aluno (exibido na tela após leitura)
- ✅ Status do QR Code (válido / inválido / revogado)
- ❌ Histórico de acessos de alunos
- ❌ Dados de responsáveis
- ❌ Alertas de evasão
- ❌ Qualquer dado além do necessário para operar o portão

### RESPONSAVEL
- ✅ Histórico do próprio filho
- ✅ Alertas referentes ao próprio filho
- ✅ Próprios dados cadastrais
- ❌ Dados de qualquer outro aluno
- ❌ Dados de turma ou escola
- ❌ Relatórios gerenciais

### SEEDF (Secretaria de Educação)
- ✅ Estatísticas agregadas por escola (sem identificação individual)
- ✅ Taxas de frequência por turma (sem nomes)
- ✅ Indicadores de evasão por região (sem dados pessoais)
- ❌ Nome de qualquer aluno
- ❌ Matrícula individual
- ❌ Timestamp individual de acesso
- ❌ Dados de responsáveis

---

## 5. Compartilhamento com a SEEDF

O acesso da SEEDF é tecnicamente um **compartilhamento de dados com
terceiro** (Art. 39 LGPD), mesmo sendo órgão público.

### Exigências antes de implementar o acesso da SEEDF:

1. **Acordo de Operação de Dados** — documento jurídico entre a escola
   operadora e a SEEDF definindo finalidade, prazo e responsabilidades
2. **Endpoint exclusivo** — a SEEDF nunca usa o mesmo token de acesso
   que coordenadores
3. **Resposta sempre anonimizada** — API retorna apenas agregados
4. **Log de todo acesso** — registrado imutavelmente no Cloudflare R2
5. **Proibição de repasse** — SEEDF não pode compartilhar com terceiros
   sem nova base legal

### Formato da resposta para SEEDF (único formato permitido):

```json
{
  "escola_id": "hash_irreversivel",
  "periodo": "2026-02",
  "turmas": [
    {
      "turma": "3A",
      "total_alunos": 35,
      "presencas_periodo": 28,
      "faltas_periodo": 7,
      "percentual_frequencia": 80.0
    }
  ]
}
```

**Nunca retorne**: nome, matrícula, timestamp individual, dados do responsável.

---

## 6. Direitos dos Titulares (Art. 18 LGPD)

O sistema deve implementar mecanismos para todos os direitos abaixo.
Prazo de resposta: **15 dias úteis** para todas as solicitações.

| Direito | Como solicitar | Como o sistema responde |
|---------|---------------|------------------------|
| **Acesso** | Portal do Titular | Exibe/exporta todos os dados do aluno |
| **Correção** | Portal do Titular | Abre ticket para admin corrigir |
| **Exclusão** | Portal do Titular | Inicia anonimização em 30 dias |
| **Portabilidade** | Portal do Titular | Exporta JSON/CSV com histórico |
| **Informação** | Portal do Titular | Lista quem teve acesso aos dados |
| **Revogação** (privadas) | Portal do Titular | Bloqueia acesso imediatamente |
| **Oposição** | Portal do Titular | Avalia caso a caso com DPO |

### Rota do Portal do Titular:
```
seuapp.com/:slug/portal-titular
→ Autenticação: CPF do responsável + código do aluno
→ Sem necessidade de login Google
→ Disponível 24/7
```

---

## 7. Anonimização — Como Funciona

Quando um aluno é desligado/transferido, os dados **não são deletados
imediatamente** — eles são anonimizados em até 30 dias. Isso preserva
a integridade estatística sem manter dados pessoais.

```
ANTES (dado pessoal):
  matricula:   "20240123"
  nome:        "João Silva Santos"
  turma_id:    "3A-2024"
  timestamp:   "2024-03-15T07:32:00Z"
  tipo:        "ENTRADA"

DEPOIS (dado anonimizado):
  matricula:   "a3f8b2c1..." (hash SHA-256 irreversível)
  nome:        NULL (removido)
  turma_id:    "3A-2024" (mantido — dado agregado)
  timestamp:   "2024-03-15T07:32:00Z" (mantido — dado de frequência)
  tipo:        "ENTRADA" (mantido — dado estatístico)
```

O hash da matrícula permite manter consistência estatística sem
permitir identificação do aluno.

---

## 8. Logs de Auditoria — Imutáveis por Lei

Todo acesso administrativo a dados de alunos **deve gerar log**.
Logs são armazenados no **Cloudflare R2 com write-once policy** —
não podem ser editados, sobrescritos ou deletados.

### Ações que obrigatoriamente geram log:

```
- Visualizar histórico de qualquer aluno
- Exportar relatório com dados individuais
- Alterar dados cadastrais de aluno
- Visualizar dados de responsável
- Qualquer acesso da SEEDF
- Tentativas de acesso negadas (com motivo)
- Ativação/desativação de QR Code
- Processo de anonimização iniciado
- Solicitação de direitos pelo titular
```

### Retenção dos logs: **5 anos** (obrigação legal para órgão público)

---

## 9. Incidente de Segurança — Protocolo

Se dados de menores forem expostos ou acessados sem autorização:

### Cronograma obrigatório:

| Prazo | Ação |
|-------|------|
| 0–2h | Isolar o incidente, bloquear acesso comprometido |
| 2–24h | Avaliar extensão — quantos alunos afetados, quais dados |
| 24–72h | **Notificar a ANPD** (Art. 48 LGPD — prazo legal) |
| 72h–7 dias | Notificar responsáveis pelos alunos afetados |
| 30 dias | Relatório completo do incidente para ANPD |

### Notificação à ANPD deve conter:
- Natureza dos dados afetados
- Quantidade de titulares afetados
- Medidas tomadas para contenção
- Riscos para os titulares
- Medidas adotadas para evitar recorrência

### Template de notificação: `docs/incidente-anpd.md`

---

## 10. Responsabilidades por Papel

| Papel | Responsabilidade |
|-------|----------------|
| **Desenvolvedor** | Implementar os controles técnicos deste documento |
| **Admin da escola** | Garantir que apenas pessoas autorizadas têm acesso |
| **DPO (SEEDF)** | Responder solicitações de titulares, notificar ANPD |
| **Direção escolar** | Informar pais sobre o sistema no ato da matrícula |
| **Porteiro** | Não fotografar, gravar ou compartilhar dados da tela |

---

## 11. Pendências que Exigem Ação Humana
### (não podem ser resolvidas só com código)

```
⚠️  RIPD — A SEEDF deve elaborar o Relatório de Impacto à Proteção
    de Dados antes do deploy em larga escala. Exigência da ANPD para
    sistemas de monitoramento de menores.

⚠️  DPO — A SEEDF deve indicar formalmente o Encarregado de Dados
    (Data Protection Officer) conforme Art. 41 da LGPD.

⚠️  Aviso aos pais — A escola deve incluir informação sobre o SCAE
    no processo de matrícula (ficha de matrícula ou termo informativo).

⚠️  Acordo SEEDF — Antes de dar acesso à Secretaria, formalizar
    o Acordo de Operação de Dados com a Procuradoria-Geral do DF.

⚠️  Escolas privadas — Criar e validar juridicamente o Termo de
    Consentimento Parental específico para o SCAE antes de qualquer
    implantação em escola privada.
```

---

## 12. Referências Legais

- **Lei 13.709/2018** — Lei Geral de Proteção de Dados (LGPD)
  - Art. 7º — bases legais para tratamento
  - Art. 11 — dados sensíveis
  - Art. 14 — dados de crianças e adolescentes
  - Art. 18 — direitos dos titulares
  - Art. 33 — transferência internacional
  - Art. 39 — compartilhamento com terceiros
  - Art. 41 — encarregado (DPO)
  - Art. 48 — comunicação de incidente
- **Lei 8.069/1990** — Estatuto da Criança e do Adolescente (ECA)
  - Art. 17 — direito à privacidade e imagem
  - Art. 70 — dever de prevenção
- **Resolução CD/ANPD nº 2/2022** — RIPD para sistemas de monitoramento
- **Resolução CD/ANPD nº 4/2023** — comunicação de incidentes

---

*SCAE v3.0 — GNU AGPL v3.0 — Atualizado: Fevereiro de 2026*
*Este documento deve ser revisado a cada nova versão do sistema
ou quando houver mudança na legislação aplicável.*