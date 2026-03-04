import fs from 'fs';
import path from 'path';

const files = [
    "src\\compartilhado\\componentes\\LayoutAdministrativo.tsx",
    "src\\compartilhado\\servicos\\bancoLocal.ts",
    "src\\compartilhado\\servicos\\sincronizacao.ts",
    "src\\funcionalidades\\configuracao-horarios\\componentes\\FormHorariosAcesso.tsx",
    "src\\funcionalidades\\controle-acesso\\componentes\\QuiosqueAutoatendimento.tsx",
    "src\\funcionalidades\\controle-acesso\\componentes\\TerminalAcesso.tsx",
    "src\\funcionalidades\\dashboard\\componentes\\Painel.tsx",
    "src\\funcionalidades\\risco-abandono\\componentes\\PainelRiscoAbandono.tsx",
    "src\\funcionalidades\\turmas\\componentes\\Turmas.tsx",
    "src\\funcionalidades\\usuarios\\componentes\\Usuarios.tsx",
    "src\\principal\\PaginaInicial.tsx"
];

files.forEach(file => {
    const fullPath = path.join(process.cwd(), file);
    let content = fs.readFileSync(fullPath, 'utf-8');
    if (!content.includes('TODO: refatorar arquivo longo')) {
        content = `// TODO: refatorar arquivo longo (> 300 linhas) para extrair lógica em hooks ou componentes menores, reduzindo a dívida técnica\n` + content;
        fs.writeFileSync(fullPath, content, 'utf-8');
    }
});
console.log('Finished prepending TODO');
