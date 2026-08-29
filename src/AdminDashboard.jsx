import { useEffect, useState } from 'react';
import { supabase } from './supabaseClient';
import { useNavigate } from 'react-router-dom';

export default function AdminDashboard() {
  const navigate = useNavigate();
  
  const [abaAtiva, setAbaAtiva] = useState('agenda');
  const [filtroAgenda, setFiltroAgenda] = useState('hoje'); // hoje, amanha, todos
  const [filtroFinanceiro, setFiltroFinanceiro] = useState('este_mes'); // hoje, este_mes, mes_passado
  
  const [financeiro, setFinanceiro] = useState([]);
  
  const [agendamentos, setAgendamentos] = useState([]);
  const [transacoes, setTransacoes] = useState([]);
  const [servicos, setServicos] = useState([]);
  const [loading, setLoading] = useState(true);

  // Estados dos Modais (Janelas flutuantes)
  const [modalAgendamento, setModalAgendamento] = useState(false);
  const [modalTransacao, setModalTransacao] = useState(false);

  // Formulários Manuais
  const [formNovoAgendamento, setFormNovoAgendamento] = useState({ cliente: '', telefone: '', servico_id: '', data: '', hora: '' });
  const [formTransacao, setFormTransacao] = useState({ tipo: 'SAIDA', descricao: '', valor: '' });

  useEffect(() => {
    async function checarSessao() {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        navigate('/login');
      } else {
        carregarDadosBase();
        carregarAgenda();
        carregarFinanceiro();
      }
    }
    checarSessao();
  }, [navigate]);

  useEffect(() => { carregarAgenda(); }, [filtroAgenda]);
  useEffect(() => { carregarFinanceiro(); }, [filtroFinanceiro]);

  async function carregarDadosBase() {
    const { data } = await supabase.from('servicos').select('*').eq('ativo', true);
    if (data) setServicos(data);
  }

  // --- 1. LÓGICA DA AGENDA ---
  async function carregarAgenda() {
    setLoading(true);
    let inicio = new Date();
    let fim = new Date();
    
    if (filtroAgenda === 'hoje') {
      inicio.setHours(0,0,0,0);
      fim.setHours(23,59,59,999);
    } else if (filtroAgenda === 'amanha') {
      inicio.setDate(inicio.getDate() + 1);
      inicio.setHours(0,0,0,0);
      fim.setDate(fim.getDate() + 1);
      fim.setHours(23,59,59,999);
    } else {
      inicio.setHours(0,0,0,0);
      fim.setFullYear(fim.getFullYear() + 1); // 1 ano pra frente
    }

    const { data } = await supabase
      .from('agendamentos')
      .select(`id, data_hora_inicio, status, clientes(nome, telefone), servicos(nome, duracao_minutos)`)
      .gte('data_hora_inicio', inicio.toISOString())
      .lte('data_hora_inicio', fim.toISOString())
      .order('data_hora_inicio', { ascending: true });

    if (data) setAgendamentos(data);
    setLoading(false);
  }

  // --- 2. LÓGICA DO FINANCEIRO ---
  async function carregarFinanceiro() {
    let inicio = new Date();
    let fim = new Date();

    if (filtroFinanceiro === 'hoje') {
      inicio.setHours(0,0,0,0);
      fim.setHours(23,59,59,999);
    } else if (filtroFinanceiro === 'este_mes') {
      inicio = new Date(inicio.getFullYear(), inicio.getMonth(), 1);
      fim = new Date(fim.getFullYear(), fim.getMonth() + 1, 0, 23, 59, 59);
    } else if (filtroFinanceiro === 'mes_passado') {
      inicio = new Date(inicio.getFullYear(), inicio.getMonth() - 1, 1);
      fim = new Date(fim.getFullYear(), fim.getMonth(), 0, 23, 59, 59);
    }

    // Puxa Cortes
    const { data: cortes } = await supabase.from('agendamentos').select(`id, status, servicos(preco), data_hora_inicio`).gte('data_hora_inicio', inicio.toISOString()).lte('data_hora_inicio', fim.toISOString()).eq('status', 'confirmado');
    // Puxa Transações (Despesas e Entradas Extras)
    const { data: transacs } = await supabase.from('transacoes').select('*').gte('data_hora', inicio.toISOString()).lte('data_hora', fim.toISOString());

    const totalCortes = cortes || [];
    const totalTransacoes = transacs || [];
    
    setFinanceiro(totalCortes);
    setTransacoes(totalTransacoes);
  }

  // --- AÇÕES DO BANCO (SALVAR MANUAIS) ---
  async function salvarAgendamentoManual(e) {
    e.preventDefault();
    let { data: cliente } = await supabase.from('clientes').select('id').eq('telefone', formNovoAgendamento.telefone).maybeSingle();
    if (!cliente) {
      const { data: novo } = await supabase.from('clientes').insert([{ nome: formNovoAgendamento.cliente, telefone: formNovoAgendamento.telefone }]).select().single();
      cliente = novo;
    }
    const { data: barbeiros } = await supabase.from('barbeiros').select('id').limit(1);
    const serv = servicos.find(s => s.id === formNovoAgendamento.servico_id);
    const inicioIso = new Date(`${formNovoAgendamento.data}T${formNovoAgendamento.hora}:00-03:00`);
    const fimIso = new Date(inicioIso.getTime() + (serv.duracao_minutos * 60000));

    await supabase.from('agendamentos').insert([{ cliente_id: cliente.id, barbeiro_id: barbeiros[0].id, servico_id: serv.id, data_hora_inicio: inicioIso.toISOString(), data_hora_fim: fimIso.toISOString(), status: 'confirmado' }]);
    setModalAgendamento(false);
    carregarAgenda();
  }

  async function salvarTransacaoManual(e) {
    e.preventDefault();
    await supabase.from('transacoes').insert([{ tipo: formTransacao.tipo, descricao: formTransacao.descricao, valor: formTransacao.valor }]);
    setModalTransacao(false);
    carregarFinanceiro();
  }

  async function handleSair() { await supabase.auth.signOut(); navigate('/login'); }

  // --- CÁLCULOS MATEMÁTICOS PARA O DASHBOARD ---
  const receitaCortes = financeiro.reduce((acc, curr) => acc + Number(curr.servicos?.preco || 0), 0);
  const entradasExtras = transacoes.filter(t => t.tipo === 'ENTRADA').reduce((acc, curr) => acc + Number(curr.valor), 0);
  const totalSaidas = transacoes.filter(t => t.tipo === 'SAIDA').reduce((acc, curr) => acc + Number(curr.valor), 0);
  
  const totalEntradas = receitaCortes + entradasExtras;
  const saldoLiquido = totalEntradas - totalSaidas;

  // Lógica do Gráfico de Barras
  const dadosGrafico = {};
  financeiro.forEach(ag => {
    const dia = new Date(ag.data_hora_inicio).toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' });
    dadosGrafico[dia] = (dadosGrafico[dia] || 0) + Number(ag.servicos?.preco || 0);
  });
  const maxFaturamentoDia = Math.max(...Object.values(dadosGrafico), 1); // Evita divisão por zero

  return (
    <div className="min-h-screen bg-black text-gray-100 font-sans pb-20">
      
      {/* HEADER */}
      <div className="bg-neutral-900 border-b border-neutral-800 p-4 sticky top-0 z-40 shadow-md">
        <div className="max-w-5xl mx-auto flex flex-col sm:flex-row justify-between items-center gap-4">
          <div className="text-center sm:text-left">
            <h1 className="text-2xl font-serif tracking-widest uppercase text-white">Painel de Gestão</h1>
            <p className="text-xs text-barber-accent tracking-[0.2em] uppercase">Raphael Halley</p>
          </div>
          <button onClick={handleSair} className="text-sm text-red-400 hover:text-red-300 transition-colors uppercase tracking-wider font-bold">Sair do Sistema</button>
        </div>

        {/* TABS PRINCIPAIS */}
        <div className="max-w-5xl mx-auto mt-6 flex gap-4 border-b border-neutral-800">
          <button onClick={() => setAbaAtiva('agenda')} className={`pb-3 px-2 text-sm uppercase tracking-widest font-bold transition-all ${abaAtiva === 'agenda' ? 'text-white border-b-2 border-white' : 'text-neutral-500 hover:text-neutral-300'}`}>📅 Agenda</button>
          <button onClick={() => setAbaAtiva('financeiro')} className={`pb-3 px-2 text-sm uppercase tracking-widest font-bold transition-all ${abaAtiva === 'financeiro' ? 'text-white border-b-2 border-white' : 'text-neutral-500 hover:text-neutral-300'}`}>💰 Financeiro</button>
        </div>
      </div>

      <div className="max-w-5xl mx-auto p-4 mt-4">
        {loading ? <div className="text-center text-neutral-500 mt-20 animate-pulse">Sincronizando dados...</div> : (
          <>
            {/* ================= ABA: AGENDA ================= */}
            {abaAtiva === 'agenda' && (
              <div className="animate-fade-in space-y-6">
                
                {/* Cabeçalho da Agenda (Filtros e Botão Novo) */}
                <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-6">
                  <div className="flex gap-2 overflow-x-auto hide-scroll w-full sm:w-auto pb-2">
                    <button onClick={() => setFiltroAgenda('hoje')} className={`px-4 py-2 text-xs font-bold uppercase tracking-widest rounded-md border ${filtroAgenda === 'hoje' ? 'bg-barber-light text-black border-barber-light' : 'bg-neutral-900 text-neutral-400 border-neutral-800'}`}>Hoje</button>
                    <button onClick={() => setFiltroAgenda('amanha')} className={`px-4 py-2 text-xs font-bold uppercase tracking-widest rounded-md border ${filtroAgenda === 'amanha' ? 'bg-barber-light text-black border-barber-light' : 'bg-neutral-900 text-neutral-400 border-neutral-800'}`}>Amanhã</button>
                    <button onClick={() => setFiltroAgenda('todos')} className={`px-4 py-2 text-xs font-bold uppercase tracking-widest rounded-md border ${filtroAgenda === 'todos' ? 'bg-barber-light text-black border-barber-light' : 'bg-neutral-900 text-neutral-400 border-neutral-800'}`}>Tudo</button>
                  </div>
                  <button onClick={() => setModalAgendamento(true)} className="bg-barber-accent text-white px-4 py-2 text-xs font-bold uppercase tracking-widest rounded-md shadow-md hover:bg-[#a67c52] transition-colors whitespace-nowrap w-full sm:w-auto">
                    + Adicionar Cliente
                  </button>
                </div>

                {/* Lista de Clientes */}
                {agendamentos.length === 0 ? (
                  <div className="bg-neutral-900 border border-neutral-800 p-8 rounded-md text-center text-neutral-500">Agenda livre para este período.</div>
                ) : (
                  <div className="grid gap-3">
                    {agendamentos.map(ag => {
                      const dataObj = new Date(ag.data_hora_inicio);
                      const diaSemana = dataObj.toLocaleDateString('pt-BR', { weekday: 'short' });
                      const hora = dataObj.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit', timeZone: 'America/Sao_Paulo' });
                      const isCancelado = ag.status === 'cancelado';

                      return (
                        <div key={ag.id} className={`p-4 rounded-md border flex items-center gap-4 transition-all ${isCancelado ? 'bg-red-950/20 border-red-900/30 opacity-50' : 'bg-neutral-900 border-neutral-800 hover:border-neutral-600'}`}>
                          <div className="text-center p-2 bg-black rounded-md border border-neutral-800 min-w-[70px]">
                            <p className="text-[10px] uppercase text-barber-accent font-bold tracking-wider mb-1">{diaSemana}</p>
                            <p className="text-lg font-bold text-white">{hora}</p>
                          </div>
                          <div className="flex-1">
                            <h3 className={`text-base font-serif tracking-wide ${isCancelado ? 'line-through text-red-400' : 'text-white'}`}>{ag.clientes?.nome}</h3>
                            <div className="flex gap-2 mt-1">
                              <span className="text-[10px] bg-neutral-800 text-neutral-300 px-2 py-0.5 rounded-sm uppercase tracking-wider">{ag.servicos?.nome}</span>
                            </div>
                          </div>
                          <div>
                            {isCancelado ? <span className="text-[10px] text-red-500 font-bold uppercase tracking-widest border border-red-900 px-2 py-1 rounded-sm">Cancelado</span> : <span className="text-[10px] text-green-400 font-bold uppercase tracking-widest border border-green-900 px-2 py-1 rounded-sm">Confirmado</span>}
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
              <div className="animate-fade-in space-y-8">
                
                {/* Cabeçalho do Financeiro */}
                <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                  <div className="flex gap-2 overflow-x-auto hide-scroll w-full sm:w-auto pb-2">
                    <button onClick={() => setFiltroFinanceiro('hoje')} className={`px-4 py-2 text-xs font-bold uppercase tracking-widest rounded-md border ${filtroFinanceiro === 'hoje' ? 'bg-barber-light text-black border-barber-light' : 'bg-neutral-900 text-neutral-400 border-neutral-800'}`}>Hoje</button>
                    <button onClick={() => setFiltroFinanceiro('este_mes')} className={`px-4 py-2 text-xs font-bold uppercase tracking-widest rounded-md border ${filtroFinanceiro === 'este_mes' ? 'bg-barber-light text-black border-barber-light' : 'bg-neutral-900 text-neutral-400 border-neutral-800'}`}>Este Mês</button>
                    <button onClick={() => setFiltroFinanceiro('mes_passado')} className={`px-4 py-2 text-xs font-bold uppercase tracking-widest rounded-md border ${filtroFinanceiro === 'mes_passado' ? 'bg-barber-light text-black border-barber-light' : 'bg-neutral-900 text-neutral-400 border-neutral-800'}`}>Mês Passado</button>
                  </div>
                  <button onClick={() => setModalTransacao(true)} className="bg-barber-accent text-white px-4 py-2 text-xs font-bold uppercase tracking-widest rounded-md shadow-md hover:bg-[#a67c52] transition-colors whitespace-nowrap w-full sm:w-auto">
                    + Movimentação
                  </button>
                </div>

                {/* Cards de Resumo */}
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                  <div className="bg-neutral-900 border border-neutral-800 p-6 rounded-md text-center shadow-lg border-b-4 border-b-green-500">
                    <span className="text-xs text-neutral-400 uppercase tracking-widest mb-1 block">Entradas Totais</span>
                    <span className="text-3xl font-serif text-white">R$ {totalEntradas.toFixed(2)}</span>
                  </div>
                  <div className="bg-neutral-900 border border-neutral-800 p-6 rounded-md text-center shadow-lg border-b-4 border-b-red-500">
                    <span className="text-xs text-neutral-400 uppercase tracking-widest mb-1 block">Saídas / Despesas</span>
                    <span className="text-3xl font-serif text-white">R$ {totalSaidas.toFixed(2)}</span>
                  </div>
                  <div className="bg-neutral-900 border border-neutral-800 p-6 rounded-md text-center shadow-lg border-b-4 border-b-blue-500">
                    <span className="text-xs text-neutral-400 uppercase tracking-widest mb-1 block">Saldo Líquido</span>
                    <span className="text-3xl font-serif text-white">R$ {saldoLiquido.toFixed(2)}</span>
                  </div>
                </div>

                {/* GRÁFICO VISUAL (Tailwind Puro) */}
                <div className="bg-neutral-900 border border-neutral-800 p-6 rounded-md shadow-lg">
                  <h3 className="text-xs uppercase tracking-widest text-neutral-400 mb-6 font-bold">Volume de Faturamento (Cortes)</h3>
                  
                  {Object.keys(dadosGrafico).length === 0 ? (
                    <div className="text-center text-neutral-600 py-10">Sem dados para gerar o gráfico neste período.</div>
                  ) : (
                    <div className="flex items-end gap-2 sm:gap-4 h-56 overflow-x-auto hide-scroll pt-4">
                      {Object.keys(dadosGrafico).sort().map(dia => {
                        const valor = dadosGrafico[dia];
                        const alturaPerc = (valor / maxFaturamentoDia) * 100;
                        return (
                          <div key={dia} className="flex flex-col justify-end items-center flex-1 min-w-[40px] group h-full">
                            <span className="text-[10px] text-barber-accent mb-2 opacity-0 group-hover:opacity-100 transition-opacity">R${valor.toFixed(2)}</span>
                            <div className="w-full bg-barber-light/80 hover:bg-barber-accent rounded-t-sm transition-all duration-500" style={{ height: `${alturaPerc}%`, minHeight: '4px' }}></div>
                            <span className="text-[10px] text-neutral-500 mt-2">{dia}</span>
                          </div>
                        )
                      })}
                    </div>
                  )}
                </div>

              </div>
            )}
          </>
        )}
      </div>

      {/* MODAL: Agendamento Manual */}
      {modalAgendamento && (
        <div className="fixed inset-0 bg-black/80 flex items-center justify-center p-4 z-50 animate-fade-in">
          <div className="bg-neutral-900 border border-neutral-700 p-6 rounded-md w-full max-w-md">
            <h2 className="text-lg font-serif tracking-widest text-white uppercase mb-4 border-b border-neutral-800 pb-2">Agendar Manualmente</h2>
            <form onSubmit={salvarAgendamentoManual} className="space-y-4">
              <input type="text" placeholder="Nome do Cliente" required onChange={e => setFormNovoAgendamento({...formNovoAgendamento, cliente: e.target.value})} className="w-full p-3 bg-black border border-neutral-700 rounded text-white text-sm" />
              <input type="tel" placeholder="Telefone (ex: 13999999999)" required onChange={e => setFormNovoAgendamento({...formNovoAgendamento, telefone: e.target.value})} className="w-full p-3 bg-black border border-neutral-700 rounded text-white text-sm" />
              <select required onChange={e => setFormNovoAgendamento({...formNovoAgendamento, servico_id: e.target.value})} className="w-full p-3 bg-black border border-neutral-700 rounded text-white text-sm">
                <option value="">Selecione o Serviço...</option>
                {servicos.map(s => <option key={s.id} value={s.id}>{s.nome}</option>)}
              </select>
              <div className="flex gap-2">
                <input type="date" required onChange={e => setFormNovoAgendamento({...formNovoAgendamento, data: e.target.value})} className="w-full p-3 bg-black border border-neutral-700 rounded text-white text-sm" style={{colorScheme:'dark'}}/>
                <input type="time" required onChange={e => setFormNovoAgendamento({...formNovoAgendamento, hora: e.target.value})} className="w-full p-3 bg-black border border-neutral-700 rounded text-white text-sm" style={{colorScheme:'dark'}}/>
              </div>
              <div className="flex gap-2 mt-6">
                <button type="button" onClick={() => setModalAgendamento(false)} className="flex-1 p-3 border border-neutral-600 text-neutral-400 rounded uppercase tracking-widest text-xs font-bold hover:bg-neutral-800">Cancelar</button>
                <button type="submit" className="flex-1 p-3 bg-barber-accent text-white rounded uppercase tracking-widest text-xs font-bold hover:bg-[#a67c52]">Salvar</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL: Transação (Entrada/Saída) */}
      {modalTransacao && (
        <div className="fixed inset-0 bg-black/80 flex items-center justify-center p-4 z-50 animate-fade-in">
          <div className="bg-neutral-900 border border-neutral-700 p-6 rounded-md w-full max-w-md">
            <h2 className="text-lg font-serif tracking-widest text-white uppercase mb-4 border-b border-neutral-800 pb-2">Nova Movimentação</h2>
            <form onSubmit={salvarTransacaoManual} className="space-y-4">
              <select required value={formTransacao.tipo} onChange={e => setFormTransacao({...formTransacao, tipo: e.target.value})} className="w-full p-3 bg-black border border-neutral-700 rounded text-white text-sm font-bold">
                <option value="SAIDA">🔴 Saída / Despesa</option>
                <option value="ENTRADA">🟢 Entrada Extra (Vendas, etc)</option>
              </select>
              <input type="text" placeholder="Descrição (ex: Conta de Luz, Pomada)" required onChange={e => setFormTransacao({...formTransacao, descricao: e.target.value})} className="w-full p-3 bg-black border border-neutral-700 rounded text-white text-sm" />
              <input type="number" step="0.01" placeholder="Valor (R$)" required onChange={e => setFormTransacao({...formTransacao, valor: e.target.value})} className="w-full p-3 bg-black border border-neutral-700 rounded text-white text-sm" />
              <div className="flex gap-2 mt-6">
                <button type="button" onClick={() => setModalTransacao(false)} className="flex-1 p-3 border border-neutral-600 text-neutral-400 rounded uppercase tracking-widest text-xs font-bold hover:bg-neutral-800">Cancelar</button>
                <button type="submit" className={`flex-1 p-3 text-white rounded uppercase tracking-widest text-xs font-bold ${formTransacao.tipo === 'SAIDA' ? 'bg-red-700 hover:bg-red-600' : 'bg-green-700 hover:bg-green-600'}`}>Registrar</button>
              </div>
            </form>
          </div>
        </div>
      )}

    </div>
  );
}