import { useState, useEffect } from 'react';
import { TIPO_ACESSO } from '../types/portaria.tipos';

/**
 * Hook para determinar o tipo de acesso (Entrada/Saída) baseado no horário.
 * Regra:
 * 06:00 - 13:00 -> ENTRADA
 * 13:01 - 22:00 -> SAIDA
 * Outros -> INDEFINIDO
 */
export function useTipoAcesso() {
    const [tipo, setTipo] = useState<string>(TIPO_ACESSO.INDEFINIDO);

    useEffect(() => {
        const atualizarTipo = () => {
            const agora = new Date();
            const hora = agora.getHours();

            if (hora >= 6 && hora < 13) {
                setTipo(TIPO_ACESSO.ENTRADA);
            } else if (hora >= 13 && hora < 22) {
                setTipo(TIPO_ACESSO.SAIDA);
            } else {
                setTipo(TIPO_ACESSO.INDEFINIDO);
            }
        };

        atualizarTipo();
        const intervalo = setInterval(atualizarTipo, 60000);
        return () => clearInterval(intervalo);
    }, []);

    return tipo;
}
