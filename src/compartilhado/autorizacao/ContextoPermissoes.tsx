import { createContext, useContext, useEffect, useState, ReactNode } from 'react';
import { useAutenticacao } from '@compartilhado/autenticacao/ContextoAutenticacao';
import { bancoLocal } from '@compartilhado/servicos/bancoLocal';
import { api } from '@compartilhado/servicos/api';
import { EMAIL_ADMIN_RAIZ } from '@compartilhado/constantes/configuracao';
import { criarRegistrador } from '@compartilhado/utils/registrarLocal';

const log = criarRegistrador('Permissoes');

export interface UsuarioPermissoes {
    email: string;
    nome_completo: string;
    papel: string;
    ativo: boolean;
    pendente?: boolean;
    criado_por?: string;
    criado_em?: string;
    atualizado_em?: string;
}

interface PermissoesContextType {
    usuario: UsuarioPermissoes | null;
    papel?: string;
    carregando: boolean;
    pode: (acao: string, recurso: string) => boolean;
    podeAcessar: (acao: string, recurso: string) => boolean;
    temPapel: (papel: string) => boolean;
    temAlgumPapel: (papeis: string[]) => boolean;
    ehAdmin: boolean;
    ehCoordenacao: boolean;
    ehSecretaria: boolean;
    ehPortaria: boolean;
    ehVisualizacao: boolean;
    podeGerenciarAlunos: boolean;
    podeGerenciarTurmas: boolean;
    podeVerRelatorios: boolean;
    podeVerLogs: boolean;
}

const ContextoPermissoes = createContext<PermissoesContextType | undefined>(undefined);

// Matriz de PermissÃµes por Papel
const MATRIZ_PERMISSOES: Record<string, Record<string, Record<string, boolean>>> = {
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

export function ProvedorPermissoes({ children }: { children: ReactNode }) {
    const { usuarioAtual } = useAutenticacao();
    const [usuario, definirUsuario] = useState<UsuarioPermissoes | null>(null);
    const [carregando, definirCarregando] = useState(true);

    useEffect(() => {
        async function carregarUsuario() {
            if (!usuarioAtual) {
                definirUsuario(null);
                definirCarregando(false);
                return;
            }

            try {
                // Buscar usuÃ¡rio do banco local
                const banco = await bancoLocal.iniciarBanco();
                const usuarioBD = await banco.get('usuarios', usuarioAtual.email);

                if (usuarioBD) {
                    definirUsuario(usuarioBD);
                } else {
                    // UsuÃ¡rio nÃ£o cadastrado - APENAS EMAIL_ADMIN_RAIZ Ã© ADMIN
                    if (usuarioAtual.email === EMAIL_ADMIN_RAIZ) {
                        log.info(`Admin principal detectado: ${usuarioAtual.email}`);
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
                                    log.info('Admin sincronizado com sucesso.');
                                } catch (e) {
                                    log.warn('Falha ao sincronizar admin (serÃ¡ tentado depois)', e);
                                }
                            }
                        } catch (e) {
                            log.error('Erro ao salvar admin', e);
                        }
                    } else {
                        // Cadastro AutomÃ¡tico com permissÃ£o mÃ­nima (VISUALIZAÃ‡ÃƒO)
                        log.info(`Novo usuÃ¡rio detectado, registrando com VISUALIZAÃ‡ÃƒO: ${usuarioAtual.email}`);

                        const novoUsuario = {
                            email: usuarioAtual.email,
                            nome_completo: usuarioAtual.displayName || usuarioAtual.email,
                            papel: 'VISUALIZACAO',
                            ativo: true,
                            pendente: true, // Novo usuÃ¡rio comeÃ§a pendente
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
                                // Import dinÃ¢mico ou usar a api se jÃ¡ importada (vou adicionar o import no topo)
                                await api.enviar('/usuarios', novoUsuario);
                            }
                        } catch (e) {
                            log.error('Erro ao registrar novo usuÃ¡rio automaticamente', e);
                        }
                    }
                }
            } catch (erro) {
                log.error('Erro ao carregar permissÃµes do usuÃ¡rio', erro);
                // Fallback seguro: sem permissÃµes
                definirUsuario(null);
            } finally {
                definirCarregando(false);
            }
        }

        carregarUsuario();
    }, [usuarioAtual]);

    /**
     * Verifica se o usuÃ¡rio possui uma permissÃ£o especÃ­fica
     * @param {string} acao - AÃ§Ã£o a verificar (ex: 'editar')
     * @param {string} recurso - Recurso (ex: 'alunos')
     * @returns {boolean}
     */
    const pode = (acao: string, recurso: string): boolean => {
        // BYPASS: EMAIL_ADMIN_RAIZ tem acesso total sempre
        if (usuarioAtual?.email === EMAIL_ADMIN_RAIZ) {
            return true;
        }

        if (!usuario || !usuario.ativo) return false;

        const permissoesRecurso = MATRIZ_PERMISSOES[usuario.papel]?.[recurso];
        if (!permissoesRecurso) return false;

        return permissoesRecurso[acao] === true;
    };

    /**
     * Verifica se o usuÃ¡rio tem papel especÃ­fico
     * @param {string} papel - Papel a verificar
     * @returns {boolean}
     */
    const temPapel = (papel: string): boolean => {
        return usuario?.papel === papel;
    };

    /**
     * Verifica se o usuÃ¡rio tem pelo menos um dos papÃ©is fornecidos
     * @param {string[]} papeis - Array de papÃ©is
     * @returns {boolean}
     */
    const temAlgumPapel = (papeis: string[]): boolean => {
        if (!usuario) return false;
        return papeis.includes(usuario.papel);
    };

    const value = {
        usuario,
        papel: usuario?.papel,
        carregando,
        pode,
        podeAcessar: pode, // Alias para compatibilidade
        temPapel,
        temAlgumPapel,

        // Atalhos Ãºteis
        ehAdmin: usuario?.papel === 'ADMIN',
        ehCoordenacao: usuario?.papel === 'COORDENACAO',
        ehSecretaria: usuario?.papel === 'SECRETARIA',
        ehPortaria: usuario?.papel === 'PORTARIA',
        ehVisualizacao: usuario?.papel === 'VISUALIZACAO',

        // PermissÃµes compostas comuns
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

// Hook para usar permissÃµes
export function usePermissoes() {
    const contexto = useContext(ContextoPermissoes);

    if (!contexto) {
        throw new Error('usePermissoes deve ser usado dentro de ProvedorPermissoes');
    }

    return contexto;
}

export default ContextoPermissoes;
