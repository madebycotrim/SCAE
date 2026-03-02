import { useState, useEffect } from 'react';
import ModalUniversal from '@compartilhado/componentes/ModalUniversal';
import { Users, Shield, UserCheck, Plus, Lock, Mail } from 'lucide-react';

interface FormUsuarioModalProps {
    usuario?: any | null;
    aoFechar: () => void;
    aoSalvar: (dados: any) => Promise<void>;
}

export default function FormUsuarioModal({ usuario, aoFechar, aoSalvar }: FormUsuarioModalProps) {
    const [email, definirEmail] = useState('');
    const [papel, definirPapel] = useState('VISUALIZACAO');
    const [ativo, definirAtivo] = useState(true);

    const PapeisDisponiveis = [
        { id: 'ADMIN', nome: 'Administrador', desc: 'Acesso total ao sistema', icone: Shield },
        { id: 'COORDENACAO', nome: 'Coordenação', desc: 'Gestão pedagógica', icone: Users },
        { id: 'SECRETARIA', nome: 'Secretaria', desc: 'Gestão de alunos e turmas', icone: Users },
        { id: 'PORTARIA', nome: 'Portaria', desc: 'Apenas registro de acesso', icone: UserCheck },
        { id: 'VISUALIZACAO', nome: 'Visitante', desc: 'Apenas visualização', icone: Lock }
    ];

    useEffect(() => {
        if (usuario) {
            definirEmail(usuario.email);
            definirPapel(usuario.papel || usuario.role || 'VISUALIZACAO');
            definirAtivo(usuario.ativo);
        } else {
            definirEmail('');
            definirPapel('VISUALIZACAO');
            definirAtivo(true);
        }
    }, [usuario]);

    const manipularSalvar = async () => {
        await aoSalvar({
            email,
            papel,
            ativo
        });
    };

    return (
        <ModalUniversal
            titulo={usuario ? "Gerenciar Permissões" : "Convidar Novo Membro"}
            subtitulo={usuario ? `Ajustando nível de acesso para ${usuario.email}` : "Adicione um novo integrante à equipe administrativa do SCAE."}
            icone={usuario ? Shield : Plus}
            aoFechar={aoFechar}
            tamanho="lg"
        >
            <div className="space-y-6">
                {/* Email Input */}
                <div className="relative pb-6">
                    <label className="block text-sm font-medium text-slate-700 mb-1.5">Email de Identificação</label>
                    <div className="relative">
                        <div className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400">
                            <Mail size={18} />
                        </div>
                        <input
                            type="email"
                            value={email}
                            onChange={(e) => definirEmail(e.target.value)}
                            disabled={!!usuario}
                            placeholder="exemplo@scae.com.br"
                            className="w-full pl-10 pr-4 h-10 bg-white border border-slate-300 rounded-md text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 transition-colors shadow-sm disabled:bg-slate-50 disabled:text-slate-500"
                        />
                    </div>
                    {usuario && <p className="absolute bottom-0 left-0 text-xs text-slate-500">O email não pode ser alterado por segurança.</p>}
                </div>                {/* Roles Select */}
                <div>
                    <label className="block text-sm font-medium text-slate-700 mb-1.5">Atribuição de Papel / Permissão</label>
                    <select
                        value={papel}
                        onChange={(e) => definirPapel(e.target.value)}
                        className="w-full px-3 h-10 bg-white border border-slate-300 rounded-md text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-indigo-500 shadow-sm"
                    >
                        {PapeisDisponiveis.map((p) => (
                            <option key={p.id} value={p.id}>
                                {p.nome} - {p.desc}
                            </option>
                        ))}
                    </select>
                </div>

                {/* Footer Ações */}
                <div className="flex gap-3 pt-6 mt-6 border-t border-slate-200 justify-end">
                    <button
                        type="button"
                        onClick={aoFechar}
                        className="px-4 py-2 rounded-md border border-slate-300 text-slate-700 font-medium hover:bg-slate-50 transition-colors text-sm"
                    >
                        Cancelar
                    </button>
                    <button
                        type="button"
                        onClick={manipularSalvar}
                        className="px-4 py-2 rounded-md bg-indigo-600 text-white font-medium hover:bg-indigo-700 transition-colors flex items-center gap-2 text-sm shadow-sm"
                    >
                        {usuario ? <UserCheck size={16} /> : <Plus size={16} />}
                        {usuario ? 'Salvar Alterações' : 'Enviar Convite'}
                    </button>
                </div>
            </div >
        </ModalUniversal >
    );
}
