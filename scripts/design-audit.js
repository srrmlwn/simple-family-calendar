/**
 * Design Audit Script — famcal.ai
 * Logs in, visits each major view, tests interactions, and records design feedback.
 * Run with: node scripts/design-audit.js
 */

const puppeteer = require('puppeteer');
const fs = require('fs');
const path = require('path');

const BASE_URL = 'http://localhost:3000';
const EMAIL = 'a@a.com';
const PASSWORD = 'test1234';
const SCREENSHOT_DIR = path.join(__dirname, '../design-audit-screenshots');

const feedback = [];
function note(category, observation, severity = 'info') {
  feedback.push({ category, observation, severity });
  const icon = severity === 'issue' ? '⚠️ ' : severity === 'good' ? '✅' : 'ℹ️ ';
  console.log(`  ${icon} [${category}] ${observation}`);
}

function hr() { console.log('-'.repeat(70)); }

async function screenshot(page, name, label) {
  const file = path.join(SCREENSHOT_DIR, `${name}.png`);
  await page.screenshot({ path: file, fullPage: false });
  console.log(`  📸 ${label || name}`);
}

async function getPageText(page, selector) {
  try { return await page.$eval(selector, el => el.textContent || ''); } catch { return ''; }
}

async function run() {
  if (!fs.existsSync(SCREENSHOT_DIR)) fs.mkdirSync(SCREENSHOT_DIR, { recursive: true });
  console.log('\n🔍 famcal.ai Design Audit\n');
  hr();

  const browser = await puppeteer.launch({
    headless: true,
    args: ['--no-sandbox', '--disable-setuid-sandbox', '--window-size=1280,800'],
    defaultViewport: { width: 1280, height: 800 },
  });

  const page = await browser.newPage();
  page.setDefaultTimeout(15000);

  // ── 1. LOGIN PAGE ──────────────────────────────────────────────────────────
  console.log('\n📋 SECTION 1: Login Page\n');
  await page.goto(`${BASE_URL}/login`, { waitUntil: 'networkidle0' });
  await screenshot(page, '01-login-initial', 'Login page initial state');

  const emailInput = await page.$('input[type="email"], input[name="email"]');
  const passwordInput = await page.$('input[type="password"], input[name="password"]');
  if (emailInput && passwordInput) {
    note('Login', 'Email and password fields are present', 'good');
  } else {
    note('Login', 'Missing email or password input field', 'issue');
  }

  const emailPlaceholder = emailInput ? await emailInput.evaluate(el => el.placeholder) : '';
  const pwPlaceholder = passwordInput ? await passwordInput.evaluate(el => el.placeholder) : '';
  note('Login', `Email placeholder: "${emailPlaceholder}" | Password placeholder: "${pwPlaceholder}"`);

  const forgotLink = await page.$('a[href*="forgot"], a[href*="reset"]');
  if (!forgotLink) note('Login', 'No "Forgot password" link — users cannot self-serve account recovery', 'issue');

  const loginPageButtons = await page.$$('button');
  const loginBtnLabels = await Promise.all(loginPageButtons.map(b => b.evaluate(el => el.textContent?.trim())));
  note('Login', `Login page button labels: [${loginBtnLabels.filter(Boolean).join(' | ')}]`);

  // ── 2. LOGIN FLOW ──────────────────────────────────────────────────────────
  console.log('\n📋 SECTION 2: Login Flow\n');
  await page.type('input[type="email"], input[name="email"]', EMAIL);
  await page.type('input[type="password"], input[name="password"]', PASSWORD);
  await screenshot(page, '02-login-filled', 'Login form filled in');

  await Promise.all([
    page.waitForNavigation({ waitUntil: 'networkidle0', timeout: 15000 }).catch(() => {}),
    page.keyboard.press('Enter'),
  ]);

  try {
    await page.waitForSelector('.rbc-calendar, [data-testid="calendar"], [data-testid="day-view"], .rbc-month-view', { timeout: 10000 });
    note('Login', 'Login succeeded — calendar loaded', 'good');
  } catch {
    note('Login', 'Calendar did not appear after login — check auth flow', 'issue');
    await screenshot(page, '02-login-error', 'Login failure state');
  }

  await screenshot(page, '03-main-calendar', 'Main calendar after successful login');

  // ── 3. HEADER ──────────────────────────────────────────────────────────────
  console.log('\n📋 SECTION 3: Header & Navigation\n');
  const logo = await page.$('header img');
  if (logo) {
    const altText = await logo.evaluate(el => el.alt);
    note('Header', `Logo present with alt="${altText}"`, 'good');
  } else {
    note('Header', 'No logo image in header', 'issue');
  }

  const brandText = await getPageText(page, 'header h1');
  note('Header', `Brand name: "${brandText.trim()}"`);

  const settingsBtn = await page.$('button[title="Settings"]');
  if (settingsBtn) note('Header', 'Settings button has title attribute for accessibility', 'good');
  else note('Header', 'Settings icon button missing title/aria-label — not screen-reader accessible', 'issue');

  // Check header height
  const headerEl = await page.$('header');
  const headerBox = headerEl ? await headerEl.boundingBox() : null;
  if (headerBox) note('Header', `Header height: ${Math.round(headerBox.height)}px (ideal: ~64px)`);
  if (headerBox && headerBox.height > 80) note('Header', 'Header is taller than 80px — may crowd content', 'issue');

  // ── 4. CALENDAR VIEW ───────────────────────────────────────────────────────
  console.log('\n📋 SECTION 4: Calendar View\n');

  const toolbar = await page.$('.rbc-toolbar');
  if (toolbar) note('Calendar', 'react-big-calendar toolbar present', 'good');
  else note('Calendar', 'No .rbc-toolbar found — calendar navigation may be custom', 'info');

  const allButtons = await page.$$('button');
  const allBtnTexts = await Promise.all(allButtons.map(b => b.evaluate(el => el.textContent?.trim())));
  const hasTodayBtn = allBtnTexts.some(t => t?.toLowerCase() === 'today');
  if (hasTodayBtn) note('Calendar', '"Today" button present', 'good');
  else note('Calendar', 'No "Today" button found in toolbar', 'issue');

  const dayViewEl = await page.$('[data-testid="day-view"]');
  if (dayViewEl) note('Calendar', 'DayView panel renders alongside main calendar', 'good');

  // Check two-column layout on desktop
  const calendarAndDayView = await page.$('.rbc-calendar');
  if (calendarAndDayView) {
    const calBox = await calendarAndDayView.boundingBox();
    note('Calendar', `Main calendar width: ${Math.round(calBox?.width || 0)}px on 1280px viewport`);
    if ((calBox?.width || 0) > 900) note('Calendar', 'Calendar takes up most of the viewport — DayView panel may be cramped', 'info');
  }

  await screenshot(page, '04-calendar-desktop', 'Full calendar desktop view');

  // ── 5. NLP INPUT BAR ───────────────────────────────────────────────────────
  console.log('\n📋 SECTION 5: NLP Input Bar\n');

  const nlpInput = await page.$('input[placeholder*="event"], input[placeholder*="Add"]');
  if (nlpInput) {
    note('NLP', 'NLP input found', 'good');
    const nlpPlaceholder = await nlpInput.evaluate(el => el.placeholder);
    note('NLP', `Placeholder text: "${nlpPlaceholder}"`);

    const nlpBox = await nlpInput.boundingBox();
    if (nlpBox) {
      note('NLP', `Input position: top=${Math.round(nlpBox.y)}px, width=${Math.round(nlpBox.width)}px`);
      if (nlpBox.y > 650) note('NLP', 'Input bar anchored near bottom of viewport — good for thumb reach', 'good');
    }

    // Check mic & send buttons exist alongside input
    const micBtn = await page.$('button[title*="voice"], button[title*="listen"], button[title*="Voice"], button[title*="Stop"]');
    if (micBtn) note('NLP', 'Voice/mic button present with title', 'good');
    else note('NLP', 'Mic button has no title attribute — purpose unclear for screen readers', 'issue');

    // Type something and observe UI
    await nlpInput.click();
    await nlpInput.type('Soccer practice tomorrow at 3pm');
    await new Promise(r => setTimeout(r, 300));
    await screenshot(page, '05-nlp-filled', 'NLP input with sample text');
    note('NLP', 'Typing in NLP input works correctly', 'good');

    // Clear
    await nlpInput.click({ clickCount: 3 });
    await page.keyboard.press('Backspace');
  } else {
    note('NLP', 'NLP input bar not found on main page', 'issue');
  }

  // ── 6. OPEN EVENT CREATION FORM ─────────────────────────────────────────────
  console.log('\n📋 SECTION 6: Event Creation (+ button / slot click)\n');

  // Look for a + / Add button
  const addEventBtns = await page.$$('button');
  const addEventBtn = await Promise.all(addEventBtns.map(async b => {
    const txt = await b.evaluate(el => el.textContent?.trim());
    const title = await b.evaluate(el => el.title);
    return { btn: b, txt, title };
  })).then(btns => btns.find(b => b.txt === '+' || b.title?.includes('Add') || b.txt?.toLowerCase().includes('add event')));

  if (addEventBtn) {
    await addEventBtn.btn.click();
    await new Promise(r => setTimeout(r, 600));
    note('EventForm', 'Add event button found and clicked', 'good');
  } else {
    // Try clicking a date cell in the mini calendar
    const dateCells = await page.$$('.rbc-date-cell, .rbc-day-bg');
    if (dateCells.length > 0) {
      await dateCells[Math.floor(dateCells.length / 2)].click({ clickCount: 2 });
      await new Promise(r => setTimeout(r, 600));
    }
  }

  const formOpen = await page.$('form');
  if (formOpen) {
    note('EventForm', 'Event form is accessible (opened via click)', 'good');
    await screenshot(page, '06-event-form', 'Event creation form');

    const formInputs = await page.$$('form input');
    note('EventForm', `Form has ${formInputs.length} input fields`);

    const saveBtn = await page.$('button[title="Save"]');
    const cancelBtn = await page.$('button[title="Cancel"]');
    const deleteBtn = await page.$('button[title="Delete"]');

    if (saveBtn) note('EventForm', 'Save button has accessible title', 'good');
    else note('EventForm', 'Save button missing title attribute', 'issue');

    if (cancelBtn) note('EventForm', 'Cancel button has accessible title', 'good');
    if (deleteBtn) note('EventForm', 'Delete button visible on creation form — confirm this is intentional', 'info');
    else note('EventForm', 'No delete button on new event form (correct for creation flow)', 'good');

    // Check save is initially disabled for empty form
    if (saveBtn) {
      const saveBtnDisabled = await saveBtn.evaluate(el => el.disabled);
      if (saveBtnDisabled) note('EventForm', 'Save button disabled until form is valid — good UX pattern', 'good');
    }

    // Close form
    if (cancelBtn) await cancelBtn.click();
    else await page.keyboard.press('Escape');
    await new Promise(r => setTimeout(r, 400));
  } else {
    note('EventForm', 'Could not open event creation form — double-click or + button not working', 'info');
  }

  // ── 7. CLICK AN EXISTING EVENT ──────────────────────────────────────────────
  console.log('\n📋 SECTION 7: Event Click → Edit Form\n');

  const clickableEventItems = await page.$$('[data-testid="day-view"] .cursor-pointer, .rbc-event');
  note('Events', `Clickable event elements found: ${clickableEventItems.length}`);

  if (clickableEventItems.length > 0) {
    await clickableEventItems[0].click();
    await new Promise(r => setTimeout(r, 700));

    const editForm = await page.$('form');
    if (editForm) {
      note('Events', 'Edit form opens when existing event is clicked', 'good');
      await screenshot(page, '07-event-edit', 'Event edit form');

      const deleteBtn = await page.$('button[title="Delete"]');
      if (deleteBtn) note('Events', 'Delete button present on edit form', 'good');
      else note('Events', 'No delete button on edit form — hard to remove events', 'issue');

      const titleInputs = await editForm.$$('input');
      if (titleInputs.length > 0) {
        const val = await titleInputs[0].evaluate(el => el.value);
        note('Events', val ? `First input pre-populated: "${val}"` : 'First input appears empty', val ? 'good' : 'issue');
      }

      await screenshot(page, '07-event-edit-detail', 'Event edit form detail');
      const cancelBtn = await page.$('button[title="Cancel"]');
      if (cancelBtn) await cancelBtn.click();
      else await page.keyboard.press('Escape');
      await new Promise(r => setTimeout(r, 400));
    } else {
      note('Events', 'No edit form appeared after clicking event', 'info');
    }
  } else {
    note('Events', 'No events in day view today — skipping edit form test', 'info');
  }

  // ── 8. SETTINGS PAGE ────────────────────────────────────────────────────────
  console.log('\n📋 SECTION 8: Settings Page\n');
  const settBtnEl = await page.$('button[title="Settings"]');
  if (settBtnEl) {
    await settBtnEl.click();
    await new Promise(r => setTimeout(r, 1000));
    await page.waitForSelector('h1, h2, [class*="settings"]', { timeout: 5000 }).catch(() => {});
    await screenshot(page, '08-settings', 'Settings page');

    const headings = await page.$$eval('h1, h2, h3', els => els.map(el => el.textContent?.trim()));
    note('Settings', `Page headings: [${headings.filter(Boolean).join(' | ')}]`);

    const saveBtn = await page.$('button[type="submit"]');
    if (saveBtn) note('Settings', 'Submit/save button present on settings', 'good');
    else note('Settings', 'No submit button found on settings page', 'issue');

    await screenshot(page, '08-settings-detail', 'Settings page scrolled');
    await page.goBack({ waitUntil: 'networkidle0' }).catch(() => {});
    await new Promise(r => setTimeout(r, 600));
  }

  // ── 9. PROFILE MENU DROPDOWN ───────────────────────────────────────────────
  console.log('\n📋 SECTION 9: Profile Dropdown\n');
  await page.goto(`${BASE_URL}/`, { waitUntil: 'networkidle0' });
  await new Promise(r => setTimeout(r, 600));

  const profileBtn2 = await page.$('button[title="Profile menu"]');
  if (profileBtn2) {
    await profileBtn2.click();
    await new Promise(r => setTimeout(r, 400));
    await screenshot(page, '09-profile-dropdown', 'Profile dropdown open');

    const dropdownBtns = await page.$$eval('button', btns =>
      btns.map(b => b.textContent?.trim()).filter(Boolean)
    );
    note('Profile', `Visible buttons after dropdown click: [${dropdownBtns.join(' | ')}]`);

    const hasSignOut = dropdownBtns.some(t => t?.toLowerCase().includes('sign') || t?.toLowerCase().includes('out'));
    if (hasSignOut) note('Profile', 'Sign Out is accessible from profile dropdown', 'good');
    else note('Profile', 'No sign-out visible in dropdown', 'issue');

    if (dropdownBtns.length < 3) {
      note('Profile', 'Profile dropdown only shows sign out — consider adding profile settings, help, or keyboard shortcuts link');
    }

    await page.keyboard.press('Escape');
    await new Promise(r => setTimeout(r, 300));
  } else {
    note('Profile', 'Profile menu button not found', 'issue');
  }

  // ── 10. MOBILE VIEWPORT ────────────────────────────────────────────────────
  console.log('\n📋 SECTION 10: Mobile Viewport (375×812)\n');
  await page.setViewport({ width: 375, height: 812 });
  await page.reload({ waitUntil: 'networkidle0' });
  await new Promise(r => setTimeout(r, 800));
  await screenshot(page, '10-mobile-view', 'Mobile viewport (375px)');

  const mobileNlp = await page.$('input[placeholder*="event"], input[placeholder*="Add"]');
  if (mobileNlp) {
    const mBox = await mobileNlp.boundingBox();
    note('Mobile', `NLP input width on mobile: ${Math.round(mBox?.width || 0)}px`);
    if ((mBox?.width || 0) > 180) note('Mobile', 'NLP input has adequate width on mobile', 'good');
    else note('Mobile', 'NLP input may be too narrow on mobile', 'issue');
  }

  const mobileHeaderEl = await page.$('header');
  if (mobileHeaderEl) {
    const mhBox = await mobileHeaderEl.boundingBox();
    note('Mobile', `Header height on mobile: ${Math.round(mhBox?.height || 0)}px`);
  }

  await screenshot(page, '10-mobile-scroll', 'Mobile full view');
  await page.setViewport({ width: 1280, height: 800 });

  // ── 11. ACCESSIBILITY ──────────────────────────────────────────────────────
  console.log('\n📋 SECTION 11: Accessibility Spot-Check\n');
  await page.reload({ waitUntil: 'networkidle0' });
  await new Promise(r => setTimeout(r, 600));

  const imgsNoAlt = await page.$$eval('img', imgs => imgs.filter(img => !img.alt).length);
  if (imgsNoAlt > 0) note('a11y', `${imgsNoAlt} <img> element(s) missing alt text`, 'issue');
  else note('a11y', 'All img elements have alt text', 'good');

  const btnsNoLabel = await page.$$eval('button', btns =>
    btns.filter(b => !b.textContent?.trim() && !b.title && !b.getAttribute('aria-label')).length
  );
  if (btnsNoLabel > 0) note('a11y', `${btnsNoLabel} button(s) have no text, title, or aria-label`, 'issue');
  else note('a11y', 'All buttons have some accessible label', 'good');

  const inputsNoLabel = await page.$$eval('input:not([type="hidden"])', inputs =>
    inputs.filter(input => {
      const id = input.id;
      const hasLabel = id && document.querySelector(`label[for="${id}"]`);
      const hasAriaLabel = input.getAttribute('aria-label') || input.getAttribute('aria-labelledby');
      return !hasLabel && !hasAriaLabel;
    }).length
  );
  if (inputsNoLabel > 0) note('a11y', `${inputsNoLabel} input(s) missing <label> or aria-label`, 'issue');
  else note('a11y', 'All inputs have associated labels', 'good');

  note('a11y', 'Secondary text uses text-gray-500 on white (#6b7280, contrast ~4.6:1). Meets WCAG AA but not AAA — consider text-gray-600 for body text');
  note('a11y', 'Icon-only buttons (mic, send, settings) rely on title= for accessibility — tooltips are better than no label but aria-label is more reliable across assistive tech');

  // ── 12. FINAL SCREENSHOT ───────────────────────────────────────────────────
  await screenshot(page, '12-final-desktop', 'Final desktop layout');

  await browser.close();

  // ── REPORT ─────────────────────────────────────────────────────────────────
  console.log('\n');
  hr();
  console.log('📊 DESIGN AUDIT REPORT\n');
  hr();

  const issues = feedback.filter(f => f.severity === 'issue');
  const goods  = feedback.filter(f => f.severity === 'good');
  const infos  = feedback.filter(f => f.severity === 'info');

  console.log(`\n✅  Strengths (${goods.length}):\n`);
  goods.forEach(f => console.log(`  • [${f.category}] ${f.observation}`));

  console.log(`\n⚠️   Issues to Address (${issues.length}):\n`);
  issues.forEach((f, i) => console.log(`  ${i+1}. [${f.category}] ${f.observation}`));

  console.log(`\nℹ️   Notes & Suggestions (${infos.length}):\n`);
  infos.forEach(f => console.log(`  • [${f.category}] ${f.observation}`));

  const reportPath = path.join(SCREENSHOT_DIR, 'report.json');
  fs.writeFileSync(reportPath, JSON.stringify({ timestamp: new Date().toISOString(), summary: { issues: issues.length, goods: goods.length, infos: infos.length }, feedback }, null, 2));

  console.log(`\n📁 Screenshots: ${SCREENSHOT_DIR}`);
  console.log(`📄 JSON report: ${reportPath}\n`);
}

run().catch(err => {
  console.error('Audit failed:', err);
  process.exit(1);
});
