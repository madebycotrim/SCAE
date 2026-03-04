import { useState, useEffect } from 'react';
import ModalUniversal from '@compartilhado/componentes/ModalUniversal';
import { SelectComBusca } from '@compartilhado/componentes/SelectComBusca';
import { CheckCircle, User, Hash, GraduationCap, Power } from 'lucide-react';
import { Aluno, TurmaLocal } from '../types/aluno';
import { Botao } from '@compartilhado/componentes/UI';

interface FormAlunoModalProps {
    aluno?: Aluno | null;
    turmas: TurmaLocal[];
    aoFechar: () => void;
    aoSalvar: (dados: Partial<Aluno>) => Promise<void>;
}

export default function FormAlunoModal({ aluno, turmas, aoFechar, aoSalvar }: FormAlunoModalProps) {
    const ehEdicao = !!aluno;
    const [carregando, definirCarregando] = useState(false);
    const [dadosFormulario, definirDadosFormulario] = useState({
        nome_completo: '',
        matricula: '',
        turma_id: '',
        ativo: true
    });

    useEffect(() => {
        if (aluno) {
            definirDadosFormulario({
                nome_completo: aluno.nome_completo,
                matricula: aluno.matricula,
                turma_id: aluno.turma_id,
                ativo: aluno.ativo ?? true
            });
        }
    }, [aluno]);

    const manipularSalvar = async () => {
        try {
            definirCarregando(true);
            await aoSalvar(dadosFormulario);
        } finally {
            definirCarregando(false);
        }
    };

    return (
        <ModalUniversal
            titulo={aluno ? "Editar Aluno" : "Matricular Novo Aluno"}
            subtitulo={aluno ? `Atualização de registro institucional` : "Preencha os dados abaixo para vincular o aluno a uma turma."}
            aoFechar={aoFechar}
            icone={aluno ? Edit2 : User}
            tamanho="lg"
        >
            <div className="space-y-8">
                {/* Nome Completo */}
                <div className="relative group">
                    <label className="flex items-center gap-2 text-[10px] font-black text-slate-500 uppercase tracking-widest mb-2 ml-1 transition-colors group-focus-within:text-slate-900">
                        <User size={14} /> Nome Completo
                    </label>
                    <input
                        type="text"
                        required
                        className="w-full px-4 h-11 bg-slate-50 border border-slate-200 rounded-lg text-sm font-bold text-slate-800 focus:outline-none focus:bg-white focus:border-slate-900 focus:ring-4 focus:ring-slate-900/5 transition-all placeholder:text-slate-400 placeholder:font-medium"
                        value={dadosFormulario.nome_completo}
                        onChange={(e) => definirDadosFormulario({ ...dadosFormulario, nome_completo: e.target.value })}
                        placeholder="Ex: Mateus Felipe Cotrim"
                    />
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-8 items-start">
                    {/* Matrícula */}
                    <div className="relative">
                        <label className="flex items-center gap-2 text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2 ml-1">
                            <Hash size={14} /> Matrícula
                        </label>
                        <input
                            type="text"
                            className="w-full px-4 h-11 bg-slate-50 border border-slate-200 rounded-lg text-sm font-bold text-slate-800 focus:outline-none focus:bg-white focus:border-slate-900 focus:ring-4 focus:ring-slate-900/5 transition-all disabled:bg-slate-100 disabled:text-slate-500 placeholder:text-slate-400"
                            value={dadosFormulario.matricula}
                            onChange={(e) => definirDadosFormulario({ ...dadosFormulario, matricula: e.target.value })}
                            disabled={!!aluno}
                            placeholder="Ex: 20240001"
                        />
                        <p className="mt-1.5 ml-1 text-[9px] font-bold text-slate-400 uppercase tracking-tighter italic">ID único permanente</p>
                    </div>

                    {/* Turma Dropdown */}
                    <div className="relative">
                        <label className="flex items-center gap-2 text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2 ml-1">
                            <GraduationCap size={14} /> Turma Designada
                        </label>
                        <SelectComBusca
                            options={turmas.map(t => ({ value: t.id, label: t.id }))}
                            value={dadosFormulario.turma_id}
                            onChange={(valor) => definirDadosFormulario({ ...dadosFormulario, turma_id: valor as string })}
                            placeholder="Selecione..."
                            className={`w-full px-4 h-11 bg-slate-50 border border-slate-200 rounded-lg text-sm font-bold transition-all flex items-center justify-between ${dadosFormulario.turma_id ? 'text-slate-800 border-slate-300' : 'text-slate-400'}`}
                        />
                    </div>

                    {/* Status Toggle */}
                    {ehEdicao && (
                        <div className="md:col-span-2 p-5 bg-slate-50 rounded-xl border border-slate-200 shadow-inner">
                            <label className="flex items-center gap-2 text-[9px] font-black text-slate-400 uppercase tracking-widest mb-4">
                                <Power size={12} /> Situação da Matrícula
                            </label>
                            <div className="flex gap-3">
                                <button
                                    type="button"
                                    onClick={() => definirDadosFormulario({ ...dadosFormulario, ativo: true })}
                                    className={`flex-1 h-10 rounded-lg text-[9px] font-black uppercase tracking-widest transition-all border ${dadosFormulario.ativo
                                        ? 'bg-slate-900 text-white border-slate-900 shadow-sm'
                                        : 'bg-white text-slate-400 border-slate-200 hover:text-slate-600'
                                        }`}
                                >
                                    Aluno Ativo
                                </button>
                                <button
                                    type="button"
                                    onClick={() => definirDadosFormulario({ ...dadosFormulario, ativo: false })}
                                    className={`flex-1 h-10 rounded-lg text-[9px] font-black uppercase tracking-widest transition-all border ${!dadosFormulario.ativo
                                        ? 'bg-rose-600 text-white border-rose-600 shadow-sm'
                                        : 'bg-white text-slate-400 border-slate-200 hover:text-slate-600'
                                        }`}
                                >
                                    Trancado / Inativo
                                </button>
                            </div>
                            <p className="mt-3 text-[9px] font-bold text-slate-400 leading-relaxed italic text-center">
                                Matrículas trancadas revogam o acesso imediato ao terminal.
                            </p>
                        </div>
                    )}
                </div>

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
                        icone={CheckCircle}
                        onClick={manipularSalvar}
                        loading={carregando}
                    >
                        {aluno ? 'Atualizar Aluno' : 'Finalizar Matrícula'}
                    </Botao>
                </div>
            </div>
        </ModalUniversal>
    );
}

const Edit2 = (props: any) => (
    <svg
        {...props}
        xmlns="http://www.w3.org/2000/svg"
        width="24"
        height="24"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
    >
        <path d="M17 3a2.85 2.83 0 1 1 4 4L7.5 20.5 2 22l1.5-5.5Z" />
        <path d="m15 5 4 4" />
    </svg>
);
