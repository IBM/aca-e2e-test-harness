/*
  © Copyright IBM Corporation 2017, 2022. All Rights Reserved.
  SPDX-License-Identifier: EPL-2.0
*/
const dotenv = require('dotenv');
const Bottleneck = require('bottleneck');
const R = require('ramda');
const runnerType = 'genesys';

const { genesys } = require('../fixtures');
const config = require('./config');

require('../matchers/e2e-script-matcher');

const setup = (dotenvpath = process.env['DOTENV_PATH']) => {
  const { log, testCases, cfg } = config(dotenv.config({ path: dotenvpath }), {
    config_path: dotenvpath,
    clientId: process.env[`${process.env.SPACE}_${process.env.ENV}_genesys_clientId`],
    clientSecret: process.env[`${process.env.SPACE}_${process.env.ENV}_genesys_clientSecret`],
    domain: process.env[`${process.env.SPACE}_${process.env.ENV}_genesys_domain`],
    cases: process.env[`${process.env.SPACE}_${process.env.ENV}_genesys_cases`],
    skipScriptLines: process.env[`${process.env.SPACE}_${process.env.ENV}_genesys_skip_script_lines`],
  });

  // Schedule 8 tests at once, unless overriden
  const limiter = new Bottleneck({ maxConcurrent: cfg.workers ? parseInt(cfg.workers) : 8 });

  const SKIP_SCRIPT_LINES = cfg.skipScriptLines || 0;

  // Test runner
  async function runTest(testCase) {
    let result = [];
    try {
      const body = await genesys.startChat(cfg.domain, cfg.clientId, cfg.clientSecret);
      log.info(`START [${testCase.name}]: ${body.dialog_id}`);
      let response;
      testCase.script = R.reject(R.propSatisfies(type => type && type !== runnerType, 'type'))(testCase.script);
      for (let index = SKIP_SCRIPT_LINES; index < testCase.script.length; index++) {
        const chat_line = testCase.script[index];
        if (chat_line.bot) {
          if (response) {
            result.push({ bot: response.message.text[0] });
          } else {
            result.push({ bot: body.message.text[0] });
          }
        } else {
          response = await genesys.chat(cfg.domain, cfg.clientId, cfg.clientSecret, body.dialog_id, chat_line.human);
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
