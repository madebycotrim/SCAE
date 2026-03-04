import { createContext, useContext, useState, useEffect, ReactNode, useCallback } from 'react';
import { criarRegistrador } from '@compartilhado/utils/registrarLocal';
import { usarAutenticacao } from '@compartilhado/autenticacao/ContextoAutenticacao';
import toast from 'react-hot-toast';

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
    const { usuarioAtual } = usarAutenticacao();
    const [notificacoes, definirNotificacoes] = useState<Notificacao[]>([]);
    const [naoLidas, definirNaoLidas] = useState(0);

    // Chave única por usuário para não misturar notificações no mesmo PC
    const chaveStorage = usuarioAtual?.email
        ? `notificacoes_${usuarioAtual.email}`
        : 'notificacoes_visitante';

    // Carregar notificações do localStorage ao iniciar ou mudar de usuário
    useEffect(() => {
        const salvas = localStorage.getItem(chaveStorage);
        if (salvas) {
            try {
                const parsed = JSON.parse(salvas);
                definirNotificacoes(parsed);
            } catch (e) {
                log.error('Erro ao carregar notificações', e);
                definirNotificacoes([]);
            }
        } else {
            definirNotificacoes([]);
        }
    }, [chaveStorage]);

    // Atualizar contador e salvar
    useEffect(() => {
        const count = notificacoes.filter(n => !n.lida).length;
        definirNaoLidas(count);
        localStorage.setItem(chaveStorage, JSON.stringify(notificacoes));
    }, [notificacoes, chaveStorage]);

    const adicionarNotificacao = useCallback((dados: string | Partial<Notificacao>) => {
        // Suporta string simples ou objeto
        const conteudo = typeof dados === 'string' ? { titulo: 'Novo Aviso', mensagem: dados } : dados;

        const nova = {
            id: crypto.randomUUID(),
            titulo: conteudo.titulo || 'Notificação',
            mensagem: conteudo.mensagem || '',
            tipo: conteudo.tipo || 'info', // info, success, warning, error
            link: conteudo.link || null,
            lida: false,
            timestamp: new Date().toISOString()
        };

        // Adiciona e mantém no máximo as últimas 50 notificações para não pesar o storage
        definirNotificacoes(anterior => {
            const novaLista = [nova, ...anterior];
            if (novaLista.length > 50) return novaLista.slice(0, 50);
            return novaLista;
        });

        // Feedback Visual Imediato via Toast
        if (nova.tipo === 'error') {
            toast.error(nova.titulo);
        } else if (nova.tipo === 'success') {
            toast.success(nova.titulo);
        } else if (nova.tipo === 'warning') {
            toast(nova.titulo, { icon: '⚠️' });
        } else {
            toast(nova.titulo, { icon: 'ℹ️' });
        }
    }, []);

    const marcarComoLida = (id: string) => {
        definirNotificacoes(prev => prev.map(n =>
            n.id === id ? { ...n, lida: true } : n
        ));
    };

    const marcarTodasComoLidas = () => {
        definirNotificacoes(prev => prev.map(n => ({ ...n, lida: true })));
    };

    const removerNotificacao = (id: string) => {
        definirNotificacoes(anterior => anterior.filter
            (n => n.id !== id));
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

export function usarNotificacoes() {
    const context = useContext(ContextoNotificacoes);
    if (!context) {
        throw new Error('usarNotificacoes deve ser usado dentro de um ProvedorNotificacoes');
    }
    return context;
}
