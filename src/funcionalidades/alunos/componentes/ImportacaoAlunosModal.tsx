import { useState } from 'react';
import ModalUniversal from '@compartilhado/componentes/ModalUniversal';
import { FileSpreadsheet, Clipboard, Upload, CheckCircle, XCircle, Info, ChevronRight, AlertCircle } from 'lucide-react';
import { read, utils } from 'xlsx';
import toast from 'react-hot-toast';
import { ResultadoImportacao } from '../types/aluno';
import { Botao } from '@compartilhado/componentes/UI';

interface ImportacaoAlunosModalProps {
    aoFechar: () => void;
    onImport: (dados: any[]) => Promise<ResultadoImportacao>;
}

export default function ImportacaoAlunosModal({ aoFechar, onImport }: ImportacaoAlunosModalProps) {
    const [abaAtiva, definirAbaAtiva] = useState<'arquivo' | 'colar'>('arquivo');
    const [importando, definirImportando] = useState(false);
    const [resultado, definirResultado] = useState<ResultadoImportacao | null>(null);
    const [textoColado, definirTextoColado] = useState('');

    const processarArquivo = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const arquivo = e.target.files?.[0];
        if (!arquivo) return;

        definirImportando(true);
        try {
            const data = await arquivo.arrayBuffer();
            const workbook = read(data);
            const worksheet = workbook.Sheets[workbook.SheetNames[0]];
            const jsonData = utils.sheet_to_json(worksheet);

            const res = await onImport(jsonData);
            definirResultado(res);
        } catch (erro) {
            console.error(erro);
            toast.error("Falha ao processar arquivo de dados.");
        } finally {
            definirImportando(false);
        }
    };

    const processarColagem = async () => {
        if (!textoColado.trim()) {
            toast.error("É necessário colar dados para processar.");
            return;
        }

        definirImportando(true);
        try {
            const linhas = textoColado.trim().split('\n');
            const data = linhas.map(linha => linha.split('\t'));

            if (data.length > 0) {
                const primeiraLinha = (data[0][0] || '').toLowerCase();
                if (primeiraLinha.includes('nome') || primeiraLinha.includes('matricula')) {
                    data.shift();
                }
            }

            const res = await onImport(data);
            definirResultado(res);
        } catch (erro) {
            console.error(erro);
            toast.error("Falha ao processar dados colados.");
        } finally {
            definirImportando(false);
        }
    };

    return (
        <ModalUniversal
            titulo="Importação Inteligente"
            subtitulo="Adição massiva de registros via Excel ou Buffer"
            aoFechar={aoFechar}
            icone={FileSpreadsheet}
            tamanho="lg"
        >
            {!resultado ? (
                <div className="space-y-8 pb-4">
                    {/* Seletor de Método (Tabs Premium V2) */}
                    <div className="flex p-1 bg-slate-50 rounded-lg border border-slate-200">
                        <button
                            onClick={() => definirAbaAtiva('arquivo')}
                            className={`flex-1 flex items-center justify-center gap-2 py-2.5 rounded-md text-[9px] font-black uppercase tracking-widest transition-all ${abaAtiva === 'arquivo' ? 'bg-slate-900 text-white shadow-sm' : 'text-slate-400 hover:text-slate-600'}`}
                        >
                            <FileSpreadsheet size={14} />
                            Planilha (XLSX/CSV)
                        </button>
                        <button
                            onClick={() => definirAbaAtiva('colar')}
                            className={`flex-1 flex items-center justify-center gap-2 py-2.5 rounded-md text-[9px] font-black uppercase tracking-widest transition-all ${abaAtiva === 'colar' ? 'bg-slate-900 text-white shadow-sm' : 'text-slate-400 hover:text-slate-600'}`}
                        >
                            <Clipboard size={14} />
                            Input Direto
                        </button>
                    </div>

                    <div className="animate-fade-in min-h-[220px]">
                        {abaAtiva === 'arquivo' ? (
                            <div className="space-y-6">
                                <div className="relative group overflow-hidden border-2 border-dashed border-slate-200 rounded-xl p-10 text-center hover:border-slate-400 hover:bg-slate-50 transition-all cursor-pointer bg-white">
                                    <input
                                        type="file"
                                        accept=".xlsx, .xls, .csv"
                                        onChange={processarArquivo}
                                        className="absolute inset-0 opacity-0 cursor-pointer z-10"
                                        disabled={importando}
                                    />
                                    <div className="flex flex-col items-center">
                                        <div className="w-14 h-14 bg-slate-50 text-slate-400 border border-slate-200 rounded-lg flex items-center justify-center mb-4 transition-transform shadow-sm">
                                            <Upload size={24} />
                                        </div>
                                        <h4 className="font-black text-slate-800 text-xs uppercase tracking-tight">Selecione ou arraste a planilha</h4>
                                        <p className="text-[9px] font-bold text-slate-400 mt-2 uppercase tracking-widest leading-none">Formatos aceitos: .xlsx, .xls, .csv</p>
                                    </div>
                                </div>

                                <div className="bg-slate-900 rounded-xl p-4 border border-slate-800 flex items-start gap-4">
                                    <div className="p-2 bg-slate-800 rounded-lg text-slate-400 shrink-0">
                                        <Info size={16} />
                                    </div>
                                    <div>
                                        <p className="text-[9px] font-black text-slate-300 uppercase tracking-widest mb-1 leading-none">Estrutura de Colunas</p>
                                        <p className="text-[10px] text-slate-500 leading-normal font-bold">
                                            Utilize as colunas <span className="text-slate-300">NOME_COMPLETO</span>, <span className="text-slate-300">MATRICULA</span> e <span className="text-slate-300">TURMA_ID</span>.
                                        </p>
                                    </div>
                                </div>
                            </div>
                        ) : (
                            <div className="space-y-6">
                                <div className="relative group">
                                    <label className="flex items-center gap-2 text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2 ml-1 transition-colors group-focus-within:text-slate-900">
                                        <Clipboard size={14} /> Buffer de Colagem
                                    </label>
                                    <textarea
                                        className="w-full h-44 p-5 bg-slate-50 border border-slate-200 rounded-xl text-sm font-bold text-slate-800 focus:outline-none focus:bg-white focus:border-slate-900 focus:ring-4 focus:ring-slate-900/5 transition-all placeholder:text-slate-400 resize-none font-mono custom-scrollbar"
                                        placeholder="Selecione os dados no Excel (Ctrl+C), e cole aqui (Ctrl+V)..."
                                        value={textoColado}
                                        onChange={(e) => definirTextoColado(e.target.value)}
                                    />
                                    <div className="absolute right-4 bottom-4 px-2 py-1 bg-white border border-slate-200 rounded text-[9px] font-black text-slate-500 pointer-events-none uppercase tracking-widest shadow-sm">
                                        {textoColado.length > 0 ? `${textoColado.trim().split('\n').length} Linhas` : 'Vazio'}
                                    </div>
                                </div>

                                <Botao
                                    onClick={processarColagem}
                                    disabled={!textoColado.trim()}
                                    loading={importando}
                                    fullWidth
                                    tamanho="lg"
                                    icone={ChevronRight}
                                    className="flex-row-reverse"
                                >
                                    Fase de Processamento
                                </Botao>
                            </div>
                        )}
                    </div>
                </div>
            ) : (
                <div className="py-2 animate-zoom-in">
                    <div className="text-center mb-8">
                        <div className="w-16 h-16 bg-slate-900 text-white rounded-xl flex items-center justify-center mb-5 mx-auto shadow-lg shadow-slate-900/10">
                            <CheckCircle size={32} strokeWidth={2.5} />
                        </div>
                        <h3 className="text-xl font-black text-slate-900 uppercase tracking-tight mb-1">Batch Concluído</h3>
                        <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest">Processamento massivo finalizado</p>
                    </div>

                    <div className="grid grid-cols-2 gap-4 mb-8">
                        <div className="bg-slate-50 p-6 rounded-xl border border-slate-200 text-center shadow-sm">
                            <p className="text-slate-900 font-black text-3xl mb-1 tracking-tighter">{resultado.sucessos}</p>
                            <p className="text-[9px] text-slate-400 font-black uppercase tracking-[0.2em]">Sincronizados</p>
                        </div>

                        <div className="bg-rose-50 p-6 rounded-xl border border-rose-100 text-center shadow-sm">
                            <p className="text-rose-700 font-black text-3xl mb-1 tracking-tighter">{resultado.erros}</p>
                            <p className="text-[9px] text-rose-500 font-black uppercase tracking-[0.2em]">Inconsistências</p>
                        </div>
                    </div>

                    <div className="bg-slate-50 rounded-lg p-5 border border-slate-200 mb-8 flex items-center gap-4">
                        <AlertCircle className="text-slate-400 shrink-0" size={18} />
                        <p className="text-[9px] font-bold text-slate-500 leading-normal uppercase tracking-wide">
                            Registros com incidência de erro devem ser validados individualmente no próximo painel.
                        </p>
                    </div>

                    <Botao
                        variante="secundario"
                        fullWidth
                        tamanho="lg"
                        onClick={aoFechar}
                    >
                        Pular para Listagem Atualizada
                    </Botao>
                </div>
            )}
        </ModalUniversal>
    );
}
