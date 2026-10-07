import {test} from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync,readdirSync} from 'node:fs';
import path from 'node:path';
function files(directory:string):string[]{return readdirSync(directory,{withFileTypes:true}).flatMap(e=>e.isDirectory()?files(path.join(directory,e.name)):[path.join(directory,e.name)])}
test('marca: todas las fuentes usan la identidad vigente',()=>{
 const previous = new RegExp(['alivio','norte'].join('[ -]?'),'i');
 const sources=['lib','app','config','data','docs','tests','scripts'].flatMap(files).filter(f=>/\.(?:tsx?|json|md|mjs|css)$/.test(f));
 sources.push('README.md','package.json','package-lock.json','.gitignore');
 for(const file of sources)assert.equal(previous.test(readFileSync(file,'utf8')),false,file);
});
