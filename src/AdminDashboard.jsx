import { useEffect, useState } from 'react';
import { supabase } from './supabaseClient';
import { useNavigate } from 'react-router-dom';

export default function AdminDashboard() {
  const navigate = useNavigate();
  
  // Controle de Abas e Filtros
  const [abaAtiva, setAbaAtiva] = useState('agenda'); // 'agenda' | 'financeiro'
  const [filtroTempo, setFiltroTempo] = useState('hoje'); // 'hoje' | '7dias' | '30dias'
  
  // Dados
  const [agendamentos, setAgendamentos] = useState([]);
  const [financeiro, setFinanceiro] = useState([]);
  const [loading, setLoading] = useState(true);

  // Autenticação e Carregamento inicial
  useEffect(() => {
    async function checarSessao() {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        navigate('/login');
      } else {
        carregarAgenda();
        carregarFinanceiro('hoje');
      }
    }
    checarSessao();
  }, [navigate]);

  // Recarrega o financeiro quando o filtro muda
  useEffect(() => {
    carregarFinanceiro(filtroTempo);
  }, [filtroTempo]);

  // 1. BUSCA AGENDA (Foco no Operacional: Hoje para frente)
  async function carregarAgenda() {
    setLoading(true);
    const hojeIso = new Date().toISOString().split('T')[0] + 'T00:00:00-03:00';

    const { data, error } = await supabase
      .from('agendamentos')
      .select(`
        id,
        data_hora_inicio,
        status,
        clientes ( nome, telefone ),
        servicos ( nome, preco, duracao_minutos )
      `)
      .gte('data_hora_inicio', hojeIso)
      .order('data_hora_inicio', { ascending: true });

    if (!error && data) {
      setAgendamentos(data);
    }
    setLoading(false);
  }

  // 2. BUSCA FINANCEIRO (Foco Analítico: Baseado no Filtro)
  async function carregarFinanceiro(filtro) {
    const hoje = new Date();
    let dataInicio = new Date();

    if (filtro === 'hoje') {
      dataInicio.setHours(0, 0, 0, 0);
    } else if (filtro === '7dias') {
      dataInicio.setDate(hoje.getDate() - 7);
    } else if (filtro === '30dias') {
      dataInicio.setDate(hoje.getDate() - 30);
    }

    const inicioIso = dataInicio.toISOString();

    const { data, error } = await supabase
      .from('agendamentos')
      .select(`
        id,
        status,
        servicos ( preco )
      `)
      .gte('data_hora_inicio', inicioIso)
      .eq('status', 'confirmado'); // Apenas os confirmados/concluídos geram receita

    if (!error && data) {
      setFinanceiro(data);
    }
  }

  async function handleSair() {
    await supabase.auth.signOut();
    navigate('/login');
  }

  // Cálculos Financeiros
  const faturamentoTotal = financeiro.reduce((acc, curr) => acc + Number(curr.servicos?.preco || 0), 0);
  const totalCortes = financeiro.length;
  const ticketMedio = totalCortes > 0 ? faturamentoTotal / totalCortes : 0;

  // Formatação de Data para a Agenda (Ex: Segunda-feira, 28/08 às 15:00)
  const formatarDataAgenda = (dataIso) => {
    const dataObj = new Date(dataIso);
    const diaSemana = dataObj.toLocaleDateString('pt-BR', { weekday: 'long' });
    const dataCurta = dataObj.toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' });
    const hora = dataObj.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit', timeZone: 'America/Sao_Paulo' });
    
    return {
      semana: diaSemana.charAt(0).toUpperCase() + diaSemana.slice(1),
      data: dataCurta,
      hora: hora
    };
  };

  return (
    <div className="min-h-screen bg-black text-gray-100 font-sans pb-20">
      
      {/* HEADER & NAVEGAÇÃO SUPERIOR */}
      <div className="bg-neutral-900 border-b border-neutral-800 p-4 sticky top-0 z-50 shadow-md">
        <div className="max-w-4xl mx-auto flex flex-col sm:flex-row justify-between items-center gap-4">
          <div className="text-center sm:text-left">
            <h1 className="text-2xl font-serif tracking-widest uppercase text-white">Painel de Gestão</h1>
            <p className="text-xs text-gray-400 tracking-[0.2em] uppercase">Raphael Halley</p>
          </div>
          <button onClick={handleSair} className="text-sm text-red-400 hover:text-red-300 transition-colors uppercase tracking-wider font-bold">
            Sair do Sistema
          </button>
        </div>

        {/* TABS (Abas) */}
        <div className="max-w-4xl mx-auto mt-6 flex gap-4 border-b border-neutral-800">
          <button 
            onClick={() => setAbaAtiva('agenda')}
            className={`pb-3 px-2 text-sm uppercase tracking-widest font-bold transition-all ${abaAtiva === 'agenda' ? 'text-white border-b-2 border-white' : 'text-neutral-500 hover:text-neutral-300'}`}
          >
            📅 Agenda
          </button>
          <button 
            onClick={() => setAbaAtiva('financeiro')}
            className={`pb-3 px-2 text-sm uppercase tracking-widest font-bold transition-all ${abaAtiva === 'financeiro' ? 'text-white border-b-2 border-white' : 'text-neutral-500 hover:text-neutral-300'}`}
          >
            💰 Financeiro
          </button>
        </div>
      </div>

      {/* CONTEÚDO PRINCIPAL */}
      <div className="max-w-4xl mx-auto p-4 mt-6">
        
        {loading ? (
          <div className="text-center text-neutral-500 mt-20 animate-pulse">Carregando dados...</div>
        ) : (
          <>
            {/* ================= ABA: AGENDA ================= */}
            {abaAtiva === 'agenda' && (
              <div className="animate-fade-in space-y-6">
                <h2 className="text-lg uppercase tracking-widest font-bold text-neutral-300 mb-4">Próximos Atendimentos</h2>
                
                {agendamentos.length === 0 ? (
                  <div className="bg-neutral-900 border border-neutral-800 p-8 rounded-md text-center text-neutral-500">
                    Nenhum agendamento encontrado para os próximos dias.
                  </div>
                ) : (
                  <div className="grid gap-4">
                    {agendamentos.map(ag => {
                      const { semana, data, hora } = formatarDataAgenda(ag.data_hora_inicio);
                      const isCancelado = ag.status === 'cancelado';

                      return (
                        <div key={ag.id} className={`p-5 rounded-md border flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 transition-all ${isCancelado ? 'bg-red-950/20 border-red-900/30 opacity-60' : 'bg-neutral-900 border-neutral-800 hover:border-neutral-600'}`}>
                          
                          {/* Bloco de Data e Hora */}
                          <div className="flex items-center gap-4 min-w-[150px]">
                            <div className="text-center p-3 bg-black rounded-md border border-neutral-800">
                              <p className="text-xs uppercase text-neutral-400 tracking-wider mb-1">{semana}</p>
                              <p className="text-xl font-bold text-white leading-none">{hora}</p>
                              <p className="text-[10px] text-neutral-500 mt-1">{data}</p>
                            </div>
                          </div>

                          {/* Dados do Cliente e Serviço */}
                          <div className="flex-1">
                            <h3 className={`text-lg font-serif tracking-wide ${isCancelado ? 'text-red-400 line-through' : 'text-white'}`}>
                              {ag.clientes?.nome || 'Cliente não identificado'}
                            </h3>
                            <p className="text-sm text-neutral-400 mt-1">📱 {ag.clientes?.telefone || 'Sem número'}</p>
                            <div className="flex items-center gap-2 mt-2">
                              <span className="text-xs bg-neutral-800 text-neutral-300 px-2 py-1 rounded-sm uppercase tracking-wider">
                                {ag.servicos?.nome || 'Serviço excluído'}
                              </span>
                              <span className="text-xs text-neutral-500">{ag.servicos?.duracao_minutos} min</span>
                            </div>
                          </div>

                          {/* Status */}
                          <div className="flex-shrink-0">
                            {isCancelado ? (
                              <span className="text-xs text-red-500 font-bold uppercase tracking-widest border border-red-900 px-3 py-1 rounded-full">Cancelado</span>
                            ) : (
                              <span className="text-xs text-green-400 font-bold uppercase tracking-widest border border-green-900 px-3 py-1 rounded-full">Confirmado</span>
                            )}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            )}

            {/* ================= ABA: FINANCEIRO ================= */}
            {abaAtiva === 'financeiro' && (
              <div className="animate-fade-in space-y-6">
                
                {/* Filtros */}
                <div className="flex gap-2 mb-6 overflow-x-auto hide-scroll pb-2">
                  <button onClick={() => setFiltroTempo('hoje')} className={`px-4 py-2 text-xs font-bold uppercase tracking-widest rounded-md border transition-all whitespace-nowrap ${filtroTempo === 'hoje' ? 'bg-white text-black border-white' : 'bg-neutral-900 text-neutral-400 border-neutral-800 hover:bg-neutral-800'}`}>Hoje</button>
                  <button onClick={() => setFiltroTempo('7dias')} className={`px-4 py-2 text-xs font-bold uppercase tracking-widest rounded-md border transition-all whitespace-nowrap ${filtroTempo === '7dias' ? 'bg-white text-black border-white' : 'bg-neutral-900 text-neutral-400 border-neutral-800 hover:bg-neutral-800'}`}>Últimos 7 Dias</button>
                  <button onClick={() => setFiltroTempo('30dias')} className={`px-4 py-2 text-xs font-bold uppercase tracking-widest rounded-md border transition-all whitespace-nowrap ${filtroTempo === '30dias' ? 'bg-white text-black border-white' : 'bg-neutral-900 text-neutral-400 border-neutral-800 hover:bg-neutral-800'}`}>Últimos 30 Dias</button>
                </div>

                {/* Cards de Indicadores */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div className="bg-neutral-900 border border-neutral-800 p-6 rounded-md flex flex-col justify-center items-center text-center">
                    <span className="text-xs text-neutral-500 uppercase tracking-widest mb-2">Faturamento</span>
                    <span className="text-4xl font-serif text-white">R$ {faturamentoTotal.toFixed(2)}</span>
                  </div>
                  
                  <div className="bg-neutral-900 border border-neutral-800 p-6 rounded-md flex flex-col justify-center items-center text-center">
                    <span className="text-xs text-neutral-500 uppercase tracking-widest mb-2">Cortes Realizados</span>
                    <span className="text-4xl font-serif text-white">{totalCortes}</span>
                  </div>

                  <div className="bg-neutral-900 border border-neutral-800 p-6 rounded-md flex flex-col justify-center items-center text-center">
                    <span className="text-xs text-neutral-500 uppercase tracking-widest mb-2">Ticket Médio</span>
                    <span className="text-4xl font-serif text-white">R$ {ticketMedio.toFixed(2)}</span>
                  </div>
                </div>

              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}