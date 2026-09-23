import { expect, test, type Page } from '@playwright/test';

async function signIn(page: Page) {
  await page.goto('/auth/login');
  await page.getByLabel('账号').fill('zhiqiu');
  await page.getByLabel('密码', { exact: true }).fill('Passw0rd!');
  await page.getByRole('button', { name: '登录', exact: true }).click();
  await expect(page).toHaveURL(/\/home$/);
}

test('draft autosave and publish preserve navigation and refresh interactions across pages', async ({
  page,
}) => {
  test.setTimeout(60_000);
  const originalText = '架构迁移验收：首次保存草稿';
  const publishedText = '架构迁移验收：自动保存后的完整正文';
  await signIn(page);

  // Visit both surfaces before writing, so the test exercises existing Query caches.
  await page.getByRole('link', { name: '收藏夹', exact: true }).click();
  await expect(page).toHaveURL(/\/bookmarks\/bookmark-default$/);
  await expect(page.locator('article').first()).toBeVisible();
  await page.getByRole('link', { name: '首页', exact: true }).click();
  await page.getByRole('button', { name: '分享此刻的想法、发现或作品…', exact: true }).click();
  await expect(page).toHaveURL(/\/compose$/);
  await page.getByRole('textbox', { name: '帖子正文' }).fill(originalText);
  await page.getByRole('button', { name: '保存草稿', exact: true }).click();
  await expect(page).toHaveURL(/\/compose\/[^/]+$/);
  const draftPath = new URL(page.url()).pathname;
  const draftId = draftPath.slice('/compose/'.length);
  await expect(page.getByRole('textbox', { name: '帖子正文' })).toHaveValue(originalText);

  const autosaveResponse = page.waitForResponse(
    (response) =>
      new URL(response.url()).pathname === `/api/posts/drafts/${draftId}/autosave` &&
      response.request().method() === 'PUT',
  );
  await page.getByRole('textbox', { name: '帖子正文' }).fill(publishedText);
  expect((await autosaveResponse).ok()).toBe(true);
  await expect(page.getByText(/^已保存于 /)).toBeVisible();

  await page.getByRole('link', { name: '首页', exact: true }).click();
  await page.goBack();
  await expect(page).toHaveURL(new RegExp(`${draftPath}$`));
  await expect(page.getByRole('textbox', { name: '帖子正文' })).toHaveValue(publishedText);
  await page.getByRole('main').getByRole('button', { name: '发布帖子', exact: true }).click();
  await expect(page).toHaveURL(/\/posts\/[^/]+$/);
  const detail = page.locator('article').filter({ hasText: publishedText });
  await expect(detail).toBeVisible();

  for (const action of ['点赞', '转发', '收藏']) {
    const button = detail.getByRole('button', { name: new RegExp(`^${action} `) });
    await expect(button).toHaveAttribute('aria-pressed', 'false');
    await button.click();
    await expect(button).toHaveAttribute('aria-pressed', 'true');
    await expect(button).toBeEnabled();
    await expect(button).toHaveAccessibleName(`${action} 1`);
  }

  await page.getByRole('link', { name: '首页', exact: true }).click();
  const feedPost = page.locator('article').filter({ hasText: publishedText });
  await expect(feedPost).toBeVisible();
  for (const action of ['点赞', '转发', '收藏']) {
    await expect(
      feedPost.getByRole('button', { name: `${action} 1`, exact: true }),
    ).toHaveAttribute('aria-pressed', 'true');
  }

  await page.getByRole('link', { name: '收藏夹', exact: true }).click();
  const bookmarkedPost = page.locator('article').filter({ hasText: publishedText });
  await expect(bookmarkedPost).toBeVisible();
  for (const action of ['点赞', '转发', '收藏']) {
    await expect(
      bookmarkedPost.getByRole('button', { name: `${action} 1`, exact: true }),
    ).toHaveAttribute('aria-pressed', 'true');
  }
  await bookmarkedPost.getByRole('button', { name: '收藏 1', exact: true }).click();
  await expect(bookmarkedPost).toHaveCount(0);
  await page.getByRole('link', { name: '首页', exact: true }).click();
  await expect(feedPost.getByRole('button', { name: '收藏 0', exact: true })).toHaveAttribute(
    'aria-pressed',
    'false',
  );
  await expect(feedPost.getByRole('button', { name: '点赞 1', exact: true })).toHaveAttribute(
    'aria-pressed',
    'true',
  );
});

test('quick compose remains visible and opens the editor on a narrow screen', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await signIn(page);
  const quickCompose = page.getByRole('button', {
    name: '分享此刻的想法、发现或作品…',
    exact: true,
  });
  await expect(quickCompose).toBeInViewport();
  await expect(page.getByRole('button', { name: '添加图片', exact: true })).toBeVisible();
  await quickCompose.click();
  await expect(page).toHaveURL(/\/compose$/);
  await expect(page.getByRole('textbox', { name: '帖子正文' })).toBeVisible();
});
