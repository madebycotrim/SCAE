import type { ContextoSCAE } from '../../tipos/ambiente';
import { ErroValidacao, ErroNaoEncontrado } from '../erros';
import { ServicoCache } from '../utilitarios/cache';

export async function onRequestGet(contexto: ContextoSCAE): Promise<Response> {
    const url = new URL(contexto.request.url);
    const slug = url.searchParams.get('slug');

    if (!slug) {
        throw new ErroValidacao('Slug da escola ausente');
    }

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
            'X-SCAE-Cache': 'HIT'
        }
    });
}
