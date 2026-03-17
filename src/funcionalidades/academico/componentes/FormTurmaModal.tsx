import { useState, useEffect } from 'react';
import ModalUniversal from '@/compartilhado/componentes/ModalUniversal';
import { BookOpen, Users, GraduationCap, ChevronRight, CheckCircle, MapPin, Calendar, Clock, Hash, ArrowLeft } from 'lucide-react';
import { Botao } from '@/compartilhado/componentes/UI';
import toast from 'react-hot-toast';

interface FormTurmaModalProps {
    turma?: any | null;
    aoFechar: () => void;
    aoSalvar: (dados: any) => Promise<void>;
}

export default function FormTurmaModal({ turma, aoFechar, aoSalvar }: FormTurmaModalProps) {
    const [etapa, definirEtapa] = useState(1);
    const [carregando, definirCarregando] = useState(false);

    // Estados do formulário
    const [serieTurma, definirSerieTurma] = useState('');
    const [letraTurma, definirLetraTurma] = useState('');
    const [turno, definirTurno] = useState('Matutino');
    const [anoLetivo, definirAnoLetivo] = useState(new Date().getFullYear().toString());
    const [lotacaoMaxima, definirLotacaoMaxima] = useState('40');
    const [professorRegente, definirProfessorRegente] = useState('');
    const [sala, definirSala] = useState('');

    useEffect(() => {
        if (turma) {
            definirSerieTurma(turma.serie?.toString() || '');
            definirLetraTurma(turma.letra || '');
            definirTurno(turma.turno || 'Matutino');
            definirAnoLetivo(turma.ano_letivo?.toString() || new Date().getFullYear().toString());
            definirLotacaoMaxima(turma.lotacao_maxima?.toString() || '40');
            definirProfessorRegente(turma.professor_regente || '');
            definirSala(turma.sala || '');
        }
    }, [turma]);

    const podeAvancar = serieTurma !== '' && letraTurma !== '';
    const temAlunos = (turma?.totalAlunos || 0) > 0;

    const manipularSalvar = async () => {
        try {
            definirCarregando(true);
            await aoSalvar({
                idAntigo: turma?.id, // Útil caso o ID mude (renomeação de turma vazia)
                serie: parseInt(serieTurma),
                letra: letraTurma,
                turno,
                ano_letivo: parseInt(anoLetivo),
                lotacao_maxima: parseInt(lotacaoMaxima) || 40,
                professor_regente: professorRegente,
                sala
            });
        } finally {
            definirCarregando(false);
        }
    };

    const exibirAvisoImutavel = () => {
        toast.error('Esta turma já possui alunos vinculados. Para alterar Série, Letra ou Turno, a turma deve estar vazia.', {
            duration: 6000,
            icon: '🔒'
        });
    };

    return (
        <ModalUniversal
            titulo={turma ? "Editar Turma" : "Criar Nova Turma"}
            subtitulo={etapa === 1 ? "Defina a identidade básica e o turno" : "Gestão acadêmica e localização física"}
            aoFechar={aoFechar}
            icone={GraduationCap}
            tamanho="lg"
        >
            <div className="flex flex-col min-h-[400px]">
                {/* Stepper Moderno (Compacto) */}
                <div className="flex items-center justify-center gap-2.5 mb-8">
                    <div className={`h-1 rounded-full transition-all duration-500 ${etapa === 1 ? 'w-8 bg-slate-900' : 'w-3 bg-slate-200'}`}></div>
                    <div className={`h-1 rounded-full transition-all duration-500 ${etapa === 2 ? 'w-8 bg-slate-900' : 'w-3 bg-slate-200'}`}></div>
                </div>

                <div className="flex-1 animate-fade-in">
                    {etapa === 1 ? (
                        <div className="space-y-8">
                            {/* Série */}
                            <div className="group">
                                <label className="flex items-center gap-2 text-[10px] font-black text-slate-500 uppercase tracking-widest mb-4 ml-1">
                                    <Hash size={14} /> 1. Qual a Série da Turma?
                                </label>
                                <div className="grid grid-cols-3 gap-3">
                                    {['1', '2', '3'].map((s) => (
                                        <button
                                            key={s}
                                            type="button"
                                            onClick={() => temAlunos ? exibirAvisoImutavel() : definirSerieTurma(s)}
                                            className={`h-11 rounded-2xl text-[11px] font-black transition-all border uppercase tracking-wider ${serieTurma === s
                                                ? 'bg-slate-900 border-slate-900 text-white shadow-suave'
                                                : 'bg-white border-slate-200 text-slate-500 hover:border-slate-400 hover:bg-slate-50'
                                                } ${temAlunos ? 'opacity-50 cursor-help' : ''}`}
                                        >
                                            {s}º Ano
                                        </button>
                                    ))}
                                </div>
                            </div>

                            {/* Letra */}
                            <div className="group">
                                <label className="flex items-center gap-2 text-[10px] font-black text-slate-500 uppercase tracking-widest mb-4 ml-1">
                                    <MapPin size={14} /> 2. Identificação da Letra
                                </label>
                                <div className="flex flex-wrap gap-2.5">
                                    {['A', 'B', 'C', 'D', 'E', 'F', 'G', 'H', 'I', 'J', 'K', 'L'].map((l) => (
                                        <button
                                            key={l}
                                            type="button"
                                            onClick={() => temAlunos ? exibirAvisoImutavel() : definirLetraTurma(l)}
                                            className={`w-10 h-10 rounded-2xl text-base font-black transition-all border ${letraTurma === l
                                                ? 'bg-slate-900 border-slate-900 text-white shadow-suave'
                                                : 'bg-white border-slate-200 text-slate-400 hover:border-slate-400 hover:text-slate-800'
                                                } ${temAlunos ? 'opacity-50 cursor-help' : ''}`}
                                        >
                                            {l}
                                        </button>
                                    ))}
                                </div>
                            </div>

                            {/* Turno */}
                            <div className="group">
                                <label className="flex items-center gap-2 text-[10px] font-black text-slate-500 uppercase tracking-widest mb-4 ml-1">
                                    <Clock size={14} /> 3. Regime de Horário
                                </label>
                                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
                                    {['Matutino', 'Vespertino', 'Noturno', 'Integral'].map((t) => (
                                        <button
                                            key={t}
                                            type="button"
                                            onClick={() => temAlunos ? exibirAvisoImutavel() : definirTurno(t)}
                                            className={`h-9 rounded-2xl text-[9px] font-black uppercase tracking-widest border transition-all ${turno === t
                                                ? 'bg-slate-900 border-slate-900 text-white shadow-suave'
                                                : 'bg-white border-slate-200 text-slate-400 hover:border-slate-400 hover:bg-slate-50'
                                                } ${temAlunos ? 'opacity-50 cursor-help' : ''}`}
                                        >
                                            {t}
                                        </button>
                                    ))}
                                </div>
                            </div>
                        </div>
                    ) : (
                        <div className="space-y-8 animate-fade-in">
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                                {/* Ano Letivo */}
                                <div className="relative group">
                                    <label className="flex items-center gap-2 text-[10px] font-black text-slate-500 uppercase tracking-widest mb-2.5 ml-1">
                                        <Calendar size={14} /> Ano Letivo
                                    </label>
                                    <input
                                        type="number"
                                        value={anoLetivo}
                                        onChange={(e) => definirAnoLetivo(e.target.value)}
                                        className="w-full px-4 h-11 bg-slate-50 border border-slate-200 rounded-2xl text-sm font-bold text-slate-800 outline-none focus:bg-white focus:border-slate-900 focus:ring-4 focus:ring-slate-900/5 transition-all disabled:bg-slate-100 disabled:text-slate-500"
                                        disabled={temAlunos}
                                        onClick={() => temAlunos && exibirAvisoImutavel()}
                                    />
                                </div>

                                {/* Capacidade */}
                                <div className="relative">
                                    <label className="flex items-center justify-between text-[10px] font-black text-slate-500 uppercase tracking-widest mb-2.5 ml-1">
                                        <div className="flex items-center gap-2"><Users size={14} /> Capacidade de Alunos</div>
                                        <span className="text-indigo-600 font-black">{lotacaoMaxima} Vagas</span>
                                    </label>
                                    <div className="pt-4 pb-2 px-1">
                                        <input
                                            type="range" min="1" max="60"
                                            value={lotacaoMaxima}
                                            onChange={(e) => definirLotacaoMaxima(e.target.value)}
                                            className="w-full h-1 bg-slate-200 rounded-full appearance-none cursor-pointer accent-slate-900"
                                        />
                                    </div>
                                </div>
                            </div>

                            <div className="pt-8 border-t border-slate-100 space-y-8">
                                {/* Professor Regente */}
                                <div className="group">
                                    <label className="flex items-center gap-2 text-[10px] font-black text-slate-500 uppercase tracking-widest mb-2.5 ml-1">
                                        <GraduationCap size={14} /> Professor(a) Regente
                                    </label>
                                    <input
                                        type="text"
                                        value={professorRegente}
                                        onChange={(e) => definirProfessorRegente(e.target.value)}
                                        placeholder="Nome do docente responsável"
                                        className="w-full px-4 h-11 bg-slate-50 border border-slate-200 rounded-2xl text-sm font-bold text-slate-800 outline-none focus:bg-white focus:border-slate-900 focus:ring-4 focus:ring-slate-900/5 transition-all"
                                    />
                                </div>

                                {/* Sala */}
                                <div className="group">
                                    <label className="flex items-center gap-2 text-[10px] font-black text-slate-500 uppercase tracking-widest mb-2.5 ml-1">
                                        <BookOpen size={14} /> Sala / Bloco Acadêmico
                                    </label>
                                    <input
                                        type="text"
                                        value={sala}
                                        onChange={(e) => definirSala(e.target.value)}
                                        placeholder="Ex: Bloco B - Sala 12"
                                        className="w-full px-4 h-11 bg-slate-50 border border-slate-200 rounded-2xl text-sm font-bold text-slate-800 outline-none focus:bg-white focus:border-slate-900 focus:ring-4 focus:ring-slate-900/5 transition-all"
                                    />
                                </div>
                            </div>
                        </div>
                    )}
                </div>

                <div className="flex gap-4 pt-8 mt-4 border-t border-slate-100 justify-end">
                    {etapa === 1 ? (
                        <>
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
                                icone={ChevronRight}
                                onClick={() => definirEtapa(2)}
                                disabled={!podeAvancar}
                                className="flex-row-reverse"
                            >
                                Próximo Passo
                            </Botao>
                        </>
                    ) : (
                        <>
                            <Botao
                                variante="secundario"
                                tamanho="lg"
                                icone={ArrowLeft}
                                onClick={() => definirEtapa(1)}
                                disabled={carregando}
                            >
                                Voltar
                            </Botao>
                            <Botao
                                variante="primario"
                                tamanho="lg"
                                icone={CheckCircle}
                                onClick={manipularSalvar}
                                loading={carregando}
                            >
                                {turma ? 'Salvar Alterações' : 'Criar Turma'}
                            </Botao>
                        </>
                    )}
                </div>
            </div>
        </ModalUniversal>
    );
}

