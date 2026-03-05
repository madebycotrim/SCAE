import { usarEscolaOpcional } from '@escola/ProvedorEscola';
import { AMBIENTE } from '@configuracoes/ambiente';

interface BaseLegal {
    titulo: string;
    descricao: string;
}

export interface ConteudoLegal {
    basesLegais: BaseLegal[];
    prazoRetencaoRegistros: string;
    prazoRetencaoAuditoria: string;
    nomeFornecedor: string;
    caraterUso: string;
    exigeConsentimento: boolean;
    nomeEncarregadoDPO: string;
    emailEncarregadoDPO: string;
    foro: string;
    dataUltimaRevisao: string;
}

export function usarConteudoLegal(): ConteudoLegal {
    const escola = usarEscolaOpcional();

    const tipoEscola = escola?.tipoEscola || 'publica';
    const foro = escola?.foro;
    const nomeDPO = escola?.nomeDPO;
    const emailDPO = escola?.emailDPO;

    const ehEscolaPrivada = tipoEscola === 'privada';

    const basesLegais: BaseLegal[] = [
        {
            titulo: 'Execução de Políticas Públicas (Art. 7º, III)',
            descricao: 'Tratamento de dados estritamente necessário para garantir a prestação do serviço público de educação e a segurança no ambiente escolar.'
        },
        {
            titulo: 'Obrigação Legal ou Regulatória (Art. 7º, II)',
            descricao: 'Para manutenção de diários de classe, controle de evasão escolar e reporte de frequência às secretarias competentes do Governo.'
        },
        {
            titulo: 'Proteção de Crianças e Adolescentes (Art. 14)',
            descricao: 'O tratamento de dados pessoais de crianças e adolescentes será realizado em seu melhor interesse e com a finalidade de proteção à sua integridade no ambiente escolar.'
        }
    ];

    return {
        prazoRetencaoRegistros: '2 anos letivos após o evento',
        prazoRetencaoAuditoria: '5 anos',
        basesLegais,
        nomeFornecedor: AMBIENTE.nomeFornecedor,
        caraterUso: 'temporário, não exclusivo e intransferível, nos termos do contrato firmado entre as partes',
        exigeConsentimento: false,
        nomeEncarregadoDPO: nomeDPO || import.meta.env.VITE_DPO_NOME || 'Encarregado de Dados (DPO)',
        emailEncarregadoDPO: emailDPO || import.meta.env.VITE_DPO_EMAIL || '',
        foro: foro || 'Brasília/DF',
        dataUltimaRevisao: '05 de Março de 2026'
    };
}

