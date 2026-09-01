import { chromium } from 'playwright';
import Database from 'better-sqlite3';
import { existsSync, mkdirSync, writeFileSync } from 'fs';
import { join } from 'path';
import { callLlm, getInteractiveElements } from './agent-utils.js';
import { DB_PATH, AGENT_LOGS_DIR } from '../src/lib/server/paths.js';

const args = {};
process.argv.slice(2).forEach(val => {
  const parts = val.split('=');
  if (parts[0].startsWith('--')) {
    args[parts[0].slice(2).replace(/-./g, m => m[1].toUpperCase())] = parts.slice(1).join('=') || true;
  }
});

const runId = Number(args.runId), loginUrl = args.url, username = args.username, password = args.password, hints = args.hints || '';

if (!runId || !loginUrl) {
  console.error('Usage: node scripts/run-web-agent.js --runId=<id> --url=<url> [--username=<user>] [--password=<pass>]');
  process.exit(1);
}

const db = new Database(DB_PATH);
const logsDir = AGENT_LOGS_DIR;
if (!existsSync(logsDir)) mkdirSync(logsDir, { recursive: true });
const logFile = join(logsDir, `${runId}.log`);

function log(msg) {
  const time = new Date().toISOString().split('T')[1].slice(0, 8);
  const line = `[${time}] ${msg}`;
  console.log(line);
  writeFileSync(logFile, line + '\n', { flag: 'a' });
}

/** Safe wrapper — tries a Playwright action with timeout, returns success boolean */
async function safeAction(page, action, timeout = 10000) {
  try { await action(page, timeout); return true; }
  catch (err) { log(`  ↳ Action failed: ${err.message.split('\n')[0]}`); return false; }
}

log(`Starting automated web testing agent for Run ID: ${runId}`);

(async () => {
  const browser = await chromium.launch({ headless: !args.headed });
  const context = await browser.newContext({ viewport: { width: 1280, height: 800 } });
  const page = await context.newPage();
  page.setDefaultTimeout(15000);

  try {
    // ── 1. Research Stage ──
    const runRow = db.prepare('SELECT platform_name, research_notes FROM test_runs WHERE id = ?').get(runId);
    const platform = runRow?.platform_name || 'ERP';
    const existingResearch = runRow?.research_notes || '';

    if (existingResearch.trim()) {
      log(`[SYS] Research notes already exist for ${platform}. Skipping.`);
    } else {
      log(`[SYS] Researching platform documentation for: ${platform}`);
      try {
        const researchPage = await context.newPage();
        const q = encodeURIComponent(`${platform} ERP CRM user guide tutorial login help`);
        await researchPage.goto(`https://www.google.com/search?q=${q}`, { waitUntil: 'domcontentloaded', timeout: 15000 });
        await researchPage.waitForTimeout(3000);
        const searchTexts = await researchPage.evaluate(() => {
          const headings = Array.from(document.querySelectorAll('h3')).map(h => h.innerText).filter(Boolean);
          const snippets = Array.from(document.querySelectorAll('.VwiC3b, .IsZvec')).map(s => s.innerText).filter(Boolean);
          const combined = headings.map((h, i) => `${h}${snippets[i] ? ': ' + snippets[i] : ''}`);
          return combined.slice(0, 8).join('\n');
        });
        if (searchTexts.trim()) {
          db.prepare("UPDATE test_runs SET research_notes = ? WHERE id = ?").run(searchTexts, runId);
          log(`Research completed. Found ${searchTexts.split('\n').length} references.`);
        } else {
          db.prepare("UPDATE test_runs SET research_notes = ? WHERE id = ?").run(`Platform: ${platform}. No online docs found.`, runId);
          log('Research: No results scraped, saved placeholder.');
        }
        await researchPage.close();
      } catch (err) {
        log(`Research warning: ${err.message.split('\n')[0]}`);
        db.prepare("UPDATE test_runs SET research_notes = ? WHERE id = ?").run(`Platform: ${platform}. Research failed.`, runId);
      }
    }

    // ── 2. Authentication Stage ──
    log(`Navigating to: ${loginUrl}`);
    await page.goto(loginUrl, { waitUntil: 'domcontentloaded', timeout: 30000 });
    await page.waitForTimeout(4000);

    // Take a screenshot for the LLM to visually analyze
    const loginScreenshot = await page.screenshot();
    let elements = await getInteractiveElements(page);

    const detectorPrompt = `You are a web page analyzer. Look at the screenshot and the interactive elements list.
    
Interactive elements on page: ${JSON.stringify(elements.slice(0, 60))}

Determine which scenario applies:
A) A login form is ALREADY visible (username/email/mobile/phone input field is present in the elements list)
B) There is a clickable element (link, button, tab) that says "Login", "Sign In", "App", "Portal", or similar that needs to be clicked first
C) The login form is on a DIFFERENT URL entirely

Return ONLY JSON:
- Scenario A: {"scenario": "A"}
- Scenario B: {"scenario": "B", "selector": "css_selector_or_text_selector"}  
- Scenario C: {"scenario": "C", "guessUrl": "https://..."}`;
    
    let scenario = { scenario: 'A' };
    try {
      const decisionText = await callLlm('Analyze the page. Return JSON only.', detectorPrompt, loginScreenshot);
      scenario = JSON.parse(decisionText.match(/\{[\s\S]*\}/)[0]);
      log(`Login detection: Scenario ${scenario.scenario}`);
    } catch (err) {
      log(`Login detection LLM parse failed, assuming form is visible: ${err.message.split('\n')[0]}`);
    }
    
    // Handle scenario B (click to login page) with retries
    if (scenario.scenario === 'B' && scenario.selector) {
      log(`Clicking to reach login page: ${scenario.selector}`);
      const clicked = await safeAction(page, async (p, t) => {
        // Try the LLM-suggested selector first
        await p.click(scenario.selector, { timeout: t });
      });
      if (!clicked) {
        // Fallback: try common login link patterns
        log('  ↳ Retrying with common login selectors...');
        const fallbacks = [
          'text=Login', 'text=Sign In', 'text=Log In', 'text=Sign in',
          'a:has-text("Login")', 'button:has-text("Login")',
          'a:has-text("Sign In")', 'a[href*="login"]', 'a[href*="signin"]',
          '#loginBtn', '#btnLogin', '.login-btn', '.login-link'
        ];
        let found = false;
        for (const sel of fallbacks) {
          found = await safeAction(page, async (p, t) => p.click(sel, { timeout: 3000 }));
          if (found) { log(`  ↳ Clicked fallback: ${sel}`); break; }
        }
        if (!found) log('  ↳ Could not find login link. Proceeding with current page.');
      }
      await page.waitForTimeout(4000);
      elements = await getInteractiveElements(page);
    } else if (scenario.scenario === 'C' && scenario.guessUrl) {
      log(`Navigating to guessed login URL: ${scenario.guessUrl}`);
      await safeAction(page, async (p) => p.goto(scenario.guessUrl, { waitUntil: 'domcontentloaded', timeout: 20000 }));
      await page.waitForTimeout(3000);
      elements = await getInteractiveElements(page);
    }

    // Now identify login form fields using screenshot + elements
    const formScreenshot = await page.screenshot();
    const formPrompt = `You are a login form assistant. Analyze the screenshot and interactive elements to find the login form.
    
Interactive elements: ${JSON.stringify(elements.slice(0, 60))}

This platform may use mobile number, email, or username for login. It may have OTP-based login (no password field).
Identify:
1. The username/email/mobile/phone input field
2. The password input field (may not exist for OTP logins)
3. The submit/login/send-OTP button

Return ONLY JSON: {
  "usernameSelector": "css_selector_or_null",
  "passwordSelector": "css_selector_or_null", 
  "submitSelector": "css_selector_or_null",
  "loginType": "standard" | "otp"
}`;

    let selectors = { usernameSelector: null, passwordSelector: null, submitSelector: null, loginType: 'standard' };
    try {
      const selectorsText = await callLlm('Identify login form selectors. Return JSON only.', formPrompt, formScreenshot);
      selectors = JSON.parse(selectorsText.match(/\{[\s\S]*\}/)[0]);
      log(`Login form detected (${selectors.loginType}): user=${selectors.usernameSelector}, pass=${selectors.passwordSelector}, submit=${selectors.submitSelector}`);
    } catch (err) {
      log(`Login form detection failed: ${err.message.split('\n')[0]}`);
    }

    // Fill credentials with safe wrappers
    if (username && selectors.usernameSelector) {
      const filled = await safeAction(page, async (p, t) => p.fill(selectors.usernameSelector, username, { timeout: t }));
      if (!filled) {
        // Try clicking the field first then typing
        log('  ↳ Fill failed, trying click + type...');
        await safeAction(page, async (p, t) => {
          await p.click(selectors.usernameSelector, { timeout: t });
          await p.keyboard.type(username, { delay: 50 });
        });
      }
      log(`Username entered: ${username}`);
    }

    // ── Password handling with fallback ──
    if (password) {
      let pwField = selectors.passwordSelector;

      if (!pwField) {
        log('LLM did not detect a password field. Searching for password input...');
        pwField = await page.evaluate(() => {
          const pw = document.querySelector('input[type="password"]');
          if (!pw) return null;
          const id = pw.id ? `#${CSS.escape(pw.id)}` : null;
          const name = pw.name ? `[name="${CSS.escape(pw.name)}"]` : null;
          return id || name || 'input[type="password"]';
        });
        if (pwField) {
          log(`  ↳ Found password field: ${pwField}`);
        } else {
          log('  ↳ No password field on current page (may be multi-step login).');
        }
      }

      if (pwField) {
        const filled = await safeAction(page, async (p, t) => p.fill(pwField, password, { timeout: t }));
        if (!filled) {
          log('  ↳ Fill failed, trying click + type...');
          await safeAction(page, async (p, t) => {
            await p.click(pwField, { timeout: t });
            await p.keyboard.type(password, { delay: 50 });
          });
        }
        log('Password entered.');
      }
    }

    // ── Submit ──
    const preAuthUrl = page.url();
    if (selectors.submitSelector) {
      const clicked = await safeAction(page, async (p, t) => p.click(selectors.submitSelector, { timeout: t }));
      if (clicked) {
        log('Submitted credentials. Waiting for response...');
      } else {
        log('Submit button click failed. Trying Enter key...');
        await page.keyboard.press('Enter');
      }
    }
    await page.waitForTimeout(4000);

    // ── Multi-step login: password field may appear after first submit ──
    if (password && !selectors.passwordSelector) {
      const pwField2 = await page.evaluate(() => {
        const pw = document.querySelector('input[type="password"]');
        if (!pw) return null;
        return pw.id ? `#${CSS.escape(pw.id)}` : (pw.name ? `[name="${CSS.escape(pw.name)}"]` : 'input[type="password"]');
      });
      if (pwField2) {
        log(`Multi-step login detected. Password field appeared after submit: ${pwField2}`);
        const filled = await safeAction(page, async (p, t) => p.fill(pwField2, password, { timeout: t }));
        if (!filled) {
          await safeAction(page, async (p, t) => {
            await p.click(pwField2, { timeout: t });
            await p.keyboard.type(password, { delay: 50 });
          });
        }
        log('Password entered in second step.');

        await page.waitForTimeout(1000);
        const elements2 = await getInteractiveElements(page);
        const submitPrompt2 = `Find the submit/login/Sign In button on this page.
        Interactive elements: ${JSON.stringify(elements2.slice(0, 40))}
        Return ONLY the css selector string of the submit button, or "null".`;
        try {
          const submitText2 = await callLlm('Find submit button.', submitPrompt2);
          const m = submitText2.match(/"([^"]+)"|`([^`]+)`/);
          const sel2 = m ? (m[1] || m[2]) : submitText2.trim();
          if (sel2 && sel2 !== 'null') {
            await safeAction(page, async (p, t) => p.click(sel2, { timeout: t }));
            log('Submitted second step.');
          } else {
            await page.keyboard.press('Enter');
          }
        } catch (err) {
          await page.keyboard.press('Enter');
          log(`  ↳ Second step submit fallback (Enter): ${err.message.split('\n')[0]}`);
        }
        await page.waitForTimeout(4000);
      }
    }

    // ── Login verification ──
    const postAuthUrl = page.url().replace(/\/+$/, '');
    const urlChanged = postAuthUrl !== preAuthUrl.replace(/\/+$/, '');
    let loginStillVisible = false;
    try {
      loginStillVisible = await page.evaluate(() => {
        const headings = document.querySelectorAll('h1, h2, h3, legend');
        for (const h of headings) {
          const t = h.innerText.toLowerCase().trim();
          if (t.includes('sign in') || t.includes('log in') || t === 'login' || t.includes('welcome back')) return true;
        }
        return false;
      });
    } catch (e) {}

    if (urlChanged) {
      log(`[SYS] URL changed to: ${postAuthUrl} — login appears successful.`);
    } else if (!loginStillVisible) {
      log('[SYS] Same URL but login form no longer visible — login appears successful.');
    } else {
      log('[SYS] WARNING: Still on login page after authentication. Tests may fail.');
    }

    // ── 3. Execution Loop ──
    const uploadDir = join(process.cwd(), 'static', 'images');
    if (!existsSync(uploadDir)) mkdirSync(uploadDir, { recursive: true });

    while (true) {
      const results = db.prepare("SELECT * FROM test_results WHERE test_run_id = ? AND status = 'pending'").all(runId);
      if (results.length > 0) {
        log(`Found ${results.length} pending test case(s).`);
        for (const r of results) {
          log(`▶ Test #${r.criteria_id}: ${r.stage} — ${r.what_to_test}`);
          
          let step = 0, done = false, verdict = 'pending', gapNotes = '';

          while (step < 8 && !done) {
            step++;
            let screen, pageEls;
            try {
              screen = await page.screenshot();
              pageEls = await getInteractiveElements(page);
            } catch (err) {
              log(`  Step ${step}: Screenshot/elements failed: ${err.message.split('\n')[0]}`);
              break;
            }
            
            const agentPrompt = `
Test Case: "${r.what_to_test}"
Expected Outcome: "${r.expected_outcome}"
Current Page URL: ${page.url()}
Interactive Elements: ${JSON.stringify(pageEls.slice(0, 50))}

CRITICAL CONSTRAINT: You MUST NOT write, edit, create, or delete any data on the platform.
- Read-only validation ONLY. No "Save", "Submit", "Create", "Delete" that modifies records.
- You MAY navigate, click tabs/menus, use search/filter inputs to locate and verify data.

Decide the next action. Return ONLY JSON: {
  "action": "CLICK" | "FILL" | "NAVIGATE" | "VERDICT",
  "selector": "css_selector_or_null",
  "value": "text_or_url_or_null",
  "verdict": "passed" | "failed" | "gaps" | null,
  "notes": "explanation"
}`;
            
            try {
              const decisionText = await callLlm('Web test execution assistant. Return JSON only.', agentPrompt, screen);
              const dec = JSON.parse(decisionText.match(/\{[\s\S]*\}/)[0]);

              log(`  Step ${step}: ${dec.action} → ${dec.selector || dec.value || 'none'} (${dec.notes})`);

              if (dec.action === 'CLICK' && dec.selector) {
                await safeAction(page, async (p, t) => { await p.click(dec.selector, { timeout: t }); await p.waitForTimeout(2000); });
              } else if (dec.action === 'FILL' && dec.selector) {
                await safeAction(page, async (p, t) => { await p.fill(dec.selector, dec.value || '', { timeout: t }); await p.waitForTimeout(1000); });
              } else if (dec.action === 'NAVIGATE' && dec.value) {
                await safeAction(page, async (p) => { await p.goto(dec.value, { waitUntil: 'domcontentloaded', timeout: 20000 }); await p.waitForTimeout(3000); });
              } else if (dec.action === 'VERDICT') {
                verdict = dec.verdict; gapNotes = dec.notes; done = true;
              }
            } catch (err) {
              log(`  Step ${step}: LLM/action error: ${err.message.split('\n')[0]}`);
              verdict = 'gaps'; gapNotes = `Agent error at step ${step}: ${err.message.split('\n')[0]}`;
              done = true;
            }
          }

          if (!done) { verdict = 'gaps'; gapNotes = 'Timed out after maximum steps.'; }

          const filename = `${runId}_res_${r.criteria_id}.png`;
          const filepath = join(uploadDir, filename);
          try { await page.screenshot({ path: filepath }); } catch {}

          db.prepare("UPDATE test_results SET status = ?, notes_gap = ?, screenshot_path = ?, updated_at = datetime('now') WHERE id = ?").run(verdict, gapNotes, `/images/${filename}`, r.id);
          log(`  ✓ Test #${r.criteria_id}: ${verdict.toUpperCase()} — ${gapNotes}`);
        }
      }
      await new Promise(resolve => setTimeout(resolve, 2000));
    }
  } catch (err) {
    log(`CRITICAL ERROR DURING RUN: ${err.message}\n${err.stack}`);
  } finally {
    db.prepare("UPDATE test_runs SET updated_at = datetime('now') WHERE id = ?").run(runId);
    db.close();
    if (args.headed) {
      log('Headed mode: pausing 15s for visual review...');
      await new Promise(r => setTimeout(r, 15000));
    }
    await browser.close();
    log('Agent browser closed. Execution finished.');
  }
})();
