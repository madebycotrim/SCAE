import { useState, useEffect } from 'react';
import ModalUniversal from '@compartilhado/componentes/ModalUniversal';
import { Users, Shield, UserCheck, Plus, Lock, Mail, GraduationCap } from 'lucide-react';
import { Botao } from '@compartilhado/componentes/UI';
import { mascararDadoPessoal } from '@compartilhado/utils/registrarLocal';

interface FormUsuarioModalProps {
    usuario?: any | null;
    aoFechar: () => void;
    aoSalvar: (dados: any) => Promise<void>;
}

export default function FormUsuarioModal({ usuario, aoFechar, aoSalvar }: FormUsuarioModalProps) {
    const [email, definirEmail] = useState('');
    const [papel, definirPapel] = useState('VISUALIZACAO');
    const [carregando, definirCarregando] = useState(false);

    const PapeisDisponiveis = [
        { id: 'ADMIN', nome: 'Administrador', desc: 'Acesso total irrestrito', icone: Shield },
        { id: 'COORDENACAO', nome: 'Coordenação', desc: 'Gestão pedagógica e turmas', icone: GraduationCap },
        { id: 'SECRETARIA', nome: 'Secretaria', desc: 'Matrículas e documentos', icone: Users },
        { id: 'PORTEIRO', nome: 'Portaria', desc: 'Apenas registro de acesso', icone: UserCheck },
        { id: 'VISUALIZACAO', nome: 'Auditor', desc: 'Apenas consulta de dados', icone: Lock }
    ];

    useEffect(() => {
        if (usuario) {
            definirEmail(usuario.email);
            definirPapel(usuario.papel || usuario.role || 'VISUALIZACAO');
        } else {
            definirEmail('');
            definirPapel('VISUALIZACAO');
        }
    }, [usuario]);

    const manipularSalvar = async () => {
        try {
            definirCarregando(true);
            await aoSalvar({
                email,
                papel,
                ativo: true
            });
        } finally {
            definirCarregando(false);
        }
    };

    return (
        <ModalUniversal
            titulo={usuario ? "Ajustar Privilégios" : "Convidar para a Equipe"}
            subtitulo={usuario ? `Gerenciando permissões de ${mascararDadoPessoal(usuario.email, 'email')}` : "Adicione um novo integrante à equipe administrativa da unidade."}
            icone={usuario ? Shield : Plus}
            aoFechar={aoFechar}
            tamanho="lg"
        >
            <div className="space-y-8 pb-4">
                {/* Email Input */}
                <div className="relative group">
                    <label className="flex items-center gap-2 text-[10px] font-black text-slate-500 uppercase tracking-widest mb-2.5 ml-1 transition-colors group-focus-within:text-indigo-600">
                        <Mail size={14} /> E-mail Institucional (Google)
                    </label>
                    <div className="relative">
                        <input
                            type="email"
                            value={email}
                            onChange={(e) => definirEmail(e.target.value)}
                            disabled={!!usuario}
                            placeholder="exemplo@edu.se.df.gov.br"
                            className="w-full px-5 h-12 bg-slate-50 border border-slate-200 rounded-2xl text-sm font-bold text-slate-800 focus:outline-none focus:border-indigo-600 focus:ring-4 focus:ring-indigo-600/5 transition-all placeholder:text-slate-400 disabled:bg-slate-100 disabled:text-slate-500 disabled:cursor-not-allowed"
                        />
                    </div>
                    {usuario && <p className="mt-2 ml-1 text-[10px] font-bold text-slate-400 uppercase tracking-tight italic">O identificador de segurança não pode ser alterado.</p>}
                </div>

                {/* Roles Selector - Visual Cards */}
                <div className="space-y-4">
                    <label className="flex items-center gap-2 text-[10px] font-black text-slate-500 uppercase tracking-widest mb-2.5 ml-1">
                        <Shield size={14} /> Atribuição de Responsabilidades
                    </label>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                        {PapeisDisponiveis.map((p) => (
                            <button
                                key={p.id}
                                type="button"
                                onClick={() => definirPapel(p.id)}
                                className={`flex items-start gap-4 p-4 rounded-2xl border-2 text-left transition-all active:scale-[0.98] ${papel === p.id
                                    ? 'bg-indigo-600 border-indigo-700 text-white shadow-lg shadow-indigo-100'
                                    : 'bg-white border-slate-100 text-slate-600 hover:border-slate-200 hover:bg-slate-50'
                                    }`}
                            >
                                <div className={`p-2 rounded-xl shrink-0 ${papel === p.id ? 'bg-white/20 text-white' : 'bg-slate-100 text-slate-500'}`}>
                                    <p.icone size={20} />
                                </div>
                                <div className="min-w-0">
                                    <p className={`text-xs font-black uppercase tracking-tight ${papel === p.id ? 'text-white' : 'text-slate-800'}`}>{p.nome}</p>
                                    <p className={`text-[10px] font-bold mt-0.5 truncate ${papel === p.id ? 'text-indigo-100' : 'text-slate-500'}`}>{p.desc}</p>
                                </div>
                            </button>
                        ))}
                    </div>
                </div>

                {/* Footer Ações */}
                <div className="flex gap-4 pt-8 mt-4 border-t border-slate-100 justify-end">
                    <Botao
                        variante="secundario"
                        tamanho="lg"
                        onClick={aoFechar}
                        disabled={carregando}
                    >
                        Cancelar
                    </Botao>
                    <Botao
                        variante="primario"
                        tamanho="lg"
                        icone={usuario ? UserCheck : Plus}
                        onClick={manipularSalvar}
                        loading={carregando}
                    >
                        {usuario ? 'Atualizar Permissões' : 'Confirmar Convite'}
                    </Botao>
                </div>
            </div>
        </ModalUniversal>
    );
}
