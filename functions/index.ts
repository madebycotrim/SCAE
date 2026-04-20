import { ContextoCatraki } from './tipos/ambiente';

export async function onRequest(contexto: ContextoCatraki) {
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
