import { api } from '@/compartilhado/servicos/api';
import { Registrador } from '@/compartilhado/servicos/auditoria';
import { criarRegistrador } from '@/compartilhado/utils/registrarLocal';
import type { UsuarioVisualizacao } from '../tipos/usuario.esquema';

const log = criarRegistrador('UsuarioServico');

/**
 * SERVIÇO DE USUÁRIOS (Online-First)
 * Módulo Administrativo: Operações 100% online.
 * O banco local não é mais utilizado para gerenciar usuários.
 */
export const usuarioServico = {
    /**
     * Busca usuários diretamente da API.
     */
    async carregarOnline() {
        try {
            return await api.obter<UsuarioVisualizacao[]>('/seguranca/usuarios');
        } catch (erro) {
            log.error('Erro ao buscar usuários online', erro);
            throw erro;
        }
    },

    /**
     * Salva ou convida um usuário diretamente no servidor.
     */
    async salvarUsuario(dados: UsuarioVisualizacao, ehEdicao: boolean, usuarioAnterior?: UsuarioVisualizacao): Promise<void> {
        const usuarioNovo = {
            ...dados,
            atualizado_em: new Date().toISOString(),
            sincronizado: 1
        };

        if (!navigator.onLine) {
            throw new Error('Sem conexão com a internet. A gestão de acesso requer conexão ativa.');
        }

        try {
            // POST para a coleção (backend usa ON CONFLICT DO UPDATE)
            await api.enviar('/seguranca/usuarios', usuarioNovo);
            
            // Auditoria
            await Registrador.registrar(
                ehEdicao ? 'USUARIO_EDITAR' : 'USUARIO_CONVIDAR', 
                'usuario', 
                usuarioNovo.email, 
                { ...usuarioNovo, via: 'online_admin' },
                ehEdicao ? { ...usuarioAnterior } : undefined
            );
            
            log.info('Usuário processado online com sucesso');
        } catch (erro) {
            log.error('Falha ao salvar usuário no servidor', erro);
            throw erro;
        }
    },

    /**
     * Altera o status (ativo/inativo) diretamente no servidor.
     */
    async toggleStatus(user: UsuarioVisualizacao): Promise<void> {
        const novoStatus = !user.ativo;

        if (!navigator.onLine) {
            throw new Error('Sem conexão. Não é possível alterar o status de acesso offline.');
        }

        try {
            await api.atualizar('/seguranca/usuarios', { email: user.email, ativo: novoStatus });
            
            const acao = novoStatus ? 'USUARIO_LIBERAR' : 'USUARIO_BLOQUEAR';
            await Registrador.registrar(acao, 'usuario', user.email, { via: 'online_admin' });
            
            log.info('Status do usuário atualizado online');
        } catch (erro) {
            log.error('Falha ao atualizar status online', erro);
            throw erro;
        }
    },

    /**
     * Exclui um usuário diretamente no servidor.
     */
    async excluirUsuario(email: string): Promise<void> {
        if (!navigator.onLine) {
            throw new Error('Sem conexão. A exclusão de acesso requer conexão ativa.');
        }

        try {
            await api.remover(`/seguranca/usuarios?email=${email}`);
            await Registrador.registrar('USUARIO_EXCLUIR', 'usuario', email, { status: 'online_admin' });
            log.info('Usuário removido com sucesso do servidor');
        } catch (erro) {
            log.error('Falha ao remover usuário online', erro);
            throw erro;
        }
    }
};
