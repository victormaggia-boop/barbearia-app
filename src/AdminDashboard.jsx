import { useEffect, useState } from 'react';
import { supabase } from './supabaseClient';
import { useNavigate } from 'react-router-dom';

export default function AdminDashboard() {
  const navigate = useNavigate();
  
  const [perfilUsuario, setPerfilUsuario] = useState(null);

  const [abaAtiva, setAbaAtiva] = useState('agenda');
  const [filtroAgenda, setFiltroAgenda] = useState('hoje');
  const [filtroFinanceiro, setFiltroFinanceiro] = useState('este_mes');
  
  const [financeiro, setFinanceiro] = useState([]);
  const [agendamentos, setAgendamentos] = useState([]);
  const [transacoes, setTransacoes] = useState([]);
  const [servicos, setServicos] = useState([]);
  const [equipe, setEquipe] = useState([]); // Novo estado para a Equipe
  const [loading, setLoading] = useState(true);

  const [modalAgendamento, setModalAgendamento] = useState(false);
  const [modalTransacao, setModalTransacao] = useState(false);
  const [modalDetalhes, setModalDetalhes] = useState(null);
  const [modalEquipe, setModalEquipe] = useState(false); // Novo modal

  // Atualizado para incluir o profissional_id
  const [formNovoAgendamento, setFormNovoAgendamento] = useState({ cliente: '', telefone: '', servico_id: '', profissional_id: '', data: '', hora: '' });
  const [formTransacao, setFormTransacao] = useState({ tipo: 'SAIDA', descricao: '', valor: '' });
  const [formNovaEquipe, setFormNovaEquipe] = useState({ nome: '', telefone: '' }); // Novo formulário

  useEffect(() => {
    async function inicializarSistema() {
      const { data: { session } } = await supabase.auth.getSession();
      
      if (!session) {
        navigate('/admin');
        return;
      }

      const { data: perfil } = await supabase
        .from('barbeiros')
        .select('id, nome, cargo, empresa_id')
        .eq('user_id', session.user.id)
        .maybeSingle();

      if (perfil) {
        setPerfilUsuario(perfil);
      } else {
        alert("Erro: Seu usuário não está vinculado a uma empresa.");
        await supabase.auth.signOut();
        navigate('/admin');
      }
    }
    inicializarSistema();
  }, [navigate]);

  useEffect(() => { 
    if (perfilUsuario) {
      carregarDadosBase();
      carregarEquipe();
    }
  }, [perfilUsuario]);
  
  useEffect(() => { if (perfilUsuario) carregarAgenda(); }, [filtroAgenda, perfilUsuario]);
  useEffect(() => { if (perfilUsuario && perfilUsuario.cargo === 'dono') carregarFinanceiro(); }, [filtroFinanceiro, perfilUsuario]);

  async function carregarDadosBase() {
    const { data } = await supabase.from('servicos').select('*').eq('empresa_id', perfilUsuario.empresa_id).eq('ativo', true);
    if (data) setServicos(data);
  }

  async function carregarEquipe() {
    const { data } = await supabase.from('barbeiros').select('*').eq('empresa_id', perfilUsuario.empresa_id);
    if (data) setEquipe(data);
  }

  async function carregarAgenda() {
    setLoading(true);
    let inicio = new Date();
    let fim = new Date();
    
    if (filtroAgenda === 'hoje') {
      inicio.setHours(0,0,0,0); fim.setHours(23,59,59,999);
    } else if (filtroAgenda === 'amanha') {
      inicio.setDate(inicio.getDate() + 1); inicio.setHours(0,0,0,0);
      fim.setDate(fim.getDate() + 1); fim.setHours(23,59,59,999);
    } else {
      inicio.setHours(0,0,0,0); fim.setFullYear(fim.getFullYear() + 1);
    }

    const { data } = await supabase.from('agendamentos')
      .select(`id, data_hora_inicio, status, clientes(nome, telefone), servicos(nome, duracao_minutos, preco), barbeiros(nome)`)
      .eq('empresa_id', perfilUsuario.empresa_id)
      .gte('data_hora_inicio', inicio.toISOString())
      .lte('data_hora_inicio', fim.toISOString())
      .order('data_hora_inicio', { ascending: true });

    if (data) setAgendamentos(data);
    setLoading(false);
  }

  async function carregarFinanceiro() {
    let inicio = new Date();
    let fim = new Date();

    if (filtroFinanceiro === 'hoje') {
      inicio.setHours(0,0,0,0); fim.setHours(23,59,59,999);
    } else if (filtroFinanceiro === 'este_mes') {
      inicio = new Date(inicio.getFullYear(), inicio.getMonth(), 1);
      fim = new Date(fim.getFullYear(), fim.getMonth() + 1, 0, 23, 59, 59);
    } else if (filtroFinanceiro === 'mes_passado') {
      inicio = new Date(inicio.getFullYear(), inicio.getMonth() - 1, 1);
      fim = new Date(fim.getFullYear(), fim.getMonth(), 0, 23, 59, 59);
    }

    const { data: cortes } = await supabase.from('agendamentos').select(`id, status, data_hora_inicio, servicos(nome, preco), clientes(nome)`)
      .eq('empresa_id', perfilUsuario.empresa_id)
      .gte('data_hora_inicio', inicio.toISOString()).lte('data_hora_inicio', fim.toISOString())
      .in('status', ['confirmado', 'concluido']);
      
    const { data: transacs } = await supabase.from('transacoes').select('*')
      .eq('empresa_id', perfilUsuario.empresa_id)
      .gte('data_hora', inicio.toISOString()).lte('data_hora', fim.toISOString());

    setFinanceiro(cortes || []);
    setTransacoes(transacs || []);
  }

  async function alterarStatus(id, novoStatus) {
    await supabase.from('agendamentos').update({ status: novoStatus }).eq('id', id);
    carregarAgenda();
    if (perfilUsuario.cargo === 'dono') carregarFinanceiro();
  }

  async function salvarAgendamentoManual(e) {
    e.preventDefault();
    let { data: cliente } = await supabase.from('clientes')
      .select('id').eq('telefone', formNovoAgendamento.telefone).eq('empresa_id', perfilUsuario.empresa_id).maybeSingle();
      
    if (!cliente) {
      const { data: novo } = await supabase.from('clientes')
        .insert([{ nome: formNovoAgendamento.cliente, telefone: formNovoAgendamento.telefone, empresa_id: perfilUsuario.empresa_id }])
        .select().single();
      cliente = novo;
    }
    
    const serv = servicos.find(s => s.id === formNovoAgendamento.servico_id);
    const inicioIso = new Date(`${formNovoAgendamento.data}T${formNovoAgendamento.hora}:00-03:00`);
    const fimIso = new Date(inicioIso.getTime() + (serv.duracao_minutos * 60000));

    await supabase.from('agendamentos').insert([{ 
      cliente_id: cliente.id, 
      barbeiro_id: formNovoAgendamento.profissional_id || perfilUsuario.id, // Usa o selecionado ou o logado
      servico_id: serv.id, 
      empresa_id: perfilUsuario.empresa_id, 
      data_hora_inicio: inicioIso.toISOString(), 
      data_hora_fim: fimIso.toISOString(), 
      status: 'confirmado' 
    }]);
    
    setModalAgendamento(false);
    carregarAgenda();
  }

  async function salvarTransacaoManual(e) {
    e.preventDefault();
    await supabase.from('transacoes').insert([{ 
      tipo: formTransacao.tipo, descricao: formTransacao.descricao, valor: formTransacao.valor, empresa_id: perfilUsuario.empresa_id 
    }]);
    setModalTransacao(false);
    carregarFinanceiro();
  }

  // NOVA FUNÇÃO: Salvar novo membro da equipe (Com aviso de Erros)
  async function salvarProfissional(e) {
    e.preventDefault();
    
    const { error } = await supabase.from('barbeiros').insert([{ 
      nome: formNovaEquipe.nome, 
      telefone: formNovaEquipe.telefone, 
      empresa_id: perfilUsuario.empresa_id,
      cargo: 'profissional'
    }]);

    if (error) {
      alert("Erro do Banco de Dados: " + error.message);
      console.error(error);
    } else {
      setModalEquipe(false);
      setFormNovaEquipe({ nome: '', telefone: '' }); // Limpa o formulário
      carregarEquipe();
    }
  }

  async function handleSair() { await supabase.auth.signOut(); navigate('/admin'); }

  const listaEntradasCortes = financeiro.map(ag => ({
    id: ag.id, data: ag.data_hora_inicio, titulo: ag.servicos?.nome || 'Serviço',
    subtitulo: ag.clientes?.nome || 'Cliente', valor: Number(ag.servicos?.preco || 0),
    tipo: 'ENTRADA', tag: 'Serviço'
  }));

  const listaEntradasExtras = transacoes.filter(t => t.tipo === 'ENTRADA').map(t => ({
    id: t.id, data: t.data_hora, titulo: t.descricao, subtitulo: 'Entrada Extra',
    valor: Number(t.valor), tipo: 'ENTRADA', tag: 'Extra'
  }));

  const listaSaidas = transacoes.filter(t => t.tipo === 'SAIDA').map(t => ({
    id: t.id, data: t.data_hora, titulo: t.descricao, subtitulo: 'Despesa / Pagamento',
    valor: Number(t.valor), tipo: 'SAIDA', tag: 'Saída'
  }));

  const todasEntradas = [...listaEntradasCortes, ...listaEntradasExtras].sort((a,b) => new Date(b.data) - new Date(a.data));
  const todasSaidas = [...listaSaidas].sort((a,b) => new Date(b.data) - new Date(a.data));
  const todasMovimentacoes = [...todasEntradas, ...todasSaidas].sort((a,b) => new Date(b.data) - new Date(a.data));

  const totalEntradas = todasEntradas.reduce((acc, curr) => acc + curr.valor, 0);
  const totalSaidas = todasSaidas.reduce((acc, curr) => acc + curr.valor, 0);
  const saldoLiquido = totalEntradas - totalSaidas;

  const dadosGrafico = {};
  financeiro.forEach(ag => {
    const dia = new Date(ag.data_hora_inicio).toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' });
    dadosGrafico[dia] = (dadosGrafico[dia] || 0) + Number(ag.servicos?.preco || 0);
  });
  const maxFaturamentoDia = Math.max(...Object.values(dadosGrafico), 1);

  let detalhesAtuais = [];
  let tituloDetalhes = '';
  if (modalDetalhes === 'ENTRADAS') { detalhesAtuais = todasEntradas; tituloDetalhes = 'Detalhamento de Entradas'; }
  else if (modalDetalhes === 'SAIDAS') { detalhesAtuais = todasSaidas; tituloDetalhes = 'Detalhamento de Saídas'; }
  else if (modalDetalhes === 'GERAL') { detalhesAtuais = todasMovimentacoes; tituloDetalhes = 'Extrato Geral'; }

  const brandStyles = `
    @import url('https://fonts.googleapis.com/css2?family=Fraunces:ital,opsz,wght@0,9..144,400;0,9..144,600;0,9..144,700;0,9..144,900;1,9..144,500;1,9..144,600&family=Work+Sans:wght@400;500;600;700&family=Space+Mono:wght@400;700&display=swap');
    .brand-theme {
      --leather: #16130F; --leather-2: #1D1912; --leather-3: #241F17;
      --brass: #C9A24B; --brass-bright: #E4C066;
      --copper: #A85C2E; --copper-bright: #C97A44;
      --paper: #EFE6D8; --paper-dim: #9C9182;
      --line: rgba(201,162,75,0.16); --green: #7FA86B;
      font-family: 'Work Sans', sans-serif;
      background-color: var(--leather);
      color: var(--paper);
    }
    .font-fraunces { font-family: 'Fraunces', serif; }
    .font-mono { font-family: 'Space Mono', monospace; }
    .hide-scroll::-webkit-scrollbar { display: none; }
    .hide-scroll { -ms-overflow-style: none; scrollbar-width: none; }
  `;

  return (
    <>
      <style>{brandStyles}</style>
      <div className="brand-theme min-h-screen flex flex-col md:flex-row antialiased text-[14px]">
        
        {/* SIDEBAR */}
        <div className="w-full md:w-[220px] shrink-0 bg-[var(--leather-2)] border-b md:border-b-0 md:border-r border-[var(--line)] p-4 md:p-5 flex flex-row md:flex-col justify-between md:justify-start items-center md:items-stretch z-10 sticky top-0 md:h-screen">
          <div className="flex items-center gap-3 md:mb-8">
            <img src="/BFB3EEA2-F7C6-4AD7-9E2D-384F1676CCB4.JPG" alt="Logo" className="w-9 h-9 md:w-10 md:h-10 rounded-full border-[1.5px] border-[var(--brass)] object-cover shadow-lg" />
            <div className="font-fraunces font-black text-[13px] md:text-[14.5px] leading-tight">BARBER<br/>HALLEY</div>
          </div>
          
          <div className="hidden md:block font-mono text-[10px] tracking-[.1em] uppercase text-[var(--paper-dim)] my-4 px-3">Operação</div>
          <div className="flex flex-row md:flex-col gap-2">
            <button onClick={() => setAbaAtiva('agenda')} className={`px-3 py-2 md:py-2.5 rounded-md text-[13px] font-medium transition-all ${abaAtiva === 'agenda' ? 'bg-[rgba(201,162,75,0.10)] text-[var(--brass-bright)] border border-[rgba(201,162,75,0.25)]' : 'text-[var(--paper-dim)] hover:bg-[var(--leather-3)]'}`}>Agenda</button>
            
            {perfilUsuario?.cargo === 'dono' && (
              <>
                <button onClick={() => setAbaAtiva('financeiro')} className={`px-3 py-2 md:py-2.5 rounded-md text-[13px] font-medium transition-all ${abaAtiva === 'financeiro' ? 'bg-[rgba(201,162,75,0.10)] text-[var(--brass-bright)] border border-[rgba(201,162,75,0.25)]' : 'text-[var(--paper-dim)] hover:bg-[var(--leather-3)]'}`}>Financeiro</button>
                <button onClick={() => setAbaAtiva('equipe')} className={`px-3 py-2 md:py-2.5 rounded-md text-[13px] font-medium transition-all ${abaAtiva === 'equipe' ? 'bg-[rgba(201,162,75,0.10)] text-[var(--brass-bright)] border border-[rgba(201,162,75,0.25)]' : 'text-[var(--paper-dim)] hover:bg-[var(--leather-3)]'}`}>Equipe</button>
              </>
            )}
          </div>
          
          <div className="hidden md:block mt-auto pt-4 border-t border-[var(--line)] text-xs text-[var(--paper-dim)]">
            <div className="mb-3 px-3 font-mono text-[10px] text-[var(--brass)] uppercase tracking-widest">{perfilUsuario?.nome}</div>
            <button onClick={handleSair} className="hover:text-[var(--copper-bright)] transition-colors w-full text-left px-3">Sair do Sistema</button>
          </div>
        </div>

        {/* MAIN CONTENT */}
        <div className="flex-1 p-5 md:p-9 pb-24 overflow-y-auto">
          
          <div className="flex flex-col sm:flex-row justify-between items-start mb-8 gap-4">
            <div>
              <div className="font-mono text-[11px] tracking-[.14em] uppercase text-[var(--brass)] mb-2">Painel de Gestão</div>
              <h1 className="font-fraunces font-extrabold text-[28px] m-0 tracking-[-.01em]">
                {abaAtiva === 'agenda' ? 'Sua Agenda' : abaAtiva === 'financeiro' ? 'Relatório Financeiro' : 'Sua Equipe'}
              </h1>
            </div>
            
            <div className="w-full sm:w-auto text-right flex gap-2">
              {abaAtiva === 'equipe' ? (
                <button onClick={() => setModalEquipe(true)} className="w-full sm:w-auto font-semibold text-[12.5px] px-4 py-[9px] rounded-[5px] border-none bg-[var(--brass)] text-[var(--leather)] cursor-pointer hover:bg-[var(--brass-bright)] transition-colors shadow-lg">
                  + Novo Profissional
                </button>
              ) : (
                <button onClick={() => setModalAgendamento(true)} className="w-full sm:w-auto font-semibold text-[12.5px] px-4 py-[9px] rounded-[5px] border-none bg-[var(--brass)] text-[var(--leather)] cursor-pointer hover:bg-[var(--brass-bright)] transition-colors shadow-lg">
                  + Novo agendamento
                </button>
              )}
              
              {perfilUsuario?.cargo === 'dono' && abaAtiva === 'financeiro' && (
                <button onClick={() => setModalTransacao(true)} className="w-full sm:w-auto font-semibold text-[12.5px] px-4 py-[9px] rounded-[5px] border border-[var(--brass)] bg-transparent text-[var(--brass)] cursor-pointer hover:bg-[rgba(201,162,75,0.1)] transition-colors shadow-lg">
                  + Lançar Transação
                </button>
              )}
            </div>
          </div>

          {loading ? <div className="text-center text-[var(--paper-dim)] mt-20 animate-pulse font-mono text-xs">Sincronizando dados...</div> : (
            <>
              {/* ABA: AGENDA */}
              {abaAtiva === 'agenda' && (
                <div className="animate-fade-in max-w-5xl">
                  <div className="flex gap-2 overflow-x-auto hide-scroll pb-4 mb-2">
                    <button onClick={() => setFiltroAgenda('hoje')} className={`px-4 py-2 text-[11px] font-mono uppercase tracking-[.06em] rounded border transition-all ${filtroAgenda === 'hoje' ? 'bg-[var(--leather-3)] text-[var(--brass-bright)] border-[var(--brass)]' : 'bg-transparent text-[var(--paper-dim)] border-[var(--line)] hover:border-[var(--brass)]'}`}>Hoje</button>
                    <button onClick={() => setFiltroAgenda('amanha')} className={`px-4 py-2 text-[11px] font-mono uppercase tracking-[.06em] rounded border transition-all ${filtroAgenda === 'amanha' ? 'bg-[var(--leather-3)] text-[var(--brass-bright)] border-[var(--brass)]' : 'bg-transparent text-[var(--paper-dim)] border-[var(--line)] hover:border-[var(--brass)]'}`}>Amanhã</button>
                    <button onClick={() => setFiltroAgenda('todos')} className={`px-4 py-2 text-[11px] font-mono uppercase tracking-[.06em] rounded border transition-all ${filtroAgenda === 'todos' ? 'bg-[var(--leather-3)] text-[var(--brass-bright)] border-[var(--brass)]' : 'bg-transparent text-[var(--paper-dim)] border-[var(--line)] hover:border-[var(--brass)]'}`}>Próximos</button>
                  </div>

                  <div className="bg-[var(--leather-2)] border border-[var(--line)] rounded-lg p-5">
                    <div className="flex justify-between items-center border-b border-[var(--line)] pb-4 mb-4">
                      <span className="font-fraunces font-bold text-[16px] text-[var(--paper)]">Resumo da Agenda</span>
                      <div className="font-mono text-[11px] text-[var(--paper-dim)]">
                        <span className="text-[var(--brass-bright)] font-bold">{agendamentos.length}</span> Cortes · <span className="text-[var(--green)] font-bold">{agendamentos.filter(a => a.status === 'concluido').length}</span> Concluídos
                      </div>
                    </div>

                    {agendamentos.length === 0 ? (
                      <div className="text-center py-8 text-[var(--paper-dim)] font-mono text-xs">Agenda livre para este período.</div>
                    ) : (
                      <div className="overflow-x-auto">
                        <table className="w-full border-collapse min-w-[650px]">
                          <thead>
                            <tr>
                              <th className="text-left font-mono text-[10px] uppercase tracking-[.06em] text-[var(--paper-dim)] font-normal pb-3 border-b border-[var(--line)] pl-2">Data / Hora</th>
                              <th className="text-left font-mono text-[10px] uppercase tracking-[.06em] text-[var(--paper-dim)] font-normal pb-3 border-b border-[var(--line)]">Cliente</th>
                              <th className="text-left font-mono text-[10px] uppercase tracking-[.06em] text-[var(--paper-dim)] font-normal pb-3 border-b border-[var(--line)]">Profissional</th>
                              <th className="text-left font-mono text-[10px] uppercase tracking-[.06em] text-[var(--paper-dim)] font-normal pb-3 border-b border-[var(--line)]">Serviço & Valor</th>
                              <th className="text-right font-mono text-[10px] uppercase tracking-[.06em] text-[var(--paper-dim)] font-normal pb-3 border-b border-[var(--line)] pr-2">Ações / Status</th>
                            </tr>
                          </thead>
                          <tbody>
                            {agendamentos.map(ag => {
                              const dataObj = new Date(ag.data_hora_inicio);
                              const diaSemana = dataObj.toLocaleDateString('pt-BR', { weekday: 'short' }).substring(0,3);
                              const diaNum = dataObj.toLocaleDateString('pt-BR', { day: '2-digit' });
                              const mes = dataObj.toLocaleDateString('pt-BR', { month: 'short' }).substring(0,3);
                              const hora = dataObj.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit', timeZone: 'America/Sao_Paulo' });
                              
                              const isCancelado = ag.status === 'cancelado';
                              const isConcluido = ag.status === 'concluido';

                              return (
                                <tr key={ag.id} className={`${isCancelado ? 'opacity-40' : ''} hover:bg-[var(--leather-3)] transition-colors`}>
                                  <td className="py-3 px-2 border-b border-[var(--line)]">
                                    <div className="flex items-center gap-3">
                                      <div className="flex flex-col items-center justify-center bg-[var(--leather-3)] border border-[var(--line)] rounded-[5px] w-[46px] h-[52px] shrink-0">
                                        <span className="text-[9px] uppercase text-[var(--paper-dim)] font-mono leading-none mt-1">{diaSemana}</span>
                                        <span className="text-[14px] text-[var(--paper)] font-bold font-mono leading-none my-1">{diaNum}</span>
                                        <span className="text-[9px] uppercase text-[var(--paper-dim)] font-mono leading-none mb-1">{mes}</span>
                                      </div>
                                      <span className="font-mono text-[var(--copper-bright)] text-[15px] font-bold">{hora}</span>
                                    </div>
                                  </td>
                                  <td className="py-3 border-b border-[var(--line)] font-semibold text-[13px] text-[var(--paper)]">
                                    {ag.clientes?.nome}
                                    <div className="text-[10.5px] text-[var(--paper-dim)] font-mono mt-1">{ag.clientes?.telefone}</div>
                                  </td>
                                  <td className="py-3 border-b border-[var(--line)] text-[12.5px] text-[var(--paper)]">
                                    {ag.barbeiros?.nome || 'Não atribuído'}
                                  </td>
                                  <td className="py-3 border-b border-[var(--line)]">
                                    <div className="text-[12.5px] text-[var(--paper)]">{ag.servicos?.nome}</div>
                                    <div className="font-mono text-[11px] text-[var(--brass)] mt-1">R$ {Number(ag.servicos?.preco).toFixed(2)}</div>
                                  </td>
                                  <td className="py-3 px-2 border-b border-[var(--line)] text-right">
                                    {isCancelado ? (
                                      <span className="text-[10px] font-bold py-1.5 px-[10px] rounded-full uppercase tracking-[.03em] bg-[rgba(239,230,216,0.06)] text-[var(--paper-dim)] border border-[var(--line)]">Cancelado</span>
                                    ) : isConcluido ? (
                                      <span className="text-[10px] font-bold py-1.5 px-[10px] rounded-full uppercase tracking-[.03em] bg-[rgba(127,168,107,0.15)] text-[var(--green)] border border-[rgba(127,168,107,0.4)]">Finalizado</span>
                                    ) : (
                                      <div className="flex justify-end gap-2">
                                        <button onClick={() => alterarStatus(ag.id, 'cancelado')} className="text-[10px] font-bold py-1.5 px-[10px] rounded-md uppercase tracking-[.03em] bg-[rgba(168,92,46,0.15)] text-[var(--copper-bright)] border border-[rgba(168,92,46,0.35)] hover:bg-[var(--copper)] hover:text-white transition-colors">Cancelar</button>
                                        <button onClick={() => alterarStatus(ag.id, 'concluido')} className="text-[10px] font-bold py-1.5 px-[10px] rounded-md uppercase tracking-[.03em] bg-[rgba(201,162,75,0.15)] text-[var(--brass-bright)] border border-[rgba(201,162,75,0.35)] hover:bg-[var(--brass)] hover:text-[var(--leather)] transition-colors">✔ Concluir</button>
                                      </div>
                                    )}
                                  </td>
                                </tr>
                              );
                            })}
                          </tbody>
                        </table>
                      </div>
                    )}
                  </div>
                </div>
              )}

              {/* ABA: EQUIPE (Protegida) */}
              {abaAtiva === 'equipe' && perfilUsuario?.cargo === 'dono' && (
                <div className="animate-fade-in max-w-4xl">
                  <div className="bg-[var(--leather-2)] border border-[var(--line)] rounded-lg p-5">
                    <div className="flex justify-between items-center border-b border-[var(--line)] pb-4 mb-4">
                      <span className="font-fraunces font-bold text-[16px] text-[var(--paper)]">Profissionais Cadastrados</span>
                      <div className="font-mono text-[11px] text-[var(--paper-dim)]">
                        <span className="text-[var(--brass-bright)] font-bold">{equipe.length}</span> Membros na Equipe
                      </div>
                    </div>

                    <div className="grid gap-3">
                      {equipe.map(membro => (
                        <div key={membro.id} className="flex justify-between items-center bg-[var(--leather-3)] p-4 rounded-md border border-[var(--line)]">
                          <div>
                            <div className="text-[14px] font-semibold text-[var(--paper)]">{membro.nome}</div>
                            <div className="text-[11px] font-mono text-[var(--paper-dim)] mt-1">{membro.telefone || 'Sem telefone'}</div>
                          </div>
                          <div>
                            <span className={`text-[10px] font-bold py-1 px-2.5 rounded-sm uppercase tracking-wider ${membro.cargo === 'dono' ? 'bg-[rgba(201,162,75,0.15)] text-[var(--brass-bright)] border border-[rgba(201,162,75,0.3)]' : 'bg-[rgba(239,230,216,0.06)] text-[var(--paper-dim)] border border-[var(--line)]'}`}>
                              {membro.cargo}
                            </span>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              )}

              {/* ABA: FINANCEIRO (Protegida) */}
              {abaAtiva === 'financeiro' && perfilUsuario?.cargo === 'dono' && (
                <div className="animate-fade-in max-w-5xl">
                  <div className="flex gap-2 overflow-x-auto hide-scroll pb-4 mb-2">
                    <button onClick={() => setFiltroFinanceiro('hoje')} className={`px-4 py-2 text-[11px] font-mono uppercase tracking-[.06em] rounded border transition-all ${filtroFinanceiro === 'hoje' ? 'bg-[var(--leather-3)] text-[var(--brass-bright)] border-[var(--brass)]' : 'bg-transparent text-[var(--paper-dim)] border-[var(--line)] hover:border-[var(--brass)]'}`}>Hoje</button>
                    <button onClick={() => setFiltroFinanceiro('este_mes')} className={`px-4 py-2 text-[11px] font-mono uppercase tracking-[.06em] rounded border transition-all ${filtroFinanceiro === 'este_mes' ? 'bg-[var(--leather-3)] text-[var(--brass-bright)] border-[var(--brass)]' : 'bg-transparent text-[var(--paper-dim)] border-[var(--line)] hover:border-[var(--brass)]'}`}>Este Mês</button>
                    <button onClick={() => setFiltroFinanceiro('mes_passado')} className={`px-4 py-2 text-[11px] font-mono uppercase tracking-[.06em] rounded border transition-all ${filtroFinanceiro === 'mes_passado' ? 'bg-[var(--leather-3)] text-[var(--brass-bright)] border-[var(--brass)]' : 'bg-transparent text-[var(--paper-dim)] border-[var(--line)] hover:border-[var(--brass)]'}`}>Mês Passado</button>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-6">
                    <div onClick={() => setModalDetalhes('ENTRADAS')} className="bg-[var(--leather-2)] border border-[var(--line)] rounded-lg p-5 cursor-pointer hover:scale-[1.02] hover:border-[var(--brass)] transition-all group">
                      <div className="text-[11.5px] text-[var(--paper-dim)] mb-2 flex justify-between items-center group-hover:text-[var(--brass-bright)] transition-colors">Entradas Totais <span>Ver →</span></div>
                      <div className="font-fraunces font-extrabold text-[26px] text-[var(--brass-bright)]">R$ {totalEntradas.toFixed(2)}</div>
                    </div>
                    <div onClick={() => setModalDetalhes('SAIDAS')} className="bg-[var(--leather-2)] border border-[var(--line)] rounded-lg p-5 cursor-pointer hover:scale-[1.02] hover:border-[var(--copper-bright)] transition-all group">
                      <div className="text-[11.5px] text-[var(--paper-dim)] mb-2 flex justify-between items-center group-hover:text-[var(--copper-bright)] transition-colors">Saídas / Despesas <span>Ver →</span></div>
                      <div className="font-fraunces font-extrabold text-[26px] text-[var(--copper-bright)]">R$ {totalSaidas.toFixed(2)}</div>
                    </div>
                    <div onClick={() => setModalDetalhes('GERAL')} className="bg-[var(--leather-2)] border border-[var(--line)] rounded-lg p-5 cursor-pointer hover:scale-[1.02] hover:border-[var(--paper)] transition-all group">
                      <div className="text-[11.5px] text-[var(--paper-dim)] mb-2 flex justify-between items-center group-hover:text-[var(--paper)] transition-colors">Saldo Líquido <span>Ver Extrato →</span></div>
                      <div className="font-fraunces font-extrabold text-[26px] text-[var(--paper)]">R$ {saldoLiquido.toFixed(2)}</div>
                    </div>
                  </div>

                  <div className="bg-[var(--leather-2)] border border-[var(--line)] rounded-lg p-6">
                    <div className="flex justify-between items-center mb-6">
                      <span className="font-fraunces font-bold text-[16px]">Faturamento Diário</span>
                    </div>
                    {Object.keys(dadosGrafico).length === 0 ? (
                      <div className="text-center text-[var(--paper-dim)] py-10 font-mono text-xs">Sem dados no período.</div>
                    ) : (
                      <div className="flex items-end gap-2 sm:gap-4 h-48 overflow-x-auto hide-scroll pt-4">
                        {Object.keys(dadosGrafico).sort().map(dia => {
                          const valor = dadosGrafico[dia];
                          const alturaPerc = maxFaturamentoDia > 0 ? (valor / maxFaturamentoDia) * 100 : 0;
                          return (
                            <div key={dia} className="flex flex-col justify-end items-center flex-1 min-w-[40px] group h-full">
                              <span className="text-[10px] text-[var(--brass-bright)] font-mono mb-2 opacity-0 group-hover:opacity-100 transition-opacity">R${valor.toFixed(0)}</span>
                              <div className="w-full bg-[rgba(201,162,75,0.4)] hover:bg-[var(--brass)] rounded-t-sm transition-all duration-500" style={{ height: `${alturaPerc}%`, minHeight: '4px' }}></div>
                              <span className="text-[10px] font-mono text-[var(--paper-dim)] mt-2">{dia}</span>
                            </div>
                          );
                        })}
                      </div>
                    )}
                  </div>
                </div>
              )}
            </>
          )}
        </div>

        {/* MODAIS AQUI EMBAIXO */}

        {/* MODAL: Detalhes Financeiros */}
        {modalDetalhes && (
          <div className="fixed inset-0 bg-black/80 flex items-center justify-center p-4 z-50 animate-fade-in backdrop-blur-sm">
            <div className="bg-[var(--leather-2)] border border-[var(--line)] p-6 rounded-lg w-full max-w-2xl shadow-2xl flex flex-col max-h-[85vh]">
              <div className="flex justify-between items-start mb-6 border-b border-[var(--line)] pb-4">
                <div>
                  <h2 className="text-[19px] font-fraunces font-bold text-[var(--paper)] mb-1">{tituloDetalhes}</h2>
                  <div className="text-[11px] text-[var(--paper-dim)] font-mono">Período: {filtroFinanceiro.replace('_', ' ').toUpperCase()}</div>
                </div>
                <button onClick={() => setModalDetalhes(null)} className="text-[var(--paper-dim)] hover:text-[var(--paper)] text-xl font-bold p-2">&times;</button>
              </div>
              <div className="overflow-y-auto flex-1 hide-scroll pr-2 space-y-3">
                {detalhesAtuais.length === 0 ? (
                  <div className="text-center py-10 text-[var(--paper-dim)] font-mono text-xs">Nenhuma movimentação.</div>
                ) : (
                  detalhesAtuais.map((item, idx) => {
                    const d = new Date(item.data);
                    const isEntrada = item.tipo === 'ENTRADA';
                    return (
                      <div key={idx} className="flex justify-between items-center bg-[var(--leather-3)] p-4 rounded-md border border-[var(--line)]">
                        <div>
                          <div className="flex items-center gap-2 mb-1">
                            <span className={`text-[9px] font-bold py-0.5 px-2 rounded-sm uppercase tracking-wider ${isEntrada ? 'bg-[rgba(201,162,75,0.15)] text-[var(--brass-bright)]' : 'bg-[rgba(168,92,46,0.15)] text-[var(--copper-bright)]'}`}>{item.tag}</span>
                            <span className="text-[10px] font-mono text-[var(--paper-dim)]">{d.toLocaleDateString('pt-BR', {day:'2-digit', month:'2-digit'})} · {d.toLocaleTimeString('pt-BR', {hour:'2-digit', minute:'2-digit'})}</span>
                          </div>
                          <div className="text-[13px] font-semibold text-[var(--paper)] mt-1.5">{item.titulo}</div>
                          <div className="text-[11px] text-[var(--paper-dim)] mt-0.5">{item.subtitulo}</div>
                        </div>
                        <div className={`font-mono text-[14px] font-bold ${isEntrada ? 'text-[var(--brass-bright)]' : 'text-[var(--copper-bright)]'}`}>
                          {isEntrada ? '+' : '-'} R$ {item.valor.toFixed(2)}
                        </div>
                      </div>
                    )
                  })
                )}
              </div>
              <div className="mt-6 pt-4 border-t border-[var(--line)] flex justify-end">
                <button onClick={() => setModalDetalhes(null)} className="py-2.5 px-6 border border-[var(--paper-dim)] text-[var(--paper)] rounded font-semibold text-[12.5px] hover:bg-[var(--leather-3)] transition-colors">Fechar Detalhes</button>
              </div>
            </div>
          </div>
        )}

        {/* MODAL: Agendamento Manual (Agora com seleção de equipe) */}
        {modalAgendamento && (
          <div className="fixed inset-0 bg-black/80 flex items-center justify-center p-4 z-50 animate-fade-in backdrop-blur-sm">
            <div className="bg-[var(--leather-2)] border border-[var(--line)] p-6 rounded-lg w-full max-w-md shadow-2xl">
              <h2 className="text-[19px] font-fraunces font-bold text-[var(--paper)] mb-1">Agendar Manualmente</h2>
              <div className="text-[11px] text-[var(--paper-dim)] mb-5">Insira os dados do cliente</div>
              <form onSubmit={salvarAgendamentoManual} className="space-y-3">
                <input type="text" placeholder="Nome do Cliente" required onChange={e => setFormNovoAgendamento({...formNovoAgendamento, cliente: e.target.value})} className="w-full p-3 bg-[var(--leather-3)] border border-[var(--line)] rounded text-[var(--paper)] text-sm focus:border-[var(--brass)] outline-none" />
                <input type="tel" placeholder="Telefone (ex: 13999999999)" required onChange={e => setFormNovoAgendamento({...formNovoAgendamento, telefone: e.target.value})} className="w-full p-3 bg-[var(--leather-3)] border border-[var(--line)] rounded text-[var(--paper)] text-sm focus:border-[var(--brass)] outline-none" />
                
                <select required onChange={e => setFormNovoAgendamento({...formNovoAgendamento, profissional_id: e.target.value})} className="w-full p-3 bg-[var(--leather-3)] border border-[var(--line)] rounded text-[var(--paper)] text-sm focus:border-[var(--brass)] outline-none">
                  <option value="">Quem vai atender?</option>
                  {equipe.map(p => <option key={p.id} value={p.id}>{p.nome}</option>)}
                </select>

                <select required onChange={e => setFormNovoAgendamento({...formNovoAgendamento, servico_id: e.target.value})} className="w-full p-3 bg-[var(--leather-3)] border border-[var(--line)] rounded text-[var(--paper)] text-sm focus:border-[var(--brass)] outline-none">
                  <option value="">Qual o Serviço?</option>
                  {servicos.map(s => <option key={s.id} value={s.id}>{s.nome} - R$ {s.preco}</option>)}
                </select>
                
                <div className="flex gap-3">
                  <input type="date" required onChange={e => setFormNovoAgendamento({...formNovoAgendamento, data: e.target.value})} className="w-full p-3 bg-[var(--leather-3)] border border-[var(--line)] rounded text-[var(--paper)] text-sm focus:border-[var(--brass)] outline-none" style={{colorScheme:'dark'}}/>
                  <input type="time" required onChange={e => setFormNovoAgendamento({...formNovoAgendamento, hora: e.target.value})} className="w-full p-3 bg-[var(--leather-3)] border border-[var(--line)] rounded text-[var(--paper)] text-sm focus:border-[var(--brass)] outline-none" style={{colorScheme:'dark'}}/>
                </div>
                <div className="flex gap-3 mt-6">
                  <button type="button" onClick={() => setModalAgendamento(false)} className="flex-1 py-[11px] border border-[var(--paper-dim)] text-[var(--paper)] rounded font-semibold text-[12.5px] hover:bg-[var(--leather-3)] transition-colors">Cancelar</button>
                  <button type="submit" className="flex-1 py-[11px] bg-[var(--brass)] text-[var(--leather)] rounded font-semibold text-[12.5px] hover:bg-[var(--brass-bright)] transition-colors">Confirmar</button>
                </div>
              </form>
            </div>
          </div>
        )}

        {/* MODAL: Novo Profissional da Equipe */}
        {modalEquipe && perfilUsuario?.cargo === 'dono' && (
          <div className="fixed inset-0 bg-black/80 flex items-center justify-center p-4 z-50 animate-fade-in backdrop-blur-sm">
            <div className="bg-[var(--leather-2)] border border-[var(--line)] p-6 rounded-lg w-full max-w-md shadow-2xl">
              <h2 className="text-[19px] font-fraunces font-bold text-[var(--paper)] mb-1">Adicionar Profissional</h2>
              <div className="text-[11px] text-[var(--paper-dim)] mb-5">Insira os dados do novo membro da equipe</div>
              <form onSubmit={salvarProfissional} className="space-y-3">
                <input type="text" placeholder="Nome Completo" required onChange={e => setFormNovaEquipe({...formNovaEquipe, nome: e.target.value})} className="w-full p-3 bg-[var(--leather-3)] border border-[var(--line)] rounded text-[var(--paper)] text-sm focus:border-[var(--brass)] outline-none" />
                <input type="tel" placeholder="Telefone / WhatsApp (ex: 13999999999)" onChange={e => setFormNovaEquipe({...formNovaEquipe, telefone: e.target.value})} className="w-full p-3 bg-[var(--leather-3)] border border-[var(--line)] rounded text-[var(--paper)] text-sm focus:border-[var(--brass)] outline-none" />
                <div className="flex gap-3 mt-6">
                  <button type="button" onClick={() => setModalEquipe(false)} className="flex-1 py-[11px] border border-[var(--paper-dim)] text-[var(--paper)] rounded font-semibold text-[12.5px] hover:bg-[var(--leather-3)] transition-colors">Cancelar</button>
                  <button type="submit" className="flex-1 py-[11px] bg-[var(--brass)] text-[var(--leather)] rounded font-semibold text-[12.5px] hover:bg-[var(--brass-bright)] transition-colors">Adicionar</button>
                </div>
              </form>
            </div>
          </div>
        )}

        {/* MODAL: Transação (Visível só pro dono) */}
        {modalTransacao && perfilUsuario?.cargo === 'dono' && (
          <div className="fixed inset-0 bg-black/80 flex items-center justify-center p-4 z-50 animate-fade-in backdrop-blur-sm">
            <div className="bg-[var(--leather-2)] border border-[var(--line)] p-6 rounded-lg w-full max-w-md shadow-2xl">
              <h2 className="text-[19px] font-fraunces font-bold text-[var(--paper)] mb-1">Nova Movimentação</h2>
              <div className="text-[11px] text-[var(--paper-dim)] mb-5">Registre entradas extras ou despesas</div>
              <form onSubmit={salvarTransacaoManual} className="space-y-3">
                <select required value={formTransacao.tipo} onChange={e => setFormTransacao({...formTransacao, tipo: e.target.value})} className="w-full p-3 bg-[var(--leather-3)] border border-[var(--line)] rounded text-[var(--paper)] text-sm font-semibold focus:border-[var(--brass)] outline-none">
                  <option value="SAIDA">Saída / Despesa</option>
                  <option value="ENTRADA">Entrada Extra</option>
                </select>
                <input type="text" placeholder="Descrição (ex: Pomada, Conta de Luz)" required onChange={e => setFormTransacao({...formTransacao, descricao: e.target.value})} className="w-full p-3 bg-[var(--leather-3)] border border-[var(--line)] rounded text-[var(--paper)] text-sm focus:border-[var(--brass)] outline-none" />
                <input type="number" step="0.01" placeholder="Valor (R$)" required onChange={e => setFormTransacao({...formTransacao, valor: e.target.value})} className="w-full p-3 bg-[var(--leather-3)] border border-[var(--line)] rounded text-[var(--paper)] text-sm focus:border-[var(--brass)] outline-none" />
                <div className="flex gap-3 mt-6">
                  <button type="button" onClick={() => setModalTransacao(false)} className="flex-1 py-[11px] border border-[var(--paper-dim)] text-[var(--paper)] rounded font-semibold text-[12.5px] hover:bg-[var(--leather-3)] transition-colors">Cancelar</button>
                  <button type="submit" className="flex-1 py-[11px] bg-[var(--brass)] text-[var(--leather)] rounded font-semibold text-[12.5px] hover:bg-[var(--brass-bright)] transition-colors">Registrar</button>
                </div>
              </form>
            </div>
          </div>
        )}

      </div>
    </>
  );
}