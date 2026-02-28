import { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { criarRegistrador } from '@compartilhado/utils/registrarLocal';

const log = criarRegistrador('Notificacoes');

export interface Notificacao {
    id: string;
    titulo: string;
    mensagem: string;
    tipo: string;
    link: string | null;
    lida: boolean;
    timestamp: string;
}

interface ContextoNotificacoesType {
    notificacoes: Notificacao[];
    naoLidas: number;
    adicionarNotificacao: (dados: string | Partial<Notificacao>) => void;
    marcarComoLida: (id: string) => void;
    marcarTodasComoLidas: () => void;
    removerNotificacao: (id: string) => void;
    limparTodas: () => void;
}

const ContextoNotificacoes = createContext<ContextoNotificacoesType | undefined>(undefined);

export function ProvedorNotificacoes({ children }: { children: ReactNode }) {
    const [notificacoes, definirNotificacoes] = useState<Notificacao[]>([]);
    const [naoLidas, definirNaoLidas] = useState(0);

    // Carregar notificaÃ§Ãµes do localStorage ao iniciar
    useEffect(() => {
        const salvas = localStorage.getItem('notificacoes');
        if (salvas) {
            try {
                const parsed = JSON.parse(salvas);
                definirNotificacoes(parsed);
            } catch (e) {
                log.error('Erro ao carregar notificaÃ§Ãµes', e);
            }
        }
    }, []);

    // Atualizar contador e salvar
    useEffect(() => {
        const count = notificacoes.filter(n => !n.lida).length;
        definirNaoLidas(count);
        localStorage.setItem('notificacoes', JSON.stringify(notificacoes));
    }, [notificacoes]);

    const adicionarNotificacao = (dados: string | Partial<Notificacao>) => {
        // Suporta string simples ou objeto
        const conteudo = typeof dados === 'string' ? { titulo: 'Novo Aviso', mensagem: dados } : dados;

        const nova = {
            id: crypto.randomUUID(),
            titulo: conteudo.titulo || 'NotificaÃ§Ã£o',
            mensagem: conteudo.mensagem || '',
            tipo: conteudo.tipo || 'info', // info, success, warning, error
            link: conteudo.link || null,
            lida: false,
            timestamp: new Date().toISOString()
        };

        definirNotificacoes(prev => [nova, ...prev]);

        // Tocar som suave se desejar (opcional)
    };

    const marcarComoLida = (id: string) => {
        definirNotificacoes(prev => prev.map(n =>
            n.id === id ? { ...n, lida: true } : n
        ));
    };

    const marcarTodasComoLidas = () => {
        definirNotificacoes(prev => prev.map(n => ({ ...n, lida: true })));
    };

    const removerNotificacao = (id: string) => {
        definirNotificacoes(prev => prev.filter(n => n.id !== id));
    };

    const limparTodas = () => {
        definirNotificacoes([]);
    };

    const value = {
        notificacoes,
        naoLidas,
        adicionarNotificacao,
        marcarComoLida,
        marcarTodasComoLidas,
        removerNotificacao,
        limparTodas
    };

    return (
        <ContextoNotificacoes.Provider value={value}>
            {children}
        </ContextoNotificacoes.Provider>
    );
}

export function useNotificacoes() {
    const context = useContext(ContextoNotificacoes);
    if (!context) {
        throw new Error('useNotificacoes deve ser usado dentro de um ProvedorNotificacoes');
    }
    return context;
}
