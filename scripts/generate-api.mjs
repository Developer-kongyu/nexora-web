import { execFileSync } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';

const source = process.argv[2] || process.env.OPENAPI_SCHEMA || './openapi.json';
const output = path.resolve('src/shared/api/generated/openapi.d.ts');
if (!fs.existsSync(source) && !/^https?:\/\//.test(source)) {
  console.error(`OpenAPI schema 不存在：${source}`);
  process.exit(1);
}
fs.mkdirSync(path.dirname(output), { recursive: true });
execFileSync(
  process.execPath,
  ['./node_modules/openapi-typescript/bin/cli.js', source, '--output', output],
  { stdio: 'inherit' },
);
