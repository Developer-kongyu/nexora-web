import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import { createRequire } from 'node:module';

const require = createRequire(import.meta.url);
const ts = require('typescript');

const root = process.argv[2] ? path.resolve(process.argv[2]) : process.cwd();
const srcRoot = path.join(root, 'src');
const excluded = new Set(['node_modules', 'dist', 'coverage', 'storybook-static', 'playwright-report', 'test-results']);
function walk(dir) {
  if (!fs.existsSync(dir)) return [];
  const out = [];
  for (const e of fs.readdirSync(dir, { withFileTypes: true })) {
    if (excluded.has(e.name)) continue;
    const p = path.join(dir, e.name);
    if (e.isDirectory()) out.push(...walk(p));
    else if (/\.(?:ts|tsx)$/.test(p)) out.push(p);
  }
  return out;
}
function rel(file) { return path.relative(root, file).replaceAll(path.sep, '/'); }
function lineOf(sf, node) { return sf.getLineAndCharacterOfPosition(node.getStart(sf)).line + 1; }
function normalizeText(text) {
  return text
    .replace(/\/\*[\s\S]*?\*\//g, '')
    .replace(/\/\/[^\n\r]*/g, '')
    .replace(/\s+/g, '')
    .replace(/;+/g, ';');
}
function hash(value) { return crypto.createHash('sha256').update(value).digest('hex').slice(0, 16); }
function isProd(file) {
  const r = rel(file);
  return !/(?:^|\/)(?:test|mocks)(?:\/|$)/.test(r)
    && !/\.(?:test|spec|stories)\.(?:ts|tsx)$/.test(r)
    && !r.includes('/generated/');
}
function isExported(node) {
  return !!node.modifiers?.some((m) => m.kind === ts.SyntaxKind.ExportKeyword || m.kind === ts.SyntaxKind.DefaultKeyword);
}
function declarationName(node) {
  return node.name && ts.isIdentifier(node.name) ? node.name.text : null;
}
function typeMemberCanonical(member, sf) {
  if (ts.isPropertySignature(member)) {
    const name = member.name?.getText(sf) ?? '';
    const optional = member.questionToken ? '?' : '';
    const readonly = member.modifiers?.some((m) => m.kind === ts.SyntaxKind.ReadonlyKeyword) ? 'readonly ' : '';
    return `${readonly}${name}${optional}:${normalizeText(member.type?.getText(sf) ?? 'unknown')}`;
  }
  if (ts.isMethodSignature(member)) {
    return `method:${normalizeText(member.getText(sf))}`;
  }
  if (ts.isIndexSignatureDeclaration(member)) return `index:${normalizeText(member.getText(sf))}`;
  if (ts.isCallSignatureDeclaration(member)) return `call:${normalizeText(member.getText(sf))}`;
  return normalizeText(member.getText(sf));
}
function declarationCanonical(node, sf) {
  if (ts.isInterfaceDeclaration(node)) {
    const heritage = (node.heritageClauses ?? []).map((h) => normalizeText(h.getText(sf))).sort();
    const members = node.members.map((m) => typeMemberCanonical(m, sf)).sort();
    return `interface|${heritage.join(',')}|${members.join('|')}`;
  }
  if (ts.isTypeAliasDeclaration(node)) {
    return `type|${normalizeText(node.type.getText(sf))}`;
  }
  if (ts.isEnumDeclaration(node)) {
    const members = node.members.map((m) => `${m.name.getText(sf)}=${normalizeText(m.initializer?.getText(sf) ?? '')}`);
    return `enum|${members.join('|')}`;
  }
  return null;
}
function containingName(node) {
  let p = node.parent;
  while (p) {
    if ((ts.isTypeAliasDeclaration(p) || ts.isInterfaceDeclaration(p) || ts.isFunctionDeclaration(p) || ts.isMethodDeclaration(p) || ts.isVariableDeclaration(p) || ts.isPropertyDeclaration(p)) && p.name) {
      return p.name.getText();
    }
    p = p.parent;
  }
  return '<module>';
}
function literalUnionSignature(node) {
  if (!ts.isUnionTypeNode(node)) return null;
  const literals = [];
  for (const t of node.types) {
    if (ts.isLiteralTypeNode(t) && (ts.isStringLiteral(t.literal) || ts.isNumericLiteral(t.literal) || t.literal.kind === ts.SyntaxKind.TrueKeyword || t.literal.kind === ts.SyntaxKind.FalseKeyword)) {
      literals.push(t.getText());
    } else {
      return null;
    }
  }
  if (literals.length < 2) return null;
  return literals.sort().join('|');
}
function staticInitializerCanonical(init, sf) {
  if (!init) return null;
  if (!ts.isArrayLiteralExpression(init) && !ts.isObjectLiteralExpression(init)) return null;
  const text = normalizeText(init.getText(sf));
  return text.length >= 35 ? text : null;
}
function collectFunctionInfo(node, sf, file) {
  let name = null;
  let body = null;
  let params = [];
  if (ts.isFunctionDeclaration(node) && node.body) {
    name = node.name?.text ?? '<anonymous>';
    body = node.body;
    params = node.parameters;
  } else if (ts.isMethodDeclaration(node) && node.body) {
    name = node.name.getText(sf);
    body = node.body;
    params = node.parameters;
  } else if (ts.isVariableDeclaration(node) && node.initializer && (ts.isArrowFunction(node.initializer) || ts.isFunctionExpression(node.initializer))) {
    name = node.name.getText(sf);
    body = node.initializer.body;
    params = node.initializer.parameters;
  } else return null;
  const raw = normalizeText(body.getText(sf));
  if (raw.length < 45) return null;
  let nodeCount = 0;
  const shape = [];
  function visit(n) {
    nodeCount += 1;
    if (ts.isIdentifier(n)) {
      // Preserve property names, JSX identifiers and declaration names only where they convey an API contract.
      if (ts.isPropertyAccessExpression(n.parent) && n.parent.name === n) shape.push(`PROP:${n.text}`);
      else if (ts.isPropertyAssignment(n.parent) && n.parent.name === n) shape.push(`KEY:${n.text}`);
      else if (ts.isJsxAttribute(n.parent) || ts.isJsxOpeningElement(n.parent) || ts.isJsxClosingElement(n.parent) || ts.isJsxSelfClosingElement(n.parent)) shape.push(`JSX:${n.text}`);
      else shape.push('ID');
    } else if (ts.isStringLiteralLike(n)) shape.push(`STR:${n.text}`);
    else if (ts.isNumericLiteral(n)) shape.push(`NUM:${n.text}`);
    else if (n.kind === ts.SyntaxKind.TrueKeyword) shape.push('BOOL:true');
    else if (n.kind === ts.SyntaxKind.FalseKeyword) shape.push('BOOL:false');
    else shape.push(ts.SyntaxKind[n.kind]);
    ts.forEachChild(n, visit);
  }
  visit(body);
  if (nodeCount < 18) return null;
  return {
    file: rel(file),
    line: lineOf(sf, node),
    name,
    params: params.length,
    rawLength: raw.length,
    nodeCount,
    exact: raw,
    shape: shape.join('|'),
  };
}

const files = walk(srcRoot);
const declarations = [];
const literalUnions = [];
const staticConstants = [];
const functions = [];
for (const file of files) {
  if (!isProd(file)) continue;
  const text = fs.readFileSync(file, 'utf8');
  const sf = ts.createSourceFile(file, text, ts.ScriptTarget.Latest, true, file.endsWith('.tsx') ? ts.ScriptKind.TSX : ts.ScriptKind.TS);
  function visit(node) {
    if (ts.isInterfaceDeclaration(node) || ts.isTypeAliasDeclaration(node) || ts.isEnumDeclaration(node)) {
      const name = declarationName(node);
      const canonical = declarationCanonical(node, sf);
      if (name && canonical) declarations.push({
        file: rel(file), line: lineOf(sf, node), kind: ts.SyntaxKind[node.kind], name,
        exported: isExported(node), canonical, canonicalHash: hash(canonical), length: canonical.length,
      });
    }
    const unionSig = literalUnionSignature(node);
    if (unionSig) literalUnions.push({
      file: rel(file), line: lineOf(sf, node), context: containingName(node), signature: unionSig, hash: hash(unionSig), count: node.types.length,
    });
    if (ts.isVariableDeclaration(node) && ts.isIdentifier(node.name)) {
      const canonical = staticInitializerCanonical(node.initializer, sf);
      if (canonical) staticConstants.push({
        file: rel(file), line: lineOf(sf, node), name: node.name.text, canonical, hash: hash(canonical), length: canonical.length,
      });
    }
    const fn = collectFunctionInfo(node, sf, file);
    if (fn) functions.push(fn);
    ts.forEachChild(node, visit);
  }
  visit(sf);
}
function group(items, keyFn, min = 2) {
  const m = new Map();
  for (const item of items) {
    const key = keyFn(item);
    if (!m.has(key)) m.set(key, []);
    m.get(key).push(item);
  }
  return [...m.entries()].filter(([, group]) => group.length >= min).map(([key, group]) => ({ key, group }));
}
const duplicateExportedNames = group(declarations.filter((d) => d.exported), (d) => d.name)
  .filter(({group}) => new Set(group.map((x) => x.file)).size > 1);
const duplicateDeclarationStructures = group(declarations.filter((d) => d.canonical.length >= 35), (d) => d.canonical)
  .filter(({group}) => new Set(group.map((x) => x.file)).size > 1)
  .map(({key, group}) => ({ hash: hash(key), canonical: key.slice(0, 400), group }));
const repeatedLiteralUnions = group(literalUnions, (u) => u.signature)
  .filter(({group}) => new Set(group.map((x) => x.file)).size > 1)
  .map(({key, group}) => ({ signature: key, group }));
const duplicateStaticConstants = group(staticConstants, (x) => x.canonical)
  .filter(({group}) => new Set(group.map((x) => x.file)).size > 1)
  .map(({key, group}) => ({ hash: hash(key), canonical: key.slice(0, 500), group }));
const exactFunctionClones = group(functions, (f) => f.exact)
  .filter(({group}) => new Set(group.map((x) => x.file)).size > 1)
  .map(({key, group}) => ({ hash: hash(key), group }));
const shapedFunctionClones = group(functions.filter((f) => f.nodeCount >= 28), (f) => `${f.params}|${f.shape}`)
  .filter(({group}) => new Set(group.map((x) => x.file)).size > 1)
  .map(({key, group}) => ({ hash: hash(key), group }));
const policyViolations = [];
for (const file of files) {
  const relativePath = rel(file);
  const text = fs.readFileSync(file, 'utf8');
  if (/^src\/domains\/.+\/api\/.+\.ts$/.test(relativePath)
    && !/\.(?:test|spec)\.ts$/.test(relativePath)
    && text.includes('new URLSearchParams')) {
    policyViolations.push({ file: relativePath, rule: 'API 查询参数必须复用 shared/api/query' });
  }
  if (relativePath !== 'src/shared/lib/clipboard.ts'
    && text.includes('navigator.clipboard.writeText')) {
    policyViolations.push({ file: relativePath, rule: '剪贴板写入必须复用 shared/lib/clipboard' });
  }
  if (isProd(file) && /queryKey\s*:\s*\[/.test(text)) {
    policyViolations.push({
      file: relativePath,
      rule: 'Query Key 必须复用领域 model/queryKeys，禁止在调用点手写数组',
    });
  }
  if (/\.(?:test|spec)\.(?:ts|tsx)$/.test(relativePath) && /function\s+ok\s*\(/.test(text)) {
    policyViolations.push({ file: relativePath, rule: 'API 测试成功响应必须复用 src/test/http' });
  }
  if (text.includes('useCommunityImageSelection')) {
    policyViolations.push({ file: relativePath, rule: '图片选择必须复用 domains/media 公共能力' });
  }
}

const report = {
  productionFiles: files.filter(isProd).length,
  declarations: declarations.length,
  literalUnions: literalUnions.length,
  staticConstants: staticConstants.length,
  functions: functions.length,
  duplicateExportedNames,
  duplicateDeclarationStructures,
  repeatedLiteralUnions,
  duplicateStaticConstants,
  exactFunctionClones,
  shapedFunctionClones,
  policyViolations,
};

const blockingGroups = [
  ...duplicateExportedNames,
  ...duplicateDeclarationStructures,
  ...repeatedLiteralUnions,
  ...duplicateStaticConstants,
  ...exactFunctionClones,
  ...shapedFunctionClones,
];

if (blockingGroups.length > 0 || policyViolations.length > 0) {
  console.error('复用检查失败：发现重复实现或绕过公共能力。');
  console.error(JSON.stringify(report, null, 2));
  process.exit(1);
}

console.log(
  `复用检查通过：${report.productionFiles} 个生产文件，未发现重复类型/枚举、常量、函数或公共能力绕过。`,
);
