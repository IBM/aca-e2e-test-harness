/*
  © Copyright IBM Corporation 2017, 2022. All Rights Reserved.
  SPDX-License-Identifier: EPL-2.0
*/
const dotenv = require('dotenv');
const Bottleneck = require('bottleneck');

const { wva } = require('../fixtures');
const config = require('./config');

require('../matchers/e2e-script-matcher');

const setup = (dotenvpath = process.env['DOTENV_PATH']) => {
  const { log, testCases, delay, cfg } = config(dotenv.config({ path: dotenvpath }), {
    config_path: dotenvpath,
    clientId: process.env[`${process.env.SPACE}_${process.env.ENV}_wva_clientId`],
    clientSecret: process.env[`${process.env.SPACE}_${process.env.ENV}_wva_clientSecret`],
    domain: process.env[`${process.env.SPACE}_${process.env.ENV}_wva_domain`],
    botId: process.env[`${process.env.SPACE}_${process.env.ENV}_wva_botId`],
    cases: process.env[`${process.env.SPACE}_${process.env.ENV}_wva_cases`],
  });

  // Schedule 8 tests at once, unless overriden
  const limiter = new Bottleneck({ maxConcurrent: cfg.workers ? parseInt(cfg.workers) : 8 });

  // Test runner
  async function runTest(testCase) {
    let result = [];
    try {
      const body = await wva.startChat(cfg.domain, cfg.clientId, cfg.clientSecret, 20000, cfg.botId);
      // log.info(`START [${testCase.name}]: ${body.dialog_id}`);
      let response;
      for (let index = 0; index < testCase.script.length; index++) {
        const chat_line = testCase.script[index];
        if (chat_line.bot) {
          if (response) {
            log.info(`Intents of [${testCase.name}]: ${JSON.stringify(response.message.intents)}`);
            // Sadly we need this pause because winston needs to flush.
            await wva.sleep(500);
            result.push({ bot: response.message.text[0] });
            // console.log(response.message.intents);
          }
        } else {
          await wva.sleep(delay);
          response = await wva.chat(
            cfg.domain,
            cfg.clientId,
            cfg.clientSecret,
            body.dialog_id,
            chat_line.human,
            20000,
            cfg.botId
          );
          result.push({ human: chat_line.human });
        }
      }
    } catch (err) {
      log.error(`END-ERROR [${testCase.name}]`);
      // Resolve with error to avoid breaking the test to early and allow other test cases to run
      return Promise.resolve({ err });
    }
    // log.info(`END - SUCCESS [${testCase.name}]`);
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
          expect(res.result).toMatchScript(testCase.script, 'wva');
        });
      });
    });

  return { cfg, runner };
};

module.exports = setup;
