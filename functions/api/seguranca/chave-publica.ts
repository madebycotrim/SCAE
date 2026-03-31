import type { ContextoCatraki } from '../../tipos/ambiente';
import { ServicoCache } from '../utilitarios/cache';
import { ErroValidacao, ErroNaoEncontrado } from '../erros';

/**
 * Endpoint para fornecer a Chave Pública ECDSA P-256 da escola.
 * Utilizado pelos tablets/quiosques para validar assinaturas de QR Code offline.
 */
export async function onRequestGet(contexto: ContextoCatraki): Promise<Response> {
    const url = new URL(contexto.request.url);
    const escolaId = url.searchParams.get('escola_id');

    if (!escolaId) {
        throw new ErroValidacao('ID da escola é obrigatório para obter a chave pública.');
    }

    try {
        // Busca do cache (KV) ou Banco de Dados (D1)
        const chavePublicaB64 = await ServicoCache.buscarPubKey(escolaId, contexto.env);

        if (!chavePublicaB64) {
            throw new ErroNaoEncontrado('Chave pública não encontrada para esta instituição.');
        }

        // Retornamos em formato standard SPKI (Base64) e também JWK para facilitar o Frontend
        // Para simplificar e manter compatibilidade com validarQR.ts, vamos converter b64 SPKI para JWK se necessário,
        // ou apenas retornar o b64 e deixar o frontend importar via 'spki'.
        
        return Response.json({
            dados: {
                escola_id: escolaId,
                chave_publica: chavePublicaB64,
                algoritmo: 'ECDSA-P256-SHA256',
                formato: 'spki'
            },
            mensagem: 'Chave pública institucional carregada com sucesso.'
        }, {
            headers: {
                'Cache-Control': 'public, max-age=86400' // Cache por 24h
            }
        });

    } catch (erro) {
        console.error('Erro ao buscar chave pública:', erro);
        return Response.json({ erro: 'Falha ao recuperar chave de segurança.' }, { status: 500 });
    }
}
