import type { ContextoSCAE } from '../../tipos/ambiente';
import { ErroBase, ErroInterno, ErroNaoEncontrado } from '../erros';

export async function onRequestGet(contexto: ContextoSCAE): Promise<Response> {
    try {
        const usuarioBD = contexto.data.usuarioScae;
        const dadosToken = contexto.data.user;

        if (!usuarioBD && !['madebycotrim@gmail.com'].includes(dadosToken?.email || '')) {
            throw new ErroNaoEncontrado('Usuário não localizado no sistema.');
        }

        // Se for o admin raiz e não estiver no BD, retorna um perfil sintético
        if (!usuarioBD && dadosToken?.email === 'madebycotrim@gmail.com') {
            return Response.json({
                dados: {
                    email: dadosToken.email,
                    nome_completo: 'Administrador Principal',
                    papel: 'CENTRAL',
                    ativo: true,
                    pendente: false
                }
            });
        }

        return Response.json({
            dados: usuarioBD,
            mensagem: 'Perfil carregado com sucesso'
        });

    } catch (erro) {
        if (erro instanceof ErroBase) {
            return Response.json(erro.toJSON(), { status: erro.status, headers: { 'Content-Type': 'application/json' } });
        }
        const erroInterno = new ErroInterno('Erro ao carregar perfil');
        return Response.json(erroInterno.toJSON(), { status: 500 });
    }
}
