/*
  © Copyright IBM Corporation 2017, 2022. All Rights Reserved.
  SPDX-License-Identifier: EPL-2.0
*/
const dotenv = require('dotenv');
const Bottleneck = require('bottleneck');
const R = require('ramda');
const { liveperson } = require('../fixtures');
const puppeteer = require('puppeteer');
const { TimeoutError } = require('puppeteer/Errors');
const { generateRandom } = require('../fixtures/generate-random');
const { kill } = require('../fixtures');

const runnerType = 'sync-chrome';

const config = require('./config');

require('../matchers/e2e-script-matcher');

const setup = (dotenvpath = process.env['DOTENV_PATH']) => {
  const { log, testCases, delay, leaveOpen, cfg } = config(dotenv.config({ path: dotenvpath }), {
    config_path: dotenvpath,
    url: process.env[`${process.env.SPACE}_${process.env.ENV}_lp_sync_chrome_url`],
    cases: process.env[`${process.env.SPACE}_${process.env.ENV}_lp_sync_chrome_cases`],
    skipScriptLines: process.env[`${process.env.SPACE}_${process.env.ENV}_lp_sync_chrome_skip_script_lines`],
  });

  // Schedule 8 tests at once, unless overriden
  const limiter = new Bottleneck({ maxConcurrent: cfg.workers ? parseInt(cfg.workers) : 8 });

  const SKIP_SCRIPT_LINES = cfg.skipScriptLines || 0;

  const headless = cfg.headless || false;
  const queryParams = cfg.queryParams ? '?' + cfg.queryParams : '';

  // Test runner
  async function runTest(testCase) {
    let result = [];
    let browser;
    let page;
    let pid;
    try {
      browser = await puppeteer.launch({ headless: headless });
      pid = browser.process().pid;
      log.info(`BROWSER-PID:${pid} [${testCase.name}]`);
      // browser.on('disconnect', () => {
      //   return Promise.resolve({ result });
      // });
      page = await browser.newPage();
      await page.setDefaultTimeout(40000); // 40 seconds timeout
      log.info(cfg.url + queryParams);
      await page.goto(cfg.url + queryParams);
      await page.waitForSelector('.LPMcontainer');
      log.info(`LPMcontainer loaded: [${testCase.name}]`);
      await page.click('.LPMcontainer');
      log.info(`LPMcontainer was clicked: [${testCase.name}]`);

      let randomDelay;

      testCase.script = R.reject(R.propSatisfies(type => type && type !== runnerType, 'type'))(testCase.script);

      log.info(`START [${testCase.name}]`);
      let correction_counter = 0;
      let api_index = 0;
      await page.waitForSelector(`#lp_line_1`);
      let line1 = await page.$eval(`#lp_line_1`, e => e.innerText);
      log.info(`Line1 loaded: ${line1} [${testCase.name}]`);
      for (let index = SKIP_SCRIPT_LINES; index < testCase.script.length; index++) {
        const chat_line = testCase.script[index];
        api_index = index - correction_counter;
        if (chat_line.bot) {
          let text;
          const startTime = Date.now();

          log.silly(`LINE START:${index} [${testCase.name}] ${startTime}`);
          await page.waitForSelector(`#lp_line_bubble_${api_index + 2}`);
          text = await page.$eval(`#lp_line_bubble_${api_index + 2}`, e => e.innerText);
          log.silly(`LINE END:${index} [${testCase.name}] - END: ${Date.now() - startTime} - ${text}`);

          result.push({ bot: text });
        } else if (chat_line.sleep) {
          let time = chat_line.sleep;
          result.push({ sleep: time });
          await liveperson.sleep(time);
          correction_counter++;
        } else if (chat_line.rsleep) {
          let time = generateRandom(false, chat_line.rsleep);
          result.push({ rsleep: chat_line.rsleep });
          await liveperson.sleep(time);
          correction_counter++;
        } else {
          randomDelay = delay ? generateRandom(false, delay) : 0;
          await liveperson.sleep(randomDelay);
          await page.focus('.lpview_form_textarea');
          await page.keyboard.type(chat_line.human);
          await page.keyboard.press('Enter');
          result.push({ human: chat_line.human });
        }
      }
    } catch (err) {
      if (err instanceof TimeoutError) {
        log.warn('TIMEOUT', err);
        try {
          // cleanup
          await browser.close();
          await kill.treeKill(pid, 'SIGKILL');
        } catch (err) {
          log.error(`BROWSER-PROCESS-KILL-ERROR [${testCase.name}]`);
        }
        return Promise.resolve({ result });
      }
      log.error(`END-ERROR [${testCase.name}]`);
      // Resolve with error to avoid breaking the test to early and allow other test cases to run
      try {
        // cleanup
        await browser.close();
        await kill.treeKill(pid, 'SIGKILL');
      } catch (err) {
        log.error(`BROWSER-PROCESS-KILL-ERROR [${testCase.name}]`);
      }
      return Promise.resolve({ err });
    } finally {
      try {
        if (!leaveOpen) {
          await page.evaluate(() => {
            document.querySelectorAll('.lp_close')[1].click();
          });
          await page.waitForSelector('.lp_confirm_button');
          const handles = await page.$$('.lp_confirm_button');
          for (const handle of handles) await handle.click();
        }
        await browser.close();
      } catch (err) {
        log.error(`CLOSE-ERROR [${testCase.name}]`);
      }
      try {
        // When done, kill it with fire
        await kill.treeKill(pid, 'SIGKILL');
      } catch (err) {
        log.error(`BROWSER-PROCESS-KILL-ERROR [${testCase.name}]`);
      }
    }
    log.info(`END - SUCCESS [${testCase.name}]`);
    return Promise.resolve({ result });
  }

  const runner = () =>
    testCases.map(testCase => {
      // Run the test inside the limiter
      const p = limiter.schedule(runTest, testCase);

      it(`Test case ${testCase.name}`, () => {
        // Wait for the result of this particular test (as run through the limiter)
        return p.then(res => {
          expect(res.err).toBeUndefined();
          expect(res.result).toMatchScript(testCase.script.slice(SKIP_SCRIPT_LINES), runnerType);
        });
      });
    });

  return { cfg, runner };
};

module.exports = setup;
