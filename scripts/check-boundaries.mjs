import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import ts from 'typescript';

const layers = ['shared', 'domains', 'features', 'widgets', 'pages', 'app'];
// Only read composition is allowed across domains. See docs/ARCHITECTURE.md.
export const domainReads = {
  auth: { users: ['api', 'model'] },
  posts: { users: ['model'] },
  communities: { posts: ['model', 'lib'], users: ['model'] },
  feed: { posts: ['api', 'model', 'lib'], media: ['model'], communities: ['model'] },
  settings: { permissions: ['model'] },
  library: { posts: ['api', 'model'] },
  search: { posts: ['api', 'model', 'lib'], communities: ['model', 'lib'], users: ['model'] },
};
const extensions = ['.ts', '.tsx', '.mts', '.cts'];
const normalize = (value) => value.replaceAll(path.sep, '/');
const auxiliary = (file) =>
  /^(?:mocks|test)\//.test(file) || /\.(?:test|spec|stories)\.[cm]?tsx?$/.test(file);
const walk = (dir) =>
  fs.existsSync(dir)
    ? fs.readdirSync(dir, { withFileTypes: true }).flatMap((entry) => {
        const file = path.join(dir, entry.name);
        return entry.isDirectory()
          ? walk(file)
          : extensions.some((ext) => file.endsWith(ext))
            ? [file]
            : [];
      })
    : [];
function identity(file) {
  const [layer, slice] = file.split('/');
  return {
    layer,
    module: ['domains', 'features', 'widgets', 'pages'].includes(layer)
      ? `${layer}/${slice}`
      : layer,
  };
}
function publicEntry(file, module) {
  const tail = file.slice(module.length + 1);
  if (tail === 'index.ts') return 'root';
  const match = /^(model|queries|api|lib)\/index\.ts$/.exec(tail);
  return match?.[1];
}
function cycles(graph) {
  const active = new Set();
  const done = new Set();
  const stack = [];
  const found = [];
  function visit(node) {
    if (active.has(node)) {
      found.push([...stack.slice(stack.indexOf(node)), node]);
      return;
    }
    if (done.has(node)) return;
    active.add(node);
    stack.push(node);
    for (const dependency of graph.get(node) ?? []) visit(dependency);
    stack.pop();
    active.delete(node);
    done.add(node);
  }
  for (const node of graph.keys()) visit(node);
  return found;
}
function dependencies(sf) {
  const entries = [];
  function visit(node) {
    if (
      (ts.isImportDeclaration(node) || ts.isExportDeclaration(node)) &&
      node.moduleSpecifier &&
      ts.isStringLiteral(node.moduleSpecifier)
    ) {
      entries.push({ node, specifier: node.moduleSpecifier.text, dynamic: false });
    } else if (
      ts.isCallExpression(node) &&
      (node.expression.kind === ts.SyntaxKind.ImportKeyword ||
        (ts.isIdentifier(node.expression) && node.expression.text === 'require')) &&
      node.arguments.length === 1 &&
      ts.isStringLiteralLike(node.arguments[0])
    ) {
      entries.push({
        node,
        specifier: node.arguments[0].text,
        dynamic: node.expression.kind === ts.SyntaxKind.ImportKeyword,
      });
    } else if (
      ts.isImportTypeNode(node) &&
      ts.isLiteralTypeNode(node.argument) &&
      ts.isStringLiteral(node.argument.literal)
    ) {
      entries.push({ node, specifier: node.argument.literal.text, dynamic: false });
    } else if (
      ts.isImportEqualsDeclaration(node) &&
      ts.isExternalModuleReference(node.moduleReference) &&
      node.moduleReference.expression &&
      ts.isStringLiteral(node.moduleReference.expression)
    ) {
      entries.push({ node, specifier: node.moduleReference.expression.text, dynamic: false });
    }
    ts.forEachChild(node, visit);
  }
  visit(sf);
  return entries;
}
function guardedMockImport(sf, node) {
  // This one bootstrap exception is deliberately narrow: no synchronous or unguarded import.
  let enclosing = node.parent;
  while (enclosing && !ts.isFunctionDeclaration(enclosing)) enclosing = enclosing.parent;
  if (enclosing?.name?.text !== 'enableMocking' || !enclosing.body) return false;
  const before = enclosing.body.statements.filter((statement) => statement.end < node.pos);
  const mode = before.some(
    (statement) =>
      ts.isVariableStatement(statement) &&
      statement.declarationList.declarations.some(
        (declaration) =>
          declaration.name.getText(sf) === 'mockMode' &&
          declaration.initializer?.getText(sf).replace(/\s/g, '') ===
            "import.meta.env.DEV||import.meta.env.MODE==='test'",
      ),
  );
  const guard = before.some(
    (statement) =>
      ts.isIfStatement(statement) &&
      statement.expression.getText(sf).replace(/\s/g, '') === '!mockMode||!env.VITE_ENABLE_MOCK' &&
      (ts.isReturnStatement(statement.thenStatement) ||
        (ts.isBlock(statement.thenStatement) &&
          statement.thenStatement.statements.length === 1 &&
          ts.isReturnStatement(statement.thenStatement.statements[0]))),
  );
  return mode && guard;
}
export function checkBoundaries(root) {
  const src = path.join(root, 'src');
  const configPath = ts.findConfigFile(root, ts.sys.fileExists, 'tsconfig.app.json');
  const config = configPath ? ts.readConfigFile(configPath, ts.sys.readFile).config : {};
  const options = ts.parseJsonConfigFileContent(config, ts.sys, root).options;
  const diagnostics = [];
  const graph = new Map();
  const modules = new Map();
  const files = walk(src);
  const report = (file, sf, node, rule) =>
    diagnostics.push(
      `${file}:${sf.getLineAndCharacterOfPosition(node.getStart(sf)).line + 1} ${rule}`,
    );
  for (const full of files) {
    const file = normalize(path.relative(src, full));
    if (file.includes('/generated/') || auxiliary(file)) continue;
    const from = identity(file);
    const sf = ts.createSourceFile(
      full,
      fs.readFileSync(full, 'utf8'),
      ts.ScriptTarget.Latest,
      true,
    );
    graph.set(file, new Set());
    for (const entry of dependencies(sf)) {
      const { specifier, node } = entry;
      let resolved = ts.resolveModuleName(specifier, full, options, ts.sys).resolvedModule
        ?.resolvedFileName;
      // CSS Module imports are also architectural dependencies.
      if (!resolved && /\.css$/.test(specifier)) {
        const candidate = specifier.startsWith('@/')
          ? path.join(src, specifier.slice(2))
          : path.resolve(path.dirname(full), specifier);
        if (fs.existsSync(candidate)) resolved = candidate;
      }
      if (!resolved) {
        if (specifier.startsWith('.') || specifier.startsWith('@/'))
          report(file, sf, node, `unresolved local import: ${specifier}`);
        continue;
      }
      const target = normalize(path.relative(src, resolved));
      if (target.startsWith('../') || path.isAbsolute(target)) continue;
      const to = identity(target);
      if (auxiliary(target)) {
        const allowed =
          file === 'app/mountApplication.ts' &&
          target === 'mocks/browser.ts' &&
          entry.dynamic &&
          guardedMockImport(sf, node);
        if (!allowed)
          report(
            file,
            sf,
            node,
            `production code cannot import test/mock implementation: ${target}`,
          );
        continue;
      }
      graph.get(file).add(target);
      if (layers.indexOf(to.layer) > layers.indexOf(from.layer) && layers.includes(from.layer))
        report(file, sf, node, `upward dependency: ${from.layer} -> ${to.layer}`);
      if (from.module === to.module) {
        if (
          ['domains', 'features', 'widgets', 'pages'].includes(from.layer) &&
          !specifier.startsWith('.')
        )
          report(file, sf, node, 'use a relative path within the same module');
        continue;
      }
      const entryPoint = publicEntry(target, to.module);
      if (to.layer === 'domains' && !entryPoint)
        report(file, sf, node, `private domain import: ${target}`);
      if (['features', 'widgets'].includes(to.layer) && entryPoint !== 'root')
        report(file, sf, node, `use the module public entry: ${to.module}`);
      if (from.layer === 'pages' && to.layer === 'pages')
        report(file, sf, node, 'pages cannot import another page module');
      if (from.layer === 'features' && to.layer === 'features')
        report(file, sf, node, 'features must be composed by a widget or page');
      if (from.layer === 'domains' && to.layer === 'domains') {
        const allowedEntries = domainReads[from.module.split('/')[1]]?.[to.module.split('/')[1]];
        if (!allowedEntries?.includes(entryPoint))
          report(
            file,
            sf,
            node,
            `unapproved domain read: ${from.module} -> ${to.module}/${entryPoint ?? 'private'}`,
          );
      }
      if (
        ['domains', 'features', 'widgets', 'pages'].includes(from.layer) &&
        ['domains', 'features', 'widgets', 'pages'].includes(to.layer)
      ) {
        if (!modules.has(from.module)) modules.set(from.module, new Set());
        modules.get(from.module).add(to.module);
      }
    }
    if (
      /^(domains|features|widgets)\/[^/]+\/(?:index\.ts|(?:model|api|lib|queries)\/index\.ts)$/.test(
        file,
      )
    ) {
      for (const statement of sf.statements)
        if (ts.isExportDeclaration(statement) && !statement.exportClause)
          report(file, sf, statement, 'public entries must use explicit exports');
    }
  }
  for (const cycle of cycles(graph)) diagnostics.push(`file cycle: ${cycle.join(' -> ')}`);
  for (const cycle of cycles(modules)) diagnostics.push(`module cycle: ${cycle.join(' -> ')}`);
  return { diagnostics, files: graph.size };
}
if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  const result = checkBoundaries(path.resolve(process.argv[2] ?? '.'));
  if (result.diagnostics.length) {
    console.error(
      `Architecture check failed (${result.diagnostics.length}):\n${result.diagnostics.join('\n')}`,
    );
    process.exitCode = 1;
  } else
    console.log(
      `Architecture check passed: ${result.files} production files; resolved boundaries and cycles checked.`,
    );
}
