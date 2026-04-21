import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { agenteServico, EstadoAgenteLocal } from '../servicos/agente.servico';

interface ContextoAgenteTipo {
    agente: EstadoAgenteLocal;
    online: boolean;
    carregando: boolean;
    forcarVerificacao: () => Promise<boolean>;
}

const ContextoAgente = createContext<ContextoAgenteTipo | undefined>(undefined);

/**
 * Provedor que centraliza a saúde do Agente Local (Edge Agent).
 * Evita múltiplas requisições paralelas e erros duplicados no console.
 */
export const ProvedorAgente = ({ children }: { children: ReactNode }) => {
    const [estado, setEstado] = useState<EstadoAgenteLocal>({ online: false });
    const [carregando, setCarregando] = useState(true);

    const verificar = async () => {
        try {
            const status = await agenteServico.verificarSaude();
            setEstado(status);
            return status.online;
        } catch {
            setEstado({ online: false });
            return false;
        } finally {
            setCarregando(false);
        }
    };

    useEffect(() => {
        let timer: NodeJS.Timeout;

        const loop = async () => {
            const estaOnline = await verificar();
            
            // Se estiver offline, esperamos 5s (ajuda o Chrome a agrupar o erro x1, x2...)
            // Se estiver online, checamos a cada 3s para manter o radar vivo
            const proximoIntervalo = estaOnline ? 3000 : 5000;
            
            timer = setTimeout(loop, proximoIntervalo);
        };

        loop();
        return () => clearTimeout(timer);
    }, []); // Loop auto-gerenciado

    return (
        <ContextoAgente.Provider value={{ 
            agente: estado, 
            online: estado.online, 
            carregando,
            forcarVerificacao: verificar 
        }}>
            {children}
        </ContextoAgente.Provider>
    );
};

export const usarAgente = () => {
    const contexto = useContext(ContextoAgente);
    if (!contexto) {
        throw new Error('usarAgente deve ser usado dentro de um ProvedorAgente');
    }
    return contexto;
};
