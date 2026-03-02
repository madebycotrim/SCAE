import { criarRegistrador } from '@compartilhado/utils/registrarLocal';

const log = criarRegistrador('Portaria:Validador');

/**
 * Utilitários para validação de QR Code usando ECDSA P-256.
 */

// Placeholder para chave pública se a API falhar ou estiver offline sem cache
const CP_FALLBACK = "MHYwEAYHKoZIzj0CAQYFK4EEACIDYgAEP7...";

export async function obterChavePublica(): Promise<CryptoKey> {
    try {
        const cache = await caches.open('scae-seguranca-v1');
        const respostaCache = await cache.match('/api/seguranca/chave-publica');

        if (respostaCache) {
            const data = await respostaCache.json();
            return await importarJWK(data.jwk);
        }

        const resposta = await fetch('/api/seguranca/chave-publica');
        const data = await resposta.json();

        // Salvar no cache para uso offline
        const respostaClone = new Response(JSON.stringify(data));
        await cache.put('/api/seguranca/chave-publica', respostaClone);

        return await importarJWK(data.jwk);
    } catch (e) {
        log.error('Erro ao obter chave pública, usando fallback', e);
        // Em produção, o fallback deve ser uma chave válida embutida
        throw new Error('Chave pública não disponível');
    }
}

async function importarJWK(jwk: JsonWebKey): Promise<CryptoKey> {
    return await window.crypto.subtle.importKey(
        'jwk',
        jwk,
        { name: 'ECDSA', namedCurve: 'P-256' },
        true,
        ['verify']
    );
}

export async function verificarAssinaturaECDSA(payload: string, assinaturaB64: string, chavePublica: CryptoKey): Promise<boolean> {
    const encoder = new TextEncoder();
    const data = encoder.encode(payload);

    // Converter B64 para ArrayBuffer
    const binaryString = atob(assinaturaB64);
    const bytes = new Uint8Array(binaryString.length);
    for (let i = 0; i < binaryString.length; i++) {
        bytes[i] = binaryString.charCodeAt(i);
    }

    return await window.crypto.subtle.verify(
        { name: 'ECDSA', hash: { name: 'SHA-256' } },
        chavePublica,
        bytes,
        data
    );
}
