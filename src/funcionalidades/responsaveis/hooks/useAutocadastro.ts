/**
 * Hook de autocadastro de responsÃ¡veis.
 * Vincula responsÃ¡vel ao aluno via cÃ³digo + dados pessoais.
 */
import { useState } from 'react';
import { responsaveisApi } from '../servicos/responsaveis.api';
import { STATUS_VINCULO, type StatusVinculo, type VinculoAluno } from '../types/responsavel.tipos';

interface RetornoAutocadastro {
    vincular: (codigoAluno: string, nomeResponsavel: string, telefone: string) => Promise<void>;
    status: StatusVinculo;
    erro: string | null;
}

export function useAutocadastro(): RetornoAutocadastro {
    const [status, definirStatus] = useState<StatusVinculo>(STATUS_VINCULO.AGUARDANDO);
    const [erro, definirErro] = useState<string | null>(null);

    async function vincular(codigoAluno: string, nomeResponsavel: string, telefone: string): Promise<void> {
        definirStatus(STATUS_VINCULO.PROCESSANDO);
        definirErro(null);

        try {
            await responsaveisApi.vincular({
                codigoAluno,
                nomeResponsavel,
                telefone,
                fcmToken: null
            } as VinculoAluno);

            definirStatus(STATUS_VINCULO.VINCULADO);
        } catch (e: unknown) {
            const mensagem = e instanceof Error ? e.message : 'CÃ³digo invÃ¡lido. Verifique com a escola.';
            definirErro(mensagem);
            definirStatus(STATUS_VINCULO.ERRO);
        }
    }

    return { vincular, status, erro };
}

