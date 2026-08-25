import { chromium } from 'playwright';
import { createInterface } from 'node:readline/promises';
import { stdin as input, stdout as output } from 'node:process';
import { nextAction } from './ollama.js';
import { assessActionRisk } from './policy.js';
import { buildSnapshot, findSnapshotElement } from './snapshot.js';

const DEFAULT_MAX_STEPS = 30;

function targetLocator(page, elementId) {
  if (!/^op-\d+$/.test(String(elementId))) {
    throw new Error(`Invalid element id: ${elementId}`);
  }

  return page.locator(`[data-local-ai-operator-id="${elementId}"]`).first();
}

async function terminalApproval({ action, element, risk }) {
  const rl = createInterface({ input, output });
  try {
    output.write('\nApproval required\n');
    output.write(`Reason: ${risk.reason}\n`);
    output.write(`Action: ${JSON.stringify(action)}\n`);
    if (element) {
      output.write(`Target: ${JSON.stringify(element)}\n`);
    }
    const answer = await rl.question('Allow once? [y/N] ');
    return /^y(es)?$/i.test(answer.trim());
  } finally {
    rl.close();
  }
}

async function executeAction({ page, action, snapshot, approve }) {
  const element = action.elementId
    ? findSnapshotElement(snapshot, action.elementId)
    : null;

  if (action.elementId && !element) {
    throw new Error(`Element ${action.elementId} is not present in the current snapshot`);
  }

  const risk = assessActionRisk(action, element);
  if (risk.level === 'deny') {
    throw new Error(`Policy denied action: ${risk.reason}`);
  }

  if (risk.level === 'approval') {
    const allowed = await approve({ action, element, risk });
    if (!allowed) {
      return { status: 'rejected', reason: risk.reason };
    }
  }

  switch (action.type) {
    case 'goto':
      await page.goto(action.url, { waitUntil: 'domcontentloaded', timeout: 30000 });
      break;
    case 'click':
      await targetLocator(page, action.elementId).click({ timeout: 10000 });
      break;
    case 'fill':
      await targetLocator(page, action.elementId).fill(String(action.text ?? ''), { timeout: 10000 });
      break;
    case 'press':
      await targetLocator(page, action.elementId).press(String(action.key ?? 'Enter'), { timeout: 10000 });
      break;
    case 'wait':
      await page.waitForTimeout(Math.min(Math.max(Number(action.ms) || 500, 100), 5000));
      break;
    case 'back':
      await page.goBack({ waitUntil: 'domcontentloaded', timeout: 30000 });
      break;
    default:
      throw new Error(`Unsupported executable action: ${action.type}`);
  }

  return { status: 'executed', reason: risk.reason };
}

export async function runBrowserOperator({
  task,
  model,
  ollamaUrl,
  headed = true,
  maxSteps = DEFAULT_MAX_STEPS,
  approve = terminalApproval
}) {
  if (!task?.trim()) {
    throw new Error('A task is required');
  }
  if (!model?.trim()) {
    throw new Error('An Ollama model is required');
  }

  const browser = await chromium.launch({ headless: !headed });
  const context = await browser.newContext({
    acceptDownloads: false,
    permissions: []
  });
  const page = await context.newPage();
  const history = [];

  try {
    for (let step = 1; step <= maxSteps; step += 1) {
      const snapshot = await buildSnapshot(page);
      const action = await nextAction({ model, task, snapshot, history, ollamaUrl });

      if (action.type === 'done') {
        return {
          status: 'done',
          result: String(action.result ?? ''),
          steps: step - 1,
          history
        };
      }

      try {
        const outcome = await executeAction({ page, action, snapshot, approve });
        history.push({
          step,
          action,
          outcome,
          page: { title: snapshot.title, url: snapshot.url }
        });
      } catch (error) {
        history.push({
          step,
          action,
          outcome: {
            status: 'failed',
            reason: error instanceof Error ? error.message : String(error)
          },
          page: { title: snapshot.title, url: snapshot.url }
        });
      }
    }

    return {
      status: 'step_limit',
      result: `Stopped after ${maxSteps} steps without a done action`,
      steps: maxSteps,
      history
    };
  } finally {
    await context.close();
    await browser.close();
  }
}

export { DEFAULT_MAX_STEPS };
