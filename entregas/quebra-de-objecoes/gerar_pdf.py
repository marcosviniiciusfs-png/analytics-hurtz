from pathlib import Path
from reportlab.pdfgen import canvas
from reportlab.lib.pagesizes import A4, landscape
from reportlab.lib.colors import HexColor, white
from reportlab.pdfbase import pdfmetrics
from reportlab.pdfbase.ttfonts import TTFont
from reportlab.pdfbase.pdfmetrics import stringWidth
from reportlab.lib.utils import ImageReader

ROOT=Path(__file__).resolve().parent; ASSET=ROOT/'assets'
OUT=ROOT/'Hurtz_Quebra_de_Objecoes_Consorcio.pdf'; W,H=landscape(A4)
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

def quote(c,x,y,w,h,body,label='MODELO DE ABORDAGEM'):
    rr(c,x,y,w,h,PEACH,O,14,1.5);pill(c,label,x+16,y+h-30,O);text(c,'“'+body+'”',x+18,y+h-59,11.5,BLACK,'AB',w-36,15)

def arrow(c,x1,y1,x2,y2,color=O):
    c.setStrokeColor(color);c.setFillColor(color);c.setLineWidth(2.4);c.line(x1,y1,x2,y2);p=c.beginPath();p.moveTo(x2,y2);p.lineTo(x2-8,y2+4);p.lineTo(x2-8,y2-4);p.close();c.drawPath(p,fill=1,stroke=0)

def check(c,x,y):
    c.setFillColor(GREEN);c.circle(x,y,10,fill=1,stroke=0);c.setStrokeColor(white);c.setLineWidth(1.8);c.line(x-5,y,x-1,y-4);c.line(x-1,y-4,x+6,y+4)

c=canvas.Canvas(str(OUT),pagesize=(W,H),pageCompression=1);c.setTitle('Quebra de Objeções e Conversão de Leads em Consórcio');c.setAuthor('Hurtz Company')

# 1 CAPA
c.setFillColor(white);c.rect(0,0,W,H,fill=1,stroke=0);c.setFillColor(PEACH);c.circle(10,-25,145,fill=1,stroke=0);c.circle(W+15,H+15,155,fill=1,stroke=0)
pill(c,'MATERIAL DE ESTUDO • CONSÓRCIO',48,H-73,BLACK)
text(c,'QUEBRA DE',48,H-135,32,BLACK,'AB');text(c,'OBJEÇÕES',48,H-176,32,O,'AB');text(c,'E CONVERSÃO',48,H-217,24,INK,'AB')
text(c,'Postura, scripts, qualificação e processo comercial.',48,H-251,11,GRAY,'AB',315)
img(c,'capa.png',365,42,455,425);img(c,'logo-hurtz-laranja.png',650,H-154,142,106)
text(c,'Baseado no treinamento comercial de 23 de julho',48,93,9,GRAY);text(c,'HURTZ COMPANY',48,66,8,INK,'AB');c.showPage()

# 2 COMO ESTUDAR
head(c,'01 • Orientação','Como usar este material','Leia os scripts, entenda a intenção e adapte a fala ao perfil do cliente — sem decorar mecanicamente.')
for i,(n,t,b) in enumerate([('1','ENTENDA','Descubra o objetivo da técnica.'),('2','TREINE','Leia em voz alta e ajuste o tom.'),('3','APLIQUE','Teste em conversas reais.'),('4','REGISTRE','Leve objeções novas à mentoria.')]):
    x=42+i*193;rr(c,x,220,173,164,white,LINE);c.setFillColor(O if i%2==0 else INK);c.circle(x+33,349,21,fill=1,stroke=0);text(c,n,x+33,342,18,white,'AB',align='center');text(c,t,x+17,305,12,BLACK,'AB');text(c,b,x+17,277,9.5,GRAY,width=139,leading=13)
rr(c,42,132,752,58,INK,INK);text(c,'REGRA DE ESTUDO',61,165,8,O,'AB');text(c,'A frase é um modelo. A intenção é o que precisa ser dominado.',61,143,12,white,'AB')
page(c,2)

# 3 FRAMEWORK ESCUTA
head(c,'02 • Framework','ESCUTA: o mapa mental da quebra de objeção','Uma sequência para manter calma, investigar a causa e conduzir o próximo passo.')
steps=[('E','ESCUTAR','Não interrompa.'),('S','SEPARAR','Ache a objeção real.'),('C','CONSULTAR','Faça perguntas.'),('U','USAR CONTEXTO','Conecte à realidade.'),('T','TRAVAR O PASSO','Agende com precisão.'),('A','ACOMPANHAR','Confirme e registre.')]
for i,(letter,title_,body) in enumerate(steps):
    col=i%3;row=i//3;x=42+col*252;y=272-row*118;rr(c,x,y,230,95,white,LINE);c.setFillColor(O if i%2==0 else INK);c.circle(x+34,y+51,21,fill=1,stroke=0);text(c,letter,x+34,y+44,17,white,'AB',align='center');text(c,title_,x+68,y+57,10.5,BLACK,'AB');text(c,body,x+68,y+34,9,GRAY,'AB')
rr(c,42,108,734,45,PEACH,PEACH);text(c,'OBJETIVO',61,124,8,O,'AB');text(c,'Trocar reação emocional por diagnóstico e próximo compromisso.',126,123,10.5,BLACK,'AB')
page(c,3)

# 4 POSTURA
head(c,'03 • Postura','Resultado começa antes da ligação','Estudo diário, tom positivo e personalização são comportamentos — não frases prontas.')
img(c,'postura.png',24,112,475,305)
for i,(h,b) in enumerate([('INVISTA EM VOCÊ','Cursos, mentorias e prática constante.'),('USE O NOME','Personalização cria proximidade.'),('CUIDE DO TOM','Energia positiva mesmo em dias difíceis.')]):
    card(c,520,310-i*76,277,65,h,b,O if i!=1 else INK,PEACH if i==0 else white)
rr(c,42,104,456,47,INK,INK);text(c,'SEM ATALHO:',61,121,8,O,'AB');text(c,'quebra de objeção exige treino diário.',137,120,10.5,white,'AB');page(c,4)

# 5 PLANTAR E COLHER
head(c,'04 • Mentalidade','Plantar antes de colher','A primeira conversa vende confiança e próximo passo — não precisa carregar todo o fechamento.')
phases=[('INÍCIO DO MÊS','PLANTAR','Conversar, educar e criar proximidade.'),('MEIO DO CICLO','CULTIVAR','Provas, retornos e qualificação.'),('FINAL DO MÊS','COLHER','Agendar, negociar e fechar.')]
for i,(k,h,b) in enumerate(phases):
    x=55+i*258;c.setFillColor(PEACH);c.circle(x+88,325,52,fill=1,stroke=0);c.setFillColor(O);c.circle(x+88,325,12+10*i,fill=1,stroke=0);text(c,k,x+18,246,8,O,'AB');text(c,h,x+18,219,15,BLACK,'AB');text(c,b,x+18,193,9.5,GRAY,width=175,leading=13)
    if i<2:arrow(c,x+150,325,x+235,325,O)
rr(c,42,110,755,48,INK,INK);text(c,'PONTO-CHAVE',62,128,8,O,'AB');text(c,'Relacionamento prepara o terreno; fechamento acontece quando há confiança e clareza.',151,127,10.5,white,'AB')
page(c,5)

# 6 LEAD CURIOSO
head(c,'05 • Lead curioso','“Cliquei sem querer” não encerra a conversa','A negativa pode significar falta de tempo, defesa ou ausência de contexto. Responda com calma e proponha um próximo momento.')
img(c,'cliquei-sem-querer.png',25,115,470,300)
quote(c,520,249,278,140,'Sei que talvez você não possa falar agora. Posso te ligar em outro momento? Tenho duas opções de horário para você.')
rr(c,520,145,278,78,white,LINE);text(c,'NÃO CONFRONTE',538,194,8,RED,'AB');text(c,'Reconheça o momento, preserve a relação e reagende.',538,170,10,BLACK,'AB',240,13)
page(c,6)

# 7 CONSULTIVO X IMPACTO
head(c,'06 • Contexto','Consultivo e impacto usam a mesma base','O momento da qualificação muda; velocidade, CRM e disciplina continuam obrigatórios.')
card(c,42,205,340,180,'VENDA CONSULTIVA','Qualificação acontece ao longo da conversa. Priorize escuta, educação curta e descoberta gradual.',O,PEACH)
card(c,458,205,340,180,'VENDA DE IMPACTO','O lead chega por um bem específico. Antecipe parcela, entrada, prazo e aderência para não perder energia.',INK,PALE)
arrow(c,390,295,448,295,O)
rr(c,145,120,550,55,INK,INK);text(c,'BASE COMUM',165,152,8,O,'AB');text(c,'Resposta rápida • registro • troca de vendedor • próximo passo',165,131,11,white,'AB')
page(c,7)

# 8 FOLLOW-UP
head(c,'07 • Follow-up','Personalização em cada tentativa','Mensagens individuais devem recuperar algo que o cliente já disse. Repetição genérica vira ruído.')
img(c,'follow-up.png',22,106,470,315)
quote(c,520,251,278,139,'Vi que talvez não seja o momento. Vou parar por aqui para não incomodar. Se mudar de ideia, pode me chamar.')
rr(c,520,145,278,79,PEACH,PEACH);text(c,'FUNÇÃO DO ENCERRAMENTO',538,196,8,O,'AB');text(c,'Filtrar: quem justifica continua ativo; quem confirma o desinteresse sai do fluxo.',538,173,9.5,BLACK,'AB',240,12)
page(c,8)

# 9 INVESTIGAR
head(c,'08 • Diagnóstico','Não aceite a justificativa sem investigar','Pessoas gostam de ser escutadas. O vendedor consulta como um detetive: sem acusar, sem adivinhar.')
img(c,'investigar.png',24,108,470,310)
quote(c,520,265,278,126,'O que aconteceu? Foi a entrada, a parcela, o prazo ou alguma outra coisa? Conta para mim.')
for i,s in enumerate(['Entrada disponível','Parcela confortável','Prazo e urgência','Tomador da decisão']):
    check(c,541,228-i*27);text(c,s,562,224-i*27,9.5,BLACK,'AB')
page(c,9)

# 10 FLUXO DA CONVERSA
head(c,'09 • Simulação','Do anúncio ao compromisso','O atendimento avança em blocos. Cada bloco tem uma pergunta e uma saída clara.')
flow=[('1','RELEMBRAR','“Você se recorda do anúncio?”'),('2','ACOLHER','“Está ocupada agora?”'),('3','QUALIFICAR','Bairro, parcela e entrada.'),('4','AGENDAR','Ofereça dois horários.'),('5','CONFIRMAR','Decisor e presença.')]
for i,(n,h,b) in enumerate(flow):
    x=35+i*160;rr(c,x,210,145,180,white,LINE);c.setFillColor(O if i%2==0 else INK);c.circle(x+28,353,19,fill=1,stroke=0);text(c,n,x+28,347,15,white,'AB',align='center');text(c,h,x+15,309,11,BLACK,'AB');text(c,b,x+15,283,9,GRAY,width=114,leading=12)
    if i<4:arrow(c,x+146,300,x+158,300,O)
rr(c,42,126,754,53,PEACH,PEACH);text(c,'NÃO PERGUNTE',61,156,8,RED,'AB');text(c,'“Quando você pode?”',61,137,10,BLACK,'AB');text(c,'OFEREÇA',280,156,8,GREEN,'AB');text(c,'“Sexta às 9h45 ou às 15h45?”',280,137,10,BLACK,'AB')
page(c,10)

# 11 QUALIFICAÇÃO E AGENDA
head(c,'10 • Compromisso','Qualifique antes de aprofundar no bem','Evite buscar a solução errada: alinhe capacidade, preferência, decisor e próximo horário.')
img(c,'agendamento.png',23,108,475,311)
for i,(h,b) in enumerate([('PREFERÊNCIA','Bairro ou tipo de bem.'),('CAPACIDADE','Parcela e entrada.'),('DECISOR','Cônjuge ou sócio presente.'),('AGENDA','Duas opções exatas.')]):
    card(c,520+(i%2)*140,304-(i//2)*106,130,91,h,b,O if i%2==0 else INK,PEACH if i==0 else white)
page(c,11)

# 12 CONFIRMAÇÃO
head(c,'11 • Confirmação','Agendamento só existe com compromisso','Confirme presença, decisor e horário; reforce próximo à reunião.')
rows=[('NO AGENDAMENTO','Data • hora • objetivo • decisor'),('NO DIA','Relembre o benefício da conversa'),('30 MIN ANTES','Confirme presença e chegada'),('SE NÃO CONFIRMAR','Trate como risco de no-show')]
for i,(h,b) in enumerate(rows):
    y=344-i*66;c.setFillColor(O if i==0 else PEACH);c.circle(72,y,18,fill=1,stroke=0);text(c,str(i+1),72,y-6,13,white if i==0 else O,'AB',align='center');text(c,h,110,y+4,10,BLACK,'AB');text(c,b,110,y-17,9.5,GRAY)
rr(c,475,172,320,212,INK,INK);text(c,'TOMADOR DA DECISÃO',497,350,9,O,'AB');text(c,'Nunca avance sozinho',497,309,22,white,'AB');text(c,'quando outra pessoa precisa aprovar.',497,281,11,white,'AB');text(c,'Inclua o decisor no próximo compromisso.',497,228,10,O,'AB',260,14)
page(c,12)

# 13 CRM
head(c,'12 • Processo','Técnica sem processo não escala','O CRM sustenta velocidade, distribuição, persistência e aprendizado do time.')
img(c,'crm.png',24,110,475,309)
items=[('ATÉ 5 MIN','Primeiro contato'),('5 DIAS','Tentativas antes da troca'),('8–13','Pontos de contato'),('NOVO VENDEDOR','Nova abordagem')]
for i,(h,b) in enumerate(items):
    x=520+(i%2)*140;y=304-(i//2)*103;card(c,x,y,130,88,h,b,O if i!=3 else INK,PEACH if i==0 else white)
page(c,13)

# 14 INDICADORES E GOVERNANÇA
head(c,'13 • Gestão','Dados transformam objeção em melhoria','O resultado citado no treinamento serve como referência de evolução — não como teto automático.')
rr(c,42,205,350,180,INK,INK);text(c,'TAXA DE RESPOSTA RELATADA',63,352,9,O,'AB');text(c,'40%',63,292,34,white,'AB');arrow(c,162,303,240,303,O);text(c,'70%',257,292,34,O,'AB');text(c,'após mudanças de processo',63,239,10,white,'AB')
for i,(h,b) in enumerate([('SEGMENTAÇÃO','Anúncio fora do padrão deve ser investigado.'),('POLÍTICAS','Múltiplos canais exigem regras internas e proteção de dados.'),('MENTORIA','Leve objeções recorrentes e casos que o script não resolveu.')]):
    card(c,430,310-i*73,367,62,h,b,O if i!=1 else RED,white)
page(c,14)

# 15 CHECKLIST
head(c,'14 • Checklist','Antes de encerrar o dia','Use esta página como conferência operacional do vendedor.')
checks=['Respondi leads novos em até 5 minutos.','Usei o nome do cliente e personalizei a conversa.','Investiguei a causa por trás do “não tenho interesse”.','Qualifiquei parcela, entrada, preferência e decisor.','Fiz follow-up individualizado e registrei cada tentativa.','Ofereci dois horários concretos.','Confirmei presença e tomador da decisão.','Separei objeções não resolvidas para a próxima mentoria.']
for i,s in enumerate(checks):
    col=i%2;row=i//2;x=55+col*390;y=359-row*61;check(c,x,y);text(c,s,x+22,y-4,9.5,BLACK,'AB',330,12)
rr(c,42,103,754,45,INK,INK);text(c,'SE NÃO ESTÁ REGISTRADO,',62,119,9,O,'AB');text(c,'não vira dado, aprendizado nem melhoria de processo.',222,119,10.5,white,'AB')
page(c,15)

# 16 FINAL
c.setFillColor(INK);c.rect(0,0,W,H,fill=1,stroke=0);text(c,'QUEBRA DE OBJEÇÃO',52,H-105,10,O,'AB');text(c,'não é vencer',52,H-158,31,white,'AB');text(c,'uma discussão.',52,H-198,31,O,'AB');text(c,'É entender o que impede a decisão e conduzir o próximo passo.',52,H-246,12,white,'AB',430,17)
rr(c,52,120,520,78,HexColor('#242743'),HexColor('#3A3E60'));text(c,'ESCUTA',73,166,9,O,'AB');text(c,'Escutar • Separar • Consultar • Usar contexto • Travar • Acompanhar',73,140,10,white,'AB')
img(c,'logo-hurtz-laranja.png',650,35,140,104);text(c,'HURTZ COMPANY  •  TREINAMENTO COMERCIAL',52,36,8,white,'AB');c.save();print(OUT)
