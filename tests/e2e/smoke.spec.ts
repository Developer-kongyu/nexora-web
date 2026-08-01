import { expect, test } from '@playwright/test';

test('mock login opens home feed', async ({ page }) => {
  await page.goto('/auth/login');
  await page.getByLabel('账号').fill('zhiqiu');
  await page.getByLabel('密码').fill('Passw0rd!');
  await page.getByRole('button', { name: '登录', exact: true }).click();
  await expect(page).toHaveURL(/\/home/);
  await expect(page.getByRole('link', { name: '首页', exact: true })).toBeVisible();
  await expect(page.getByRole('link', { name: '正在关注', exact: true })).toBeVisible();
  await expect(page.getByText('产品小助手')).toBeVisible();
});

test('post card exposes all primary controls and the view metric', async ({ page }) => {
  await page.goto('/home');
  const firstPost = page.locator('article').first();
  await expect(firstPost).toBeVisible();

  for (const label of ['评论', '点赞', '转发', '收藏', '分享']) {
    await expect(firstPost.getByRole('button', { name: new RegExp(`^${label}`) })).toBeVisible();
  }

  await expect(firstPost.getByRole('button', { name: '帖子菜单' })).toBeVisible();
  await expect(firstPost.getByLabel(/^浏览 /)).toBeVisible();
});
