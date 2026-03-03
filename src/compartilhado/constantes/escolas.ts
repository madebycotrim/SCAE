export interface EscolaSistema {
    id: string; // ID / Banco / Slug
    nome: string;
    slug: string;
    cidade: string;
    status: 'ATIVA' | 'SUSPENSA' | 'PENDENTE';
    criadoEm: string;
    totalAlunos: number;
}

export const ESCOLAS_CADASTRADAS_SISTEMA: EscolaSistema[] = [
    { id: 'cem03-taguatinga', nome: 'CEM 03 Taguatinga', slug: 'cem03-taguatinga', cidade: 'Taguatinga', status: 'ATIVA', criadoEm: '2024-01-15', totalAlunos: 1450 },
    { id: 'cef12-ceilandia', nome: 'CEF 12 Ceilândia', slug: 'cef12-ceilandia', cidade: 'Ceilândia', status: 'ATIVA', criadoEm: '2024-03-22', totalAlunos: 2100 },
    { id: 'ced45-gama', nome: 'CED 45 Gama', slug: 'ced45-gama', cidade: 'Gama', status: 'SUSPENSA', criadoEm: '2023-11-05', totalAlunos: 800 },
];
