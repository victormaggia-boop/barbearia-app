import 'dotenv/config';
import pkg from 'whatsapp-web.js';
const { Client, LocalAuth } = pkg;
import qrcode from 'qrcode-terminal';
import OpenAI from 'openai';
import { createClient } from '@supabase/supabase-js';
import WebSocket from 'ws';

global.WebSocket = WebSocket;

// 1. CONEXÃO COM CHATGPT E SUPABASE
const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
const supabaseUrl = process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY; 
const supabase = createClient(supabaseUrl, supabaseKey);

// NÚMERO DO BARBEIRO (Para receber os alertas de cancelamento/vagas)
const NUMERO_ADMIN = '5513974211857@c.us'; 
const LINK_SITE = 'https://barbearia-app-swart.vercel.app/';

// 2. CONFIGURAÇÃO DO PUPPETEER
const client = new Client({
    authStrategy: new LocalAuth(),
    puppeteer: {
        args: ['--no-sandbox', '--disable-setuid-sandbox', '--disable-dev-shm-usage', '--disable-accelerated-2d-canvas', '--no-first-run', '--no-zygote', '--single-process', '--disable-gpu']
    }
});

const historicoConversas = new Map();
const cronometros = new Map();

client.on('qr', (qr) => console.log('🔗 Link QR Code: https://api.qrserver.com/v1/create-qr-code/?size=400x400&data=' + encodeURIComponent(qr)));
client.on('ready', () => console.log('✅ Robô RECEPCIONISTA (COMPLETO) ATIVO!'));

client.on('message', async (msg) => {
    if (msg.from.includes('@g.us') || msg.from === 'status@broadcast') return;
    if (msg.from === NUMERO_ADMIN && msg.body.toLowerCase().includes('aviso bot')) return;

    console.log(`📩 Cliente disse: ${msg.body}`);
    const numeroCliente = msg.from;

    if (cronometros.has(numeroCliente)) clearTimeout(cronometros.get(numeroCliente));

    try {
        const { data: servicos } = await supabase.from('servicos').select('*').eq('ativo', true);
        let textoServicos = (servicos || []).map(s => `- ${s.nome} (R$ ${s.preco_promocional || s.preco})`).join('\n');
        
        const { data: barbeiros } = await supabase.from('barbeiros').select('id').limit(1);
        const barbeiroId = barbeiros?.[0]?.id;

        const dataHoje = new Date().toLocaleDateString('pt-BR', { timeZone: 'America/Sao_Paulo' });
        const horaHoje = new Date().toLocaleTimeString('pt-BR', { timeZone: 'America/Sao_Paulo' });

        if (!historicoConversas.has(numeroCliente)) {
            historicoConversas.set(numeroCliente, [{
                role: "system",
                content: `Você é o recepcionista virtual da Barbearia Raphael Halley. Seu objetivo é atender clientes, agendar, consultar horários, cancelar e remarcar agendamentos de forma rápida e natural.

TOM DE VOZ:
- Amigável, direto e cortês (chame o cliente de chefe, irmão, patrão, jogador ou amigo).
- Responda em 1 ou 2 frases curtas. Não seja robótico.

CONTEXTO TEMPORAL:
Hoje é: ${dataHoje} | Agora são: ${horaHoje}

INFORMAÇÕES DA BARBEARIA:
- Endereço: Avenida Jequié 1430, Jardim Rio Negro - São Vicente, SP.
- Funcionamento: Segunda a Sábado, das 09h às 20h. (Domingo é fechado).
- Serviços e Preços: ${textoServicos}

DIRETRIZES E FERRAMENTAS (REGRAS RÍGIDAS):
1. CONSULTAR: Se o cliente perguntar quais horários estão livres, use a função 'consultar_horarios_livres' informando a data. Apresente os horários de forma clara.
2. CANCELAR: Se o cliente pedir para desmarcar, use 'cancelar_agendamento' informando a data.
3. REMARCAR: Se o cliente quiser alterar o dia/hora, use 'remarcar_agendamento' informando a data antiga, a data nova e a hora nova.
4. AGENDAR: Colete Nome, Serviço, Data (YYYY-MM-DD) e Hora (HH:MM). Se for para 2+ pessoas, finalize 100% a primeira pessoa antes de perguntar da segunda.
5. CONFIRMAÇÃO: Antes de chamar as funções de agendar, cancelar ou remarcar, confirme com o cliente. Assim que ele der o "ok/sim/pode ser", execute a ferramenta IMEDIATAMENTE.
6. PRECISÃO: NUNCA invente preços, serviços ou horários. O nome do serviço passado para as ferramentas deve ser EXATAMENTE igual ao da lista.`
            }]);
        }

        const conversaAtual = historicoConversas.get(numeroCliente);
        conversaAtual.push({ role: "user", content: msg.body });

        const ferramentas = [
            { type: "function", function: { name: "agendar_horario", parameters: { type: "object", properties: { nome_cliente: { type: "string" }, nome_servico: { type: "string" }, data: { type: "string" }, hora: { type: "string" } }, required: ["nome_cliente", "nome_servico", "data", "hora"] } } },
            { type: "function", function: { name: "consultar_horarios_livres", parameters: { type: "object", properties: { data: { type: "string" } }, required: ["data"] } } },
            { type: "function", function: { name: "cancelar_agendamento", parameters: { type: "object", properties: { data: { type: "string" } }, required: ["data"] } } },
            { type: "function", function: { name: "remarcar_agendamento", description: "Muda o horário de um agendamento existente", parameters: { type: "object", properties: { data_antiga: { type: "string", description: "YYYY-MM-DD" }, data_nova: { type: "string", description: "YYYY-MM-DD" }, hora_nova: { type: "string", description: "HH:MM" } }, required: ["data_antiga", "data_nova", "hora_nova"] } } }
        ];

        const respostaIA = await openai.chat.completions.create({ model: "gpt-4o-mini", messages: conversaAtual, tools: ferramentas });
        const mensagemIA = respostaIA.choices[0].message;
        conversaAtual.push(mensagemIA);

        if (mensagemIA.tool_calls?.length > 0) {
            for (const toolCall of mensagemIA.tool_calls) {
                const args = JSON.parse(toolCall.function.arguments);
                const telefoneCliente = numeroCliente.split('@')[0];
                let cliente = (await supabase.from('clientes').select('*').eq('telefone', telefoneCliente).maybeSingle()).data;

                // --- CONSULTAR ---
                if (toolCall.function.name === 'consultar_horarios_livres') {
                    const inicio = new Date(`${args.data}T00:00:00-03:00`).toISOString();
                    const fim = new Date(`${args.data}T23:59:59-03:00`).toISOString();
                    const { data: ocupados } = await supabase.from('agendamentos').select('data_hora_inicio').eq('status', 'confirmado').gte('data_hora_inicio', inicio).lte('data_hora_inicio', fim);
                    const horasOcupadas = (ocupados || []).map(a => new Date(a.data_hora_inicio).toLocaleTimeString('pt-BR', { timeZone: 'America/Sao_Paulo', hour: '2-digit', minute: '2-digit' }));
                    const disponiveis = ['09:00', '10:00', '11:00', '12:00', '13:00', '14:00', '15:00', '16:00', '17:00', '18:00', '19:00'].filter(h => !horasOcupadas.includes(h));
                    conversaAtual.push({ role: "tool", tool_call_id: toolCall.id, content: JSON.stringify({ disponiveis }) });
                    const res = await openai.chat.completions.create({ model: "gpt-4o-mini", messages: conversaAtual });
                    await msg.reply(res.choices[0].message.content);
                }

                // --- CANCELAR ---
                if (toolCall.function.name === 'cancelar_agendamento') {
                    if (!cliente) {
                        conversaAtual.push({ role: "tool", tool_call_id: toolCall.id, content: "Cliente não encontrado." });
                        await msg.reply("Não encontrei agendamentos para o seu número.");
                        continue;
                    }
                    const inicio = new Date(`${args.data}T00:00:00-03:00`).toISOString();
                    const fim = new Date(`${args.data}T23:59:59-03:00`).toISOString();
                    await supabase.from('agendamentos').update({ status: 'cancelado' }).eq('cliente_id', cliente.id).eq('status', 'confirmado').gte('data_hora_inicio', inicio).lte('data_hora_inicio', fim);
                    
                    conversaAtual.push({ role: "tool", tool_call_id: toolCall.id, content: "Cancelado." });
                    await msg.reply(`Feito! Agendamento do dia ${args.data} cancelado.`);
                    
                    await client.sendMessage(NUMERO_ADMIN, `⚠️ *AVISO DO SISTEMA*\nO cliente ${cliente.nome} acabou de CANCELAR o horário do dia ${args.data}.\nSe alguém estava querendo esse horário, a vaga está livre!`);
                }

                // --- REMARCAR ---
                if (toolCall.function.name === 'remarcar_agendamento') {
                    if (!cliente) {
                        conversaAtual.push({ role: "tool", tool_call_id: toolCall.id, content: "Cliente não encontrado." });
                        await msg.reply("Não encontrei agendamentos para remarcar.");
                        continue;
                    }
                    const inicioAntigo = new Date(`${args.data_antiga}T00:00:00-03:00`).toISOString();
                    const fimAntigo = new Date(`${args.data_antiga}T23:59:59-03:00`).toISOString();
                    const { data: agendamentoAntigo } = await supabase.from('agendamentos').select('*').eq('cliente_id', cliente.id).eq('status', 'confirmado').gte('data_hora_inicio', inicioAntigo).lte('data_hora_inicio', fimAntigo).maybeSingle();
                    
                    if(agendamentoAntigo) {
                        await supabase.from('agendamentos').update({ status: 'cancelado' }).eq('id', agendamentoAntigo.id);
                        const inicioNovo = new Date(`${args.data_nova}T${args.hora_nova}:00-03:00`);
                        await supabase.from('agendamentos').insert([{ cliente_id: cliente.id, barbeiro_id: barbeiroId, servico_id: agendamentoAntigo.servico_id, data_hora_inicio: inicioNovo.toISOString(), data_hora_fim: new Date(inicioNovo.getTime() + 30 * 60000).toISOString(), status: 'confirmado' }]);
                        
                        conversaAtual.push({ role: "tool", tool_call_id: toolCall.id, content: "Remarcado." });
                        await msg.reply(`Fechou! Seu horário foi remarcado para o dia ${args.data_nova} às ${args.hora_nova}.`);

                        const horaAntiga = new Date(agendamentoAntigo.data_hora_inicio).toLocaleTimeString('pt-BR', {hour: '2-digit', minute:'2-digit', timeZone: 'America/Sao_Paulo'});
                        await client.sendMessage(NUMERO_ADMIN, `⚠️ *AVISO DO SISTEMA*\nO cliente ${cliente.nome} REMARCOU.\nEle saiu do dia ${args.data_antiga} às ${horaAntiga} e foi para o dia ${args.data_nova} às ${args.hora_nova}.\n\nO horário das ${horaAntiga} vagou!`);
                    } else {
                        conversaAtual.push({ role: "tool", tool_call_id: toolCall.id, content: "Agendamento não encontrado para a data antiga." });
                        await msg.reply("Não achei horário seu nesse dia para remarcar.");
                    }
                }

                // --- AGENDAR ---
                if (toolCall.function.name === 'agendar_horario') {
                    let servico = servicos.find(s => 
                        s.nome.toLowerCase().includes(args.nome_servico.toLowerCase()) || 
                        args.nome_servico.toLowerCase().includes(s.nome.toLowerCase())
                    );

                    if (!servico) {
                        const primeiraPalavraIA = args.nome_servico.split(' ')[0].toLowerCase();
                        servico = servicos.find(s => s.nome.toLowerCase().includes(primeiraPalavraIA));
                    }

                    if (!servico) {
                        conversaAtual.push({ role: "tool", tool_call_id: toolCall.id, content: "Erro: Serviço não encontrado." });
                        await msg.reply("Putz irmão, não achei esse serviço na lista.");
                        continue;
                    }

                    const dataHoraInicio = new Date(`${args.data}T${args.hora}:00-03:00`);
                    const dataHoraFim = new Date(dataHoraInicio.getTime() + (servico.duracao_minutos || 30) * 60000);

                    const { data: horarioOcupado } = await supabase
                        .from('agendamentos')
                        .select('id')
                        .eq('data_hora_inicio', dataHoraInicio.toISOString())
                        .eq('status', 'confirmado')
                        .limit(1);

                    if (horarioOcupado && horarioOcupado.length > 0) {
                        conversaAtual.push({ role: "tool", tool_call_id: toolCall.id, content: "Erro: Horário ocupado." });
                        await msg.reply(`Ixi, chefe! O horário das *${args.hora}* já está ocupado. 😅\nQuer dar uma olhada em outro horário?`);
                        continue;
                    }
                    
                    if (!cliente) {
                        const { data: novoCliente } = await supabase.from('clientes').insert([{ nome: args.nome_cliente, telefone: telefoneCliente }]).select().single();
                        cliente = novoCliente;
                    } else if (cliente.nome !== args.nome_cliente) {
                        await supabase.from('clientes').update({ nome: args.nome_cliente }).eq('id', cliente.id);
                    }

                    const { error: erroAgendamento } = await supabase.from('agendamentos').insert([{
                        cliente_id: cliente.id,
                        barbeiro_id: barbeiroId,
                        servico_id: servico.id,
                        data_hora_inicio: dataHoraInicio.toISOString(),
                        data_hora_fim: dataHoraFim.toISOString(),
                        status: 'confirmado'
                    }]);

                    if (erroAgendamento) {
                        conversaAtual.push({ role: "tool", tool_call_id: toolCall.id, content: "Erro ao gravar." });
                        await msg.reply(`Putz, chefe! Deu um erro no servidor na hora de salvar seu agendamento.\n\nPara não ficar esperando, você pode garantir seu horário direto pelo nosso site:\n🔗 ${LINK_SITE}`);
                    } else {
                        conversaAtual.push({ role: "tool", tool_call_id: toolCall.id, content: "Sucesso." });
                        await msg.reply(`Tudo certo, chefe! ✅\nSeu horário para *${servico.nome}* no dia *${dataHoraInicio.toLocaleDateString('pt-BR')}* às *${args.hora}* está garantido!`);
                    }
                }
            }
        } else {
            await msg.reply(mensagemIA.content);
        }

        const timer = setTimeout(() => { historicoConversas.delete(numeroCliente); cronometros.delete(numeroCliente); }, 15 * 60 * 1000);
        cronometros.set(numeroCliente, timer);

    } catch (erro) { 
        console.error('❌ Erro no robô:', erro);
        try {
            await msg.reply(`Ixi, chefe! Minha inteligência artificial deu uma travada aqui. 😅\n\nMas não esquenta, você pode ver a agenda e garantir seu horário rapidinho direto pelo nosso site:\n🔗 ${LINK_SITE}`);
        } catch(e) {} 
    }
});

client.initialize();