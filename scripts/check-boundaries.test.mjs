import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import test from 'node:test';
import { checkBoundaries } from './check-boundaries.mjs';

function fixture(files) {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), 'nexora-boundaries-'));
  fs.writeFileSync(
    path.join(root, 'tsconfig.app.json'),
    JSON.stringify({
      compilerOptions: {
        baseUrl: '.',
        paths: { '@/*': ['src/*'] },
        moduleResolution: 'Bundler',
        module: 'ESNext',
      },
      include: ['src'],
    }),
  );
  for (const [name, text] of Object.entries(files)) {
    const file = path.join(root, 'src', name);
    fs.mkdirSync(path.dirname(file), { recursive: true });
    fs.writeFileSync(file, text);
  }
  if (!path.resolve(root).startsWith(`${path.resolve(os.tmpdir())}${path.sep}nexora-boundaries-`))
    throw new Error('Invalid fixture cleanup path');
  try {
    return checkBoundaries(root).diagnostics;
  } finally {
    fs.rmSync(root, { recursive: true, force: true });
  }
}

test('accepts downward imports, local internals and approved pure domain reads', () => {
  assert.deepEqual(
    fixture({
      'shared/lib/value.ts': 'export const value = 1;',
      'domains/posts/model/types.ts': 'export interface Post { id: string }',
      'domains/posts/model/index.ts': "export type { Post } from './types';",
      'domains/feed/model/types.ts':
        "import type { Post } from '@/domains/posts/model'; export type Feed = Post[];",
      'domains/feed/index.ts': "export type { Feed } from './model/types';",
      'features/compose-post/index.ts':
        "import { value } from '@/shared/lib/value'; export { value };",
      'widgets/composer/index.ts': "export { value } from '@/features/compose-post';",
      'pages/compose/ComposePage.ts':
        "import { value } from '@/widgets/composer'; export { value };",
      'app/router.ts': "export const lazy = () => import('@/pages/compose/ComposePage');",
    }),
    [],
  );
});

for (const [kind, statement] of [
  ['alias', "import { post } from '@/domains/posts';"],
  ['relative', "import { post } from '../../domains/posts';"],
  ['re-export', "export { post } from '../../domains/posts';"],
  ['dynamic', "export const load = () => import('../../domains/posts');"],
  ['type import', "export type Post = import('../../domains/posts').Post;"],
  ['require', "const post = require('../../domains/posts');"],
])
  test(`rejects shared upward dependency via ${kind}`, () => {
    const diagnostics = fixture({
      'shared/lib/consumer.ts': statement,
      'domains/posts/index.ts': 'export const post = 1; export interface Post { id: string }',
    });
    assert.ok(diagnostics.some((message) => message.includes('upward dependency')));
  });

test('rejects private domain, widget and feature imports including relative paths', () => {
  const diagnostics = fixture({
    'pages/home/Home.ts':
      "import { value } from '../../domains/posts/api/private'; import { Card } from '../../widgets/post-card/Card'; import { run } from '../../features/compose-post/model/run';",
    'domains/posts/api/private.ts': 'export const value = 1;',
    'widgets/post-card/Card.ts': 'export const Card = 1;',
    'features/compose-post/model/run.ts': 'export const run = 1;',
  });
  assert.equal(
    diagnostics.filter((message) => /private domain import|module public entry/.test(message))
      .length,
    3,
  );
});

test('rejects cross-page CSS and cross-feature composition', () => {
  const diagnostics = fixture({
    'pages/home/Home.ts': "import '../search/Search.module.css';",
    'pages/search/Search.module.css': '.root {}',
    'features/a/index.ts': "export { value } from '../b';",
    'features/b/index.ts': 'export const value = 1;',
  });
  assert.ok(diagnostics.some((message) => message.includes('pages cannot import')));
  assert.ok(diagnostics.some((message) => message.includes('features must be composed')));
});

test('rejects unapproved cross-domain reads even through a public entry', () => {
  assert.ok(
    fixture({
      'domains/users/model/index.ts': "export { id } from '../../posts/model';",
      'domains/posts/model/index.ts': "export const id = 'post';",
    }).some((message) => message.includes('unapproved domain read')),
  );
});

test('detects cycles through re-exports, and domain cycles through separate files', () => {
  const diagnostics = fixture({
    'shared/lib/a.ts': "export { b } from './b'; export const a = 1;",
    'shared/lib/b.ts': "export { a } from './a'; export const b = 2;",
    'domains/posts/model/index.ts': "export const id = 'post';",
    'domains/users/model/index.ts': "export const id = 'user';",
    'domains/posts/read.ts': "import { id } from '../users/model'; export const value = id;",
    'domains/users/read.ts': "import { id } from '../posts/model'; export const value = id;",
  });
  assert.ok(diagnostics.some((message) => message.includes('file cycle:')));
  assert.ok(diagnostics.some((message) => message.includes('module cycle:')));
});

test('rejects production mocks, including mock exports and files named as tests', () => {
  const diagnostics = fixture({
    'domains/posts/index.ts':
      "export { mock } from '../../mocks/fixture'; export { helper } from './helper.test';",
    'domains/posts/helper.test.ts': 'export const helper = 1;',
    'mocks/fixture.ts': 'export const mock = 1;',
  });
  assert.equal(diagnostics.filter((message) => message.includes('test/mock')).length, 2);
});

test('allows test and Storybook fixtures and the explicitly guarded bootstrap import', () => {
  assert.deepEqual(
    fixture({
      'app/mountApplication.ts':
        "async function enableMocking() { const mockMode = import.meta.env.DEV || import.meta.env.MODE === 'test'; if (!mockMode || !env.VITE_ENABLE_MOCK) return; const { worker } = await import('@/mocks/browser'); return worker; }",
      'pages/home/Home.test.ts': "import { worker } from '@/mocks/browser';",
      'widgets/post-card/Post.stories.tsx': "import { worker } from '@/mocks/browser';",
      'mocks/browser.ts': 'export const worker = {};',
    }),
    [],
  );
});

test('rejects static or unguarded Mock imports even in the bootstrap file', () => {
  for (const source of [
    "import { worker } from '@/mocks/browser';",
    "async function enableMocking() { return import('@/mocks/browser'); }",
  ]) {
    assert.ok(
      fixture({
        'app/mountApplication.ts': source,
        'mocks/browser.ts': 'export const worker = {};',
      }).some((message) => message.includes('test/mock')),
    );
  }
});

test('rejects wildcard public exports, self-alias imports and missing local modules', () => {
  const diagnostics = fixture({
    'domains/posts/index.ts': "export * from './missing';",
    'domains/posts/api.ts': "import { value } from '@/domains/posts/value';",
    'domains/posts/value.ts': 'export const value = 1;',
  });
  assert.ok(diagnostics.some((message) => message.includes('explicit exports')));
  assert.ok(diagnostics.some((message) => message.includes('relative path')));
  assert.ok(diagnostics.some((message) => message.includes('unresolved local import')));
});
