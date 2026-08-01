import fs from 'node:fs';

const path = process.argv[2] || '.env.production';
if (!fs.existsSync(path)) {
  console.error(`未找到 ${path}，请从 .env.example 创建。`);
  process.exit(1);
}
const text = fs.readFileSync(path, 'utf8');
for (const key of ['VITE_APP_ENV', 'VITE_API_BASE_URL', 'VITE_SOCKET_URL', 'VITE_RELEASE']) {
  if (!new RegExp(`^${key}=.+$`, 'm').test(text)) {
    console.error(`缺少必需环境变量：${key}`);
    process.exitCode = 1;
  }
}
