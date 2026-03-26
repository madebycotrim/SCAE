import { createContext, useContext, useEffect, useState, ReactNode } from 'react';
import { usarAutenticacao } from '@/compartilhado/autenticacao/ContextoAutenticacao';
import { criarRegistrador } from '@/compartilhado/utils/registrarLocal';
import { api } from '@/compartilhado/servicos/api';

const EMAIL_RAIZ = 'madebycotrim@gmail.com';
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
    ehCentral: boolean;
    ehAdmin: boolean;
    ehCoordenacao: boolean;
    ehSecretaria: boolean;
    ehPorteiro: boolean;
    ehVisualizacao: boolean;
    podeGerenciarAlunos: boolean;
    podeGerenciarTurmas: boolean;
    podeVerRelatorios: boolean;
    podeVerLogs: boolean;
}

const ContextoPermissoes = createContext<PermissoesContextType | undefined>(undefined);

// 🛡️ Matriz de Permissões (Strict)
const MATRIZ_PERMISSOES: Record<string, Record<string, Record<string, boolean>>> = {
    CENTRAL: {
        dashboard: { visualizar: true },
        alunos: { visualizar: true, criar: true, editar: true, deletar: true },
        turmas: { visualizar: true, criar: true, editar: true, deletar: true },
        terminal_acesso: { acessar: true },
        relatorios: { visualizar: true, exportar: true },
        risco_abandono: { visualizar: true },
        usuarios: { visualizar: true, criar: true, editar: true, desativar: true, deletar: true },
        auditoria: { visualizar: true, exportar: true },
        configuracoes: { visualizar: true, editar: true }
    },

    ADMIN: {
        dashboard: { visualizar: true },
        alunos: { visualizar: true, criar: true, editar: true, deletar: true },
        turmas: { visualizar: true, criar: true, editar: true, deletar: true },
        terminal_acesso: { acessar: true },
        relatorios: { visualizar: true, exportar: true },
        risco_abandono: { visualizar: true },
        usuarios: { visualizar: true, criar: true, editar: true, desativar: true, deletar: true },
        auditoria: { visualizar: true, exportar: true },
        configuracoes: { visualizar: true, editar: true }
    },

    COORDENACAO: {
        dashboard: { visualizar: true },
        alunos: { visualizar: true, criar: true, editar: true, deletar: false },
        turmas: { visualizar: true, criar: true, editar: true, deletar: false },
        terminal_acesso: { acessar: true },
        relatorios: { visualizar: true, exportar: true },
        risco_abandono: { visualizar: true },
        usuarios: { visualizar: false, criar: false, editar: false, desativar: false }, // Escondido!
        auditoria: { visualizar: true, exportar: false }
    },

    SECRETARIA: {
        dashboard: { visualizar: true },
        alunos: { visualizar: true, criar: true, editar: true, deletar: false },
        turmas: { visualizar: true, criar: true, editar: true, deletar: false },
        terminal_acesso: { acessar: true },
        relatorios: { visualizar: true, exportar: true },
        risco_abandono: { visualizar: false },
        usuarios: { visualizar: false, criar: false, editar: false, desativar: false }, // Escondido!
        auditoria: { visualizar: false, exportar: false }
    },

    PORTEIRO: {
        dashboard: { visualizar: false },
        alunos: { visualizar: false, criar: false, editar: false, deletar: false },
        turmas: { visualizar: false, criar: false, editar: false, deletar: false },
        terminal_acesso: { acessar: true },
        relatorios: { visualizar: false, exportar: false },
        risco_abandono: { visualizar: false },
        usuarios: { visualizar: false, criar: false, editar: false, desativar: false },
        auditoria: { visualizar: false, exportar: false }
    },

    VISUALIZACAO: {
        dashboard: { visualizar: true },
        alunos: { visualizar: true, criar: false, editar: false, deletar: false },
        turmas: { visualizar: true, criar: false, editar: false, deletar: false },
        terminal_acesso: { acessar: false },
        relatorios: { visualizar: true, exportar: false },
        risco_abandono: { visualizar: false },
        usuarios: { visualizar: false, criar: false, editar: false, desativar: false },
        auditoria: { visualizar: false, exportar: false }
    }
};

export function ProvedorPermissoes({ children }: { children: ReactNode }) {
    const { usuarioAtual } = usarAutenticacao();
    const [usuario, definirUsuario] = useState<UsuarioPermissoes | null>(null);
    const [carregando, definirCarregando] = useState(true);

    useEffect(() => {
        async function carregarUsuario() {
            if (!usuarioAtual) {
                definirUsuario(null);
                definirCarregando(false);
                return;
            }

            // 🔐 Rotas da Central não têm escola — bypass direto para root
            const ehRotaCentral = window.location.pathname.startsWith('/central');
            if (ehRotaCentral) {
                if (usuarioAtual.email === EMAIL_RAIZ) {
                    definirUsuario({
                        email: usuarioAtual.email,
                        nome_completo: 'Administrador Principal (Root)',
                        papel: 'CENTRAL',
                        ativo: true,
                        pendente: false
                    });
                } else {
                    definirUsuario(null);
                }
                definirCarregando(false);
                return;
            }

            try {
                // 🔐 Online-First: Verifica perfil diretamente no servidor
                // Nota: O serviço de api.ts já faz o unwrap do campo 'dados'
                const usuarioPerfil = await api.obter<UsuarioPermissoes>('/seguranca/perfil');
                
                if (usuarioPerfil) {
                    definirUsuario(usuarioPerfil);
                    log.info(`Permissões carregadas: ${usuarioPerfil.papel}`);
                } else {
                    log.warn(`Usuário autenticado mas não vinculado no sistema: ${usuarioAtual.email}`);
                    definirUsuario(null);
                }
            } catch (erro: unknown) {
                const erroApi = erro as { status?: number; message?: string };
                if (erroApi?.status === 401 || erroApi?.status === 403) {
                    log.error('Acesso negado: Usuário não vinculado ou bloqueado pelo sistema.');
                    definirUsuario(null);
                } else {
                    log.error('Erro ao carregar perfil de segurança', erro instanceof Error ? erro.message : String(erro));
                    definirUsuario(null);
                }
            } finally {
                definirCarregando(false);
            }
        }

        carregarUsuario();
    }, [usuarioAtual]);

    /**
     * Verifica se o usuário possui uma permissão específica
     */
    const pode = (acao: string, recurso: string): boolean => {
        // BYPASS: EMAIL_RAIZ tem acesso total sempre se autenticado
        if (usuarioAtual?.email === EMAIL_RAIZ) return true;

        if (!usuario || !usuario.ativo) return false;

        const permissoesRecurso = MATRIZ_PERMISSOES[usuario.papel]?.[recurso];
        if (!permissoesRecurso) return false;

        return permissoesRecurso[acao] === true;
    };

    const value = {
        usuario,
        papel: usuario?.papel,
        carregando,
        pode,
        podeAcessar: pode,
        temPapel: (papel: string) => usuario?.papel === papel,
        temAlgumPapel: (papeis: string[]) => !!usuario && papeis.includes(usuario.papel),

        ehCentral: usuario?.papel === 'CENTRAL' || usuarioAtual?.email === EMAIL_RAIZ,
        ehAdmin: usuario?.papel === 'ADMIN',
        ehCoordenacao: usuario?.papel === 'COORDENACAO',
        ehSecretaria: usuario?.papel === 'SECRETARIA',
        ehPorteiro: usuario?.papel === 'PORTEIRO',
        ehVisualizacao: usuario?.papel === 'VISUALIZACAO',

        podeGerenciarAlunos: pode('editar', 'alunos') || pode('criar', 'alunos'),
        podeGerenciarTurmas: pode('editar', 'turmas') || pode('criar', 'turmas'),
        podeVerRelatorios: pode('visualizar', 'relatorios'),
        podeVerLogs: pode('visualizar', 'auditoria')
    };

    return (
        <ContextoPermissoes.Provider value={value}>
            {children}
        </ContextoPermissoes.Provider>
    );
}

export function usarPermissoes() {
    const contexto = useContext(ContextoPermissoes);
    if (!contexto) throw new Error('usarPermissoes deve ser usado dentro de ProvedorPermissoes');
    return contexto;
}

export default ContextoPermissoes;
