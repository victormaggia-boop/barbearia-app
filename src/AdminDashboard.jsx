import { useEffect, useState } from 'react';
import { supabase } from './supabaseClient';
import { useNavigate } from 'react-router-dom';
import { 
  Home, Calendar, Users, Scissors, DollarSign, Box, Percent, 
  BarChart, Settings, LogOut, Search, Bell, Plus, Wallet, Star, X, TrendingUp, TrendingDown, Edit2, EyeOff, Eye, MessageCircle, Clock, Award, Trash2, ShieldAlert
} from 'lucide-react';

export default function AdminDashboard() {
  const [agendamentos, setAgendamentos] = useState([]);
  const [transacoes, setTransacoes] = useState([]);
  const [servicos, setServicos] = useState([]);
  const [bloqueios, setBloqueios] = useState([]);
  const [barbeiroId, setBarbeiroId] = useState(null);
  
  // Controles de Tela e Menus
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isCaixaOpen, setIsCaixaOpen] = useState(false);
  const [isServicoModalOpen, setIsServicoModalOpen] = useState(false);
  const [isBloqueioModalOpen, setIsBloqueioModalOpen] = useState(false); 
  const [filtroAgenda, setFiltroAgenda] = useState('hoje');
  const [filtroSumidos, setFiltroSumidos] = useState('30');
  const [abaAtiva, setAbaAtiva] = useState('dashboard'); 
  const navigate = useNavigate();

  // Data Selecionada para a Linha do Tempo (Agenda)
  const [dataTimeline, setDataTimeline] = useState(new Date().toISOString().split('T')[0]);

  // Estados dos Formulários
  const [novoNome, setNovoNome] = useState('');
  const [novoTelefone, setNovoTelefone] = useState('');
  const [novoServico, setNovoServico] = useState('');
  const [novaData, setNovaData] = useState('');
  const [novaHora, setNovaHora] = useState('');
  const [modalStatus, setModalStatus] = useState('');

  const [caixaTipo, setCaixaTipo] = useState('saida');
  const [caixaDescricao, setCaixaDescricao] = useState('');
  const [caixaValor, setCaixaValor] = useState('');
  const [caixaStatus, setCaixaStatus] = useState('');

  const [servicoIdEdicao, setServicoIdEdicao] = useState(null);
  const [servicoNome, setServicoNome] = useState('');
  const [servicoPreco, setServicoPreco] = useState('');
  const [servicoPromo, setServicoPromo] = useState('');
  const [servicoDuracao, setServicoDuracao] = useState('');

  const [blqTipo, setBlqTipo] = useState('pontual');
  const [blqData, setBlqData] = useState('');
  const [blqDiaSemana, setBlqDiaSemana] = useState('1'); 
  const [blqHoraInicio, setBlqHoraInicio] = useState('');
  const [blqHoraFim, setBlqHoraFim] = useState('');
  const [blqMotivo, setBlqMotivo] = useState('');

  useEffect(() => {
    verificarAcesso();
    carregarDados();
  }, []);

  async function verificarAcesso() {
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) navigate('/admin');
  }

  async function carregarDados() {
    const { data: dataServicos } = await supabase.from('servicos').select('*').order('ativo', { ascending: false }).order('nome', { ascending: true });
    if (dataServicos) setServicos(dataServicos);
    
    const { data: dataBarbeiros } = await supabase.from('barbeiros').select('id').limit(1);
    if (dataBarbeiros && dataBarbeiros.length > 0) setBarbeiroId(dataBarbeiros[0].id);

    const { data: dataAgendamentos } = await supabase
      .from('agendamentos')
      .select('id, cliente_id, data_hora_inicio, status, clientes(nome, telefone), servicos(nome, preco, preco_promocional, duracao_minutos)')
      .order('data_hora_inicio', { ascending: true });
    if (dataAgendamentos) setAgendamentos(dataAgendamentos);

    const { data: dataTransacoes } = await supabase.from('transacoes').select('*').order('data_hora', { ascending: false });
    if (dataTransacoes) setTransacoes(dataTransacoes);

    const { data: dataBloqueios } = await supabase.from('bloqueios_agenda').select('*');
    if (dataBloqueios) setBloqueios(dataBloqueios);
  }

  async function atualizarStatus(id, novoStatus) {
    const { error } = await supabase.from('agendamentos').update({ status: novoStatus }).eq('id', id);
    if (!error) carregarDados();
  }

  function abrirModalServico(servico = null) {
    if (servico) {
      setServicoIdEdicao(servico.id); setServicoNome(servico.nome); setServicoPreco(servico.preco);
      setServicoPromo(servico.preco_promocional || ''); setServicoDuracao(servico.duracao_minutos);
    } else {
      setServicoIdEdicao(null); setServicoNome(''); setServicoPreco(''); setServicoPromo(''); setServicoDuracao('');
    }
    setIsServicoModalOpen(true);
  }

  async function salvarServico(e) {
    e.preventDefault();
    setModalStatus('Salvando...');
    const dados = { nome: servicoNome, preco: parseFloat(servicoPreco), preco_promocional: servicoPromo ? parseFloat(servicoPromo) : null, duracao_minutos: parseInt(servicoDuracao) };
    let error;
    if (servicoIdEdicao) {
      const res = await supabase.from('servicos').update(dados).eq('id', servicoIdEdicao); error = res.error;
    } else {
      const res = await supabase.from('servicos').insert([{ ...dados, ativo: true }]); error = res.error;
    }
    if (!error) {
      setModalStatus('Serviço salvo!'); carregarDados();
      setTimeout(() => { setIsServicoModalOpen(false); setModalStatus(''); }, 1000);
    } else { setModalStatus('Erro ao salvar.'); }
  }

  async function toggleStatusServico(id, statusAtual) {
    await supabase.from('servicos').update({ ativo: !statusAtual }).eq('id', id); carregarDados();
  }

  async function handleAgendarManual(e) {
    e.preventDefault();
    setModalStatus('Salvando...');
    let { data: cliente } = await supabase.from('clientes').select('id').eq('telefone', novoTelefone).single();
    if (!cliente) {
      const { data: novoCliente, error: errCliente } = await supabase.from('clientes').insert([{ nome: novoNome, telefone: novoTelefone }]).select().single();
      if (errCliente) { setModalStatus('Erro ao cadastrar cliente.'); return; }
      cliente = novoCliente;
    }
    const dataHoraInicio = new Date(`${novaData}T${novaHora}:00`).toISOString();
    const servicoSelecionado = servicos.find(s => s.id == novoServico);
    const duracaoMinutos = servicoSelecionado?.duracao_minutos || 30;
    const dataHoraFim = new Date(new Date(dataHoraInicio).getTime() + duracaoMinutos * 60000).toISOString();
    const { error: errAgendamento } = await supabase.from('agendamentos').insert([{
      cliente_id: cliente.id, barbeiro_id: barbeiroId, servico_id: novoServico, data_hora_inicio: dataHoraInicio, data_hora_fim: dataHoraFim, status: 'confirmado'
    }]);
    if (!errAgendamento) {
      setModalStatus('Agendado!'); carregarDados();
      setTimeout(() => { setIsModalOpen(false); setModalStatus(''); setNovoNome(''); setNovoTelefone(''); setNovoServico(''); setNovaData(''); setNovaHora(''); }, 1500);
    } else {
      setModalStatus('Erro ao agendar.');
    }
  }

  async function handleLancamentoCaixa(e) {
    e.preventDefault();
    setCaixaStatus('Registrando...');
    const { error } = await supabase.from('transacoes').insert([{ tipo: caixaTipo, descricao: caixaDescricao, valor: parseFloat(caixaValor.replace(',', '.')) }]);
    if (!error) {
      setCaixaStatus('Sucesso!'); carregarDados(); 
      setTimeout(() => { setIsCaixaOpen(false); setCaixaStatus(''); setCaixaDescricao(''); setCaixaValor(''); setCaixaTipo('saida'); }, 1500);
    } else {
      setCaixaStatus('Erro ao registrar.');
    }
  }

  async function salvarBloqueio(e) {
    e.preventDefault();
    setModalStatus('Salvando Bloqueio...');
    const dados = {
      barbeiro_id: barbeiroId,
      tipo: blqTipo,
      data: blqTipo === 'pontual' ? blqData : null,
      dia_semana: blqTipo === 'recorrente' ? parseInt(blqDiaSemana) : null,
      hora_inicio: `${blqHoraInicio}:00`,
      hora_fim: `${blqHoraFim}:00`,
      motivo: blqMotivo || 'Bloqueado'
    };
    const { error } = await supabase.from('bloqueios_agenda').insert([dados]);
    if (!error) {
      setModalStatus('Bloqueio salvo!'); carregarDados();
      setTimeout(() => { setIsBloqueioModalOpen(false); setModalStatus(''); setBlqMotivo(''); }, 1500);
    } else {
      setModalStatus('Erro ao bloquear.');
    }
  }

  async function removerBloqueio(id) {
    if(window.confirm('Tem certeza que deseja remover este bloqueio?')) {
      await supabase.from('bloqueios_agenda').delete().eq('id', id);
      carregarDados();
    }
  }

  async function handleLogout() { await supabase.auth.signOut(); navigate('/admin'); }

  // Matemática e Datas Base
  const now = new Date();
  const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const endOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 23, 59, 59, 999);
  const startOfWeek = new Date(startOfToday); startOfWeek.setDate(startOfToday.getDate() - startOfToday.getDay());
  const endOfWeek = new Date(startOfWeek); endOfWeek.setDate(startOfWeek.getDate() + 6); endOfWeek.setHours(23, 59, 59, 999);
  const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
  const endOfMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59, 999);

  // DASHBOARD FILTROS
  const agendamentosFiltrados = agendamentos.filter(ag => {
    const dataAg = new Date(ag.data_hora_inicio);
    if (filtroAgenda === 'hoje') return dataAg >= startOfToday && dataAg <= endOfToday;
    if (filtroAgenda === 'semana') return dataAg >= startOfWeek && dataAg <= endOfWeek;
    if (filtroAgenda === 'mes') return dataAg >= startOfMonth && dataAg <= endOfMonth;
    return true;
  });

  const agendamentosMes = agendamentos.filter(ag => new Date(ag.data_hora_inicio) >= startOfMonth && new Date(ag.data_hora_inicio) <= endOfMonth);
  const transacoesMes = transacoes.filter(t => new Date(t.data_hora) >= startOfMonth && new Date(t.data_hora) <= endOfMonth);
  
  const faturamentoCortes = agendamentosMes.filter(ag => ag.status === 'concluido' || ag.status === 'confirmado' || !ag.status).reduce((acc, curr) => {
    const precoCalculado = curr.servicos?.preco_promocional ? curr.servicos.preco_promocional : curr.servicos?.preco;
    return acc + (precoCalculado ? parseFloat(precoCalculado) : 0);
  }, 0);
  const entradasExtras = transacoesMes.filter(t => t.tipo === 'entrada').reduce((acc, curr) => acc + parseFloat(curr.valor), 0);
  const despesas = transacoesMes.filter(t => t.tipo === 'saida').reduce((acc, curr) => acc + parseFloat(curr.valor), 0);
  const faturamentoBruto = faturamentoCortes + entradasExtras;
  const caixaLiquido = faturamentoBruto - despesas;
  const totalAtendimentosMes = agendamentosMes.length;

  // CRM MATEMÁTICA
  const crmData = Object.values(agendamentos.reduce((acc, ag) => {
    if (!ag.clientes || !ag.cliente_id) return acc;
    const cid = ag.cliente_id;
    if (!acc[cid]) {
      acc[cid] = { id: cid, nome: ag.clientes.nome, telefone: ag.clientes.telefone, totalCortes: 0, totalGasto: 0, ultimaVisita: null, proximaVisita: null };
    }
    const agDate = new Date(ag.data_hora_inicio);
    if (agDate < now && (ag.status === 'concluido' || ag.status === 'confirmado')) {
      if (!acc[cid].ultimaVisita || agDate > acc[cid].ultimaVisita) acc[cid].ultimaVisita = agDate;
      if (ag.status === 'concluido') {
        acc[cid].totalCortes += 1;
        const preco = ag.servicos?.preco_promocional || ag.servicos?.preco || 0;
        acc[cid].totalGasto += parseFloat(preco);
      }
    }
    if (agDate >= now && ag.status === 'confirmado') {
      if (!acc[cid].proximaVisita || agDate < acc[cid].proximaVisita) acc[cid].proximaVisita = agDate;
    }
    return acc;
  }, {}));

  const proximos7Dias = new Date(now); proximos7Dias.setDate(proximos7Dias.getDate() + 7);
  const clientesNaSemana = crmData.filter(c => c.proximaVisita && c.proximaVisita <= proximos7Dias).sort((a, b) => a.proximaVisita - b.proximaVisita);

  const clientesSumidos = crmData.filter(c => {
    if (c.proximaVisita) return false; 
    if (!c.ultimaVisita) return false; 
    const diffTime = Math.abs(now - c.ultimaVisita);
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    c.diasSumido = diffDays;
    return diffDays >= parseInt(filtroSumidos);
  }).sort((a, b) => b.diasSumido - a.diasSumido);

  const gerarLinkWpp = (cliente) => {
    const numeroLimpo = cliente.telefone.replace(/\D/g, '');
    const primeiroNome = cliente.nome.split(' ')[0];
    const mensagem = `Fala ${primeiroNome}, tudo beleza? Reparei que já faz um tempinho desde o seu último corte com a gente. Vamos dar aquele talento no visual essa semana? Tenho uns horários bons aqui!`;
    return `https://wa.me/55${numeroLimpo}?text=${encodeURIComponent(mensagem)}`;
  };

  // AGENDA LINHA DO TEMPO
  const dateObjTimeline = new Date(dataTimeline + 'T12:00:00');
  const diaSemanaTimeline = dateObjTimeline.getDay();

  const agendamentosDoDia = agendamentos.filter(ag => ag.data_hora_inicio.startsWith(dataTimeline)).map(ag => {
    const d = new Date(ag.data_hora_inicio);
    return { tipoItem: 'agendamento', timestamp: d.getTime(), horaStr: d.toLocaleTimeString('pt-BR', {hour:'2-digit', minute:'2-digit'}), titulo: ag.clientes?.nome, subtitulo: ag.servicos?.nome, status: ag.status, id: ag.id }
  });

  const bloqueiosDoDia = bloqueios.filter(b => (b.tipo === 'pontual' && b.data === dataTimeline) || (b.tipo === 'recorrente' && b.dia_semana === diaSemanaTimeline)).map(b => {
    const [h, m] = b.hora_inicio.split(':');
    const d = new Date(dataTimeline); d.setHours(parseInt(h), parseInt(m), 0);
    return { tipoItem: 'bloqueio', timestamp: d.getTime(), horaStr: `${b.hora_inicio.substring(0,5)} - ${b.hora_fim.substring(0,5)}`, titulo: b.motivo, subtitulo: b.tipo === 'recorrente' ? 'Fixo toda semana' : 'Apenas hoje', id: b.id }
  });

  const linhaDoTempo = [...agendamentosDoDia, ...bloqueiosDoDia].sort((a, b) => a.timestamp - b.timestamp);

  const getStatusColor = (status) => {
    switch(status) {
      case 'concluido': return 'bg-blue-500/10 text-blue-400 border-blue-500/20';
      case 'cancelado': return 'bg-red-500/10 text-red-400 border-red-500/20';
      default: return 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20';
    }
  };

  return (
    <div className="flex h-screen bg-[#09090A] text-gray-300 font-sans overflow-hidden relative">
      {/* SIDEBAR */}
      <aside className="w-64 bg-[#121214] border-r border-zinc-800 flex flex-col justify-between hidden md:flex">
        <div>
          <div className="p-6 text-center border-b border-zinc-800 mb-4">
            <h1 className="text-xl font-serif text-yellow-600 tracking-widest uppercase">Raphael Haley</h1>
            <p className="text-[10px] tracking-[0.3em] text-zinc-500 uppercase mt-1">Barber</p>
          </div>
          <nav className="px-4 space-y-1">
            <NavItem icon={<Home size={18} />} label="Dashboard" active={abaAtiva === 'dashboard'} onClick={() => setAbaAtiva('dashboard')} />
            <NavItem icon={<Calendar size={18} />} label="Agenda (Bloqueios)" active={abaAtiva === 'agenda'} onClick={() => setAbaAtiva('agenda')} />
            <NavItem icon={<Users size={18} />} label="Clientes (CRM)" active={abaAtiva === 'clientes'} onClick={() => setAbaAtiva('clientes')} />
            <NavItem icon={<Scissors size={18} />} label="Serviços" active={abaAtiva === 'servicos'} onClick={() => setAbaAtiva('servicos')} />
            <NavItem icon={<DollarSign size={18} />} label="Financeiro" active={abaAtiva === 'financeiro'} onClick={() => setAbaAtiva('financeiro')} />
          </nav>
        </div>
        <div className="p-4 border-t border-zinc-800">
          <button onClick={handleLogout} className="flex items-center gap-3 text-sm text-zinc-400 hover:text-red-400 w-full p-2 transition-colors">
            <LogOut size={18} /> Sair do sistema
          </button>
        </div>
      </aside>

      {/* CONTEÚDO PRINCIPAL */}
      <main className="flex-1 flex flex-col h-screen overflow-hidden">
        <header className="h-20 border-b border-zinc-800 flex items-center justify-between px-8 bg-[#121214] shrink-0">
          <div className="flex items-center gap-4 w-1/3">
            <div className="relative w-full">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-500" size={18} />
              <input type="text" placeholder="Buscar..." className="w-full bg-[#09090A] border border-zinc-800 rounded-lg pl-10 pr-4 py-2 text-sm focus:outline-none focus:border-yellow-600 text-zinc-200" />
            </div>
          </div>
          <div className="flex items-center gap-6">
            <div className="flex items-center gap-3 border-l border-zinc-800 pl-6">
              <div className="w-8 h-8 rounded-full bg-zinc-700 flex items-center justify-center text-xs text-white">RH</div>
              <span className="text-sm text-zinc-300">Raphael Haley</span>
            </div>
          </div>
        </header>

        <div className="flex-1 overflow-y-auto p-8">
          <div className="flex justify-between items-end mb-8">
            <div>
              <h2 className="text-3xl text-white font-medium mb-1">Olá, Raphael! 👋</h2>
              <p className="text-sm text-zinc-400 capitalize">{now.toLocaleDateString('pt-BR', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}</p>
            </div>
            <div className="flex gap-4">
              <button onClick={() => setIsCaixaOpen(true)} className="flex items-center gap-2 bg-transparent border border-zinc-700 hover:bg-zinc-800 text-white px-4 py-2 rounded-lg text-sm transition-colors">
                <Box size={16} /> Movimentar Caixa
              </button>
              <button onClick={() => setIsModalOpen(true)} className="flex items-center gap-2 bg-yellow-600 hover:bg-yellow-500 text-zinc-950 px-4 py-2 rounded-lg text-sm font-semibold transition-colors">
                <Plus size={16} /> Novo agendamento
              </button>
            </div>
          </div>

          {/* DASHBOARD PRINCIPAL */}
          {abaAtiva === 'dashboard' && (
            <div className="animate-fade-in">
              <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-8">
                <KpiCard icon={<TrendingUp className="text-emerald-500" />} title="Faturamento Bruto (Mês)" value={`R$ ${faturamentoBruto.toFixed(2)}`} />
                <KpiCard icon={<TrendingDown className="text-red-500" />} title="Despesas (Mês)" value={`R$ ${despesas.toFixed(2)}`} />
                <KpiCard icon={<Wallet className="text-blue-400" />} title="Caixa Líquido (Mês)" value={`R$ ${caixaLiquido.toFixed(2)}`} />
                <KpiCard icon={<Scissors className="text-yellow-500" />} title="Atendimentos (Mês)" value={totalAtendimentosMes} />
              </div>
              <div className="bg-[#121214] border border-zinc-800 rounded-xl p-6">
                <div className="flex gap-6 mb-6 border-b border-zinc-800">
                  <button onClick={() => setFiltroAgenda('hoje')} className={`pb-3 text-sm font-medium transition-colors ${filtroAgenda === 'hoje' ? 'text-yellow-600 border-b-2 border-yellow-600' : 'text-zinc-500 hover:text-zinc-300'}`}>Hoje</button>
                  <button onClick={() => setFiltroAgenda('semana')} className={`pb-3 text-sm font-medium transition-colors ${filtroAgenda === 'semana' ? 'text-yellow-600 border-b-2 border-yellow-600' : 'text-zinc-500 hover:text-zinc-300'}`}>Esta Semana</button>
                  <button onClick={() => setFiltroAgenda('mes')} className={`pb-3 text-sm font-medium transition-colors ${filtroAgenda === 'mes' ? 'text-yellow-600 border-b-2 border-yellow-600' : 'text-zinc-500 hover:text-zinc-300'}`}>Este Mês</button>
                </div>
                <div className="space-y-3">
                  {agendamentosFiltrados.map((ag) => {
                    const dataObj = new Date(ag.data_hora_inicio);
                    const hora = dataObj.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });
                    const dataFormatada = dataObj.toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' });
                    const currentStatus = ag.status || 'confirmado';
                    return (
                      <div key={ag.id} className="flex items-center justify-between p-3 rounded-lg hover:bg-zinc-800/50 transition-colors border border-transparent hover:border-zinc-800">
                        <div className="flex flex-col items-center justify-center w-16 border-r border-zinc-800 pr-3 mr-3">
                          <span className="text-yellow-600 font-medium">{hora}</span>
                          {filtroAgenda !== 'hoje' && <span className="text-[10px] text-zinc-500 mt-1">{dataFormatada}</span>}
                        </div>
                        <div className="flex items-center gap-3 w-48">
                          <div className="w-8 h-8 rounded-full bg-zinc-800 flex items-center justify-center text-xs uppercase text-white">{ag.clientes?.nome?.substring(0,2) || 'CL'}</div>
                          <span className="text-sm text-zinc-200">{ag.clientes?.nome || 'Cliente Removido'}</span>
                        </div>
                        <div className="text-sm text-zinc-400 w-32">{ag.servicos?.nome || 'S/N'}</div>
                        <div>
                          <select value={currentStatus} onChange={(e) => atualizarStatus(ag.id, e.target.value)} className={`px-3 py-1 rounded-full text-xs border appearance-none cursor-pointer focus:outline-none ${getStatusColor(currentStatus)}`}>
                            <option value="confirmado">Confirmado</option>
                            <option value="concluido">Concluído</option>
                            <option value="cancelado">Cancelado</option>
                          </select>
                        </div>
                      </div>
                    )
                  })}
                  {agendamentosFiltrados.length === 0 && <p className="text-zinc-500 text-sm py-4">Nenhum agendamento encontrado.</p>}
                </div>
              </div>
            </div>
          )}

          {/* AGENDA (LINHA DO TEMPO) */}
          {abaAtiva === 'agenda' && (
            <div className="animate-fade-in space-y-6">
              <div className="flex justify-between items-center bg-[#121214] border border-zinc-800 rounded-xl p-6">
                <div>
                  <h3 className="text-white font-medium flex items-center gap-2"><Clock size={18} className="text-yellow-500"/> Controle de Visão Diária</h3>
                  <p className="text-xs text-zinc-500 mt-1">Veja os clientes agendados e trave horários de folga ou almoço.</p>
                </div>
                <div className="flex gap-4 items-center">
                  <input type="date" value={dataTimeline} onChange={e => setDataTimeline(e.target.value)} className="bg-[#09090A] border border-zinc-700 rounded-lg p-2 text-zinc-300 text-sm focus:outline-none focus:border-yellow-600" style={{ colorScheme: 'dark' }} />
                  <button onClick={() => setIsBloqueioModalOpen(true)} className="flex items-center gap-2 bg-red-600/10 hover:bg-red-600/20 text-red-500 border border-red-600/30 px-4 py-2 rounded-lg text-sm font-medium transition-colors">
                    <ShieldAlert size={16} /> Bloquear Horário
                  </button>
                </div>
              </div>

              <div className="bg-[#121214] border border-zinc-800 rounded-xl p-8 relative">
                <div className="absolute left-10 md:left-24 top-8 bottom-8 w-px bg-zinc-800"></div>
                {linhaDoTempo.length === 0 && <p className="text-center text-zinc-500 text-sm py-10 relative z-10">Sua agenda está livre neste dia.</p>}
                <div className="space-y-8 relative z-10">
                  {linhaDoTempo.map((item, idx) => (
                    <div key={idx} className="flex items-start gap-4 md:gap-8">
                      <div className="w-16 md:w-20 text-right pt-2 shrink-0">
                        <span className={`font-medium ${item.tipoItem === 'bloqueio' ? 'text-red-400' : 'text-yellow-600'}`}>{item.horaStr}</span>
                      </div>
                      <div className="relative pt-3">
                        <div className={`w-3 h-3 rounded-full border-2 border-[#121214] shadow-sm ${item.tipoItem === 'bloqueio' ? 'bg-red-500' : 'bg-emerald-500'}`}></div>
                      </div>
                      <div className={`flex-1 p-4 rounded-xl border ${item.tipoItem === 'bloqueio' ? 'bg-red-950/10 border-red-900/30' : 'bg-[#09090A] border-zinc-800'}`}>
                        <div className="flex justify-between items-start">
                          <div>
                            <h4 className={`font-medium ${item.tipoItem === 'bloqueio' ? 'text-red-400' : 'text-zinc-200'}`}>{item.titulo}</h4>
                            <p className="text-xs text-zinc-500 mt-1">{item.subtitulo}</p>
                          </div>
                          {item.tipoItem === 'agendamento' ? (
                            <select value={item.status || 'confirmado'} onChange={(e) => atualizarStatus(item.id, e.target.value)} className={`px-3 py-1 rounded-full text-[10px] uppercase font-bold border appearance-none cursor-pointer outline-none ${getStatusColor(item.status || 'confirmado')}`}>
                              <option value="confirmado">Confirmado</option><option value="concluido">Concluído</option><option value="cancelado">Cancelado</option>
                            </select>
                          ) : (
                            <button onClick={() => removerBloqueio(item.id)} className="text-zinc-500 hover:text-red-400 transition-colors p-1"><Trash2 size={16} /></button>
                          )}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* CLIENTES CRM */}
          {abaAtiva === 'clientes' && (
            <div className="space-y-6 animate-fade-in">
              <div className="bg-[#121214] border border-zinc-800 rounded-xl p-6">
                <h3 className="text-white font-medium mb-6 flex items-center gap-2"><Calendar size={18} className="text-yellow-500"/> Agendados para a Semana</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {clientesNaSemana.map(c => (
                    <div key={c.id} className="flex items-center gap-4 p-4 rounded-lg bg-[#09090A] border border-zinc-800">
                      <div className="w-10 h-10 rounded-full bg-yellow-600/10 flex items-center justify-center text-yellow-500 font-medium">{c.nome.substring(0,2).toUpperCase()}</div>
                      <div>
                        <p className="text-sm font-medium text-zinc-200">{c.nome}</p>
                        <p className="text-xs text-zinc-500 mt-1">Vem dia {new Date(c.proximaVisita).toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' })} às {new Date(c.proximaVisita).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}</p>
                      </div>
                    </div>
                  ))}
                  {clientesNaSemana.length === 0 && <p className="text-zinc-500 text-sm">Nenhum cliente agendado para os próximos dias.</p>}
                </div>
              </div>

              <div className="bg-[#121214] border border-zinc-800 rounded-xl p-6">
                <div className="flex justify-between items-center mb-6 border-b border-zinc-800 pb-4">
                  <div>
                    <h3 className="text-white font-medium flex items-center gap-2"><Award size={18} className="text-red-400"/> Radar de Resgate (Clientes Sumidos)</h3>
                    <p className="text-xs text-zinc-500 mt-1">Recupere clientes que não agendam há algum tempo enviando uma mensagem rápida.</p>
                  </div>
                  <div className="flex bg-[#09090A] border border-zinc-800 rounded-lg p-1">
                    <button onClick={() => setFiltroSumidos('15')} className={`px-3 py-1.5 text-xs font-medium rounded-md transition-colors ${filtroSumidos === '15' ? 'bg-zinc-800 text-white' : 'text-zinc-500 hover:text-zinc-300'}`}>+15 Dias</button>
                    <button onClick={() => setFiltroSumidos('30')} className={`px-3 py-1.5 text-xs font-medium rounded-md transition-colors ${filtroSumidos === '30' ? 'bg-zinc-800 text-white' : 'text-zinc-500 hover:text-zinc-300'}`}>+30 Dias</button>
                    <button onClick={() => setFiltroSumidos('60')} className={`px-3 py-1.5 text-xs font-medium rounded-md transition-colors ${filtroSumidos === '60' ? 'bg-zinc-800 text-white' : 'text-zinc-500 hover:text-zinc-300'}`}>+60 Dias</button>
                  </div>
                </div>

                <div className="space-y-3">
                  {clientesSumidos.map(c => (
                    <div key={c.id} className="flex items-center justify-between p-4 rounded-lg bg-[#09090A] border border-zinc-800 hover:border-zinc-700 transition-colors">
                      <div className="flex flex-col justify-center w-20 border-r border-zinc-800 pr-3 mr-3 text-center">
                        <span className="text-red-400 font-bold text-lg">{c.diasSumido}</span>
                        <span className="text-[10px] text-zinc-500 uppercase">Dias</span>
                      </div>
                      <div className="flex-1 flex flex-col justify-center">
                        <p className="text-sm font-medium text-zinc-200 flex items-center gap-2">{c.nome} {c.totalCortes > 5 && <span className="text-[10px] bg-yellow-500/10 text-yellow-500 px-2 py-0.5 rounded-full border border-yellow-500/20">VIP</span>}</p>
                        <p className="text-xs text-zinc-500 mt-1">Última vez: {new Date(c.ultimaVisita).toLocaleDateString('pt-BR')}</p>
                      </div>
                      <div className="w-32 text-right border-r border-zinc-800 pr-4 mr-4 hidden md:block">
                        <p className="text-xs text-zinc-500">Valor Histórico</p>
                        <p className="text-sm font-medium text-zinc-300">R$ {c.totalGasto.toFixed(2)}</p>
                      </div>
                      <div>
                        <a href={gerarLinkWpp(c)} target="_blank" rel="noreferrer" className="flex items-center gap-2 bg-emerald-600/10 hover:bg-emerald-600/20 text-emerald-500 border border-emerald-600/30 px-3 py-2 rounded-lg text-xs font-medium transition-colors">
                          <MessageCircle size={16} /> Enviar Promo
                        </a>
                      </div>
                    </div>
                  ))}
                  {clientesSumidos.length === 0 && <p className="text-zinc-500 text-sm py-4">Nenhum cliente sumido neste período!</p>}
                </div>
              </div>
            </div>
          )}

          {/* SERVIÇOS */}
          {abaAtiva === 'servicos' && (
            <div className="bg-[#121214] border border-zinc-800 rounded-xl p-6 animate-fade-in">
              <div className="flex justify-between items-center mb-6">
                <h3 className="text-white font-medium">Meus Serviços e Promoções</h3>
                <button onClick={() => abrirModalServico()} className="flex items-center gap-2 bg-zinc-800 hover:bg-zinc-700 text-white px-4 py-2 rounded-lg text-sm transition-colors border border-zinc-700"><Plus size={16} /> Adicionar Serviço</button>
              </div>
              <div className="space-y-3">
                {servicos.map(s => (
                  <div key={s.id} className={`flex justify-between items-center p-4 rounded-lg bg-[#09090A] border transition-colors ${s.ativo !== false ? 'border-zinc-800' : 'border-red-900/40 opacity-60'}`}>
                    <div>
                      <p className="text-zinc-200 font-medium flex items-center gap-2">
                        {s.nome}
                        {s.ativo === false && <span className="text-[10px] bg-red-500/10 text-red-500 px-2 py-0.5 rounded-full border border-red-500/20">Oculto</span>}
                        {s.preco_promocional && s.ativo !== false && <span className="text-[10px] bg-yellow-500/10 text-yellow-500 px-2 py-0.5 rounded-full border border-yellow-500/20">Promoção Ativa</span>}
                      </p>
                      <p className="text-xs text-zinc-500 mt-1">Duração: {s.duracao_minutos} min</p>
                    </div>
                    <div className="flex items-center gap-6">
                      <div className="text-right">
                        {s.preco_promocional ? (
                          <><p className="text-xs text-zinc-500 line-through">R$ {parseFloat(s.preco).toFixed(2)}</p><p className="text-yellow-500 font-medium text-lg">R$ {parseFloat(s.preco_promocional).toFixed(2)}</p></>
                        ) : (<p className="text-yellow-500 font-medium text-lg">R$ {parseFloat(s.preco).toFixed(2)}</p>)}
                      </div>
                      <div className="flex gap-2 border-l border-zinc-800 pl-4">
                        <button onClick={() => abrirModalServico(s)} className="p-2 text-zinc-400 hover:text-white hover:bg-zinc-800 rounded transition-colors"><Edit2 size={18} /></button>
                        <button onClick={() => toggleStatusServico(s.id, s.ativo)} className={`p-2 rounded transition-colors ${s.ativo !== false ? 'text-zinc-400 hover:text-red-400 hover:bg-red-900/20' : 'text-zinc-400 hover:text-emerald-400 hover:bg-emerald-900/20'}`}>
                          {s.ativo !== false ? <EyeOff size={18} /> : <Eye size={18} />}
                        </button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* FINANCEIRO */}
          {abaAtiva === 'financeiro' && (
            <div className="bg-[#121214] border border-zinc-800 rounded-xl p-6 animate-fade-in">
              <h3 className="text-white font-medium mb-6">Histórico de Caixa (Manuais)</h3>
              <div className="space-y-3">
                {transacoes.map(t => (
                  <div key={t.id} className="flex justify-between items-center p-4 rounded-lg bg-[#09090A] border border-zinc-800">
                    <div className="flex gap-4 items-center">
                      <span className="text-xs text-zinc-500">{new Date(t.data_hora).toLocaleDateString('pt-BR')}</span>
                      <p className="text-zinc-300">{t.descricao}</p>
                    </div>
                    <span className={`font-medium ${t.tipo === 'entrada' ? 'text-emerald-500' : 'text-red-500'}`}>
                      {t.tipo === 'entrada' ? '+' : '-'} R$ {parseFloat(t.valor).toFixed(2)}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </main>

      {/* JANELAS MODAIS */}
      {isBloqueioModalOpen && (
        <div className="absolute inset-0 bg-black/80 flex items-center justify-center z-50 backdrop-blur-sm">
          <div className="bg-[#121214] border border-zinc-700 p-8 rounded-xl w-full max-w-md shadow-2xl">
            <div className="flex justify-between items-center mb-6">
              <h3 className="text-xl text-white font-medium flex items-center gap-2"><ShieldAlert className="text-red-500" /> Travar Agenda</h3>
              <button onClick={() => setIsBloqueioModalOpen(false)} className="text-zinc-400 hover:text-white"><X size={20} /></button>
            </div>
            <form onSubmit={salvarBloqueio} className="space-y-4">
              <div>
                <label className="block text-xs text-zinc-400 mb-2">Tipo de Bloqueio</label>
                <div className="flex gap-4">
                  <label className="flex items-center gap-2 text-sm text-white cursor-pointer"><input type="radio" checked={blqTipo === 'pontual'} onChange={() => setBlqTipo('pontual')} className="accent-red-500" />Data Específica</label>
                  <label className="flex items-center gap-2 text-sm text-white cursor-pointer"><input type="radio" checked={blqTipo === 'recorrente'} onChange={() => setBlqTipo('recorrente')} className="accent-red-500" />Fixo na Semana</label>
                </div>
              </div>
              {blqTipo === 'pontual' ? (
                <div><label className="block text-xs text-zinc-400 mb-1">Qual Data?</label><input required type="date" value={blqData} onChange={e => setBlqData(e.target.value)} className="w-full bg-[#09090A] border border-zinc-800 rounded p-2 text-white text-sm focus:border-red-500 outline-none" style={{ colorScheme: 'dark' }} /></div>
              ) : (
                <div><label className="block text-xs text-zinc-400 mb-1">Dia da Semana Fixo</label>
                  <select value={blqDiaSemana} onChange={e => setBlqDiaSemana(e.target.value)} className="w-full bg-[#09090A] border border-zinc-800 rounded p-2 text-white text-sm focus:border-red-500 outline-none">
                    <option value="1">Toda Segunda</option><option value="2">Toda Terça</option><option value="3">Toda Quarta</option><option value="4">Toda Quinta</option><option value="5">Toda Sexta</option><option value="6">Todo Sábado</option><option value="0">Todo Domingo</option>
                  </select>
                </div>
              )}
              <div className="grid grid-cols-2 gap-4">
                <div><label className="block text-xs text-zinc-400 mb-1">Hora Início</label><input required type="time" value={blqHoraInicio} onChange={e => setBlqHoraInicio(e.target.value)} className="w-full bg-[#09090A] border border-zinc-800 rounded p-2 text-white text-sm focus:border-red-500 outline-none" style={{ colorScheme: 'dark' }} /></div>
                <div><label className="block text-xs text-zinc-400 mb-1">Hora Fim</label><input required type="time" value={blqHoraFim} onChange={e => setBlqHoraFim(e.target.value)} className="w-full bg-[#09090A] border border-zinc-800 rounded p-2 text-white text-sm focus:border-red-500 outline-none" style={{ colorScheme: 'dark' }} /></div>
              </div>
              <div><label className="block text-xs text-zinc-400 mb-1">Motivo (Opcional)</label><input type="text" placeholder="Ex: Almoço" value={blqMotivo} onChange={e => setBlqMotivo(e.target.value)} className="w-full bg-[#09090A] border border-zinc-800 rounded p-2 text-white text-sm focus:border-red-500 outline-none" /></div>
              <button type="submit" className="w-full bg-red-600 hover:bg-red-700 text-white font-bold py-3 rounded-lg text-sm mt-4 transition-colors">Confirmar Bloqueio</button>
            </form>
            {modalStatus && <p className="text-red-400 text-sm mt-4 text-center">{modalStatus}</p>}
          </div>
        </div>
      )}

      {isServicoModalOpen && (
        <div className="absolute inset-0 bg-black/80 flex items-center justify-center z-50 backdrop-blur-sm">
          <div className="bg-[#121214] border border-zinc-700 p-8 rounded-xl w-full max-w-md shadow-2xl">
            <div className="flex justify-between items-center mb-6">
              <h3 className="text-xl text-white font-medium">{servicoIdEdicao ? 'Editar Serviço' : 'Novo Serviço'}</h3>
              <button onClick={() => setIsServicoModalOpen(false)} className="text-zinc-400 hover:text-white"><X size={20} /></button>
            </div>
            <form onSubmit={salvarServico} className="space-y-4">
              <div><label className="block text-xs text-zinc-400 mb-1">Nome do Corte/Serviço</label><input required type="text" value={servicoNome} onChange={e => setServicoNome(e.target.value)} className="w-full bg-[#09090A] border border-zinc-800 rounded p-2 text-white text-sm focus:border-yellow-600 outline-none" /></div>
              <div className="grid grid-cols-2 gap-4">
                <div><label className="block text-xs text-zinc-400 mb-1">Preço Normal (R$)</label><input required type="number" step="0.01" value={servicoPreco} onChange={e => setServicoPreco(e.target.value)} className="w-full bg-[#09090A] border border-zinc-800 rounded p-2 text-white text-sm focus:border-yellow-600 outline-none" /></div>
                <div><label className="block text-xs text-zinc-400 mb-1 flex justify-between">Preço Promo <span className="text-[10px] text-yellow-600">(Opcional)</span></label><input type="number" step="0.01" value={servicoPromo} onChange={e => setServicoPromo(e.target.value)} className="w-full bg-[#09090A] border border-yellow-600/30 rounded p-2 text-yellow-500 text-sm focus:border-yellow-600 outline-none placeholder-zinc-700" placeholder="Ex: 35.00" /></div>
              </div>
              <div><label className="block text-xs text-zinc-400 mb-1">Tempo (Minutos)</label><input required type="number" value={servicoDuracao} onChange={e => setServicoDuracao(e.target.value)} className="w-full bg-[#09090A] border border-zinc-800 rounded p-2 text-white text-sm focus:border-yellow-600 outline-none" /></div>
              <button type="submit" className="w-full bg-yellow-600 hover:bg-yellow-500 text-zinc-950 font-bold py-3 rounded-lg text-sm mt-4 transition-colors">{servicoIdEdicao ? 'Atualizar' : 'Cadastrar'}</button>
            </form>
          </div>
        </div>
      )}

      {isCaixaOpen && (
        <div className="absolute inset-0 bg-black/80 flex items-center justify-center z-50 backdrop-blur-sm">
          <div className="bg-[#121214] border border-zinc-700 p-8 rounded-xl w-full max-w-md shadow-2xl">
            <div className="flex justify-between items-center mb-6">
              <h3 className="text-xl text-white font-medium">Movimentar Caixa</h3>
              <button onClick={() => setIsCaixaOpen(false)} className="text-zinc-400 hover:text-white"><X size={20} /></button>
            </div>
            <form onSubmit={handleLancamentoCaixa} className="space-y-4">
              <div>
                <label className="block text-xs text-zinc-400 mb-1">Tipo</label>
                <div className="flex gap-4">
                  <label className="flex items-center gap-2 text-sm text-white cursor-pointer"><input type="radio" checked={caixaTipo === 'saida'} onChange={() => setCaixaTipo('saida')} className="accent-yellow-600" />Saída</label>
                  <label className="flex items-center gap-2 text-sm text-white cursor-pointer"><input type="radio" checked={caixaTipo === 'entrada'} onChange={() => setCaixaTipo('entrada')} className="accent-yellow-600" />Entrada Extra</label>
                </div>
              </div>
              <div><label className="block text-xs text-zinc-400 mb-1">Descrição</label><input required type="text" value={caixaDescricao} onChange={e => setCaixaDescricao(e.target.value)} className="w-full bg-[#09090A] border border-zinc-800 rounded p-2 text-white text-sm focus:border-yellow-600 outline-none" /></div>
              <div><label className="block text-xs text-zinc-400 mb-1">Valor (R$)</label><input required type="number" step="0.01" value={caixaValor} onChange={e => setCaixaValor(e.target.value)} className="w-full bg-[#09090A] border border-zinc-800 rounded p-2 text-white text-sm focus:border-yellow-600 outline-none" /></div>
              <button type="submit" className="w-full bg-yellow-600 text-zinc-950 font-bold py-3 rounded-lg text-sm mt-4">Registrar</button>
            </form>
          </div>
        </div>
      )}

      {isModalOpen && (
        <div className="absolute inset-0 bg-black/80 flex items-center justify-center z-50 backdrop-blur-sm">
          <div className="bg-[#121214] border border-zinc-700 p-8 rounded-xl w-full max-w-md shadow-2xl">
            <div className="flex justify-between items-center mb-6">
              <h3 className="text-xl text-white font-medium">Agendar Manualmente</h3>
              <button onClick={() => setIsModalOpen(false)} className="text-zinc-400 hover:text-white"><X size={20} /></button>
            </div>
            <form onSubmit={handleAgendarManual} className="space-y-4">
              <div><label className="block text-xs text-zinc-400 mb-1">Cliente</label><input required type="text" value={novoNome} onChange={e => setNovoNome(e.target.value)} className="w-full bg-[#09090A] border border-zinc-800 rounded p-2 text-white text-sm focus:border-yellow-600 outline-none" /></div>
              <div><label className="block text-xs text-zinc-400 mb-1">WhatsApp</label><input required type="tel" value={novoTelefone} onChange={e => setNovoTelefone(e.target.value)} className="w-full bg-[#09090A] border border-zinc-800 rounded p-2 text-white text-sm focus:border-yellow-600 outline-none" /></div>
              <div><label className="block text-xs text-zinc-400 mb-1">Serviço</label>
                <select required value={novoServico} onChange={e => setNovoServico(e.target.value)} className="w-full bg-[#09090A] border border-zinc-800 rounded p-2 text-white text-sm focus:border-yellow-600 outline-none">
                  <option value="">Selecione...</option>
                  {servicos.filter(s => s.ativo !== false).map(s => (<option key={s.id} value={s.id}>{s.nome}</option>))}
                </select>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div><label className="block text-xs text-zinc-400 mb-1">Data</label><input required type="date" value={novaData} onChange={e => setNovaData(e.target.value)} className="w-full bg-[#09090A] border border-zinc-800 rounded p-2 text-white text-sm focus:border-yellow-600 outline-none" style={{ colorScheme: 'dark' }} /></div>
                <div><label className="block text-xs text-zinc-400 mb-1">Hora</label><input required type="time" value={novaHora} onChange={e => setNovaHora(e.target.value)} className="w-full bg-[#09090A] border border-zinc-800 rounded p-2 text-white text-sm focus:border-yellow-600 outline-none" style={{ colorScheme: 'dark' }} /></div>
              </div>
              <button type="submit" className="w-full bg-yellow-600 text-zinc-950 font-bold py-3 rounded-lg text-sm mt-4">Confirmar</button>
            </form>
            {modalStatus && <p className="text-yellow-500 text-sm mt-4 text-center">{modalStatus}</p>}
          </div>
        </div>
      )}
    </div>
  );
}

function NavItem({ icon, label, active, onClick }) {
  return (
    <button onClick={onClick} className={`w-full flex items-center gap-3 px-4 py-3 rounded-lg text-sm transition-colors ${active ? 'bg-yellow-600/10 text-yellow-500 font-medium' : 'text-zinc-400 hover:text-zinc-200 hover:bg-zinc-800/50'}`}>
      {icon}{label}
    </button>
  );
}

function KpiCard({ icon, title, value }) {
  return (
    <div className="bg-[#121214] border border-zinc-800 rounded-xl p-5 flex flex-col gap-3">
      <div className="flex items-center gap-3">
        <div className="p-2 bg-[#09090A] rounded-lg border border-zinc-800">{icon}</div>
        <span className="text-xs text-zinc-400">{title}</span>
      </div>
      <div className="text-2xl font-semibold text-white">{value}</div>
    </div>
  );
}
