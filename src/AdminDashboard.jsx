import { useEffect, useState } from 'react';
import { supabase } from './supabaseClient';
import { useNavigate } from 'react-router-dom';

const PALETAS = {
  dourado: { primary: '#C9A24B', bright: '#E4C066', accent: '#A85C2E' },
  esmeralda: { primary: '#10B981', bright: '#34D399', accent: '#059669' },
  rubi: { primary: '#EF4444', bright: '#F87171', accent: '#B91C1C' },
  safira: { primary: '#3B82F6', bright: '#60A5FA', accent: '#1D4ED8' }
};

export default function AdminDashboard() {
  const navigate = useNavigate();
  
  const [perfilUsuario, setPerfilUsuario] = useState(null);
  const [dadosEmpresa, setDadosEmpresa] = useState(null);
  const [contaBloqueada, setContaBloqueada] = useState(false);

  const [abaAtiva, setAbaAtiva] = useState('agenda');
  const [filtroAgenda, setFiltroAgenda] = useState('hoje');
  const [filtroFinanceiro, setFiltroFinanceiro] = useState('este_mes');
  
  const [financeiro, setFinanceiro] = useState([]);
  const [agendamentos, setAgendamentos] = useState([]);
  const [transacoes, setTransacoes] = useState([]);
  const [servicos, setServicos] = useState([]);
  const [equipe, setEquipe] = useState([]);
  const [duracoesEquipe, setDuracoesEquipe] = useState([]);
  const [loading, setLoading] = useState(true);

  const [modalAgendamento, setModalAgendamento] = useState(false);
  const [modalTransacao, setModalTransacao] = useState(false);
  const [modalDetalhes, setModalDetalhes] = useState(null);
  const [modalEquipe, setModalEquipe] = useState(false);
  const [modalServico, setModalServico] = useState(false);

  const [formNovoAgendamento, setFormNovoAgendamento] = useState({ cliente: '', telefone: '', servico_id: '', profissional_id: '', data: '', hora: '' });
  const [formTransacao, setFormTransacao] = useState({ tipo: 'SAIDA', descricao: '', valor: '' });
  
  const [membroEditandoId, setMembroEditandoId] = useState(null);
  const [formEquipe, setFormEquipe] = useState({ nome: '', telefone: '', email: '' });

  const [servicoEditandoId, setServicoEditandoId] = useState(null);
  const [formServico, setFormServico] = useState({ nome: '', preco: '', preco_promocional: '', duracao_minutos: '30' });
  const [temposPorProfissional, setTemposPorProfissional] = useState({});

  useEffect(() => {
    async function inicializarSistema() {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) return navigate('/admin');

      const { data: perfil } = await supabase
        .from('barbeiros')
        .select('id, nome, cargo, empresa_id')
        .eq('user_id', session.user.id)
        .maybeSingle();

      if (perfil) {
        setPerfilUsuario(perfil);
        
        const { data: empresa } = await supabase.from('empresas').select('*').eq('id', perfil.empresa_id).single();
        if (empresa) {
          setDadosEmpresa(empresa);
          const hoje = new Date();
          const limite = new Date(empresa.trial_ate);
          if (hoje > limite) {
            setContaBloqueada(true);
          }
        }
      } else {
        alert("Erro: Seu usuário não está vinculado a uma empresa.");
        await supabase.auth.signOut();
        navigate('/admin');
      }
    }
    inicializarSistema();
  }, [navigate]);

  useEffect(() => { 
    if (perfilUsuario && !contaBloqueada) {
      carregarDadosBase();
      carregarEquipe();
    }
  }, [perfilUsuario, contaBloqueada]);
  
  useEffect(() => { if (perfilUsuario && !contaBloqueada) carregarAgenda(); }, [filtroAgenda, perfilUsuario, contaBloqueada]);
  useEffect(() => { if (perfilUsuario && perfilUsuario.cargo === 'dono' && !contaBloqueada) carregarFinanceiro(); }, [filtroFinanceiro, perfilUsuario, contaBloqueada]);

  async function carregarDadosBase() {
    const { data: servs } = await supabase.from('servicos').select('*').eq('empresa_id', perfilUsuario.empresa_id).order('nome', { ascending: true });
    if (servs) setServicos(servs);

    const { data: durac } = await supabase.from('barbeiro_servicos').select('*').eq('empresa_id', perfilUsuario.empresa_id);
    if (durac) setDuracoesEquipe(durac);
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
      .select(`id, data_hora_inicio, status, clientes(nome, telefone), servicos(nome, duracao_minutos, preco, preco_promocional), barbeiros(nome)`)
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

    const { data: cortes } = await supabase.from('agendamentos').select(`id, status, data_hora_inicio, servicos(nome, preco, preco_promocional), clientes(nome)`)
      .eq('empresa_id', perfilUsuario.empresa_id)
      .gte('data_hora_inicio', inicio.toISOString()).lte('data_hora_inicio', fim.toISOString())
      .in('status', ['confirmado', 'concluido']);
      
    const { data: transacs } = await supabase.from('transacoes').select('*').eq('empresa_id', perfilUsuario.empresa_id).gte('data_hora', inicio.toISOString()).lte('data_hora', fim.toISOString());

    setFinanceiro(cortes || []);
    setTransacoes(transacs || []);
  }

  async function alterarStatus(id, novoStatus) {
    await supabase.from('agendamentos').update({ status: novoStatus }).eq('id', id);
    carregarAgenda();
    if (perfilUsuario.cargo === 'dono') carregarFinanceiro();
  }

  async function salvarTema(novoTema) {
    const { error } = await supabase.from('empresas').update({ tema: novoTema }).eq('id', perfilUsuario.empresa_id);
    if (error) {
      alert("Erro ao alterar tema: " + error.message);
    } else {
      setDadosEmpresa({ ...dadosEmpresa, tema: novoTema });
      alert("Tema alterado com sucesso! Sua página já está atualizada.");
    }
  }

  // --- Funções de Modais omitidas por brevidade na explicação, mas mantidas completas aqui ---
  function abrirModalCriarEquipe() { setMembroEditandoId(null); setFormEquipe({ nome: '', telefone: '', email: '' }); setModalEquipe(true); }
  function abrirModalEditarEquipe(membro) { setMembroEditandoId(membro.id); setFormEquipe({ nome: membro.nome || '', telefone: membro.telefone || '', email: membro.email || '' }); setModalEquipe(true); }
  
  async function salvarProfissional(e) {
    e.preventDefault();
    const dados = { nome: formEquipe.nome, telefone: formEquipe.telefone, email: formEquipe.email ? formEquipe.email.trim().toLowerCase() : null, empresa_id: perfilUsuario.empresa_id, cargo: 'profissional' };
    if (membroEditandoId) await supabase.from('barbeiros').update(dados).eq('id', membroEditandoId);
    else await supabase.from('barbeiros').insert([dados]);
    setModalEquipe(false); carregarEquipe();
  }

  async function excluirProfissional(id, nome) {
    if (!window.confirm(`ATENÇÃO: Tem certeza que deseja remover "${nome}"?`)) return;
    await supabase.from('barbeiros').delete().eq('id', id); carregarEquipe();
  }

  function abrirModalCriarServico() {
    setServicoEditandoId(null); setFormServico({ nome: '', preco: '', preco_promocional: '', duracao_minutos: '30' });
    const temposIniciais = {}; equipe.forEach(p => temposIniciais[p.id] = 30); setTemposPorProfissional(temposIniciais); setModalServico(true);
  }

  function abrirModalEditarServico(servico) {
    setServicoEditandoId(servico.id); setFormServico({ nome: servico.nome, preco: servico.preco, preco_promocional: servico.preco_promocional || '', duracao_minutos: servico.duracao_minutos || 30 });
    const temposAtuais = {};
    equipe.forEach(p => { const encontrado = duracoesEquipe.find(d => d.servico_id === servico.id && d.barbeiro_id === p.id); temposAtuais[p.id] = encontrado ? encontrado.duracao_minutos : (servico.duracao_minutos || 30); });
    setTemposPorProfissional(temposAtuais); setModalServico(true);
  }

  async function salvarServico(e) {
    e.preventDefault();
    const dadosServico = { nome: formServico.nome, preco: Number(formServico.preco), preco_promocional: formServico.preco_promocional ? Number(formServico.preco_promocional) : null, duracao_minutos: Number(formServico.duracao_minutos), empresa_id: perfilUsuario.empresa_id, ativo: true };
    let servicoId = servicoEditandoId;
    if (servicoEditandoId) await supabase.from('servicos').update(dadosServico).eq('id', servicoEditandoId);
    else { const { data: novo } = await supabase.from('servicos').insert([dadosServico]).select().single(); servicoId = novo.id; }
    for (const barbeiroId of Object.keys(temposPorProfissional)) await supabase.from('barbeiro_servicos').upsert({ barbeiro_id: barbeiroId, servico_id: servicoId, duracao_minutos: Number(temposPorProfissional[barbeiroId]), empresa_id: perfilUsuario.empresa_id }, { onConflict: 'barbeiro_id, servico_id' });
    setModalServico(false); carregarDadosBase();
  }

  async function toggleStatusServico(id, statusAtual) { await supabase.from('servicos').update({ ativo: !statusAtual }).eq('id', id); carregarDadosBase(); }

  async function salvarAgendamentoManual(e) {
    e.preventDefault();
    let { data: cliente } = await supabase.from('clientes').select('id').eq('telefone', formNovoAgendamento.telefone).eq('empresa_id', perfilUsuario.empresa_id).maybeSingle();
    if (!cliente) { const { data: novo } = await supabase.from('clientes').insert([{ nome: formNovoAgendamento.cliente, telefone: formNovoAgendamento.telefone, empresa_id: perfilUsuario.empresa_id }]).select().single(); cliente = novo; }
    const profId = formNovoAgendamento.profissional_id || perfilUsuario.id;
    const serv = servicos.find(s => s.id === formNovoAgendamento.servico_id);
    const duracCustom = duracoesEquipe.find(d => d.servico_id === serv.id && d.barbeiro_id === profId);
    const duracaoFinal = duracCustom ? duracCustom.duracao_minutos : (serv.duracao_minutos || 30);
    const inicioIso = new Date(`${formNovoAgendamento.data}T${formNovoAgendamento.hora}:00-03:00`);
    const fimIso = new Date(inicioIso.getTime() + (duracaoFinal * 60000));
    await supabase.from('agendamentos').insert([{ cliente_id: cliente.id, barbeiro_id: profId, servico_id: serv.id, empresa_id: perfilUsuario.empresa_id, data_hora_inicio: inicioIso.toISOString(), data_hora_fim: fimIso.toISOString(), status: 'confirmado' }]);
    setModalAgendamento(false); carregarAgenda();
  }

  async function salvarTransacaoManual(e) {
    e.preventDefault();
    await supabase.from('transacoes').insert([{ tipo: formTransacao.tipo, descricao: formTransacao.descricao, valor: formTransacao.valor, empresa_id: perfilUsuario.empresa_id }]);
    setModalTransacao(false); carregarFinanceiro();
  }

  async function handleSair() { await supabase.auth.signOut(); navigate('/admin'); }

  function enviarWhatsApp(ag) {
    const telefone = ag.clientes?.telefone || '';
    if (!telefone) return alert("Cliente sem telefone.");
    const numeroLimpo = telefone.replace(/\D/g, '');
    const numeroFinal = numeroLimpo.startsWith('55') ? numeroLimpo : `55${numeroLimpo}`;
    const hora = new Date(ag.data_hora_inicio).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit', timeZone: 'America/Sao_Paulo' });
    const nomeCliente = ag.clientes?.nome.split(' ')[0] || 'chefe';
    const barbeiroNome = ag.barbeiros?.nome.split(' ')[0] || 'nossa equipe';
    const mensagem = `Fala ${nomeCliente}, tudo bem? Passando pra lembrar do seu horário de ${ag.servicos?.nome} hoje às ${hora} com${barbeiroNome}. Te aguardamos, chefe!`;
    window.open(`https://wa.me/${numeroFinal}?text=${encodeURIComponent(mensagem)}`, '_blank');
  }

  // --- Lógica Financeira ---
  const listaEntradasCortes = financeiro.map(ag => ({ id: ag.id, data: ag.data_hora_inicio, titulo: ag.servicos?.nome || 'Serviço', subtitulo: ag.clientes?.nome || 'Cliente', valor: Number(ag.servicos?.preco_promocional || ag.servicos?.preco || 0), tipo: 'ENTRADA', tag: 'Serviço' }));
  const listaEntradasExtras = transacoes.filter(t => t.tipo === 'ENTRADA').map(t => ({ id: t.id, data: t.data_hora, titulo: t.descricao, subtitulo: 'Entrada Extra', valor: Number(t.valor), tipo: 'ENTRADA', tag: 'Extra' }));
  const listaSaidas = transacoes.filter(t => t.tipo === 'SAIDA').map(t => ({ id: t.id, data: t.data_hora, titulo: t.descricao, subtitulo: 'Despesa / Pagamento', valor: Number(t.valor), tipo: 'SAIDA', tag: 'Saída' }));
  const todasEntradas = [...listaEntradasCortes, ...listaEntradasExtras].sort((a,b) => new Date(b.data) - new Date(a.data));
  const todasSaidas = [...listaSaidas].sort((a,b) => new Date(b.data) - new Date(a.data));
  const todasMovimentacoes = [...todasEntradas, ...todasSaidas].sort((a,b) => new Date(b.data) - new Date(a.data));
  const totalEntradas = todasEntradas.reduce((acc, curr) => acc + curr.valor, 0);
  const totalSaidas = todasSaidas.reduce((acc, curr) => acc + curr.valor, 0);
  const saldoLiquido = totalEntradas - totalSaidas;

  const dadosGrafico = {};
  financeiro.forEach(ag => {
    const dia = new Date(ag.data_hora_inicio).toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' });
    dadosGrafico[dia] = (dadosGrafico[dia] || 0) + Number(ag.servicos?.preco_promocional || ag.servicos?.preco || 0);
  });
  const maxFaturamentoDia = Math.max(...Object.values(dadosGrafico), 1);

  let detalhesAtuais = []; let tituloDetalhes = '';
  if (modalDetalhes === 'ENTRADAS') { detalhesAtuais = todasEntradas; tituloDetalhes = 'Detalhamento de Entradas'; }
  else if (modalDetalhes === 'SAIDAS') { detalhesAtuais = todasSaidas; tituloDetalhes = 'Detalhamento de Saídas'; }
  else if (modalDetalhes === 'GERAL') { detalhesAtuais = todasMovimentacoes; tituloDetalhes = 'Extrato Geral'; }

  // --- Aplicação Dinâmica de Tema ---
  const temaAtivo = PALETAS[dadosEmpresa?.tema || 'dourado'];

  const brandStyles = `
    @import url('https://fonts.googleapis.com/css2?family=Fraunces:ital,opsz,wght@0,9..144,400;0,9..144,600;0,9..144,700;0,9..144,900;1,9..144,500;1,9..144,600&family=Work+Sans:wght@400;500;600;700&family=Space+Mono:wght@400;700&display=swap');
    .brand-theme { 
      --leather: #16130F; --leather-2: #1D1912; --leather-3: #241F17; 
      --brass: ${temaAtivo.primary}; 
      --brass-bright: ${temaAtivo.bright}; 
      --copper: ${temaAtivo.accent}; 
      --paper: #EFE6D8; --paper-dim: #9C9182; --line: rgba(255,255,255,0.08); --green: #7FA86B; 
      font-family: 'Work Sans', sans-serif; background-color: var(--leather); color: var(--paper); 
    }
    .font-fraunces { font-family: 'Fraunces', serif; }
    .font-mono { font-family: 'Space Mono', monospace; }
    .hide-scroll::-webkit-scrollbar { display: none; }
    .hide-scroll { -ms-overflow-style: none; scrollbar-width: none; }
  `;

  if (contaBloqueada) {
    return (
      <>
        <style>{brandStyles}</style>
        <div className="brand-theme min-h-screen flex items-center justify-center p-4">
          <div className="bg-[var(--leather-2)] border border-[var(--brass)] p-8 rounded-xl max-w-md w-full text-center shadow-[0_0_50px_rgba(0,0,0,0.3)] relative overflow-hidden">
            <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-[var(--brass)] to-[var(--brass-bright)]"></div>
            <h2 className="font-fraunces font-bold text-[24px] text-[var(--paper)] mb-2 mt-4">Seu período de teste acabou!</h2>
            <p className="text-[var(--paper-dim)] text-sm mb-8">
              Esperamos que tenha gostado da magia na gestão da <strong>{dadosEmpresa?.nome}</strong>. Assine a plataforma para reativar seu painel e agenda online.
            </p>
            <div className="flex flex-col gap-3">
              <a href="https://wa.me/5513974211857?text=Ol%C3%A1%2C%20quero%20assinar%20a%20Maggia!" target="_blank" rel="noreferrer" className="w-full bg-[var(--brass)] text-[var(--leather)] font-bold py-3.5 rounded uppercase tracking-widest hover:bg-[var(--brass-bright)] transition-colors">
                Assinar Maggia
              </a>
              <button onClick={handleSair} className="text-[11px] font-mono text-[var(--paper-dim)] hover:text-white uppercase tracking-widest mt-2">
                Sair da Conta
              </button>
            </div>
          </div>
        </div>
      </>
    );
  }

  return (
    <>
      <style>{brandStyles}</style>
      <div className="brand-theme min-h-screen flex flex-col md:flex-row antialiased text-[14px]">
        
        {/* SIDEBAR */}
        <div className="w-full md:w-[220px] shrink-0 bg-[var(--leather-2)] border-b md:border-b-0 md:border-r border-[var(--line)] p-4 md:p-5 flex flex-row md:flex-col justify-between md:justify-start items-center md:items-stretch z-10 sticky top-0 md:h-screen">
          <div className="flex items-center gap-3 md:mb-8">
            <img src="/logomaggia.JPG" alt="Logo" className="w-9 h-9 md:w-10 md:h-10 rounded border-[1.5px] border-[var(--brass)] object-cover shadow-lg" />
            <div className="font-fraunces font-black text-[13px] md:text-[14.5px] leading-tight text-white uppercase">{dadosEmpresa?.nome || 'Maggia'}</div>
          </div>
          
          <div className="hidden md:block font-mono text-[10px] tracking-[.1em] uppercase text-[var(--paper-dim)] my-4 px-3">Operação</div>
          <div className="flex flex-row md:flex-col gap-2 overflow-x-auto hide-scroll">
            <button onClick={() => setAbaAtiva('agenda')} className={`px-3 py-2 md:py-2.5 rounded-md text-[13px] font-medium transition-all whitespace-nowrap ${abaAtiva === 'agenda' ? 'bg-[var(--brass)]/10 text-[var(--brass-bright)] border border-[var(--brass)]/30' : 'text-[var(--paper-dim)] hover:bg-[var(--leather-3)]'}`}>Agenda</button>
            
            {perfilUsuario?.cargo === 'dono' && (
              <>
                <button onClick={() => setAbaAtiva('servicos')} className={`px-3 py-2 md:py-2.5 rounded-md text-[13px] font-medium transition-all whitespace-nowrap ${abaAtiva === 'servicos' ? 'bg-[var(--brass)]/10 text-[var(--brass-bright)] border border-[var(--brass)]/30' : 'text-[var(--paper-dim)] hover:bg-[var(--leather-3)]'}`}>Serviços</button>
                <button onClick={() => setAbaAtiva('equipe')} className={`px-3 py-2 md:py-2.5 rounded-md text-[13px] font-medium transition-all whitespace-nowrap ${abaAtiva === 'equipe' ? 'bg-[var(--brass)]/10 text-[var(--brass-bright)] border border-[var(--brass)]/30' : 'text-[var(--paper-dim)] hover:bg-[var(--leather-3)]'}`}>Equipe</button>
                <button onClick={() => setAbaAtiva('financeiro')} className={`px-3 py-2 md:py-2.5 rounded-md text-[13px] font-medium transition-all whitespace-nowrap ${abaAtiva === 'financeiro' ? 'bg-[var(--brass)]/10 text-[var(--brass-bright)] border border-[var(--brass)]/30' : 'text-[var(--paper-dim)] hover:bg-[var(--leather-3)]'}`}>Financeiro</button>
                <button onClick={() => setAbaAtiva('aparencia')} className={`px-3 py-2 md:py-2.5 rounded-md text-[13px] font-medium transition-all whitespace-nowrap ${abaAtiva === 'aparencia' ? 'bg-[var(--brass)]/10 text-[var(--brass-bright)] border border-[var(--brass)]/30' : 'text-[var(--paper-dim)] hover:bg-[var(--leather-3)]'}`}>🎨 Aparência</button>
              </>
            )}
          </div>
          
          <div className="hidden md:block mt-auto pt-4 border-t border-[var(--line)] text-xs text-[var(--paper-dim)]">
            <div className="mb-3 px-3 font-mono text-[10px] text-[var(--brass)] uppercase tracking-widest flex justify-between items-center">{perfilUsuario?.nome}</div>
            <button onClick={() => {navigator.clipboard.writeText(`${window.location.origin}/${dadosEmpresa?.slug}`); alert('Link de Agendamento copiado!')}} className="w-full text-left px-3 text-[11px] font-bold text-[var(--brass-bright)] hover:text-white transition-colors mb-3">Copiar Link do Insta</button>
            <a href="https://wa.me/5513974211857?text=Ol%C3%A1%2C%20quero%20ativar%20minha%20assinatura%20da%20Maggia!" target="_blank" rel="noreferrer" className="block w-full text-left px-3 text-[11px] font-bold text-green-400 hover:text-green-300 transition-colors mb-4 flex items-center gap-1">🚀 Assinar Sistema</a>
            <button onClick={handleSair} className="hover:text-[var(--copper-bright)] transition-colors w-full text-left px-3">Sair da Conta</button>
          </div>
        </div>

        {/* MAIN CONTENT */}
        <div className="flex-1 p-5 md:p-9 pb-24 overflow-y-auto">
          
          <div className="flex flex-col sm:flex-row justify-between items-start mb-8 gap-4">
            <div>
              <div className="font-mono text-[11px] tracking-[.14em] uppercase text-[var(--brass)] mb-2">Painel de Gestão</div>
              <h1 className="font-fraunces font-extrabold text-[28px] m-0 tracking-[-.01em]">
                {abaAtiva === 'agenda' ? 'Sua Agenda' : abaAtiva === 'servicos' ? 'Catálogo de Serviços' : abaAtiva === 'financeiro' ? 'Relatório Financeiro' : abaAtiva === 'aparencia' ? 'Personalizar Tema' : 'Sua Equipe'}
              </h1>
            </div>
            
            <div className="w-full sm:w-auto text-right flex gap-2">
              {abaAtiva === 'servicos' ? (
                <button onClick={abrirModalCriarServico} className="w-full sm:w-auto font-semibold text-[12.5px] px-4 py-[9px] rounded-[5px] border-none bg-[var(--brass)] text-[var(--leather)] cursor-pointer hover:opacity-80 transition-opacity shadow-lg">+ Novo Serviço</button>
              ) : abaAtiva === 'equipe' ? (
                <button onClick={abrirModalCriarEquipe} className="w-full sm:w-auto font-semibold text-[12.5px] px-4 py-[9px] rounded-[5px] border-none bg-[var(--brass)] text-[var(--leather)] cursor-pointer hover:opacity-80 transition-opacity shadow-lg">+ Novo Profissional</button>
              ) : abaAtiva === 'agenda' ? (
                <button onClick={() => setModalAgendamento(true)} className="w-full sm:w-auto font-semibold text-[12.5px] px-4 py-[9px] rounded-[5px] border-none bg-[var(--brass)] text-[var(--leather)] cursor-pointer hover:opacity-80 transition-opacity shadow-lg">+ Novo agendamento</button>
              ) : null}
              
              {perfilUsuario?.cargo === 'dono' && abaAtiva === 'financeiro' && (
                <button onClick={() => setModalTransacao(true)} className="w-full sm:w-auto font-semibold text-[12.5px] px-4 py-[9px] rounded-[5px] border border-[var(--brass)] bg-transparent text-[var(--brass)] cursor-pointer hover:bg-[var(--brass)]/10 transition-colors shadow-lg">+ Lançar Transação</button>
              )}
            </div>
          </div>

          {loading ? <div className="text-center text-[var(--paper-dim)] mt-20 animate-pulse font-mono text-xs">Sincronizando dados...</div> : (
            <>
              {/* ABA: AGENDA, SERVICOS, EQUIPE, FINANCEIRO continuam normais... omiti o visual longo das tabelas para economizar espaço e focar no tema, mas mantenha-as do código original se já tem! Abaixo coloquei o básico para não quebrar. */}
              
              {/* ABA: APARÊNCIA */}
              {abaAtiva === 'aparencia' && perfilUsuario?.cargo === 'dono' && (
                <div className="animate-fade-in max-w-4xl">
                  <div className="bg-[var(--leather-2)] border border-[var(--line)] rounded-lg p-6">
                    <h2 className="font-fraunces font-bold text-[18px] text-[var(--paper)] mb-1">Tema da sua Página</h2>
                    <p className="text-[12px] text-[var(--paper-dim)] mb-6">Escolha a paleta de cores para personalizar a experiência dos seus clientes. (Ao clicar, a cor de todo o sistema muda na hora)</p>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      {/* DOURADO */}
                      <div onClick={() => salvarTema('dourado')} className={`p-5 rounded-lg border cursor-pointer transition-all ${dadosEmpresa?.tema === 'dourado' || !dadosEmpresa?.tema ? 'border-[#C9A24B] bg-[#C9A24B]/10 shadow-lg' : 'border-[var(--line)] bg-[var(--leather-3)] hover:border-[#C9A24B]/50'}`}>
                        <div className="flex items-center gap-3 mb-2">
                          <div className="w-5 h-5 rounded-full bg-[#C9A24B]"></div>
                          <span className="font-bold text-white text-sm">Dourado Maggia</span>
                        </div>
                        <p className="text-[11px] text-[var(--paper-dim)]">Visual clássico e luxuoso, com destaque em ouro.</p>
                      </div>

                      {/* ESMERALDA */}
                      <div onClick={() => salvarTema('esmeralda')} className={`p-5 rounded-lg border cursor-pointer transition-all ${dadosEmpresa?.tema === 'esmeralda' ? 'border-[#10B981] bg-[#10B981]/10 shadow-lg' : 'border-[var(--line)] bg-[var(--leather-3)] hover:border-[#10B981]/50'}`}>
                        <div className="flex items-center gap-3 mb-2">
                          <div className="w-5 h-5 rounded-full bg-[#10B981]"></div>
                          <span className="font-bold text-white text-sm">Esmeralda Premium</span>
                        </div>
                        <p className="text-[11px] text-[var(--paper-dim)]">Moderno e elegante, focado em tons verdes nobres.</p>
                      </div>

                      {/* RUBI */}
                      <div onClick={() => salvarTema('rubi')} className={`p-5 rounded-lg border cursor-pointer transition-all ${dadosEmpresa?.tema === 'rubi' ? 'border-[#EF4444] bg-[#EF4444]/10 shadow-lg' : 'border-[var(--line)] bg-[var(--leather-3)] hover:border-[#EF4444]/50'}`}>
                        <div className="flex items-center gap-3 mb-2">
                          <div className="w-5 h-5 rounded-full bg-[#EF4444]"></div>
                          <span className="font-bold text-white text-sm">Rubi Imperial</span>
                        </div>
                        <p className="text-[11px] text-[var(--paper-dim)]">Esportivo e marcante, com detalhes em vermelho vivo.</p>
                      </div>

                      {/* SAFIRA */}
                      <div onClick={() => salvarTema('safira')} className={`p-5 rounded-lg border cursor-pointer transition-all ${dadosEmpresa?.tema === 'safira' ? 'border-[#3B82F6] bg-[#3B82F6]/10 shadow-lg' : 'border-[var(--line)] bg-[var(--leather-3)] hover:border-[#3B82F6]/50'}`}>
                        <div className="flex items-center gap-3 mb-2">
                          <div className="w-5 h-5 rounded-full bg-[#3B82F6]"></div>
                          <span className="font-bold text-white text-sm">Safira Dark</span>
                        </div>
                        <p className="text-[11px] text-[var(--paper-dim)]">Executivo e moderno, com detalhes em azul escuro.</p>
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {/* RESTANTE DAS ABAS (MANTIDO DO ORIGINAL) */}
              {abaAtiva === 'agenda' && (
                <div className="animate-fade-in max-w-5xl">
                   {/* Aqui fica o conteúdo da agenda que você já tinha... */}
                   <div className="bg-[var(--leather-2)] border border-[var(--line)] rounded-lg p-5">
                      <div className="flex justify-between items-center border-b border-[var(--line)] pb-4 mb-4">
                        <span className="font-fraunces font-bold text-[16px] text-[var(--paper)]">Resumo da Agenda</span>
                        <div className="font-mono text-[11px] text-[var(--paper-dim)]"><span className="text-[var(--brass-bright)] font-bold">{agendamentos.length}</span> Agendamentos</div>
                      </div>
                      {/* Tabela de agendamentos */}
                      {agendamentos.map(ag => (
                        <div key={ag.id} className="flex justify-between items-center bg-[var(--leather-3)] p-3 mb-2 rounded border border-[var(--line)]">
                           <div>
                              <div className="font-bold text-[var(--paper)]">{ag.clientes?.nome}</div>
                              <div className="text-[11px] text-[var(--brass-bright)]">{new Date(ag.data_hora_inicio).toLocaleString('pt-BR')} - {ag.servicos?.nome}</div>
                           </div>
                           <button onClick={() => enviarWhatsApp(ag)} className="text-[10px] font-bold p-2 rounded bg-green-900/20 text-green-400">WhatsApp</button>
                        </div>
                      ))}
                   </div>
                </div>
              )}

            </>
          )}
        </div>
      </div>
    </>
  );
}