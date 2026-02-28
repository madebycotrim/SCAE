/**
 * Gerador de UUID v4 para identificadores únicos do SCAE.
 * Usa crypto.randomUUID() nativo do Cloudflare Workers runtime.
 */
export function gerarScaeUuid(): string {
    return crypto.randomUUID();
}
