import { criarRegistrador } from '@/compartilhado/utils/registrarLocal';

const log = criarRegistrador('ControleAcesso:Validador');

/**
 * Utilitários para validação de QR Code usando ECDSA P-256.
 */

// Placeholder para chave pública se a API falhar ou estiver offline sem cache
const CP_FALLBACK = "MHYwEAYHKoZIzj0CAQYFK4EEACIDYgAEP7...";

/**
 * Converte b64 SPKI para CryptoKey ECDSA.
 */
async function importarSPKI(b64: string): Promise<CryptoKey> {
    const binary = atob(b64);
    const bytes = new Uint8Array(binary.length);
    for (let i = 0; i < binary.length; i++) {
        bytes[i] = binary.charCodeAt(i);
    }

    return await window.crypto.subtle.importKey(
        'spki',
        bytes.buffer,
        { name: 'ECDSA', namedCurve: 'P-256' },
        true,
        ['verify']
    );
}

export async function obterChavePublica(escolaId: string): Promise<CryptoKey> {
    try {
        const cache = await caches.open('scae-seguranca-v1');
        const url = `/api/seguranca/chave-publica?escola_id=${escolaId}`;
        const respostaCache = await cache.match(url);

        if (respostaCache) {
            const json = await respostaCache.json();
            return await importarSPKI(json.dados.chave_publica);
        }

        const resposta = await fetch(url);
        if (!resposta.ok) throw new Error('Falha ao buscar chave na rede');
        
        const data = await resposta.json();
        
        // Salvar no cache para uso offline
        const respostaClone = new Response(JSON.stringify(data));
        await cache.put(url, respostaClone);

        return await importarSPKI(data.dados.chave_publica);
    } catch (e) {
        log.error('Erro ao obter chave pública institucional', e);
        throw new Error('Segurança Institucional não disponível (Offline/Erro)');
    }
}

export async function verificarAssinaturaECDSA(payload: string, assinaturaB64: string, chavePublica: CryptoKey): Promise<boolean> {
    const encoder = new TextEncoder();
    const data = encoder.encode(payload);

    // Converter B64URL para ArrayBuffer
    const b64 = assinaturaB64.replace(/-/g, '+').replace(/_/g, '/');
    const binaryString = atob(b64);
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

