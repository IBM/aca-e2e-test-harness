/*
  © Copyright IBM Corporation 2017, 2022. All Rights Reserved.
  SPDX-License-Identifier: EPL-2.0
*/
const dotenv = require('dotenv');
const Bottleneck = require('bottleneck');
const R = require('ramda');

const runnerType = 'sync';

const { liveperson } = require('../fixtures');
const { generateRandom } = require('../fixtures/generate-random');
const config = require('./config');

require('../matchers/e2e-script-matcher');

const setup = (dotenvpath = process.env['DOTENV_PATH']) => {
  const { log, testCases, delay, cfg } = config(dotenv.config({ path: dotenvpath }), {
    config_path: dotenvpath,
    accountId: process.env[`${process.env.SPACE}_${process.env.ENV}_lp_sync_accountId`],
    skill: process.env[`${process.env.SPACE}_${process.env.ENV}_lp_sync_skill`],
    appKey: process.env.lp_sync_appKey,
    service: process.env.lp_sync_service,
    cases: process.env[`${process.env.SPACE}_${process.env.ENV}_lp_sync_cases`],
    skipScriptLines: process.env[`${process.env.SPACE}_${process.env.ENV}_lp_sync_skip_script_lines`],
    generate: process.env.GENERATE,
  });

  // Schedule 8 tests at once, unless overriden
  const limiter = new Bottleneck({ maxConcurrent: cfg.workers ? parseInt(cfg.workers) : 8 });

  //increased from 50 to 205 for waiting handover message
  const MAX_CHAT_WAIT_COUNT = 205;
  const SKIP_SCRIPT_LINES = cfg.skipScriptLines || 3;

  // Test runner
  async function runTest(testCase) {
    let result = [];
    try {
      const body = await liveperson.getDomain(cfg.accountId, cfg.service);
      const avail = await liveperson.getChatAvailability(body.baseURI, cfg.accountId, cfg.appKey, cfg.skill);
      expect(avail.availability).toBeTruthy();

      let locat;
      if (cfg.generate) {
        const visitorId = await generateRandom(true, 8, '');
        const sessionId = await generateRandom(true, 8, '');
        const contextId = await generateRandom(true, 8, '');
        const LETagIds = {
          LETagVisitorId: visitorId,
          LETagSessionId: sessionId,
          LETagContextId: contextId,
        };
        locat = await liveperson.startChatWithId(body.baseURI, cfg.accountId, cfg.appKey, cfg.skill, LETagIds);
      } else {
        locat = await liveperson.startChat(body.baseURI, cfg.accountId, cfg.appKey, cfg.skill);
      }

      const session = await liveperson.getChatSession(locat.headers.location, cfg.appKey);
      let randomDelay;

      testCase.script = R.reject(R.propSatisfies(type => type && type !== runnerType, 'type'))(testCase.script);

      log.info(`START [${testCase.name}]: ${session}`);
      let correction_counter = 0;
      for (let index = SKIP_SCRIPT_LINES; index < testCase.script.length; index++) {
        const chat_line = testCase.script[index];
        const api_index = index - correction_counter;
        if (chat_line.bot) {
          let text;
          let waitCount = 0;
          const startTime = Date.now();
          log.silly(`LINE START:${index} [${testCase.name}] ${startTime}`);
          while (!text && waitCount <= MAX_CHAT_WAIT_COUNT) {
            await liveperson.sleep(100);
            waitCount++;
            text = await liveperson.getChatSessionEvents(locat.headers.location, cfg.appKey, `${api_index}`);
          }
          log.silly(`LINE END:${index} [${testCase.name}]:${waitCount} - END: ${Date.now() - startTime} - ${text}`);
          if (waitCount >= MAX_CHAT_WAIT_COUNT) {
            return Promise.resolve({ result });
          }

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
          await liveperson.addLine(session, cfg.appKey, chat_line.human);
          result.push({ human: chat_line.human });
        }
      }
    } catch (err) {
      log.error(`END-ERROR [${testCase.name}]`);
      // Resolve with error to avoid breaking the test to early and allow other test cases to run
      return Promise.resolve({ err });
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
