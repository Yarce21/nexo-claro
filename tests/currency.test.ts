import { test } from 'node:test';
import assert from 'node:assert/strict';
import { classify, normalize } from '../lib/classifier';
import { loadRules } from '../lib/rules';
const rules=loadRules();
test('moneda: rechaza códigos, símbolos y calificativos no USD antes y después del monto',()=>{
 const phrases=['I owe 18000 CHF on a credit card','debo 18000 libras en tarjeta','I owe £18000','debo €18000','debo ¥18000','I owe 18000 CAD','18000 MXN','C$18000'];
 for(const code of ['CAD','CHF','GBP','EUR','MXN','COP','JPY','CNY','ARS','BRL','AUD','PEN','ABC'])for(const c of [code,code.toLowerCase()])phrases.push('I owe '+c+' 18000 on a credit card','debo 18000 '+c+' en tarjeta');
 for(const symbol of ['€','£','¥','₣','₩','₹','₽','C$','A$','CA$','MX$'])phrases.push('I owe '+symbol+'18000 on a credit card');
 for(const word of ['euros','libras','pounds','francos','francs','yenes','yen','pesos','reales','soles','dólares canadienses','dolares australianos','canadian dollars','australian dollars'])phrases.push('debo 18000 '+word,'I owe 18000 '+word);
 for(const message of phrases){const r=classify(message,rules);assert.equal(r.decision,'escalar_humano',message);assert.match(r.reason,/moneda/i,message);assert.equal(r.qualification.amount,null,message);}
});
test('moneda: USD, dólares sin calificativo y monto sin moneda mantienen respuesta',()=>{
 for(const message of ['I owe 18000 USD','debo 18000 dólares','debo 18000 dolares','I owe $18000','I owe US$18000','I owe 18000 dollars','debo 18000','debo 18 mil','I owe 18k','I owe 18000 and can talk','debo 18000 en tarjeta y copio el dato']) {
  const r=classify(message,rules);assert.equal(r.decision,'responder',message);assert.equal(r.qualification.amount,18000,message);
 }
});
test('moneda: la normalización conserva símbolos y no confunde palabras comunes con códigos',()=>{
 for(const symbol of ['€','£','¥','₣','₩','₹','₽','$'])assert.ok(normalize(symbol).includes(symbol),symbol);
 for(const message of ['Hola copio el mensaje','Hello I can talk','Hola mil gracias','Hello feedback rated separate stopover','Hola gbptexto'])assert.equal(classify(message,rules).decision,'responder',message);
 assert.equal(classify('Hola GBP',rules).decision,'escalar_humano');
});
