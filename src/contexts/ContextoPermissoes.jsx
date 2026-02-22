import { createContext, useContext, useEffect, useState } from 'react';
import { useAutenticacao } from './ContextoAutenticacao';
import { bancoLocal } from '../servicos/bancoLocal';
import { api } from '../servicos/api';

const ContextoPermissoes = createContext();

// Matriz de Permissões por Papel
const MATRIZ_PERMISSOES = {
    ADMIN: {
        dashboard: { visualizar: true },
        alunos: { visualizar: true, criar: true, editar: true, deletar: true },
        turmas: { visualizar: true, criar: true, editar: true, deletar: true },
        leitor_portaria: { acessar: true },
        relatorios: { visualizar: true, exportar: true },
        alertas_evasao: { visualizar: true },
        usuarios: { visualizar: true, criar: true, editar: true, desativar: true },
        logs_auditoria: { visualizar: true, exportar: true }
    },

    COORDENACAO: {
        dashboard: { visualizar: true },
        alunos: { visualizar: true, criar: false, editar: false, deletar: false },
        turmas: { visualizar: true, criar: false, editar: false, deletar: false },
        leitor_portaria: { acessar: true },
        relatorios: { visualizar: true, exportar: true },
        alertas_evasao: { visualizar: true },
        usuarios: { visualizar: false, criar: false, editar: false, desativar: false },
        logs_auditoria: { visualizar: true, exportar: false }
    },

    SECRETARIA: {
        dashboard: { visualizar: true },
        alunos: { visualizar: true, criar: true, editar: true, deletar: false },
        turmas: { visualizar: true, criar: true, editar: true, deletar: false },
        leitor_portaria: { acessar: true },
        relatorios: { visualizar: true, exportar: true },
        alertas_evasao: { visualizar: false },
        usuarios: { visualizar: false, criar: false, editar: false, desativar: false },
        logs_auditoria: { visualizar: false, exportar: false }
    },

    PORTARIA: {
        dashboard: { visualizar: false },
        alunos: { visualizar: false, criar: false, editar: false, deletar: false },
        turmas: { visualizar: false, criar: false, editar: false, deletar: false },
        leitor_portaria: { acessar: true },
        relatorios: { visualizar: false, exportar: false },
        alertas_evasao: { visualizar: false },
        usuarios: { visualizar: false, criar: false, editar: false, desativar: false },
        logs_auditoria: { visualizar: false, exportar: false }
    },

    VISUALIZACAO: {
        dashboard: { visualizar: true },
        alunos: { visualizar: true, criar: false, editar: false, deletar: false },
        turmas: { visualizar: true, criar: false, editar: false, deletar: false },
        leitor_portaria: { acessar: false },
        relatorios: { visualizar: true, exportar: false },
        alertas_evasao: { visualizar: false },
        usuarios: { visualizar: false, criar: false, editar: false, desativar: false },
        logs_auditoria: { visualizar: false, exportar: false }
    }
};

export function ProvedorPermissoes({ children }) {
    const { usuarioAtual } = useAutenticacao();
    const [usuario, definirUsuario] = useState(null);
    const [carregando, definirCarregando] = useState(true);

    useEffect(() => {
        async function carregarUsuario() {
            if (!usuarioAtual) {
                definirUsuario(null);
                definirCarregando(false);
                return;
            }

            try {
                // Buscar usuário do banco local
                const banco = await bancoLocal.iniciarBanco();
                const usuarioBD = await banco.get('usuarios', usuarioAtual.email);

                if (usuarioBD) {
                    definirUsuario(usuarioBD);
                } else {
                    // Usuário não cadastrado - APENAS madebycotrim@gmail.com é ADMIN
                    if (usuarioAtual.email === 'madebycotrim@gmail.com') {
                        console.log('🔐 Admin principal:', usuarioAtual.email);
                        const adminUser = {
                            email: usuarioAtual.email,
                            nome_completo: 'Administrador Principal',
                            papel: 'ADMIN',
                            ativo: true
                        };
                        definirUsuario(adminUser);

                        // Salvar no banco
                        try {
                            await banco.put('usuarios', {
                                ...adminUser,
                                criado_por: 'system',
                                criado_em: new Date().toISOString(),
                                atualizado_em: new Date().toISOString()
                            });

                            // Tentar sincronizar com API imediatamente
                            if (navigator.onLine) {
                                try {
                                    await api.enviar('/usuarios', adminUser);
                                    console.log('✅ Admin sincronizado com sucesso.');
                                } catch (e) {
                                    console.warn('⚠️ Falha ao sincronizar admin (será tentado depois):', e);
                                }
                            }
                        } catch (e) {
                            console.error('Erro ao salvar admin:', e);
                        }
                    } else {
                        // Cadastro Automático com permissão mínima (VISUALIZAÇÃO)
                        console.log('🆕 Novo usuário detectado, registrando com VISUALIZAÇÃO:', usuarioAtual.email);

                        const novoUsuario = {
                            email: usuarioAtual.email,
                            nome_completo: usuarioAtual.displayName || usuarioAtual.email,
                            papel: 'VISUALIZACAO',
                            ativo: true,
                            pendente: true, // Novo usuário começa pendente
                            criado_por: 'system_auto',
                            criado_em: new Date().toISOString(),
                            atualizado_em: new Date().toISOString()
                        };

                        definirUsuario(novoUsuario);

                        // Salvar no banco local para que o Admin possa ver e editar
                        try {
                            await banco.put('usuarios', novoUsuario);

                            // Tentar sincronizar com API se online
                            if (navigator.onLine) {
                                // Import dinâmico ou usar a api se já importada (vou adicionar o import no topo)
                                await api.enviar('/usuarios', novoUsuario);
                            }
                        } catch (e) {
                            console.error('Erro ao registrar novo usuário automaticamente:', e);
                        }
                    }
                }
            } catch (erro) {
                console.error('Erro ao carregar permissões do usuário:', erro);
                // Fallback seguro: sem permissões
                definirUsuario(null);
            } finally {
                definirCarregando(false);
            }
        }

        carregarUsuario();
    }, [usuarioAtual]);

    /**
     * Verifica se o usuário possui uma permissão específica
     * @param {string} acao - Ação a verificar (ex: 'editar')
     * @param {string} recurso - Recurso (ex: 'alunos')
     * @returns {boolean}
     */
    const pode = (acao, recurso) => {
        // BYPASS: madebycotrim@gmail.com tem acesso total sempre
        if (usuarioAtual?.email === 'madebycotrim@gmail.com') {
            return true;
        }

        if (!usuario || !usuario.ativo) return false;

        const permissoesRecurso = MATRIZ_PERMISSOES[usuario.papel]?.[recurso];
        if (!permissoesRecurso) return false;

        return permissoesRecurso[acao] === true;
    };

    /**
     * Verifica se o usuário tem papel específico
     * @param {string} papel - Papel a verificar
     * @returns {boolean}
     */
    const temPapel = (papel) => {
        return usuario?.papel === papel;
    };

    /**
     * Verifica se o usuário tem pelo menos um dos papéis fornecidos
     * @param {string[]} papeis - Array de papéis
     * @returns {boolean}
     */
    const temAlgumPapel = (papeis) => {
        return papeis.includes(usuario?.papel);
    };

    const value = {
        usuario,
        papel: usuario?.papel,
        carregando,
        pode,
        podeAcessar: pode, // Alias para compatibilidade
        temPapel,
        temAlgumPapel,

        // Atalhos úteis
        ehAdmin: usuario?.papel === 'ADMIN',
        ehCoordenacao: usuario?.papel === 'COORDENACAO',
        ehSecretaria: usuario?.papel === 'SECRETARIA',
        ehPortaria: usuario?.papel === 'PORTARIA',
        ehVisualizacao: usuario?.papel === 'VISUALIZACAO',

        // Permissões compostas comuns
        podeGerenciarAlunos: pode('editar', 'alunos') || pode('criar', 'alunos'),
        podeGerenciarTurmas: pode('editar', 'turmas') || pode('criar', 'turmas'),
        podeVerRelatorios: pode('visualizar', 'relatorios'),
        podeVerLogs: pode('visualizar', 'logs_auditoria')
    };

    return (
        <ContextoPermissoes.Provider value={value}>
            {children}
        </ContextoPermissoes.Provider>
    );
}

// Hook para usar permissões
export function usePermissoes() {
    const contexto = useContext(ContextoPermissoes);

    if (!contexto) {
        throw new Error('usePermissoes deve ser usado dentro de ProvedorPermissoes');
    }

    return contexto;
}

export default ContextoPermissoes;
