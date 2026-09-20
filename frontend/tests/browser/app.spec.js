import { test, expect } from '@playwright/test';

test('live simulator, stale state and mobile layout', async ({ page }) => {
  await page.goto('/');
  await page.getByRole('button', { name: 'Connect', exact: true }).click();
  await expect(page.getByRole('heading', { name: 'backpack', exact: true }).first()).toBeVisible();
  await expect(page.locator('.scene-footer')).toContainText('Simulated position');
  await expect(page.locator('#telemetry-panel')).toContainText('reported');
  await page.getByRole('button', { name: 'Disconnect', exact: true }).click();
  await expect(page.locator('.scene-footer')).toContainText('stale');
  for (const width of [390, 320]) {
    await page.setViewportSize({ width, height: 1000 });
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBeTruthy();
  }
});

test('theme and accessible account dialog', async ({ page }) => {
  await page.goto('/');
  await page.getByRole('button', { name: 'Dark theme' }).click();
  const theme = await page.locator('html').getAttribute('data-theme');
  await page.reload(); await expect(page.locator('html')).toHaveAttribute('data-theme', theme);
  await page.getByRole('button', { name: 'Sign in', exact: true }).click();
  await expect(page.getByLabel('Email', { exact: true })).toBeVisible();
  await page.keyboard.press('Escape');
  await expect(page.locator('#account-dialog')).not.toBeVisible();
});

test('mock auth, analysis, saving and signout; no external writes', async ({ page }) => {
  const user = { id:'11111111-1111-4111-8111-111111111111', aud:'authenticated', role:'authenticated', email:'review@example.com', app_metadata:{provider:'email'}, user_metadata:{}, created_at:new Date().toISOString() };
  let saved;
  await page.route('https://*.supabase.co/**', async route => {
    const url = route.request().url();
    if (url.includes('/logout')) return route.fulfill({status:204});
    if (url.includes('/user')) return route.fulfill({json:user});
    if (url.includes('/rest/v1/observations')) { saved=route.request().postDataJSON(); return route.fulfill({status:201,json:[]}); }
    return route.fulfill({json:{access_token:'mock-access',refresh_token:'mock-refresh',expires_in:3600,token_type:'bearer',user}});
  });
  await page.route('**/api/analyze', route => route.fulfill({json:[{type:'semantic_observation',observation_id:'22222222-2222-4222-8222-222222222222',timestamp:new Date().toISOString(),simulated:false,object_label:'chair',confidence:null}]}));
  await page.goto('/');
  await page.getByRole('button',{name:'Sign in',exact:true}).click();
  await page.getByLabel('Email',{exact:true}).fill('review@example.com');
  await page.getByLabel('Password',{exact:true}).fill('test-password');
  await page.locator('#auth-panel').getByRole('button',{name:'Sign in',exact:true}).click();
  await expect(page.getByRole('button',{name:'Account',exact:true})).toBeVisible();
  await page.keyboard.press('Escape');
  await page.getByLabel('Choose image',{exact:true}).setInputFiles({name:'example.png',mimeType:'image/png',buffer:Buffer.from('test fixture; provider is mocked')});
  await page.getByLabel('Send this selected image to Gemini for analysis').check();
  await page.getByRole('button',{name:'Analyze image',exact:true}).click();
  await expect(page.getByRole('heading',{name:'chair',exact:true})).toBeVisible();
  await page.getByRole('button',{name:'Save to my history',exact:true}).click();
  await expect(page.locator('.notice')).toContainText('saved');
  expect(saved.user_id).toBe(user.id);
  await page.getByRole('button',{name:'Account',exact:true}).click();
  await page.getByRole('button',{name:'Sign out',exact:true}).click();
  await expect(page.getByRole('heading',{name:'chair',exact:true})).not.toBeVisible();
});
