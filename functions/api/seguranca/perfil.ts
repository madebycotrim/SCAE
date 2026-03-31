import type { ContextoCatraki } from '../../tipos/ambiente';
import { ErroBase, ErroInterno, ErroNaoEncontrado } from '../erros';
import { EMAIL_ROOT } from '../_seguranca';

export async function onRequestGet(contexto: ContextoCatraki): Promise<Response> {
    try {
        const usuarioBD = contexto.data.usuarioCatraki;
        const dadosToken = contexto.data.user;

        // 🛡️ BYPASS ADMIN GLOBAL: Se for o desenvolvedor raiz, sempre retorna perfil full
        if (dadosToken?.email === EMAIL_ROOT) {
            return Response.json({
                dados: {
                    email: dadosToken.email,
                    nome_completo: 'Administrador Principal (Root)',
                    papel: 'CENTRAL',
                    ativo: true,
                    pendente: false
                }
            });
        }

        if (!usuarioBD) {
            throw new ErroNaoEncontrado('Usuário não localizado no sistema.');
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
