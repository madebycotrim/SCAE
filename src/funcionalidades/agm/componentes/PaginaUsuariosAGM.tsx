import { useState } from 'react';
import { Users, Search, Edit2, KeyRound, ShieldAlert } from 'lucide-react';

interface UsuarioMock {
    id: string;
    email: string;
    nome: string;
    papel: string;
    tenantSlug: string | 'GLOBAL';
    ultimoAcesso: string;
}

const mockUsuarios: UsuarioMock[] = [
    { id: '1', email: 'diretora@gmail.com', nome: 'Luciana Silva', papel: 'COORDENACAO', tenantSlug: 'cem03-taguatinga', ultimoAcesso: 'Hoje, 08:15' },
    { id: '2', email: 'porteiro_joao@gmail.com', nome: 'João Ferreira', papel: 'PORTARIA', tenantSlug: 'cef12-ceilandia', ultimoAcesso: 'Ontem, 16:30' },
    { id: '3', email: 'root@scae.com', nome: 'COTTRIM SYSADMIN', papel: 'AGM', tenantSlug: 'GLOBAL', ultimoAcesso: 'Agora' },
];

export function PaginaUsuariosAGM() {
    const [busca, definirBusca] = useState('');
    const [usuarios] = useState<UsuarioMock[]>(mockUsuarios);

    const filtrados = usuarios.filter(u => u.email.toLowerCase().includes(busca.toLowerCase()) || u.nome.toLowerCase().includes(busca.toLowerCase()));

    return (
        <div className="space-y-6 animate-fade-in">
            {/* Header */}
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 bg-slate-800 p-6 rounded-xl border border-slate-700 shadow-sm">
                <div className="flex items-center gap-4">
                    <div className="w-12 h-12 bg-indigo-500/10 rounded-lg flex items-center justify-center border border-indigo-500/20 text-indigo-400">
                        <Users size={24} />
                    </div>
                    <div>
                        <p className="text-xs font-semibold text-indigo-400 uppercase tracking-wider mb-0.5">Controle de Acesso</p>
                        <h2 className="text-2xl font-bold text-white">Usuários da Plataforma</h2>
                        <p className="text-slate-400 text-sm mt-0.5">Busca omni-direcional de qualquer operador (Admin, Portaria, Coordenador).</p>
                    </div>
                </div>
            </div>

            {/* Busca */}
            <div className="bg-slate-800 border border-slate-700 rounded-xl p-4 flex flex-col md:flex-row gap-4 shadow-sm">
                <div className="relative w-full md:w-96">
                    <div className="absolute inset-y-0 left-3 flex items-center pointer-events-none text-slate-500">
                        <Search size={16} />
                    </div>
                    <input
                        type="text"
                        placeholder="Buscar por e-mail ou nome..."
                        value={busca}
                        onChange={(e) => definirBusca(e.target.value)}
                        className="w-full pl-9 pr-4 py-2 bg-slate-900 border border-slate-700 rounded-lg text-sm text-white focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 placeholder:text-slate-500 transition-shadow"
                    />
                </div>
            </div>

            {/* Tabela */}
            <div className="bg-slate-800 border border-slate-700 rounded-xl overflow-hidden shadow-sm">
                <div className="overflow-x-auto custom-scrollbar">
                    <table className="min-w-full divide-y divide-slate-700">
                        <thead className="bg-slate-900/50">
                            <tr>
                                <th scope="col" className="px-6 py-3 text-left text-xs font-semibold text-slate-400 uppercase tracking-wider">Usuário</th>
                                <th scope="col" className="px-6 py-3 text-left text-xs font-semibold text-slate-400 uppercase tracking-wider">Papel</th>
                                <th scope="col" className="px-6 py-3 text-left text-xs font-semibold text-slate-400 uppercase tracking-wider">Vinculação (Tenant)</th>
                                <th scope="col" className="px-6 py-3 text-left text-xs font-semibold text-slate-400 uppercase tracking-wider">Último Acesso</th>
                                <th scope="col" className="relative px-6 py-3 text-right text-xs font-semibold text-slate-400 uppercase tracking-wider">Ações</th>
                            </tr>
                        </thead>
                        <tbody className="bg-slate-800 divide-y divide-slate-700">
                            {filtrados.map((usuario) => (
                                <tr key={usuario.id} className="hover:bg-slate-700/50 transition-colors">
                                    <td className="px-6 py-4 whitespace-nowrap">
                                        <div className="flex flex-col gap-0.5">
                                            <span className="text-sm font-medium text-white">{usuario.nome}</span>
                                            <span className="text-xs text-slate-500 font-mono">{usuario.email}</span>
                                        </div>
                                    </td>
                                    <td className="px-6 py-4 whitespace-nowrap">
                                        {usuario.papel === 'AGM' ? (
                                            <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md text-xs font-medium bg-indigo-500/10 text-indigo-400 border border-indigo-500/20">
                                                <ShieldAlert size={14} /> SUPER ADMIN
                                            </span>
                                        ) : (
                                            <span className="inline-flex items-center px-2.5 py-1 rounded-md text-xs font-medium bg-slate-700 text-slate-300">
                                                {usuario.papel}
                                            </span>
                                        )}
                                    </td>
                                    <td className="px-6 py-4 whitespace-nowrap">
                                        <span className={`text-sm ${usuario.tenantSlug === 'GLOBAL' ? 'text-indigo-400 font-semibold' : 'text-slate-400 font-mono'}`}>
                                            {usuario.tenantSlug}
                                        </span>
                                    </td>
                                    <td className="px-6 py-4 whitespace-nowrap">
                                        <span className="text-sm text-slate-300">
                                            {usuario.ultimoAcesso}
                                        </span>
                                    </td>
                                    <td className="px-6 py-4 whitespace-nowrap text-right">
                                        <div className="inline-flex items-center justify-end gap-2">
                                            <button className="p-1.5 rounded text-slate-400 hover:text-indigo-400 hover:bg-slate-700 transition-colors" title="Forçar redefinição de senha">
                                                <KeyRound size={16} />
                                            </button>
                                            <button className="p-1.5 rounded text-slate-400 hover:text-indigo-400 hover:bg-slate-700 transition-colors" title="Editar Permissões">
                                                <Edit2 size={16} />
                                            </button>
                                        </div>
                                    </td>
                                </tr>
                            ))}
                            {filtrados.length === 0 && (
                                <tr>
                                    <td colSpan={5} className="px-6 py-16 text-center">
                                        <div className="flex flex-col items-center gap-3">
                                            <div className="w-12 h-12 bg-slate-900 rounded-full flex items-center justify-center text-slate-600">
                                                <Users size={20} />
                                            </div>
                                            <p className="text-sm font-medium text-slate-400">Nenhuma conta encontrada na base.</p>
                                        </div>
                                    </td>
                                </tr>
                            )}
                        </tbody>
                    </table>
                </div>
            </div>
        </div>
    );
}
