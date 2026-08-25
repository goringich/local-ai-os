#!/usr/bin/env node

import { runBrowserOperator } from './operator.js';
import { DEFAULT_OLLAMA_URL } from './ollama.js';

function parseArgs(argv) {
  const args = [...argv];
  const options = {
    task: '',
    model: process.env.BROWSER_OPERATOR_MODEL || 'qwen3:8b',
    ollamaUrl: process.env.OLLAMA_URL || DEFAULT_OLLAMA_URL,
    headed: true,
    maxSteps: 30
  };

  const taskParts = [];
  while (args.length > 0) {
    const arg = args.shift();
    if (arg === '--model') {
      options.model = args.shift() || options.model;
    } else if (arg === '--ollama-url') {
      options.ollamaUrl = args.shift() || options.ollamaUrl;
    } else if (arg === '--headless') {
      options.headed = false;
    } else if (arg === '--headed') {
      options.headed = true;
    } else if (arg === '--max-steps') {
      const parsed = Number(args.shift());
      if (Number.isFinite(parsed) && parsed >= 1 && parsed <= 100) {
        options.maxSteps = Math.floor(parsed);
      }
    } else if (arg === '--help' || arg === '-h') {
      options.help = true;
    } else if (arg) {
      taskParts.push(arg);
    }
  }

  options.task = taskParts.join(' ').trim();
  return options;
}

function printHelp() {
  console.log(`LOCAL AI OS Browser Operator

Usage:
  npm start -- "Find the official Playwright browser docs and summarize the install command"

Options:
  --model <name>        Ollama model (default: qwen3:8b)
  --ollama-url <url>    Ollama API base URL (default: http://127.0.0.1:11434)
  --headless            Run Chromium headlessly
  --headed              Show Chromium window (default)
  --max-steps <1-100>   Bound the agent loop (default: 30)
  -h, --help            Show help

Consequential actions are never auto-approved. The operator asks before login,
submit/send/publish, purchase/checkout, delete/remove, booking/reservation, or
sensitive-field interactions.`);
}

const options = parseArgs(process.argv.slice(2));
if (options.help || !options.task) {
  printHelp();
  process.exit(options.help ? 0 : 1);
}

try {
  const result = await runBrowserOperator(options);
  console.log('\nResult');
  console.log(JSON.stringify(result, null, 2));
  process.exit(result.status === 'done' ? 0 : 2);
} catch (error) {
  console.error(error instanceof Error ? error.message : String(error));
  process.exit(1);
}
