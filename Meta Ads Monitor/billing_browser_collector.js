const fs = require('node:fs');
const path = require('node:path');
const { chromium } = require('playwright');

const DEFAULT_URL = 'https://business.facebook.com/billing_hub/payment_activity';
const profileDir = path.resolve(__dirname, 'browser-profile');
const outputDir = path.resolve(__dirname, 'data');
const outputFile = path.join(outputDir, 'prepay-balances.json');
const targetUrl = process.argv[2] || process.env.META_BILLING_URL || DEFAULT_URL;
const cdpUrl = process.env.CDP_URL || null;
const headed = process.env.HEADLESS !== '1';
const timeoutMs = Number(process.env.COLLECT_TIMEOUT_MS || 180000);

function stripResponsePrefix(text) {
  return text.replace(/^\s*for\s*\(;;\);\s*/, '');
}

function findPrepayBalances(value, found = []) {
  if (!value || typeof value !== 'object') return found;
  if (value.prepay_balance && typeof value.prepay_balance === 'object') {
    found.push({
      adAccountId: value.id || null,
      name: value.name || null,
      currency: value.prepay_balance.currency || value.currency || null,
      amountMinor: value.prepay_balance.amount_with_offset ?? null,
    });
  }
  for (const child of Object.values(value)) findPrepayBalances(child, found);
  return found;
}

function normalizeBalance(item) {
  const numeric = Number(item.amountMinor);
  return {
    ad_account_id: item.adAccountId,
    account_name: item.name,
    currency: item.currency,
    prepay_balance_minor: Number.isFinite(numeric) ? numeric : null,
    prepay_balance: Number.isFinite(numeric) ? numeric / 100 : null,
    collected_at: new Date().toISOString(),
    source: 'Meta Billing Hub authenticated browser session',
  };
}

async function findVisibleBalance(page, adAccountId) {
  const deadline = Date.now() + timeoutMs;
  while (Date.now() < deadline) {
    const text = await page.locator('body').innerText().catch(() => '');
    const lines = text.split(/\r?\n/).map((line) => line.trim()).filter(Boolean);
    const labelIndex = lines.findIndex((line) => /^(Saldo pré-pago|Prepaid balance)$/i.test(line));
    const amountText = labelIndex >= 0 ? lines[labelIndex + 1] : null;
    const amountMatch = amountText?.match(/^R\$\s*([\d.]+,\d{2})$/i);
    if (amountMatch) {
      const amount = Number(amountMatch[1].replace(/\./g, '').replace(',', '.'));
      const nameMatch = text.match(/Conta de anúncios\s+([^\r\n(]+)\s*\(/i);
      return [{
        ad_account_id: adAccountId,
        account_name: nameMatch?.[1]?.trim() || null,
        currency: 'BRL',
        prepay_balance_minor: Math.round(amount * 100),
        prepay_balance: amount,
        collected_at: new Date().toISOString(),
        source: 'Meta Billing Hub visible authenticated page',
      }];
    }
    await page.waitForTimeout(1000);
  }
  throw new Error('Saldo pré-pago não apareceu no conteúdo visível da página.');
}

async function main() {
  fs.mkdirSync(outputDir, { recursive: true });
  let attachedBrowser = null;
  let context;
  if (cdpUrl) {
    attachedBrowser = await chromium.connectOverCDP(cdpUrl);
    context = attachedBrowser.contexts()[0];
    if (!context) throw new Error('Nenhum perfil aberto foi encontrado no navegador.');
  } else {
    context = await chromium.launchPersistentContext(profileDir, {
      channel: 'chrome',
      headless: !headed,
      viewport: { width: 1440, height: 960 },
    });
  }
  const targetAssetId = new URL(targetUrl).searchParams.get('asset_id');
  const existingPage = attachedBrowser && targetAssetId
    ? context.pages().find((candidate) => candidate.url().includes(`asset_id=${targetAssetId}`))
    : null;
  const page = existingPage || (attachedBrowser ? await context.newPage() : context.pages()[0] || (await context.newPage()));
  const createdPage = attachedBrowser && !existingPage;

  if (attachedBrowser && existingPage) {
    console.log(`Reutilizando a aba aberta: ${await page.title()}`);
    const balances = await findVisibleBalance(page, targetAssetId);
    fs.writeFileSync(outputFile, `${JSON.stringify({ accounts: balances }, null, 2)}\n`);
    for (const balance of balances) {
      console.log(
        `Saldo capturado: ${balance.account_name || balance.ad_account_id} = ` +
          `${balance.currency || ''} ${balance.prepay_balance?.toFixed(2)}`
      );
    }
    console.log(`Resultado salvo em: ${outputFile}`);
    process.exit(0);
  }

  let finished = false;
  let responseTimer;

  const done = new Promise((resolve, reject) => {
    responseTimer = setTimeout(
      () => reject(new Error(`Saldo não encontrado após ${timeoutMs / 1000} segundos.`)),
      timeoutMs
    );
    page.on('response', async (response) => {
      if (finished || !response.url().includes('/api/graphql')) return;
      try {
        const body = stripResponsePrefix(await response.text());
        const payload = JSON.parse(body);
        const balances = findPrepayBalances(payload).map(normalizeBalance);
        if (!balances.length) return;
        const unique = [...new Map(
          balances.map((balance) => [balance.ad_account_id || balance.account_name, balance])
        ).values()];
        fs.writeFileSync(outputFile, `${JSON.stringify({ accounts: unique }, null, 2)}\n`);
        finished = true;
        clearTimeout(responseTimer);
        resolve(unique);
      } catch {
        // Outras respostas GraphQL e respostas parciais são ignoradas.
      }
    });
  });

  console.log('Abrindo o Billing Hub da Meta...');
  console.log('Se solicitado, faça login e abra a conta de anúncio desejada.');
  if (existingPage) {
    console.log(`Reutilizando a aba aberta: ${await page.title()}`);
  } else {
    await page.goto(targetUrl, { waitUntil: 'domcontentloaded', timeout: 120000 });
  }
  try {
    const balances = await Promise.any([done, findVisibleBalance(page, targetAssetId)]);
    finished = true;
    clearTimeout(responseTimer);
    fs.writeFileSync(outputFile, `${JSON.stringify({ accounts: balances }, null, 2)}\n`);
    for (const balance of balances) {
      console.log(
        `Saldo capturado: ${balance.account_name || balance.ad_account_id} = ` +
          `${balance.currency || ''} ${balance.prepay_balance?.toFixed(2)}`
      );
    }
    console.log(`Resultado salvo em: ${outputFile}`);
  } finally {
    if (attachedBrowser) {
      if (createdPage) await page.close();
      await attachedBrowser._connection.close();
    } else {
      await context.close();
    }
  }
}

main().catch((error) => {
  console.error(`Erro: ${error.message}`);
  process.exitCode = 1;
});
