import { ContextoCatraki } from './tipos/ambiente';

export async function onRequest(contexto: ContextoCatraki) {
  const url = new URL(contexto.request.url);
  const hostname = url.hostname;

  // 🛰️ SEPARAÇÃO DE CANAIS
  // Se for o domínio exclusivo de comunicação, mostramos o status da API
  if (hostname === 'agente.catraki.com.br') {
    return new Response(JSON.stringify({
      ok: true,
      sistema: "Catraki SCAE Cloud API",
      status: "online",
      versao: "2.0.0",
      mensagem: "Este é o nó central de comunicação. Os agentes locais se conectam aqui para sincronização."
    }), {
      status: 200,
      headers: {
        "Content-Type": "application/json",
        "Access-Control-Allow-Origin": "*"
      }
    });
  }

  // 🌐 SITE PÚBLICO / DASHBOARD
  // Para catraki.com.br ou outros domínios, servimos o arquivo estático (dist/index.html)
  return contexto.next();
}
