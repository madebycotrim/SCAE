import type { ContextoCatraki } from '../../tipos/ambiente';
import { ErroBase, ErroValidacao, ErroNaoEncontrado, ErroInterno } from '../erros';
import { ServicoCache } from '../utilitarios/cache';

export async function onRequestGet(contexto: ContextoCatraki): Promise<Response> {
    try {
        const url = new URL(contexto.request.url);
        const slug = url.searchParams.get('slug');

        if (!slug) {
            throw new ErroValidacao('Slug da escola ausente');
        }

        try {
            // 1. Resolver ID pelo Slug usando Cache (KV)
            const idEscola = await ServicoCache.buscarIdPorSlug(slug, contexto.env);

            if (!idEscola) {
                throw new ErroNaoEncontrado('Escola não encontrada para este slug');
            }

            // 2. Buscar Branding/Configurações no KV
            const configs = await ServicoCache.buscarConfiguracoes(idEscola, contexto.env);

            if (!configs) {
                throw new ErroNaoEncontrado('Configurações da escola não encontradas');
            }

            // 3. Obter Cor do Dia sincronizada via KV
            const corDoDia = await ServicoCache.obterCorSincronizada(idEscola, contexto.env);

            // 4. Buscar Feature Flags
            const features = await ServicoCache.buscarFeatureFlags(idEscola, contexto.env);

            // 5. Buscar Chave Pública para o Tablet
            const pubKey = await ServicoCache.buscarPubKey(idEscola, contexto.env);

            return Response.json({
                dados: {
                    ...configs,
                    corDoDia,
                    features,
                    pubKey
                },
                mensagem: 'Perfil da escola carregado'
            }, {
                headers: {
                    'Cache-Control': 'public, max-age=3600',
                    'X-SCAE-Cache': 'HIT',
                    'Content-Type': 'application/json'
                }
            });
        } catch (cacheError) {
            if (cacheError instanceof ErroBase) throw cacheError;
            throw new ErroInterno(`Falha ao buscar configurações da escola: ${cacheError instanceof Error ? cacheError.message : 'Erro desconhecido'}`);
        }
    } catch (erro) {
        if (erro instanceof ErroBase) {
            return Response.json(erro.toJSON(), { status: erro.status, headers: { 'Content-Type': 'application/json' } });
        }
        const erroInterno = new ErroInterno(erro instanceof Error ? erro.message : 'Erro ao buscar perfil da escola');
        return Response.json(erroInterno.toJSON(), { status: 500, headers: { 'Content-Type': 'application/json' } });
    }
}
