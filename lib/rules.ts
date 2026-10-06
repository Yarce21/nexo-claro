import { readFileSync, writeFileSync, renameSync } from 'node:fs';
import { createHash } from 'node:crypto';
import path from 'node:path';
import { rulesSchema, type Rules } from './types';
export const rulesPath = process.env.RULES_PATH || path.join(process.cwd(), 'config', 'rules.json');
export function ruleVersion(rules: Rules) { return createHash('sha256').update(JSON.stringify(rules)).digest('hex').slice(0, 12); }
export function loadRules(): Rules { return rulesSchema.parse(JSON.parse(readFileSync(/* turbopackIgnore: true */ rulesPath, 'utf8'))); }
export function saveRules(input: unknown): Rules {
  const rules = rulesSchema.parse(input);
  const temporary = `${rulesPath}.tmp`;
  writeFileSync(temporary, JSON.stringify(rules, null, 2) + '\n');
  renameSync(temporary, rulesPath);
  return rules;
}
