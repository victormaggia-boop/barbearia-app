import { useEffect, useState, useRef } from 'react';
import { supabase } from './supabaseClient';

export default function Booking() {
  const [servicos, setServicos] = useState([]);
  const [barbeiros, setBarbeiros] = useState([]);
  
  const [servicoSelecionado, setServicoSelecionado] = useState(null);
  const [barbeiroSelecionado, setBarbeiroSelecionado] = useState(null);
  
  const [diasRapidos, setDiasRapidos] = useState([]);
  const [dataSelecionada, setDataSelecionada] = useState('');
  
  const [horarioSelecionado, setHorarioSelecionado] = useState('');
  const [nomeCliente, setNomeCliente] = useState('');
  const [telefoneCliente, setTelefoneCliente] = useState('');
  
  const [status, setStatus] = useState('');
  const [horariosOcupados, setHorariosOcupados] = useState([]);
  
  const todosHorarios = ['09:00', '10:00', '11:00', '13:30', '15:00', '17:30'];

  useEffect(() => {
    async function carregarDados() {
      const { data: dataServicos } = await supabase.from('servicos').select('*');
      const { data: dataBarbeiros } = await supabase.from('barbeiros').select('*');
      if (dataServicos) setServicos(dataServicos);
      if (dataBarbeiros && dataBarbeiros.length > 0) {
        setBarbeiros(dataBarbeiros);
        setBarbeiroSelecionado(dataBarbeiros[0].id);
      }
    }
    carregarDados();

    const gerarDias = () => {
      const dias = [];
      let dataAtual = new Date();
      let diasAdicionados = 0;

      while (diasAdicionados < 10) {
        if (dataAtual.getDay() !== 0) {
          const iso = dataAtual.toISOString().split('T')[0];
          const semana = dataAtual.toLocaleDateString('pt-BR', { weekday: 'short' }).substring(0,3);
          const diaMes = dataAtual.toLocaleDateString('pt-BR', { day: '2-digit' });
          dias.push({ iso, semana, diaMes });
          diasAdicionados++;
        }
        dataAtual.setDate(dataAtual.getDate() + 1);
      }
      setDiasRapidos(dias);
    };
    gerarDias();
  }, []);

  useEffect(() => {
    async function carregarHorariosOcupados() {
      if (!dataSelecionada) {
        setHorariosOcupados([]);
        return;
      }
      const inicio = `${dataSelecionada}T00:00:00-03:00`;
      const fim = `${dataSelecionada}T23:59:59-03:00`;
      const { data: agendamentos } = await supabase
        .from('agendamentos')
        .select('data_hora_inicio')
        .eq('status', 'confirmado')
        .gte('data_hora_inicio', inicio)
        .lte('data_hora_inicio', fim);

      if (agendamentos) {
        const ocupados = agendamentos.map(ag => new Date(ag.data_hora_inicio).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit', timeZone: 'America/Sao_Paulo' }));
        setHorariosOcupados(ocupados);
      }
    }
    carregarHorariosOcupados();
  }, [dataSelecionada]);

  async function handleFinalizarAgendamento(e) {
    e.preventDefault();
    setStatus('Gerando agendamento, aguarde...');

    let { data: cliente } = await supabase.from('clientes').select('id').eq('telefone', telefoneCliente).maybeSingle();
    if (!cliente) {
      const { data: novoCliente, error: errCliente } = await supabase.from('clientes').insert([{ nome: nomeCliente, telefone: telefoneCliente }]).select().single();
      if (errCliente) return setStatus('Erro ao cadastrar cliente.');
      cliente = novoCliente;
    }

    const baseDate = new Date(`${dataSelecionada}T${horarioSelecionado}:00-03:00`);
    const duracao = servicoSelecionado?.duracao_minutos || 30;
    
    const inicioIso = baseDate.toISOString();
    const fimIso = new Date(baseDate.getTime() + duracao * 60000).toISOString();

    const novoAgendamento = {
      cliente_id: cliente.id,
      barbeiro_id: barbeiroSelecionado,
      servico_id: servicoSelecionado.id,
      data_hora_inicio: inicioIso,
      data_hora_fim: fimIso,
      status: 'confirmado'
    };

    const { error: errAgendamento } = await supabase.from('agendamentos').insert([novoAgendamento]);

    if (errAgendamento) {
      setStatus('Erro ao processar agendamento.');
    } else {
      setStatus('Horário confirmado com sucesso, chefe!');
      setHorariosOcupados(prev => [...prev, horarioSelecionado]);
      setHorarioSelecionado('');
      setServicoSelecionado(null);
      setDataSelecionada('');
    }
  }

  // Define em qual passo do funil o usuário está
  let step = 1;
  if (servicoSelecionado && !dataSelecionada) step = 2;
  if (dataSelecionada && !horarioSelecionado) step = 2; // Continua no 2 até escolher horário
  if (horarioSelecionado) step = 3;

  return (
    <div className="min-h-screen bg-leather text-paper flex flex-col p-4 md:max-w-md md:mx-auto md:border-x md:border-brass-line">
      
      {/* Topbar */}
      <div className="flex items-center justify-between mb-6 mt-2">
        <span className="w-8 h-8 flex items-center justify-center border border-brass-line rounded-full text-xs text-paper-dim cursor-pointer" onClick={() => {
            if(step === 3) setHorarioSelecionado('');
            else if(step === 2) setServicoSelecionado(null);
        }}>‹</span>
        <div className="w-8 h-8 rounded-full border-2 border-brass flex items-center justify-center font-mono text-[8px] text-brass text-center leading-none">
          BH
        </div>
      </div>

      {step === 1 && (
        <div className="flex-1 flex flex-col">
          <h3 className="font-serif font-bold text-xl mb-1 text-paper">O que vamos fazer?</h3>
          <div className="text-xs text-paper-dim mb-6">Toque para escolher um serviço</div>
          <div className="flex-1 flex flex-col gap-2">
            {servicos.map((s) => {
              const isSelected = servicoSelecionado?.id === s.id;
              return (
                <div 
                  key={s.id}
                  onClick={() => setServicoSelecionado(s)}
                  className={`flex justify-between items-center rounded-lg p-3 cursor-pointer transition-all border ${
                    isSelected ? 'border-brass bg-brass/10' : 'bg-leather-300 border-brass-line'
                  }`}
                >
                  <div>
                    <div className="text-sm font-semibold text-paper">{s.nome}</div>
                    <div className="text-[10px] text-paper-dim mt-0.5">{s.duracao_minutos} min</div>
                  </div>
                  <div className="flex items-center gap-3">
                    <span className="font-mono text-sm text-copper-bright">R$ {parseFloat(s.preco).toFixed(0)}</span>
                    <div className={`w-4 h-4 rounded-full border-[1.5px] flex-shrink-0 ${
                      isSelected ? 'border-brass bg-brass' : 'border-paper-dim'
                    }`}></div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {step === 2 && (
        <div className="flex-1 flex flex-col">
          <h3 className="font-serif font-bold text-xl mb-1 text-paper">Quando fica bom?</h3>
          <div className="text-xs text-paper-dim mb-6">{servicoSelecionado.nome} · {servicoSelecionado.duracao_minutos} min</div>
          
          <div className="flex gap-2 mb-6 overflow-x-auto pb-2" style={{scrollbarWidth: 'none'}}>
            {diasRapidos.map(dia => {
              const ativo = dataSelecionada === dia.iso;
              return (
                <div 
                    key={dia.iso} 
                    onClick={() => setDataSelecionada(dia.iso)}
                    className={`flex-1 min-w-[60px] text-center border rounded-md py-2 cursor-pointer ${ativo ? 'bg-brass border-brass' : 'bg-leather-300 border-brass-line'}`}>
                  <div className={`font-mono text-sm font-bold ${ativo ? 'text-leather' : 'text-paper'}`}>{dia.diaMes}</div>
                  <div className={`text-[9px] uppercase ${ativo ? 'text-leather/70' : 'text-paper-dim'}`}>{dia.semana}</div>
                </div>
              )
            })}
          </div>

          {dataSelecionada && (
            <div className="grid grid-cols-2 gap-2">
              {todosHorarios.map((hora) => {
                const isOcupado = horariosOcupados.includes(hora);
                const isSelected = horarioSelecionado === hora;
                return (
                  <div 
                    key={hora} 
                    onClick={() => !isOcupado && setHorarioSelecionado(hora)}
                    className={`text-center py-2 rounded-md border font-mono text-xs cursor-pointer ${
                        isOcupado ? 'opacity-35 line-through bg-leather-300 border-brass-line text-paper-dim' : 
                        isSelected ? 'bg-brass text-leather border-brass font-bold' : 
                        'bg-leather-300 border-brass-line text-paper hover:bg-leather-200'
                    }`}
                  >
                    {hora}
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {step === 3 && (
        <div className="flex-1 flex flex-col">
          <h3 className="font-serif font-bold text-xl mb-1 text-paper">Fechado, chefe.</h3>
          <div className="text-xs text-paper-dim mb-6">Confira antes de confirmar</div>

          <div className="bg-paper text-ink rounded-lg p-4 flex-1 relative flex flex-col shadow-lg border-b-4 border-dashed border-leather">
             <div className="font-serif font-black text-sm tracking-wide">BARBER HALLEY</div>
             <div className="font-mono text-[11px] text-copper mt-1">
                 {new Date(dataSelecionada).toLocaleDateString('pt-BR')} · {horarioSelecionado}
             </div>
             
             <div className="h-px bg-ink/15 my-3"></div>
             
             <div className="flex justify-between text-xs py-1 border-b border-dashed border-ink/15">
                 <span className="font-semibold">{servicoSelecionado.nome}</span>
                 <span className="font-mono text-copper font-bold">R$ {parseFloat(servicoSelecionado.preco).toFixed(0)}</span>
             </div>
             
             <div className="mt-4 flex flex-col gap-2">
                <input type="text" placeholder="Seu nome" value={nomeCliente} onChange={e => setNomeCliente(e.target.value)} className="bg-transparent border-b border-ink/30 text-ink text-sm py-1 focus:outline-none focus:border-copper" />
                <input type="tel" placeholder="WhatsApp (DDD+Numero)" value={telefoneCliente} onChange={e => setTelefoneCliente(e.target.value)} className="bg-transparent border-b border-ink/30 text-ink text-sm py-1 focus:outline-none focus:border-copper" />
             </div>
          </div>
          
          <button 
             onClick={handleFinalizarAgendamento}
             disabled={!nomeCliente || !telefoneCliente || status !== ''}
             className="mt-6 w-full bg-brass text-leather rounded-md py-3 font-bold text-sm disabled:opacity-50"
          >
             {status || 'Confirmar Agendamento'}
          </button>
        </div>
      )}

    </div>
  );
}