import { test, expect } from '@playwright/test';
const user = { id: '11111111-1111-4111-8111-111111111111', aud: 'authenticated', role: 'authenticated', email: 'review@example.com', app_metadata: {}, user_metadata: {}, created_at: new Date().toISOString() };
async function open(page) {
  await page.goto('/');
  await page.getByRole('button', { name: 'Sign in', exact: true }).click();
}
test('signup and reset submit once and recover from errors', async ({ page }) => {
  const requests = [];
  await page.route('https://*.supabase.co/**', route => {
    requests.push(route.request().url());
    return route.fulfill({ json: route.request().url().includes('/signup') ? { user } : {} });
  });
  await open(page);
  await page.getByRole('button', { name: 'Create an account', exact: true }).click();
  await page.getByLabel('Email', { exact: true }).fill(user.email);
  await page.getByLabel('Password', { exact: true }).fill('test-password');
  await page.getByRole('button', { name: 'Create account', exact: true }).click();
  await expect(page.locator('#auth-panel [role=status]')).toContainText('Check your email');
  expect(requests.filter(url => url.includes('/signup'))).toHaveLength(1);
  await page.getByRole('button', { name: 'Forgot password?', exact: true }).click();
  await page.getByLabel('Email', { exact: true }).fill(user.email);
  await page.getByRole('button', { name: 'Send reset email', exact: true }).click();
  await expect(page.locator('#auth-panel [role=status]')).toContainText('Check your email');
  expect(requests.filter(url => url.includes('/recover'))).toHaveLength(1);
});
test('invalid credentials allow retry and password update works', async ({ page }) => {
  let attempts = 0, updated;
  await page.route('https://*.supabase.co/**', route => {
    if (route.request().url().includes('/user')) {
      if (route.request().method() === 'PUT') updated = route.request().postDataJSON();
      return route.fulfill({ json: user });
    }
    if (++attempts === 1) return route.fulfill({ status: 400, json: { error_code: 'invalid_credentials', msg: 'Invalid login credentials' } });
    return route.fulfill({ json: { access_token: 'mock-access', refresh_token: 'mock-refresh', expires_in: 3600, token_type: 'bearer', user } });
  });
  await open(page);
  await page.getByLabel('Email', { exact: true }).fill(user.email);
  await page.getByLabel('Password', { exact: true }).fill('test-password');
  const submit = page.locator('#auth-panel button[type=submit]');
  await submit.click();
  await expect(page.locator('#auth-panel [role=status]')).toContainText('Email or password is incorrect');
  await expect(submit).toBeEnabled();
  await submit.click();
  await page.getByRole('button', { name: 'Change password', exact: true }).click();
  await page.getByLabel('Password', { exact: true }).fill('changed-password');
  await page.getByRole('button', { name: 'Set new password', exact: true }).click();
  await expect(page.locator('#auth-panel [role=status]')).toContainText('Success');
  expect(updated.password).toBe('changed-password');
});
test('stalled submission disables controls then releases them with an error', async ({ page }) => {
  await page.route('https://*.supabase.co/**', () => {});
  await open(page);
  await page.clock.install();
  await page.getByLabel('Email', { exact: true }).fill(user.email);
  await page.getByLabel('Password', { exact: true }).fill('test-password');
  await page.locator('#auth-panel button[type=submit]').click();
  await expect(page.getByRole('button', { name: 'Working…', exact: true })).toBeDisabled();
  await expect(page.getByRole('button', { name: 'Create an account', exact: true })).toBeDisabled();
  await expect(page.getByLabel('Email', { exact: true })).toBeDisabled();
  await page.clock.runFor(21000);
  await expect(page.locator('#auth-panel [role=status]')).toContainText('timed out');
  await expect(page.locator('#auth-panel button[type=submit]')).toBeEnabled();
});

