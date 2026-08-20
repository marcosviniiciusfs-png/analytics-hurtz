from pathlib import Path
from reportlab.pdfgen import canvas
from reportlab.lib.pagesizes import A4, landscape
from reportlab.lib.colors import HexColor, white
from reportlab.pdfbase import pdfmetrics
from reportlab.pdfbase.ttfonts import TTFont
from reportlab.pdfbase.pdfmetrics import stringWidth
from reportlab.lib.utils import ImageReader

ROOT=Path(__file__).resolve().parent; ASSET=ROOT/'assets'
OUT=ROOT/'Hurtz_Quebra_de_Objecoes_Playbook_Pratico.pdf'; W,H=landscape(A4)
O=HexColor('#FF5A1F'); INK=HexColor('#171A35'); BLACK=HexColor('#151515')
PEACH=HexColor('#FFF0E8'); PALE=HexColor('#F6F8FC'); BLUE=HexColor('#DCEBFF')
GRAY=HexColor('#67666C'); LINE=HexColor('#E5E1DE'); GREEN=HexColor('#15845B'); RED=HexColor('#B72A22')
pdfmetrics.registerFont(TTFont('A',r'C:\Windows\Fonts\arial.ttf'));pdfmetrics.registerFont(TTFont('AB',r'C:\Windows\Fonts\arialbd.ttf'))

def text(c,s,x,y,size=11,color=BLACK,font='A',width=None,leading=None,align='left'):
    c.setFillColor(color);c.setFont(font,size)
    if width is None:
        {'left':c.drawString,'center':c.drawCentredString,'right':c.drawRightString}[align](x,y,s);return y
    words=s.split();rows=[];line='';leading=leading or size*1.3
    for word in words:
        t=(line+' '+word).strip()
        if stringWidth(t,font,size)<=width:line=t
        else:
            if line:rows.append(line)
            line=word
    if line:rows.append(line)
    for row in rows:c.drawString(x,y,row);y-=leading
    return y

def rr(c,x,y,w,h,fill=white,stroke=LINE,r=14,sw=1):
    c.setFillColor(fill);c.setStrokeColor(stroke);c.setLineWidth(sw);c.roundRect(x,y,w,h,r,fill=1,stroke=1)

def pill(c,s,x,y,fill=BLACK,fg=white,w=None):
    w=w or stringWidth(s,'AB',8)+18;c.setFillColor(fill);c.roundRect(x,y,w,20,10,fill=1,stroke=0);text(c,s,x+w/2,y+6,8,fg,'AB',align='center');return w

def img(c,name,x,y,w,h):
    im=ImageReader(str(ASSET/name));iw,ih=im.getSize();sc=min(w/iw,h/ih);dw,dh=iw*sc,ih*sc;c.drawImage(im,x+(w-dw)/2,y+(h-dh)/2,dw,dh,mask='auto')

def head(c,kicker,title,sub):
    pill(c,kicker.upper(),42,H-51,BLACK);text(c,title,42,H-93,24,BLACK,'AB');text(c,sub,42,H-116,10.5,GRAY,width=W-84)

def footer(c,n):
    c.setStrokeColor(LINE);c.setLineWidth(.7);c.line(34,24,W-34,24);text(c,'HURTZ  •  QUEBRA DE OBJEÇÕES',34,10,7,GRAY,'AB');text(c,f'{n:02d}',W-34,10,7,GRAY,'AB',align='right')

def page(c,n):footer(c,n);c.showPage()

def card(c,x,y,w,h,title,body,accent=O,fill=white):
    rr(c,x,y,w,h,fill,LINE);text(c,title.upper(),x+16,y+h-28,8.5,accent,'AB');text(c,body,x+16,y+h-51,10,BLACK,'AB',w-32,13)

def quote(c,x,y,w,h,body,label='COPIE, PERSONALIZE E USE'):
    rr(c,x,y,w,h,PEACH,O,14,1.5);pill(c,label,x+16,y+h-30,O);text(c,'“'+body+'”',x+18,y+h-59,11.5,BLACK,'AB',w-36,15)

def arrow(c,x1,y1,x2,y2,color=O):
    c.setStrokeColor(color);c.setFillColor(color);c.setLineWidth(2.4);c.line(x1,y1,x2,y2);p=c.beginPath();p.moveTo(x2,y2);p.lineTo(x2-8,y2+4);p.lineTo(x2-8,y2-4);p.close();c.drawPath(p,fill=1,stroke=0)

def check(c,x,y):
    c.setFillColor(GREEN);c.circle(x,y,10,fill=1,stroke=0);c.setStrokeColor(white);c.setLineWidth(1.8);c.line(x-5,y,x-1,y-4);c.line(x-1,y-4,x+6,y+4)

def map_icon(c,kind,x,y,accent=O):
    c.setFillColor(PEACH);c.circle(x,y,25,fill=1,stroke=0)
    c.setStrokeColor(accent);c.setFillColor(accent);c.setLineWidth(2)
    if kind=='lead':
        c.circle(x,y+5,7,fill=0,stroke=1);c.arc(x-13,y-15,x+13,y+5,15,150)
        c.circle(x+15,y+13,5,fill=1,stroke=0)
    elif kind=='silence':
        c.roundRect(x-14,y-8,28,19,6,fill=0,stroke=1)
        c.line(x-7,y-8,x-12,y-14);c.line(x-7,y-8,x-2,y-8)
        c.line(x-7,y+2,x+7,y+2)
    elif kind=='curious':
        c.circle(x,y,12,fill=0,stroke=1);text(c,'?',x,y-7,18,accent,'AB',align='center')
    elif kind=='objection':
        c.circle(x-5,y+4,9,fill=0,stroke=1);c.line(x+2,y-3,x+13,y-14)
        c.line(x+12,y+9,x+20,y+9);c.line(x+16,y+5,x+16,y+13)
    elif kind=='ready':
        c.roundRect(x-13,y-14,26,29,3,fill=0,stroke=1);c.line(x-6,y+7,x+6,y+7)
        c.line(x-6,y,x+6,y);c.line(x-6,y-7,x+2,y-7)
    elif kind=='calendar':
        c.roundRect(x-14,y-12,28,25,3,fill=0,stroke=1);c.line(x-14,y+5,x+14,y+5)
        c.line(x-7,y+17,x-7,y+9);c.line(x+7,y+17,x+7,y+9);check(c,x+5,y-5)

c=canvas.Canvas(str(OUT),pagesize=(W,H),pageCompression=1);c.setTitle('Quebra de Objeções e Conversão de Leads em Consórcio');c.setAuthor('Hurtz Company')

# 1 CAPA
c.setFillColor(white);c.rect(0,0,W,H,fill=1,stroke=0);c.setFillColor(PEACH);c.circle(10,-25,145,fill=1,stroke=0);c.circle(W+15,H+15,155,fill=1,stroke=0)
pill(c,'MATERIAL DE ESTUDO • CONSÓRCIO',48,H-73,BLACK)
text(c,'QUEBRA DE',48,H-135,32,BLACK,'AB');text(c,'OBJEÇÕES',48,H-176,32,O,'AB');text(c,'E CONVERSÃO',48,H-217,24,INK,'AB')
text(c,'Postura, scripts, qualificação e processo comercial.',48,H-251,11,GRAY,'AB',315)
img(c,'capa.png',365,42,455,425);img(c,'logo-hurtz-laranja.png',650,H-154,142,106)
text(c,'Playbook prático para aplicação diária',48,93,9,GRAY);text(c,'HURTZ COMPANY',48,66,8,INK,'AB');c.showPage()

# 2 COMO ESTUDAR
head(c,'01 • Orientação','Como usar este playbook','Localize a situação, copie o script, personalize os campos e conduza o próximo passo.')
for i,(n,t,b) in enumerate([('1','LOCALIZE','Encontre a objeção ou etapa.'),('2','PERSONALIZE','Troque nome, bem, valor e prazo.'),('3','ENVIE OU FALE','Use texto, áudio ou ligação.'),('4','REGISTRE','Anote resposta e próxima ação.')]):
    x=42+i*193;rr(c,x,220,173,164,white,LINE);c.setFillColor(O if i%2==0 else INK);c.circle(x+33,349,21,fill=1,stroke=0);text(c,n,x+33,342,18,white,'AB',align='center');text(c,t,x+17,305,12,BLACK,'AB');text(c,b,x+17,277,9.5,GRAY,width=139,leading=13)
rr(c,42,132,752,58,INK,INK);text(c,'REGRA DE USO',61,165,8,O,'AB');text(c,'Copie a estrutura, mas fale com naturalidade e preserve o contexto real do cliente.',61,143,11.5,white,'AB')
page(c,2)

# 3 MAPA DE NAVEGAÇÃO
head(c,'02 • Mapa de navegação','Qual caminho seguir em cada cenário?','Comece pelo comportamento do lead. Identifique o cenário, execute a rota indicada e registre o próximo passo.')
map_icon(c,'lead',82,321,O);text(c,'LEAD ENTROU',82,278,9,BLACK,'AB',align='center')
arrow(c,112,321,180,321,O)
rr(c,180,286,124,70,INK,INK);text(c,'HOUVE',242,327,9,white,'AB',align='center');text(c,'RESPOSTA?',242,306,12,white,'AB',align='center')

arrow(c,304,337,375,400,INK);pill(c,'NÃO',315,375,INK)
map_icon(c,'silence',406,400,INK);text(c,'SILÊNCIO',406,361,9,INK,'AB',align='center')
rr(c,456,365,145,70,PALE,LINE);text(c,'FOLLOW-UP',472,408,8,O,'AB');text(c,'Novo motivo para responder.',472,384,9,BLACK,'AB',112,12)
arrow(c,601,400,662,400,INK)
rr(c,662,365,132,70,white,INK);text(c,'SEM RESPOSTA',678,408,8,INK,'AB');text(c,'Próxima tentativa ou saída.',678,384,9,BLACK,'AB',101,12)

arrow(c,304,305,360,260,O);pill(c,'SIM',315,267,O)
rr(c,360,225,126,70,PEACH,O);text(c,'QUAL É O',423,267,9,O,'AB',align='center');text(c,'CENÁRIO?',423,246,12,BLACK,'AB',align='center')

arrow(c,486,270,550,318,O);map_icon(c,'curious',579,331,O)
text(c,'CURIOSIDADE',579,292,8.5,O,'AB',align='center');text(c,'Reduza a pressão',579,275,8.5,GRAY,'AB',align='center')

arrow(c,486,260,550,230,INK);map_icon(c,'objection',579,230,INK)
text(c,'OBJEÇÃO',579,191,8.5,INK,'AB',align='center');text(c,'Aplique ESCUTA',579,174,8.5,GRAY,'AB',align='center')

arrow(c,486,241,550,155,O);map_icon(c,'ready',579,150,O)
text(c,'INTENÇÃO CLARA',579,111,8.5,O,'AB',align='center');text(c,'Qualifique',579,94,8.5,GRAY,'AB',align='center')

arrow(c,609,331,684,280,O);arrow(c,609,230,684,255,INK);arrow(c,609,150,684,230,O)
map_icon(c,'calendar',723,255,GREEN);text(c,'PRÓXIMO',723,210,8,GREEN,'AB',align='center');text(c,'COMPROMISSO',723,195,10,BLACK,'AB',align='center')
rr(c,42,43,752,38,INK,INK);text(c,'REGRA DO MAPA:',61,57,8,O,'AB');text(c,'toda rota termina com resposta específica, data combinada ou encerramento registrado.',153,56,9.5,white,'AB')
page(c,3)

# 4 FRAMEWORK ESCUTA
head(c,'03 • Framework','ESCUTA: o mapa mental da quebra de objeção','Uma sequência para manter calma, investigar a causa e conduzir o próximo passo.')
steps=[('E','ESCUTAR','Não interrompa.'),('S','SEPARAR','Ache a objeção real.'),('C','CONSULTAR','Faça perguntas.'),('U','USAR CONTEXTO','Conecte à realidade.'),('T','TRAVAR O PASSO','Agende com precisão.'),('A','ACOMPANHAR','Confirme e registre.')]
for i,(letter,title_,body) in enumerate(steps):
    col=i%3;row=i//3;x=42+col*252;y=272-row*118;rr(c,x,y,230,95,white,LINE);c.setFillColor(O if i%2==0 else INK);c.circle(x+34,y+51,21,fill=1,stroke=0);text(c,letter,x+34,y+44,17,white,'AB',align='center');text(c,title_,x+68,y+57,10.5,BLACK,'AB');text(c,body,x+68,y+34,9,GRAY,'AB')
rr(c,42,108,734,45,PEACH,PEACH);text(c,'OBJETIVO',61,124,8,O,'AB');text(c,'Trocar reação emocional por diagnóstico e próximo compromisso.',126,123,10.5,BLACK,'AB')
page(c,4)

# 4 POSTURA
head(c,'04 • Postura','Resultado começa antes da ligação','Estudo diário, tom positivo e personalização são comportamentos — não frases prontas.')
img(c,'postura.png',24,112,475,305)
for i,(h,b) in enumerate([('PREPARE-SE','Revise objeções e scripts antes de ligar.'),('USE O NOME','Personalização cria proximidade.'),('CUIDE DO TOM','Fale com energia, calma e segurança.')]):
    card(c,520,310-i*76,277,65,h,b,O if i!=1 else INK,PEACH if i==0 else white)
rr(c,42,104,456,47,INK,INK);text(c,'SEM ATALHO:',61,121,8,O,'AB');text(c,'quebra de objeção exige treino diário.',137,120,10.5,white,'AB');page(c,5)

# 5 PLANTAR E COLHER
head(c,'05 • Mentalidade','Plantar antes de colher','A primeira conversa vende confiança e próximo passo — não precisa carregar todo o fechamento.')
phases=[('INÍCIO DO MÊS','PLANTAR','Conversar, educar e criar proximidade.'),('MEIO DO CICLO','CULTIVAR','Provas, retornos e qualificação.'),('FINAL DO MÊS','COLHER','Agendar, negociar e fechar.')]
for i,(k,h,b) in enumerate(phases):
    x=55+i*258;c.setFillColor(PEACH);c.circle(x+88,325,52,fill=1,stroke=0);c.setFillColor(O);c.circle(x+88,325,12+10*i,fill=1,stroke=0);text(c,k,x+18,246,8,O,'AB');text(c,h,x+18,219,15,BLACK,'AB');text(c,b,x+18,193,9.5,GRAY,width=175,leading=13)
    if i<2:arrow(c,x+150,325,x+235,325,O)
rr(c,42,110,755,48,INK,INK);text(c,'PONTO-CHAVE',62,128,8,O,'AB');text(c,'Relacionamento prepara o terreno; fechamento acontece quando há confiança e clareza.',151,127,10.5,white,'AB')
page(c,6)

# 6 LEAD CURIOSO
head(c,'06 • Lead curioso','“Cliquei sem querer” não encerra a conversa','Trate como objeção inicial: reduza a pressão, valide o momento e venda uma conversa curta.')
img(c,'cliquei-sem-querer.png',25,115,470,300)
quote(c,520,249,278,140,'[Nome], sem problema. Talvez agora não seja um bom momento. Posso te ligar hoje às [horário 1] ou às [horário 2] para entender o que você buscava?')
rr(c,520,145,278,78,white,LINE);text(c,'PRÓXIMO PASSO',538,194,8,GREEN,'AB');text(c,'Sair da negativa genérica com horário de retorno definido.',538,170,10,BLACK,'AB',240,13)
page(c,7)

# 7 CONSULTIVO X IMPACTO
head(c,'07 • Contexto','Consultivo e impacto usam a mesma base','O momento da qualificação muda; velocidade, CRM e disciplina continuam obrigatórios.')
card(c,42,205,340,180,'VENDA CONSULTIVA','Qualificação acontece ao longo da conversa. Priorize escuta, educação curta e descoberta gradual.',O,PEACH)
card(c,458,205,340,180,'VENDA DE IMPACTO','O lead chega por um bem específico. Antecipe parcela, entrada, prazo e aderência para não perder energia.',INK,PALE)
arrow(c,390,295,448,295,O)
rr(c,145,120,550,55,INK,INK);text(c,'BASE COMUM',165,152,8,O,'AB');text(c,'Resposta rápida • registro • troca de vendedor • próximo passo',165,131,11,white,'AB')
page(c,8)

# 8 FOLLOW-UP
head(c,'08 • Follow-up','Personalização em cada tentativa','Cada contato precisa trazer um motivo novo para responder: contexto, pergunta, prova, voz ou encerramento.')
img(c,'follow-up.png',22,106,470,315)
quote(c,520,251,278,139,'[Nome], vi que você buscava [bem] e queria manter a parcela perto de [valor]. Isso ainda está nos seus planos ou mudou alguma coisa?')
rr(c,520,145,278,79,PEACH,PEACH);text(c,'ENCERRAMENTO APÓS TENTATIVAS',538,196,8,O,'AB');text(c,'“Se não for o momento, me avise e eu paro por aqui. Se ainda fizer sentido, estou à disposição.”',538,173,9.2,BLACK,'AB',240,12)
page(c,9)

# 9 INVESTIGAR
head(c,'09 • Diagnóstico','Transforme a justificativa em diagnóstico','Uma justificativa vaga precisa virar uma causa específica antes de qualquer resposta comercial.')
img(c,'investigar.png',24,108,470,310)
quote(c,520,265,278,126,'[Nome], para eu não insistir no ponto errado: o que pesou mais para você — entrada, parcela, prazo, momento ou decisão com outra pessoa?')
for i,s in enumerate(['Entrada disponível','Parcela confortável','Prazo e urgência','Tomador da decisão']):
    check(c,541,228-i*27);text(c,s,562,224-i*27,9.5,BLACK,'AB')
page(c,10)

# 10 FLUXO DA CONVERSA
head(c,'10 • Roteiro completo','Do anúncio ao compromisso','Use os cinco blocos abaixo como guia de ligação. Avance somente quando o bloco anterior estiver claro.')
flow=[('1','RELEMBRAR','“Você pediu uma análise para [bem], lembra?”'),('2','VALIDAR','“Pode falar por dois minutos?”'),('3','QUALIFICAR','“Qual parcela e entrada funcionam?”'),('4','AGENDAR','“[hora 1] ou [hora 2]?”'),('5','CONFIRMAR','“Quem decide com você?”')]
for i,(n,h,b) in enumerate(flow):
    x=35+i*160;rr(c,x,210,145,180,white,LINE);c.setFillColor(O if i%2==0 else INK);c.circle(x+28,353,19,fill=1,stroke=0);text(c,n,x+28,347,15,white,'AB',align='center');text(c,h,x+15,309,11,BLACK,'AB');text(c,b,x+15,283,9,GRAY,width=114,leading=12)
    if i<4:arrow(c,x+146,300,x+158,300,O)
rr(c,42,126,754,53,PEACH,PEACH);text(c,'EVITE',61,156,8,RED,'AB');text(c,'“Quando você pode?”',61,137,10,BLACK,'AB');text(c,'USE',280,156,8,GREEN,'AB');text(c,'“Tenho [hora 1] ou [hora 2]. Qual funciona melhor?”',280,137,10,BLACK,'AB')
page(c,11)

# 11 QUALIFICAÇÃO E AGENDA
head(c,'11 • Compromisso','Qualifique antes de aprofundar no bem','Copie as perguntas abaixo para conduzir capacidade, preferência, decisor e agenda.')
img(c,'agendamento.png',23,108,475,311)
for i,(h,b) in enumerate([('PREFERÊNCIA','“Qual região ou modelo você procura?”'),('CAPACIDADE','“Qual parcela e entrada ficam confortáveis?”'),('DECISOR','“Quem participa dessa decisão com você?”'),('AGENDA','“[hora 1] ou [hora 2]?”')]):
    card(c,520+(i%2)*140,304-(i//2)*106,130,91,h,b,O if i%2==0 else INK,PEACH if i==0 else white)
page(c,12)

# 12 CONFIRMAÇÃO
head(c,'12 • Confirmação','Agendamento só existe com compromisso','Use mensagens curtas em cada momento e registre a confirmação.')
rows=[('NO AGENDAMENTO','“Fechado: [dia], [hora], para revisar [objetivo].”'),('NO DIA','“Hoje vamos definir o melhor caminho para [bem].”'),('30 MIN ANTES','“Tudo certo para nosso horário às [hora]?”'),('SE NÃO CONFIRMAR','“Prefere manter ou remarcar para [opção]?”')]
for i,(h,b) in enumerate(rows):
    y=344-i*66;c.setFillColor(O if i==0 else PEACH);c.circle(72,y,18,fill=1,stroke=0);text(c,str(i+1),72,y-6,13,white if i==0 else O,'AB',align='center');text(c,h,110,y+4,10,BLACK,'AB');text(c,b,110,y-17,9.5,GRAY)
rr(c,475,172,320,212,INK,INK);text(c,'SCRIPT PARA O DECISOR',497,350,9,O,'AB');text(c,'“Para não repetir',497,309,21,white,'AB');text(c,'toda a conversa depois...”',497,281,19,white,'AB');text(c,'“...vamos incluir [nome/decisor] no próximo horário?”',497,228,10,O,'AB',260,14)
page(c,13)

# 13 CRM
head(c,'13 • Processo','Técnica sem processo não escala','Trate os itens abaixo como padrão operacional obrigatório no CRM.')
img(c,'crm.png',24,110,475,309)
items=[('ATÉ 5 MIN','Executar primeiro contato'),('5 DIAS','Manter cadência ativa'),('8–13','Registrar pontos de contato'),('NOVO VENDEDOR','Retomar com novo ângulo')]
for i,(h,b) in enumerate(items):
    x=520+(i%2)*140;y=304-(i//2)*103;card(c,x,y,130,88,h,b,O if i!=3 else INK,PEACH if i==0 else white)
page(c,14)

# 14 BIBLIOTECA DE SCRIPTS
head(c,'14 • Biblioteca rápida','Scripts para objeções frequentes','Escolha a situação, personalize os campos entre colchetes e conduza uma pergunta por vez.')
scripts=[
    ('“NÃO TENHO INTERESSE”','“Entendi, [nome]. O que mudou desde que você buscou [bem]?”'),
    ('“ESTÁ CARO”','“O que ficou fora do esperado: entrada, parcela ou prazo?”'),
    ('“VOU PENSAR”','“Qual ponto precisa ficar claro para você decidir com segurança?”'),
    ('“PRECISO FALAR COM ALGUÉM”','“Vamos marcar 15 minutos com [decisor] para todos avaliarem juntos?”'),
    ('“ME MANDA NO WHATSAPP”','“Envio agora. Podemos combinar um retorno às [hora 1] ou [hora 2]?”'),
    ('“SEM TEMPO AGORA”','“Sem problema. Retorno às [hora 1] ou [hora 2]?”')
]
for i,(h,b) in enumerate(scripts):
    col=i%2;row=i//2;x=42+col*387;y=300-row*89;card(c,x,y,365,75,h,b,O if i%2==0 else INK,PEACH if i==0 else white)
rr(c,42,55,754,43,INK,INK);text(c,'SAÍDA DE TODO SCRIPT:',62,71,9,O,'AB');text(c,'uma resposta específica ou um próximo compromisso com data.',227,71,10.5,white,'AB')
page(c,15)

# 15 CHECKLIST
head(c,'15 • Checklist','Antes de encerrar o dia','Use esta página como conferência operacional do vendedor.')
checks=['Respondi leads novos em até 5 minutos.','Usei o nome do cliente e personalizei a conversa.','Transformei a objeção vaga em causa específica.','Qualifiquei parcela, entrada, preferência e decisor.','Fiz follow-up individualizado e registrei cada tentativa.','Ofereci dois horários concretos.','Confirmei presença e tomador da decisão.','Registrei objeções que ainda precisam de novo script.']
for i,s in enumerate(checks):
    col=i%2;row=i//2;x=55+col*390;y=359-row*61;check(c,x,y);text(c,s,x+22,y-4,9.5,BLACK,'AB',330,12)
rr(c,42,103,754,45,INK,INK);text(c,'SE NÃO ESTÁ REGISTRADO,',62,119,9,O,'AB');text(c,'não vira dado, aprendizado nem melhoria de processo.',222,119,10.5,white,'AB')
page(c,16)

# 16 FINAL
c.setFillColor(INK);c.rect(0,0,W,H,fill=1,stroke=0);text(c,'QUEBRA DE OBJEÇÃO',52,H-105,10,O,'AB');text(c,'não é vencer',52,H-158,31,white,'AB');text(c,'uma discussão.',52,H-198,31,O,'AB');text(c,'É entender o que impede a decisão e conduzir o próximo passo.',52,H-246,12,white,'AB',430,17)
rr(c,52,120,520,78,HexColor('#242743'),HexColor('#3A3E60'));text(c,'ESCUTA',73,166,9,O,'AB');text(c,'Escutar • Separar • Consultar • Usar contexto • Travar • Acompanhar',73,140,10,white,'AB')
img(c,'logo-hurtz-laranja.png',650,35,140,104);text(c,'HURTZ COMPANY  •  TREINAMENTO COMERCIAL',52,36,8,white,'AB');c.save();print(OUT)
