import 'dotenv/config';
import pkg from 'whatsapp-web.js';
const { Client, LocalAuth } = pkg;
import qrcode from 'qrcode-terminal';
import OpenAI from 'openai';
import { createClient } from '@supabase/supabase-js';
import WebSocket from 'ws';

global.WebSocket = WebSocket;

// 1. CONFIGURAÇÕES PRINCIPAIS
const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
const supabaseUrl = process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY; 
const supabase = createClient(supabaseUrl, supabaseKey);

// DEFINA O SLUG DA BARBEARIA QUE ESTE BOT ATENDE
const EMPRESA_SLUG = 'barber-halley'; 
const NUMERO_ADMIN = '5513974211857@c.us'; 

// 2. INICIALIZAÇÃO DO WHATSAPP (COM SESSÃO NOMEADA PARA A RAILWAY)
const client = new Client({
    authStrategy: new LocalAuth({ clientId: EMPRESA_SLUG }),
    puppeteer: {
        args: [
            '--no-sandbox', 
            '--disable-setuid-sandbox', 
            '--disable-dev-shm-usage', 
            '--disable-accelerated-2d-canvas', 
            '--no-first-run', 
            '--no-zygote', 
            '--single-process', 
            '--disable-gpu'
        ]
    }
});

const historicoConversas = new Map();
const cronometros = new Map();

client.on('qr', (qr) => {
    console.log('\n==================================================');
    console.log('🤖 NOVO QR CODE GERADO! LEIA O LINK ABAIXO:');
    console.log('🔗 https://api.qrserver.com/v1/create-qr-code/?size=400x400&data=' + encodeURIComponent(qr));
    console.log('==================================================\n');
});

client.on('ready', () => {
    console.log('\n==================================================');
    console.log(`✅ Robô Maggia ATIVO e CONECTADO para a barbearia [${EMPRESA_SLUG}]!`);
    console.log('==================================================\n');
});

client.on('authenticated', () => {
    console.log('🔒 Autenticação salva com sucesso no disco fixo!');
});

client.on('auth_failure', msg => {
    console.error('❌ Falha na autenticação. A sessão pode ter sido desconectada do celular.', msg);
});

client.on('message', async (msg) => {
    if (msg.from.includes('@g.us') || msg.from === 'status@broadcast') return;
    if (msg.from === NUMERO_ADMIN && msg.body.toLowerCase().includes('aviso bot')) return;

    const numeroCliente = msg.from;
    console.log(`📩 [${numeroCliente}] disse: ${msg.body}`);

    if (cronometros.has(numeroCliente)) clearTimeout(cronometros.get(numeroCliente));

    try {
        // A. BUSCAR DADOS DA EMPRESA E VERIFICAR ASSINATURA
        const { data: empresa } = await supabase.from('empresas').select('*').eq('slug', EMPRESA_SLUG).maybeSingle();
        
        if (!empresa) {
            console.error(`❌ Empresa '${EMPRESA_SLUG}' não encontrada no banco.`);
            return;
        }

        const hoje = new Date();
        const vencimento = new Date(empresa.trial_ate);
        if (hoje > vencimento) {
            await msg.reply(`Olá! Os agendamentos automáticos da *${empresa.nome}* estão suspensos temporariamente. Por favor, entre em contato diretamente com o estabelecimento.`);
            return;
        }

        // B. CARREGAR SERVIÇOS, EQUIPE E TEMPOS CUSTOMIZADOS
        const { data: servicos } = await supabase.from('servicos').select('*').eq('empresa_id', empresa.id).eq('ativo', true);
        const { data: barbeiros } = await supabase.from('barbeiros').select('*').eq('empresa_id', empresa.id);
        const { data: duracoesCustom } = await supabase.from('barbeiro_servicos').select('*').eq('empresa_id', empresa.id);

        let textoServicos = (servicos || []).map(s => `- ${s.nome} (R$ ${s.preco_promocional || s.preco})`).join('\n');
        let textoBarbeiros = (barbeiros || []).map(b => `- ${b.nome}`).join('\n');

        const dataHoje = new Date().toLocaleDateString('pt-BR', { timeZone: 'America/Sao_Paulo' });
        const horaHoje = new Date().toLocaleTimeString('pt-BR', { timeZone: 'America/Sao_Paulo' });

        const linkSite = `https://barbearia-app-swart.vercel.app/${empresa.slug}`;

        // C. PROMPT DA INTELIGÊNCIA ARTIFICIAL
        if (!historicoConversas.has(numeroCliente)) {
            historicoConversas.set(numeroCliente, [{
                role: "system",
                content: `Você é o recepcionista virtual da barbearia ${empresa.nome}. Seu objetivo é atender clientes, agendar, consultar horários, cancelar e remarcar agendamentos de forma rápida e natural.

TOM DE VOZ:
- Amigável, direto e cortês (chame o cliente de chefe, irmão, patrão, jogador ou amigo).
- Responda em 1 ou 2 frases curtas. Não seja robótico.

CONTEXTO TEMPORAL:
Hoje é: ${dataHoje} | Agora são: ${horaHoje}

INFORMAÇÕES DA BARBEARIA:
- Nome: ${empresa.nome}
- Serviços Disponíveis:\n${textoServicos}
- Profissionais da Equipe:\n${textoBarbeiros}

DIRETRIZES E REGRAS:
1. BARBEIRO: Se houver mais de 1 barbeiro na lista, pergunte com qual profissional o cliente prefere agendar ou verificar horários. Se houver apenas 1, selecione-o automaticamente.
2. CONSULTAR: Para ver horários livres, use a função 'consultar_horarios_livres' informando a data e o barbeiro.
3. CANCELAR: Se o cliente pedir para desmarcar, use 'cancelar_agendamento'.
4. REMARCAR: Se quiser alterar dia/hora, use 'remarcar_agendamento'.
5. AGENDAR: Colete Nome, Serviço, Barbeiro, Data (YYYY-MM-DD) e Hora (HH:MM).
6. PRECISÃO: NUNCA invente horários ou preços. O nome do serviço e do barbeiro deve corresponder aos nomes da lista.`
            }]);
        }

        const conversaAtual = historicoConversas.get(numeroCliente);
        conversaAtual.push({ role: "user", content: msg.body });

        // D. DEFINIÇÃO DAS FERRAMENTAS (TOOLS)
        const ferramentas = [
            { 
                type: "function", 
                function: { 
                    name: "agendar_horario", 
                    parameters: { 
                        type: "object", 
                        properties: { 
                            nome_cliente: { type: "string" }, 
                            nome_servico: { type: "string" }, 
                            nome_barbeiro: { type: "string" }, 
                            data: { type: "string" }, 
                            hora: { type: "string" } 
                        }, 
                        required: ["nome_cliente", "nome_servico", "nome_barbeiro", "data", "hora"] 
                    } 
                } 
            },
            { 
                type: "function", 
                function: { 
                    name: "consultar_horarios_livres", 
                    parameters: { 
                        type: "object", 
                        properties: { 
                            data: { type: "string" },
                            nome_barbeiro: { type: "string" }
                        }, 
                        required: ["data", "nome_barbeiro"] 
                    } 
                } 
            },
            { 
                type: "function", 
                function: { 
                    name: "cancelar_agendamento", 
                    parameters: { 
                        type: "object", 
                        properties: { 
                            data: { type: "string" } 
                        }, 
                        required: ["data"] 
                    } 
                } 
            },
            { 
                type: "function", 
                function: { 
                    name: "remarcar_agendamento", 
                    parameters: { 
                        type: "object", 
                        properties: { 
                            data_antiga: { type: "string" }, 
                            data_nova: { type: "string" }, 
                            hora_nova: { type: "string" },
                            nome_barbeiro: { type: "string" }
                        }, 
                        required: ["data_antiga", "data_nova", "hora_nova", "nome_barbeiro"] 
                    } 
                } 
            }
        ];

        const respostaIA = await openai.chat.completions.create({ model: "gpt-4o-mini", messages: conversaAtual, tools: ferramentas });
        const mensagemIA = respostaIA.choices[0].message;
        conversaAtual.push(mensagemIA);

        // E. PROCESSAMENTO DAS FUNÇÕES
        if (mensagemIA.tool_calls?.length > 0) {
            for (const toolCall of mensagemIA.tool_calls) {
                const args = JSON.parse(toolCall.function.arguments);
                const telefoneCliente = numeroCliente.split('@')[0];

                let cliente = (await supabase.from('clientes').select('*').eq('telefone', telefoneCliente).eq('empresa_id', empresa.id).maybeSingle()).data;
                let barbeiroAlvo = barbeiros.find(b => b.nome.toLowerCase().includes((args.nome_barbeiro || '').toLowerCase()));
                if (!barbeiroAlvo && barbeiros.length === 1) barbeiroAlvo = barbeiros[0];

                // --- CONSULTAR HORÁRIOS LIVRES ---
                if (toolCall.function.name === 'consultar_horarios_livres') {
                    if (!barbeiroAlvo) {
                        conversaAtual.push({ role: "tool", tool_call_id: toolCall.id, content: "Erro: Barbeiro não especificado ou não encontrado." });
                        await msg.reply("Com qual profissional você gostaria de verificar os horários?");
                        continue;
                    }

                    const inicio = new Date(`${args.data}T00:00:00-03:00`).toISOString();
                    const fim = new Date(`${args.data}T23:59:59-03:00`).toISOString();

                    const { data: ocupados } = await supabase.from('agendamentos')
                        .select('data_hora_inicio')
                        .eq('empresa_id', empresa.id)
                        .eq('barbeiro_id', barbeiroAlvo.id)
                        .neq('status', 'cancelado')
                        .gte('data_hora_inicio', inicio)
                        .lte('data_hora_inicio', fim);

                    const horasOcupadas = (ocupados || []).map(a => new Date(a.data_hora_inicio).toLocaleTimeString('pt-BR', { timeZone: 'America/Sao_Paulo', hour: '2-digit', minute: '2-digit' }));
                    
                    const gradeHorarios = ['09:00', '09:30', '10:00', '10:30', '11:00', '11:30', '12:00', '12:30', '13:00', '13:30', '14:00', '14:30', '15:00', '15:30', '16:00', '16:30', '17:00', '17:30', '18:00', '18:30', '19:00'];
                    const disponiveis = gradeHorarios.filter(h => !horasOcupadas.includes(h));

                    conversaAtual.push({ role: "tool", tool_call_id: toolCall.id, content: JSON.stringify({ barbeiro: barbeiroAlvo.nome, disponiveis }) });
                    const res = await openai.chat.completions.create({ model: "gpt-4o-mini", messages: conversaAtual });
                    await msg.reply(res.choices[0].message.content);
                }

                // --- CANCELAR AGENDAMENTO ---
                if (toolCall.function.name === 'cancelar_agendamento') {
                    if (!cliente) {
                        conversaAtual.push({ role: "tool", tool_call_id: toolCall.id, content: "Cliente não encontrado." });
                        await msg.reply("Não encontrei agendamentos vinculados ao seu número.");
                        continue;
                    }

                    const inicio = new Date(`${args.data}T00:00:00-03:00`).toISOString();
                    const fim = new Date(`${args.data}T23:59:59-03:00`).toISOString();

                    await supabase.from('agendamentos')
                        .update({ status: 'cancelado' })
                        .eq('empresa_id', empresa.id)
                        .eq('cliente_id', cliente.id)
                        .eq('status', 'confirmado')
                        .gte('data_hora_inicio', inicio)
                        .lte('data_hora_inicio', fim);
                    
                    conversaAtual.push({ role: "tool", tool_call_id: toolCall.id, content: "Cancelado com sucesso." });
                    await msg.reply(`Tudo certo, chefe! Seu agendamento do dia ${args.data} foi cancelado.`);
                    
                    await client.sendMessage(NUMERO_ADMIN, `⚠️ *AVISO DE CANCELAMENTO*\nO cliente ${cliente.nome} cancelou o agendamento do dia ${args.data}. Vaga liberada!`);
                }

                // --- REMARCAR AGENDAMENTO ---
                if (toolCall.function.name === 'remarcar_agendamento') {
                    if (!cliente || !barbeiroAlvo) {
                        conversaAtual.push({ role: "tool", tool_call_id: toolCall.id, content: "Cliente ou barbeiro não encontrado." });
                        await msg.reply("Não consegui localizar o agendamento anterior para remarcar.");
                        continue;
                    }

                    const inicioAntigo = new Date(`${args.data_antiga}T00:00:00-03:00`).toISOString();
                    const fimAntigo = new Date(`${args.data_antiga}T23:59:59-03:00`).toISOString();

                    const { data: agendamentoAntigo } = await supabase.from('agendamentos')
                        .select('*')
                        .eq('empresa_id', empresa.id)
                        .eq('cliente_id', cliente.id)
                        .eq('status', 'confirmado')
                        .gte('data_hora_inicio', inicioAntigo)
                        .lte('data_hora_inicio', fimAntigo)
                        .maybeSingle();
                    
                    if (agendamentoAntigo) {
                        await supabase.from('agendamentos').update({ status: 'cancelado' }).eq('id', agendamentoAntigo.id);
                        
                        const inicioNovo = new Date(`${args.data_nova}T${args.hora_nova}:00-03:00`);
                        const fimNovo = new Date(inicioNovo.getTime() + 30 * 60000);

                        await supabase.from('agendamentos').insert([{ 
                            empresa_id: empresa.id,
                            cliente_id: cliente.id, 
                            barbeiro_id: barbeiroAlvo.id, 
                            servico_id: agendamentoAntigo.servico_id, 
                            data_hora_inicio: inicioNovo.toISOString(), 
                            data_hora_fim: fimNovo.toISOString(), 
                            status: 'confirmado' 
                        }]);
                        
                        conversaAtual.push({ role: "tool", tool_call_id: toolCall.id, content: "Remarcado." });
                        await msg.reply(`Fechou! Seu horário foi remarcado para o dia ${args.data_nova} às ${args.hora_nova} com ${barbeiroAlvo.nome}.`);
                    } else {
                        conversaAtual.push({ role: "tool", tool_call_id: toolCall.id, content: "Agendamento antigo não encontrado." });
                        await msg.reply("Não encontrei agendamento ativo na data informada para alterar.");
                    }
                }

                // --- AGENDAR HORÁRIO ---
                if (toolCall.function.name === 'agendar_horario') {
                    let servico = servicos.find(s => s.nome.toLowerCase().includes((args.nome_servico || '').toLowerCase()));
                    
                    if (!servico) {
                        conversaAtual.push({ role: "tool", tool_call_id: toolCall.id, content: "Erro: Serviço não localizado." });
                        await msg.reply("Não encontrei esse serviço no nosso catálogo.");
                        continue;
                    }

                    if (!barbeiroAlvo) {
                        conversaAtual.push({ role: "tool", tool_call_id: toolCall.id, content: "Erro: Barbeiro não localizado." });
                        await msg.reply("Com qual barbeiro você deseja agendar?");
                        continue;
                    }

                    const duracCustom = (duracoesCustom || []).find(d => d.servico_id === servico.id && d.barbeiro_id === barbeiroAlvo.id);
                    const duracaoMinutos = duracCustom ? duracCustom.duracao_minutos : (servico.duracao_minutos || 30);

                    const dataHoraInicio = new Date(`${args.data}T${args.hora}:00-03:00`);
                    const dataHoraFim = new Date(dataHoraInicio.getTime() + duracaoMinutos * 60000);

                    const { data: ocupado } = await supabase.from('agendamentos')
                        .select('id')
                        .eq('empresa_id', empresa.id)
                        .eq('barbeiro_id', barbeiroAlvo.id)
                        .eq('data_hora_inicio', dataHoraInicio.toISOString())
                        .neq('status', 'cancelado')
                        .maybeSingle();

                    if (ocupado) {
                        conversaAtual.push({ role: "tool", tool_call_id: toolCall.id, content: "Erro: Horário ocupado." });
                        await msg.reply(`O horário das *${args.hora}* com *${barbeiroAlvo.nome}* já está reservado. Quer tentar outro horário?`);
                        continue;
                    }
                    
                    if (!cliente) {
                        const { data: novoCliente } = await supabase.from('clientes')
                            .insert([{ nome: args.nome_cliente, telefone: telefoneCliente, empresa_id: empresa.id }])
                            .select().single();
                        cliente = novoCliente;
                    }

                    const { error: erroAgendamento } = await supabase.from('agendamentos').insert([{
                        empresa_id: empresa.id,
                        cliente_id: cliente.id,
                        barbeiro_id: barbeiroAlvo.id,
                        servico_id: servico.id,
                        data_hora_inicio: dataHoraInicio.toISOString(),
                        data_hora_fim: dataHoraFim.toISOString(),
                        status: 'confirmado'
                    }]);

                    if (erroAgendamento) {
                        conversaAtual.push({ role: "tool", tool_call_id: toolCall.id, content: "Erro de banco." });
                        await msg.reply(`Ocorreu um erro ao salvar seu agendamento. Você pode reservar pelo site:\n🔗 ${linkSite}`);
                    } else {
                        conversaAtual.push({ role: "tool", tool_call_id: toolCall.id, content: "Sucesso." });
                        await msg.reply(`Tudo certo! ✅\n*Serviço:* ${servico.nome}\n*Profissional:* ${barbeiroAlvo.nome}\n*Data:* ${dataHoraInicio.toLocaleDateString('pt-BR')} às ${args.hora}`);
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
            await msg.reply(`Desculpe, tive uma falha momentânea no sistema. Você pode concluir seu agendamento pelo nosso link:\n🔗 https://barbearia-app-swart.vercel.app/${EMPRESA_SLUG}`);
        } catch(e) {} 
    }
});

client.initialize();