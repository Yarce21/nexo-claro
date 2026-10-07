import {test} from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {dictionaries} from '../lib/i18n';

test('funnel ES/EN distingue histórico y referencia sin cohorte',()=>{
 const keys=['Inscripciones del partner conciliadas (histórico)','Inscripciones válidas ÷ leads recibidos (referencia; no es una cohorte)','El CSV del partner es histórico y no proviene de las transferencias de esta demo. Las etapas no forman una cohorte secuencial.'];
 const page=readFileSync('app/page.tsx','utf8');
 for(const key of keys){assert.equal(dictionaries.es[key],key);assert.ok(dictionaries.en[key]);assert.notEqual(dictionaries.en[key],key);assert.ok(page.includes(key));}
 assert.match(dictionaries.en[keys[0]],/historical/i);
 assert.match(dictionaries.en[keys[1]],/reference.*cohort/i);
});
