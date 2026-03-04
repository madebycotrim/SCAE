/**
 * Barrel export do módulo Acadêmico.
 * Centraliza Alunos, Turmas e Portal do Responsável.
 */

// Componentes Principais (Telas)
export { default as Alunos } from './componentes/Alunos';
export { default as Turmas } from './componentes/Turmas';
export { default as PainelResponsavel } from './componentes/PainelResponsavel';
export { default as TelaLoginResponsavel } from './componentes/TelaLoginResponsavel';

// Modais e Componentes de Apoio
export { default as FormAlunoModal } from './componentes/FormAlunoModal';
export { default as FormTurmaModal } from './componentes/FormTurmaModal';
export { default as CredencialModal } from './componentes/CredencialModal';
export { default as ImportacaoAlunosModal } from './componentes/ImportacaoAlunosModal';

// Tipos
export * from './tipos/academico';

// Serviços
export * from './servicos/responsavelServico';
