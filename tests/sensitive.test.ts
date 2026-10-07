import {test} from 'node:test';
import assert from 'node:assert/strict';
import {classify} from '../lib/classifier';
import {loadRules} from '../lib/rules';
const rules=loadRules();
const es=['tasa','tasas','tasa de interés','tarifa','tarifas','comisión','comisiones','cuota administrativa','cuotas administrativas','puntaje','puntajes','demanda','demandas','demandar','embargo','embargos','abogado','abogados','fraude','fraudes','estafa','estafas','garantizado','garantía','garantizamos'];
const en=['rate','rates','interest rate','interest rates','fee','fees','lawsuit','lawsuits','sue','attorney','attorneys','lawyer','lawyers','foreclosure','foreclosures','scam','scams','guarantee','guaranteed','credit score','credit scores','score','scores'];
test('sensibles ES/EN: singular, plural y sinónimos activan handoff explícito',()=>{
 for(const [prefix,words] of [['Hola, ',es],['Hello, ',en]] as const)for(const word of words){const message=prefix+word;const r=classify(message,rules);assert.equal(r.decision,'escalar_humano',message);assert.match(r.reason,/sensible/i,message);}
 for(const message of ['¿cuáles son las tarifas?','what are the fees?','they filed lawsuits','me cobran tasas altas']){const r=classify(message,rules);assert.equal(r.decision,'escalar_humano',message);assert.match(r.reason,/sensible/i,message);}
});
test('protección mínima no se elimina al vaciar reglas editables',()=>{
 const empty={...rules,handoffWords:[],handoffWordsEn:[]};
 for(const word of es)assert.match(classify('Hola '+word,empty).reason,/sensible/i,word);
 for(const word of en)assert.match(classify('Hello '+word,empty).reason,/sensible/i,word);
});
test('palabras editables generan s/es/ies manteniendo límites de palabra',()=>{
 const custom={...rules,handoffWords:['consulta'],handoffWordsEn:['policy','box']};
 for(const message of ['Hola consultas','Hola consultaes','Hello policies','Hello boxes'])assert.match(classify(message,custom).reason,/sensible/i,message);
 for(const message of ['Hola casa','Hello feedback','Hello stopover','Hello rated','Hello separate','Hola consultacion','Hello policyholder'])assert.equal(classify(message,custom).decision,'responder',message);
});
