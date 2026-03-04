import { useState, useEffect } from 'react';
import ModalUniversal from '@compartilhado/componentes/ModalUniversal';
import { BookOpen, Users, GraduationCap, ChevronRight, CheckCircle, MapPin, Calendar, Clock } from 'lucide-react';
import { Botao } from '@compartilhado/componentes/UI';

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
            definirSerieTurma(turma.serie);
            definirLetraTurma(turma.letra);
            definirTurno(turma.turno);
            definirAnoLetivo(turma.ano_letivo.toString());
            definirLotacaoMaxima(turma.lotacao_maxima?.toString() || '40');
            definirProfessorRegente(turma.professor_regente || '');
            definirSala(turma.sala || '');
        }
    }, [turma]);

    const podeAvancar = serieTurma !== '' && letraTurma !== '';

    const manipularSalvar = async () => {
        try {
            definirCarregando(true);
            await aoSalvar({
                serie: serieTurma,
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

    return (
        <ModalUniversal
            titulo={turma ? "Editar Turma" : "Criar Nova Turma"}
            subtitulo={etapa === 1 ? "Defina a identidade básica e o turno" : "Gestão acadêmica e localização física"}
            aoFechar={aoFechar}
            icone={GraduationCap}
            tamanho="lg"
        >
            <div className="flex flex-col min-h-[400px]">
                {/* Stepper Moderno */}
                <div className="flex items-center justify-center gap-3 mb-10">
                    <div className={`h-1.5 rounded-full transition-all duration-500 ${etapa === 1 ? 'w-12 bg-indigo-600 shadow-[0_0_10px_rgba(79,70,229,0.3)]' : 'w-4 bg-slate-200'}`}></div>
                    <div className={`h-1.5 rounded-full transition-all duration-500 ${etapa === 2 ? 'w-12 bg-indigo-600 shadow-[0_0_10px_rgba(79,70,229,0.3)]' : 'w-4 bg-slate-200'}`}></div>
                </div>

                <div className="flex-1 animate-fade-in">
                    {etapa === 1 ? (
                        <div className="space-y-8">
                            {/* Série */}
                            <div className="group">
                                <label className="flex items-center gap-2 text-[10px] font-black text-slate-500 uppercase tracking-widest mb-4 ml-1">
                                    <Hash size={14} /> 1. Qual a Série da Turma?
                                </label>
                                <div className="grid grid-cols-3 gap-4">
                                    {['1', '2', '3'].map((s) => (
                                        <button
                                            key={s}
                                            type="button"
                                            disabled={!!turma}
                                            onClick={() => definirSerieTurma(s)}
                                            className={`h-16 rounded-2xl text-base font-black transition-all border-2 active:scale-[0.98] ${serieTurma === s
                                                ? 'bg-indigo-600 border-indigo-700 text-white shadow-xl shadow-indigo-100'
                                                : 'bg-white border-slate-200 text-slate-600 hover:border-slate-300 hover:bg-slate-50 disabled:opacity-50 disabled:bg-slate-50 disabled:cursor-not-allowed'
                                                }`}
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
                                <div className="flex flex-wrap gap-3">
                                    {['A', 'B', 'C', 'D', 'E', 'F'].map((l) => (
                                        <button
                                            key={l}
                                            type="button"
                                            disabled={!!turma}
                                            onClick={() => definirLetraTurma(l)}
                                            className={`w-14 h-14 rounded-2xl text-xl font-black transition-all border-2 active:scale-[0.98] ${letraTurma === l
                                                ? 'bg-slate-900 border-slate-950 text-white shadow-xl shadow-slate-200'
                                                : 'bg-white border-slate-200 text-slate-600 hover:border-slate-300 hover:bg-slate-50 disabled:opacity-50 disabled:bg-slate-50'
                                                }`}
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
                                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                                    {['Matutino', 'Vespertino', 'Noturno', 'Integral'].map((t) => (
                                        <button
                                            key={t}
                                            type="button"
                                            onClick={() => definirTurno(t)}
                                            className={`h-11 rounded-xl text-[10px] font-black uppercase tracking-widest border-2 transition-all active:scale-[0.98] ${turno === t
                                                ? 'bg-slate-900 border-slate-950 text-white shadow-md'
                                                : 'bg-white border-slate-200 text-slate-500 hover:border-slate-300'
                                                }`}
                                        >
                                            {t}
                                        </button>
                                    ))}
                                </div>
                            </div>
                        </div>
                    ) : (
                        <div className="space-y-8 animate-fade-in shadow-inner p-1">
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
                                        className="w-full px-5 h-12 bg-slate-50 border border-slate-200 rounded-2xl text-sm font-bold text-slate-800 outline-none focus:border-indigo-600 focus:ring-4 focus:ring-indigo-600/5 transition-all disabled:bg-slate-100 disabled:text-slate-500"
                                        disabled={!!turma}
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
                                            className="w-full h-1.5 bg-slate-200 rounded-full appearance-none cursor-pointer accent-indigo-600"
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
                                        className="w-full px-5 h-12 bg-slate-50 border border-slate-200 rounded-2xl text-sm font-bold text-slate-800 outline-none focus:border-indigo-600 focus:ring-4 focus:ring-indigo-600/5 transition-all"
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
                                        className="w-full px-5 h-12 bg-slate-50 border border-slate-200 rounded-2xl text-sm font-bold text-slate-800 outline-none focus:border-indigo-600 focus:ring-4 focus:ring-indigo-600/5 transition-all"
                                    />
                                </div>
                            </div>
                        </div>
                    )}
                </div>

                {/* Footer Navegação */}
                <div className="flex gap-4 pt-8 mt-auto border-t border-slate-100 justify-end">
                    {etapa === 2 && (
                        <Botao
                            variante="secundario"
                            onClick={() => definirEtapa(1)}
                            disabled={carregando}
                        >
                            Voltar
                        </Botao>
                    )}

                    {etapa === 1 ? (
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
                    ) : (
                        <Botao
                            variante="primario"
                            tamanho="lg"
                            icone={CheckCircle}
                            onClick={manipularSalvar}
                            loading={carregando}
                        >
                            {turma ? 'Salvar Alterações' : 'Criar Turma'}
                        </Botao>
                    )}
                </div>
            </div>
        </ModalUniversal>
    );
}
