/**
 * functions/_middleware.ts
 * Blindagem Global contra erros 502 e Bloqueios de CORS.
 */
export async function onRequest(context) {
  const { request, next } = context;
  
  // 1. Intercepta Preflight do Navegador (Crucial para evitar erro de CORS)
  if (request.method === "OPTIONS") {
    return new Response(null, {
      status: 204,
      headers: {
        "Access-Control-Allow-Origin": "*",
        "Access-Control-Allow-Methods": "GET, POST, OPTIONS, DELETE, PATCH",
        "Access-Control-Allow-Headers": "Content-Type, Authorization, X-Escola-ID, X-Agente-Token, x-admin-pin, X-Admin-Pin",
        "Access-Control-Max-Age": "86400",
      },
    });
  }

  try {
    const resposta = await next();
    
    // 2. Injeta headers de CORS em todas as respostas de sucesso
    const novaResposta = new Response(resposta.body, resposta);
    novaResposta.headers.set("Access-Control-Allow-Origin", "*");
    novaResposta.headers.set("Access-Control-Allow-Methods", "GET, POST, OPTIONS, DELETE, PATCH");
    novaResposta.headers.set("Access-Control-Allow-Headers", "Content-Type, Authorization, X-Escola-ID, X-Agente-Token, x-admin-pin, X-Admin-Pin");
    
    return novaResposta;
  } catch (e: any) {
    // 3. CAPTURA DE QUEDA (Antifragilidade): Evita o erro 502/Bad Gateway
    console.error("[Middleware Erro]", e.message);
    return new Response(JSON.stringify({
      ok: false,
      erro: "Erro Crítico no Servidor de Funções",
      detalhe: e.message,
      ajuda: "Verifique os logs do Wrangler ou se o banco D1 está ativo."
    }), {
      status: 500,
      headers: {
        "Content-Type": "application/json",
        "Access-Control-Allow-Origin": "*"
      }
    });
  }
}
