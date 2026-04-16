import { criarRegistrador } from '@/compartilhado/utils/registrarLocal';
import { api } from '@/compartilhado/servicos/api';

const log = criarRegistrador('ControleAcesso:Validador');

/**
 * Utilitários para validação de QR Code usando ECDSA P-256.
 */

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
        const rota = `/seguranca/chave-publica?escola_id=${escolaId}`;
        const urlFull = `${import.meta.env.VITE_API_URL || '/api'}${rota}`;
        const respostaCache = await cache.match(urlFull);

        if (respostaCache) {
            const data = await respostaCache.json();
            const b64 = (data && typeof data === 'object' && 'dados' in data) ? data.dados.chave_publica : data.chave_publica;
            return await importarSPKI(b64);
        }

        // api.obter já descompacta o campo 'dados' se existir no backbone
        const data: any = await api.obter(rota);
        const b64 = (data && typeof data === 'object' && 'chave_publica' in data) ? data.chave_publica : data;
        
        if (!b64) throw new Error('Chave pública não encontrada na resposta');

        // Salvar no cache para uso offline (precisa ser o objeto completo para o parser acima funcionar no cache.match)
        const respostaClone = new Response(JSON.stringify({ dados: data }));
        await cache.put(urlFull, respostaClone);

        return await importarSPKI(b64);
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

