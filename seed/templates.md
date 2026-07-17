# Catálogo-base das notificações (seed do DB). Editável pelo Victor.
# Formato: [event:<slug>] + cabeçalho 'chave: valor' + body Markdown cercado por '~~~'.
# Placeholders: {nome} (1º nome), {nome-completo} (nome todo), {valor}, {link}, ...

[event:candidate.awaiting_approval]
is_tts: false
storytelling: false
channels: whatsapp,email
title: 
subject: 
media_url: 
media_type: 
mail_template: default
story_prompt: 
fires_on: 
source: users.roles.candidate
delay_minutes: 0
active: true
~~~
{name}, um candidato concluiu o cadastro e aguarda a sua aprovação para virar promotor. Confira no painel, {name}.
~~~

[event:candidate.doc_type_reset]
is_tts: false
storytelling: false
channels: whatsapp,email
title: 
subject: 
media_url: 
media_type: 
mail_template: default
story_prompt: 
fires_on: 
source: users.roles.candidate
delay_minutes: 0
active: true
~~~
{name}, liberamos o reenvio do seu documento — pode mandar a foto do tipo certo (RG ou CNH). É só subir de novo pelo aplicativo, {name}. 📄
~~~

[event:candidate.document_approved]
is_tts: false
storytelling: false
channels: whatsapp,email
title: 
subject: 
media_url: 
media_type: 
mail_template: default
story_prompt: 
fires_on: 
source: users.roles.candidate
delay_minutes: 0
active: true
~~~
Pode seguir, {name}! ✅ Seu documento foi aprovado e o cadastro segue em frente. Continue o preenchimento, {name}.
~~~

[event:candidate.document_in_review]
is_tts: false
storytelling: false
channels: whatsapp,email
title: 
subject: 
media_url: 
media_type: 
mail_template: default
story_prompt: 
fires_on: 
source: users.roles.candidate
delay_minutes: 0
active: true
~~~
{name}, o documento de um candidato precisa da sua análise — a IA ficou em dúvida. Aprove ou reprove no painel, {name}.
~~~

[event:candidate.document_rejected]
is_tts: false
storytelling: false
channels: whatsapp,email
title: 
subject: 
media_url: 
media_type: 
mail_template: default
story_prompt: 
fires_on: 
source: users.roles.candidate
delay_minutes: 0
active: true
~~~
{name}, precisamos de uma nova foto do seu documento: {detail} Reenvie pelo aplicativo, {name} — é rapidinho. 📄
~~~

[event:candidate.rejected]
is_tts: false
storytelling: false
channels: whatsapp,email
title: 
subject: 
media_url: 
media_type: 
mail_template: default
story_prompt: 
fires_on: 
source: users.roles.candidate
delay_minutes: 0
active: true
~~~
{name}, seu cadastro de colaborador não foi aprovado neste momento. Fale com o coordenador do seu polo para entender os próximos passos, {name}.
~~~

[event:candidate.selfie_approved]
is_tts: false
storytelling: false
channels: whatsapp,email
title: 
subject: 
media_url: 
media_type: 
mail_template: default
story_prompt: 
fires_on: 
source: users.roles.candidate
delay_minutes: 0
active: true
~~~
Aprovado, {name}! ✅ Sua selfie foi confirmada e o cadastro segue em frente. Continue o preenchimento, {name}.
~~~

[event:candidate.selfie_in_review]
is_tts: false
storytelling: false
channels: whatsapp,email
title: 
subject: 
media_url: 
media_type: 
mail_template: default
story_prompt: 
fires_on: 
source: users.roles.candidate
delay_minutes: 0
active: true
~~~
{name}, a selfie de um candidato precisa da sua análise — a IA ficou em dúvida. Aprove ou reprove no painel, {name}.
~~~

[event:candidate.selfie_rejected]
is_tts: false
storytelling: false
channels: whatsapp,email
title: 
subject: 
media_url: 
media_type: 
mail_template: default
story_prompt: 
fires_on: 
source: users.roles.candidate
delay_minutes: 0
active: true
~~~
{name}, sua selfie não pôde ser confirmada. Envie uma nova foto, nítida e mostrando o rosto, {name}.
~~~

[event:enrollment.awaiting_release]
is_tts: false
storytelling: false
channels: whatsapp,email
title: 
subject: 
media_url: 
media_type: 
mail_template: default
story_prompt: 
fires_on: 
source: users.roles.enrollment
delay_minutes: 0
active: true
~~~
{name}, uma matrícula concluiu o envio de dados e aguarda a sua liberação no painel. Confira quando puder, {name}.
~~~

[event:enrollment.credentials]
is_tts: false
storytelling: false
channels: whatsapp,email
title: 
subject: 
media_url: 
media_type: 
mail_template: default
story_prompt: 
fires_on: 
source: users.roles.enrollment
delay_minutes: 0
active: true
~~~
{name}, aqui estão seus dados de acesso à plataforma de estudos:

🔗 {link}
👤 Login: {login}
🔑 Senha: {password}

Guarde com você, {name} — é por aqui que você entra nas suas aulas. Bons estudos! 📚
~~~

[event:enrollment.fee_due_paid]
is_tts: false
storytelling: false
channels: whatsapp,email
title: 
subject: 
media_url: 
media_type: 
mail_template: default
story_prompt: 
fires_on: 
source: users.roles.enrollment
delay_minutes: 0
active: true
~~~
{name}, a 2ª parcela da taxa de {student_name} ({valor}) foi PAGA no vencimento. ✅ Taxa quitada, {name} — nada mais a fazer.
~~~

[event:enrollment.fee_paid]
is_tts: false
storytelling: false
channels: whatsapp,email
title: 
subject: 
media_url: 
media_type: 
mail_template: default
story_prompt: 
fires_on: 
source: users.roles.enrollment
delay_minutes: 0
active: true
~~~
{name}, a 1ª parcela da taxa de {student_name} foi PAGA ({valor}). ✅ A instituição já pode liberar o login e a senha — conclua a matrícula no painel, {name}.
~~~

[event:enrollment.fee_problem]
is_tts: false
storytelling: false
channels: whatsapp,email
title: 
subject: 
media_url: 
media_type: 
mail_template: default
story_prompt: 
fires_on: 
source: users.roles.enrollment
delay_minutes: 0
active: true
~~~
{name}, deu problema na taxa de {student_name}: {detail} Confira no painel, {name}, e tente de novo se for o caso.
~~~

[event:enrollment.fee_scheduled]
is_tts: false
storytelling: false
channels: whatsapp,email
title: 
subject: 
media_url: 
media_type: 
mail_template: default
story_prompt: 
fires_on: 
source: users.roles.enrollment
delay_minutes: 0
active: true
~~~
{name}, a 2ª parcela da taxa de {student_name} ({valor}) foi agendada para {due_date}. O pagamento sai sozinho no vencimento, {name}.
~~~

[event:enrollment.released]
is_tts: false
storytelling: false
channels: whatsapp,email
title: 
subject: 
media_url: 
media_type: 
mail_template: default
story_prompt: 
fires_on: 
source: users.roles.enrollment
delay_minutes: 0
active: true
~~~
{name}, é oficial: você é nosso aluno! 💚 Sua matrícula foi liberada. Seja muito bem-vindo(a), {name} — a sua escola estava esperando por você.
~~~

[event:enrollment.rg_approved]
is_tts: false
storytelling: false
channels: whatsapp,email
title: 
subject: 
media_url: 
media_type: 
mail_template: default
story_prompt: 
fires_on: 
source: users.roles.enrollment
delay_minutes: 0
active: true
~~~
Tudo certo, {name}! ✅ Seu RG foi aprovado e sua matrícula segue em frente. Continue o preenchimento, {name}.
~~~

[event:enrollment.rg_in_review]
is_tts: false
storytelling: false
channels: whatsapp,email
title: 
subject: 
media_url: 
media_type: 
mail_template: default
story_prompt: 
fires_on: 
source: users.roles.enrollment
delay_minutes: 0
active: true
~~~
{name}, o RG de uma matrícula precisa da sua análise: {detail} Aprove ou reprove no painel, {name}.
~~~

[event:enrollment.rg_rejected]
is_tts: false
storytelling: false
channels: whatsapp,email
title: 
subject: 
media_url: 
media_type: 
mail_template: default
story_prompt: 
fires_on: 
source: users.roles.enrollment
delay_minutes: 0
active: true
~~~
{name}, precisamos de uma nova foto do seu RG: {detail} Reenvie pelo aplicativo, {name} — é rapidinho. 📄
~~~

[event:enrollment.selfie_approved]
is_tts: true
storytelling: true
channels: whatsapp,email
title: 
subject: 
media_url: 
media_type: 
mail_template: default
story_prompt: Você escreve para {name}, um(a) aluno(a) adulto(a) da educação de jovens e adultos (EJA), público simples e batalhador, que acabou de ASSINAR a matrícula com a própria selfie. Hoje é {data_hoje} — pode citar a data como o dia em que ele(a) deu esse passo. {faixa_etaria} Escreva uma mensagem calorosa e curta (no máximo 3 frases) celebrando que foi ELE(A) quem assinou, com o próprio rosto, e que agora é só aguardar a liberação. Trate por '{name}'. Português impecável, sem erros, sem gírias, sem emoji, sem inventar outros fatos.
fires_on: 
source: users.roles.enrollment
delay_minutes: 0
active: true
~~~
{name}, sua matrícula está assinada. ✍️ E quem assinou foi você, com o seu próprio rosto — ninguém fez isso por você. Esse passo é seu pra sempre, {name}. Agora é com a gente: assim que estiver tudo conferido, a gente te avisa por aqui.
~~~

[event:enrollment.selfie_in_review]
is_tts: false
storytelling: false
channels: whatsapp,email
title: 
subject: 
media_url: 
media_type: 
mail_template: default
story_prompt: 
fires_on: 
source: users.roles.enrollment
delay_minutes: 0
active: true
~~~
{name}, a selfie de uma matrícula precisa da sua análise — a IA ficou em dúvida. Aprove ou reprove no painel, {name}.
~~~

[event:enrollment.selfie_rejected]
is_tts: false
storytelling: false
channels: whatsapp,email
title: 
subject: 
media_url: 
media_type: 
mail_template: default
story_prompt: 
fires_on: 
source: users.roles.enrollment
delay_minutes: 0
active: true
~~~
{name}, sua selfie não pôde ser confirmada. Envie uma nova foto pelo aplicativo, nítida e mostrando bem o rosto, {name}.
~~~

[event:hub.coordinator_assigned]
is_tts: false
storytelling: false
channels: whatsapp,email
title: 
subject: 
media_url: 
media_type: 
mail_template: default
story_prompt: 
fires_on: 
source: hub.interface
delay_minutes: 0
active: true
~~~
Parabéns, {name}! Você agora é COORDENADOR de um polo. {name}, acompanhe as matrículas e libere os alunos pelo painel.
~~~

[event:lead.captured]
is_tts: false
storytelling: false
channels: whatsapp,email
title: 
subject: 
media_url: 
media_type: 
mail_template: default
story_prompt: 
fires_on: 
source: users.roles.lead
delay_minutes: 0
active: true
~~~
Olá, {name}! 🎉 Que bom ter você com a gente. Seu cadastro está pronto, {name} — falta só um passo pra garantir sua vaga: concluir o pagamento. Em instantes envio o link. Bora juntos nessa jornada!
~~~

[event:lead.captured.promoter]
is_tts: false
storytelling: false
channels: whatsapp,email
title: 
subject: 
media_url: 
media_type: 
mail_template: default
story_prompt: 
fires_on: 
source: users.roles.lead
delay_minutes: 0
active: true
~~~
Boa notícia, {name}! {lead_name} acaba de entrar na sua rede pela sua indicação. Incentive a concluir o pagamento, {name}. 👊
~~~

[event:lead.checkout.card]
is_tts: false
storytelling: false
channels: whatsapp,email
title: 
subject: 
media_url: 
media_type: 
mail_template: default
story_prompt: 
fires_on: 
source: users.roles.lead
delay_minutes: 0
active: true
~~~
{name}, para concluir sua matrícula pague {valor} no cartão:
{link}

Qualquer dúvida é só chamar, {name}.
~~~

[event:lead.checkout.pix]
is_tts: false
storytelling: false
channels: whatsapp,email
title: 
subject: 
media_url: 
media_type: 
mail_template: default
story_prompt: 
fires_on: 
source: users.roles.lead
delay_minutes: 0
active: true
~~~
{name}, para concluir sua matrícula pague o PIX de {valor}:
{link}

Ou use o PIX copia-e-cola, {name}:
{payload}
~~~

[event:lead.paid]
is_tts: true
storytelling: false
channels: whatsapp,email
title: 
subject: 
media_url: 
media_type: 
mail_template: default
story_prompt: 
fires_on: 
source: users.roles.lead
delay_minutes: 0
active: true
~~~
Parabéns, {name}! 🎉 Seu pagamento foi confirmado e sua matrícula começou. Você deu um passo importante, {name} — em breve enviamos os próximos passos.
~~~

[event:lead.paid.coordinator]
is_tts: false
storytelling: false
channels: whatsapp,email
title: 
subject: 
media_url: 
media_type: 
mail_template: default
story_prompt: 
fires_on: 
source: users.roles.lead
delay_minutes: 0
active: true
~~~
{name}, uma nova matrícula entrou no seu polo. Acompanhe quando o aluno preencher os dados, {name}.
~~~

[event:lead.paid.promoter]
is_tts: false
storytelling: false
channels: whatsapp,email
title: 
subject: 
media_url: 
media_type: 
mail_template: default
story_prompt: 
fires_on: 
source: users.roles.lead
delay_minutes: 0
active: true
~~~
{name}, seu indicado pagou a matrícula! ✅ Sua comissão entra no fechamento de sexta, {name}. 💸
~~~

[event:lead.paid.receipt]
is_tts: false
storytelling: false
channels: whatsapp,email
title: 
subject: 
media_url: 
media_type: 
mail_template: default
story_prompt: 
fires_on: 
source: users.roles.lead
delay_minutes: 0
active: true
~~~
{name}, aqui está o comprovante do seu pagamento de {valor}:
{link}
Guarde para referência, {name}.
~~~

[event:promoter.reactivated]
is_tts: false
storytelling: false
channels: whatsapp,email
title: 
subject: 
media_url: 
media_type: 
mail_template: default
story_prompt: 
fires_on: 
source: users.roles.promoter
delay_minutes: 0
active: true
~~~
Que bom te ver de volta, {name}! Sua atuação como promotor foi reativada. {name}, seu link de captação está ativo de novo — bora!
~~~

[event:promoter.suspended]
is_tts: false
storytelling: false
channels: whatsapp,email
title: 
subject: 
media_url: 
media_type: 
mail_template: default
story_prompt: 
fires_on: 
source: users.roles.promoter
delay_minutes: 0
active: true
~~~
{name}, sua atuação como promotor foi temporariamente suspensa pelo coordenador do polo. Fale com o coordenador para regularizar, {name}.
~~~

[event:student.diploma_issued]
is_tts: true
storytelling: true
channels: whatsapp,email
title: 
subject: 
media_url: 
media_type: 
mail_template: default
story_prompt: Você escreve para {name}, um(a) aluno(a) adulto(a) da EJA, público simples e batalhador, que ACABOU de ter o diploma emitido — muitas vezes um sonho adiado por décadas. Hoje é {data_hoje} — pode citar a data como o dia em que ele(a) concluiu. {faixa_etaria} Escreva uma mensagem curta (no máximo 3 frases), emocionante e digna, dizendo que terminou os estudos e que isso é dele(a) para sempre. Trate por '{name}'. NÃO fale de retirada nem logística. Português impecável, sem erros, sem gírias, sem emoji, sem inventar outros fatos.
fires_on: 
source: users.roles.student
delay_minutes: 0
active: true
~~~
{name}, chegou o grande dia: o seu diploma está pronto! 🎓 Você terminou os seus estudos — o que um dia ficou para trás, hoje você concluiu. E isso é seu para sempre, {name}. Parabéns! A gente tem muito orgulho de você.
~~~

[event:student.diploma_pickup]
is_tts: false
storytelling: false
channels: whatsapp,email
title: 
subject: 
media_url: 
media_type: 
mail_template: default
story_prompt: 
fires_on: 
source: users.roles.student
delay_minutes: 0
active: true
~~~
Para retirar o seu diploma, {name}, é só procurar o coordenador do seu polo. Ele já está esperando por você, {name}.
~~~

[event:student.document_in_review]
is_tts: false
storytelling: false
channels: whatsapp,email
title: 
subject: 
media_url: 
media_type: 
mail_template: default
story_prompt: 
fires_on: 
source: users.roles.student
delay_minutes: 0
active: true
~~~
{name}, um documento de aluno ({doc_type}) precisa da sua análise — a IA ficou em dúvida. Aprove ou reprove no painel, {name}.
~~~

[event:student.document_rejected]
is_tts: false
storytelling: false
channels: whatsapp,email
title: 
subject: 
media_url: 
media_type: 
mail_template: default
story_prompt: 
fires_on: 
source: users.roles.student
delay_minutes: 0
active: true
~~~
{name}, seu documento ({doc_type}) precisa ser reenviado. Envie uma nova foto, nítida e legível, {name}.{reason_text}
~~~

[event:student.exam_failed]
is_tts: false
storytelling: false
channels: whatsapp,email
title: 
subject: 
media_url: 
media_type: 
mail_template: default
story_prompt: 
fires_on: 
source: users.roles.student
delay_minutes: 0
active: true
~~~
{name}, você não atingiu a nota desta vez — mas não desanime. Reagende para uma nova tentativa, {name}, você consegue!
~~~

[event:student.exam_passed]
is_tts: false
storytelling: false
channels: whatsapp,email
title: 
subject: 
media_url: 
media_type: 
mail_template: default
story_prompt: 
fires_on: 
source: users.roles.student
delay_minutes: 0
active: true
~~~
Você foi APROVADO na prova, {name}! 🎉 Estamos finalizando a sua documentação, {name}. Falta pouco!
~~~

[event:student.exam_released]
is_tts: false
storytelling: false
channels: whatsapp,email
title: 
subject: 
media_url: 
media_type: 
mail_template: default
story_prompt: 
fires_on: 
source: users.roles.student
delay_minutes: 0
active: true
~~~
{name}, seus documentos foram aprovados! Você já pode agendar a sua prova quando quiser, {name}.
~~~

[event:student.exam_scheduled]
is_tts: false
storytelling: false
channels: whatsapp,email
title: 
subject: 
media_url: 
media_type: 
mail_template: default
story_prompt: 
fires_on: 
source: users.roles.student
delay_minutes: 0
active: true
~~~
{name}, um aluno do seu polo agendou a prova e aguarda a sua correção. Confira no painel, {name}.
~~~

[event:student.pendency_opened]
is_tts: false
storytelling: false
channels: whatsapp,email
title: 
subject: 
media_url: 
media_type: 
mail_template: default
story_prompt: 
fires_on: 
source: users.roles.student
delay_minutes: 0
active: true
~~~
{name}, há uma pendência na sua matrícula: {detail}. Resolva para seguir com a emissão do diploma, {name}.
~~~

[event:student.veteran]
is_tts: false
storytelling: false
channels: whatsapp,email
title: 
subject: 
media_url: 
media_type: 
mail_template: default
story_prompt: 
fires_on: 
source: users.roles.student
delay_minutes: 0
active: true
~~~
{name}, agora você é veterano da nossa escola. 💚 Você chegou até o fim — e quem chega ao fim inspira quem ainda está começando. Bem-vindo ao time, {name}!
~~~

[event:student.veteran.coordinator]
is_tts: false
storytelling: false
channels: whatsapp,email
title: 
subject: 
media_url: 
media_type: 
mail_template: default
story_prompt: 
fires_on: 
source: users.roles.student
delay_minutes: 0
active: true
~~~
{name}, um aluno do seu polo se formou e foi diplomado. ✅ Sua comissão entra no próximo fechamento, {name}. 💸
~~~

[event:training.approved]
is_tts: true
storytelling: false
channels: whatsapp,email
title: 
subject: 
media_url: 
media_type: 
mail_template: default
story_prompt: 
fires_on: 
source: users.roles.training
delay_minutes: 0
active: true
~~~
Parabéns, {name}! 🎉 Você foi aprovado e agora é PROMOTOR. {name}, seu link de captação já está ativo — comece a indicar e a ganhar!
~~~

[event:training.cleared]
is_tts: true
storytelling: false
channels: whatsapp,email
title: 
subject: 
media_url: 
media_type: 
mail_template: default
story_prompt: 
fires_on: 
source: users.roles.training
delay_minutes: 0
active: true
~~~
Treinamento concluído, {name}! 🎉 Seu painel está liberado e seu link de captação ativo. Agora é com você, {name} — comece a indicar e a ganhar!
~~~

[event:training.must_train]
is_tts: false
storytelling: false
channels: whatsapp,email
title: 
subject: 
media_url: 
media_type: 
mail_template: default
story_prompt: 
fires_on: 
source: users.roles.training
delay_minutes: 0
active: true
~~~
Parabéns, {name}! Você foi aprovado e agora é PROMOTOR. Antes de liberar seu painel, {name}, conclua o treinamento obrigatório no aplicativo — assim que terminar, tudo é liberado.
~~~

[event:training.new_material]
is_tts: false
storytelling: false
channels: whatsapp,email
title: 
subject: 
media_url: 
media_type: 
mail_template: default
story_prompt: 
fires_on: 
source: users.roles.training
delay_minutes: 0
active: true
~~~
{name}, há um novo treinamento obrigatório no aplicativo. Conclua a atividade para continuar usando o painel, {name}.
~~~

