export type Cue={start:number;end:number;text:string};
const f=(s:number)=>Math.round(s*30);
export const cues:Cue[]=[
 [0.23,2.24,'Essa é a oportunidade\npara você.'],[2.28,4.23,'O nosso Botox Day\nestá chegando'],[4.52,5.95,'e Botox não precisa'],
 [5.96,7.15,'transformar seu rosto'],[7.36,10.58,'e muito menos deixar você\ncom aparência congelada.'],[10.64,12.81,'Quando bem indicado\ne bem aplicado,'],
 [12.81,14.51,'ele suaviza essas marcas'],[14.59,17.14,'e deixa a expressão\nainda mais leve'],[17.48,20.37,'e ainda ajuda a evitar\nessas linhas de movimento'],
 [20.37,22.43,'para que não fiquem\nmais profundas.'],[22.72,26.31,'Eu faço questão de avaliar\ncada rosto individualmente,'],[26.31,29.28,'porque não existe uma dose\nigual para todo mundo.'],
 [29.64,32.61,'Mas presta atenção:\neu preparei uma condição'],[32.77,34.72,'muito especial para\nesse Botox Day.'],
 [42.07,45.30,'Mas são poucas vagas\nnessa condição.'],[45.30,47.41,'Me manda agora\na palavra BOTOX'],[47.44,49.44,'no Direct ou no WhatsApp,'],
 [49.44,52.89,'que minha equipe vai te passar\nos horários disponíveis.'],[52.89,55.67,'Eu já vou garantir o meu,\nporque eu estou precisando'],
 [55.94,58.86,'para não entregar\nminha idade.'],[59.05,61.20,'Agora falta só você\ngarantir o seu.']
].map(([start,end,text])=>({start:f(start as number),end:f(end as number),text:text as string}));
