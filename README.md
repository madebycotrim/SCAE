# 🏫 SCAE - Sistema de Controle de Acesso Escolar

**Versão:** 2.5 (Estável)  
**Instituição:** CEM 03 de Taguatinga - SEEDF

---

## 📖 Sobre o Projeto

O **SCAE** é um sistema de controle de acesso de alta disponibilidade, projetado para operar em ambientes escolares com ou sem conexão à internet. Ele utiliza QR Codes assinados digitalmente para registrar a entrada e saída de alunos, garantindo segurança e agilidade.

### 🚀 Principais Funcionalidades (v2.5)

*   **Offline-First:** Funciona sem internet e sincroniza quando conectado.
*   **Alta Performance:** Leitura instantânea via Câmera ou Leitor USB/Bluetooth (WebHID).
*   **Segurança:** Assinatura Digital HMAC e Validação Visual (Cor do Dia).
*   **Gestão de Emergência:** Geração de Lista de Evacuação com um clique.
*   **Integração:** Importação de dados do SIGE/SEEDF via planilha.

---

## 📚 Documentação

Para detalhes completos sobre o funcionamento, arquitetura e regras de negócio, consulte:

1.  [📘 Documentação Institucional (Regras e Escopo)](./DOCUMENTACAO.md)
2.  [🛠️ Documentação Técnica (Arquitetura e Instalação)](./DOCUMENTACAO_TECNICA.md)

---

## 🛠️ Como Iniciar

```bash
# Instalar dependências
npm install

# Iniciar servidor de desenvolvimento (com emulação Cloudflare)
npm run dev

# Deploy (Produção)
npm run deploy
```

---

**Desenvolvido para a Secretaria de Educação do Distrito Federal.**
