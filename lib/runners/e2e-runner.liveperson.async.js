/*
  © Copyright IBM Corporation 2017, 2022. All Rights Reserved.
  SPDX-License-Identifier: EPL-2.0
*/
const dotenv = require('dotenv');
const Bottleneck = require('bottleneck');
const R = require('ramda');

const runnerType = 'async';

const Promise = require('bluebird');
const Client = require('../fixtures/liveperson-async/client');
const mem = require('../fixtures/liveperson-async/store_conversation_id')();
const { generateSigned } = require('../fixtures/jwt');
const { jwt_api } = require('../fixtures');
const { generateRandom } = require('../fixtures/generate-random');
const config = require('./config');
const { liveperson } = require('../fixtures');
const { shutDownBot, waitOnline } = require('../fixtures/botCrashTestBehaviour');

require('../matchers/e2e-script-matcher');

const setup = (dotenvpath = process.env['DOTENV_PATH']) => {
  const { log, testCases, channel, leaveOpen, cfg } = config(dotenv.config({ path: dotenvpath }), {
    config_path: dotenvpath,
    jwtPrivateKey: process.env[`${process.env.SPACE}_${process.env.ENV}_lp_async_genjwt_private`],
    jwtCompanyBranch: process.env[`${process.env.SPACE}_${process.env.ENV}_lp_async_genjwt_companybranch`],
    jwtCustomerType: process.env[`${process.env.SPACE}_${process.env.ENV}_lp_async_genjwt_customertype`],
    jwtCustomerId: process.env[`${process.env.SPACE}_${process.env.ENV}_lp_async_genjwt_customerid`],
    externalJWT: process.env[`${process.env.SPACE}_${process.env.ENV}_lp_async_external_jwt`],
    accountId: process.env[`${process.env.SPACE}_${process.env.ENV}_lp_async_accountId`],
    cases: process.env[`${process.env.SPACE}_${process.env.ENV}_lp_async_cases`],
    channel: process.env[`${process.env.SPACE}_${process.env.ENV}_lp_async_channel`],
    getJWT_URI: process.env[`${process.env.SPACE}_${process.env.ENV}_lp_async_get_jwt_uri`],
    getJWT_exp: process.env[`${process.env.SPACE}_${process.env.ENV}_lp_async_get_jwt_expiry`],
    getJWT_auth: process.env[`${process.env.SPACE}_${process.env.ENV}_lp_async_get_jwt_auth`],
    getJWT_companyBranch: process.env[`${process.env.SPACE}_${process.env.ENV}_lp_async_get_jwt_companybranch`],
    crashBotURL: process.env[`${process.env.SPACE}_${process.env.ENV}_lp_async_bot_crash_url`],
    skipScriptLines: process.env[`${process.env.SPACE}_${process.env.ENV}_lp_async_skip_script_lines`],
  });

  // Schedule 8 tests at once, unless overriden
  // Regardless, don't parallelise if we're using a single external JWT - that means we need to serialize (for now)
  const limiter = new Bottleneck({
    maxConcurrent:
      cfg.externalJWT && !cfg.jwtPrivateKey && !cfg.getJWT_URI ? 1 : cfg.workers ? parseInt(cfg.workers) : 8,
  });

  const WAIT_FOR_MESSAGE_TIME = 100000;
  const WAIT_FOR_ANOTHER_MESSAGE_TIME = 60000;

  const SKIP_SCRIPT_LINES = cfg.skipScriptLines || 0;

  // Test runner
  async function runTest(testCase) {
    testCase.script = R.reject(R.propSatisfies(type => type && type !== runnerType, 'type'))(testCase.script);
    const startTime = Date.now();

    log.info(`[${testCase.name}]:initClient] - INIT`);
    // Generate an external JWT *just for this test* if provided the private JWT signing key
    // Otherwise, use the static external JWT, if provided
    let jwt = cfg.externalJWT;
    // Assign default value if using external JWT
    let customerId = cfg.jwtCustomerId || 'some static ID';
    // channel - set for bot to recognise channel. sms, facebook, etc. DEFAULT if not defined.
    // setChannel - read channel from test case yml, otherwise use channel.
    const setChannel = testCase.channel ? testCase.channel : channel;
    if (cfg.jwtPrivateKey && cfg.jwtCompanyBranch) {
      const now = new Date().toISOString();
      // Generate unique CustomerId for use with JWT. Makes log search on LP side easier.
      customerId = await (cfg.jwtCustomerId || generateRandom(true, 8, setChannel));
      jwt = generateSigned(cfg.jwtPrivateKey, {
        subject: `customerId: ${customerId}, test-${now}-${cfg.space}-${cfg.env}_${testCase.name}`,
        companyBranch: testCase.skill ? testCase.skill : cfg.jwtCompanyBranch,
        customerType: cfg.jwtCustomerType,
        expires: '2h',
        customerId: customerId,
      });
      log.info('jwt: ', jwt);
    } else if (cfg.getJWT_URI && cfg.getJWT_exp && cfg.getJWT_auth && cfg.getJWT_companyBranch) {
      // Generate unique CustomerId for use with JWT. Makes log search on LP side easier.
      customerId = await (cfg.jwtCustomerId || generateRandom(true, 8, setChannel));
      const companyBranch = testCase.skill ? testCase.skill : cfg.getJWT_companyBranch;
      const now = new Date().toISOString();
      const subject = `customerId: ${customerId}, test-${now}-${cfg.space}-${cfg.env}_${testCase.name}`;
      // use external client API to generate JWT
      let response = await jwt_api.getJWT(
        cfg.getJWT_URI,
        cfg.getJWT_exp,
        cfg.getJWT_auth,
        customerId,
        companyBranch,
        subject
      );
      jwt = response.token;
      log.info('jwt: ', jwt);
    }

    const client = new Client({ accountId: cfg.accountId, externalJwt: jwt });
    // avoid lot's of sockets being opened at the same time
    await liveperson.sleep(generateRandom(false, 200));
    await client.init();
    // add test case name to use in socket logging
    client.socket.testCase = testCase.name;

    // Close any existing conversation - we want a clean slate
    // Again, we want to wait until this has *finished* before continuing
    log.debug(`[${testCase.name}]:initClient] - CLOSE: ${Date.now() - startTime}`);
    await client.closeConversation();

    // Ready to go
    log.debug(`[${testCase.name}]:initClient] - DONE: ${Date.now() - startTime}`);

    return new Promise(resolve => {
      let index = SKIP_SCRIPT_LINES;
      let result = [];

      function sleep(time) {
        let nextMessage = testCase.script[index + 1];
        if (nextMessage) {
          log.info(
            `[${testCase.name}]:initClient] - SLEEPING: ${time} ms before message: ${JSON.stringify(nextMessage)}`
          );
        } else {
          log.info(`[${testCase.name}]:initClient] - SLEEPING: ${time} ms`);
        }
        return new Promise(resolve => {
          setTimeout(() => {
            index++;
            resolve();
          }, time);
        });
      }

      // Resolution & cleanup function
      const done = override => {
        // Immediately stop listening to messages, lest something else jump in before full cleanup
        client.removeAllListeners('message');
        return resolve(override || { result });
      };

      try {
        let messageTimeout;
        let sentMessage;

        // Define a "tick" action
        const tick = async function tick(message) {
          // Did we send a "human" message?
          sentMessage = false;

          // Stop the currently ticking timeout
          messageTimeout && clearTimeout(messageTimeout);

          if (message) {
            // We got a message from the bot
            result.push({ bot: message });
            const line = testCase.script[index];
            if (!line || !line.bot) {
              // Unexpected message - abort immediately
              return done();
            }
            index++;
          }

          // handle pauses (prevent test harness from closing this conversation)
          if (testCase.script[index] && testCase.script[index].sleep) {
            let time = testCase.script[index].sleep;
            result.push({ sleep: time });
            await sleep(time);
          }

          // Let's generate random sleep delay if rsleep value is given
          if (testCase.script[index] && testCase.script[index].rsleep) {
            let time = generateRandom(false, testCase.script[index].rsleep);
            result.push({ rsleep: testCase.script[index].rsleep });
            await sleep(time);
          }

          // chatClosed assertion handler
          if (testCase.script[index] && testCase.script[index].chatClosed) {
            result.push({ chatClosed: client.chatClosed() });
            index++;
          }

          // crash handler to test bot restart test cases
          if (testCase.script[index] && testCase.script[index].crash) {
            log.info(`[${testCase.name}]:initClient] - KILLING BOT`);
            let res = await shutDownBot(cfg.crashBotURL);
            log.info(`[${testCase.name}]:initClient] - ${res}`);
            result.push({ crash: true });
            waitOnline(cfg.crashBotURL, 1000).then(res => {
              log.info(`[${testCase.name}]:initClient] - Bot is ${res.status}`);
            });
            index++;
          }

          next();

          // If counter is beyond the end of the script, stop - this is the expected behaviour
          if (index >= testCase.script.length) {
            return done();
          }

          // Get the timeout ticking again
          messageTimeout = setTimeout(
            () => {
              log.warn(
                `[${testCase.name}]] - TIMEOUT: ${Date.now() - startTime}, CONVERSATION: ${JSON.stringify(
                  mem.get(testCase.name)
                )}, CustomerId: ${customerId}`
              );
              done();
            },
            sentMessage ? WAIT_FOR_MESSAGE_TIME : WAIT_FOR_ANOTHER_MESSAGE_TIME
          );
        };

        const next = async function next() {
          // log.info(`next ${index} >>> ${JSON.stringify(testCase.script[index])}`);
          // Send any outstanding human messages
          while (testCase.script[index] && testCase.script[index].human) {
            const message = testCase.script[index].human;
            await client.send(message);
            if (
              (index === SKIP_SCRIPT_LINES && testCase.script[index].human) ||
              (index === SKIP_SCRIPT_LINES + 1 && testCase.script[index].human)
            ) {
              log.info(
                `[${testCase.name}]:initClient] - NEW CONVERSATION: ${JSON.stringify(
                  mem.get(testCase.name)
                )}, CustomerId: ${customerId}`
              );
            }
            sentMessage = true;
            result.push({ human: message });
            index++;
          }
          if (
            (testCase.script[index] && testCase.script[index].sleep) ||
            (testCase.script[index] && testCase.script[index].rsleep)
          ) {
            tick();
          }
          return;
        };

        // Listen for bot messages
        client.on('message', tick);

        // First tick
        tick();
      } catch (err) {
        // Resolve with error to avoid breaking the test too early and allow other test cases to run
        log.error(
          `[${testCase.name}]] - ERROR: ${Date.now() - startTime}, CONVERSATION: ${JSON.stringify(
            mem.get(testCase.name)
          )}, CustomerId: ${customerId}`,
          err
        );
        return done({ err });
      }
    }).finally(async () => {
      log.debug(
        `[${testCase.name}]:finally] - CLEANUP: ${Date.now() - startTime}, CONVERSATION: ${JSON.stringify(
          mem.get(testCase.name)
        )}, CustomerId: ${customerId}`
      );
      try {
        if (!leaveOpen) await client.closeConversation();
        await client.disconnect();
      } catch (err) {
        return { err };
      }
      log.info(
        `[${testCase.name}]:finally] - END: ${Date.now() - startTime}, CONVERSATION: ${JSON.stringify(
          mem.get(testCase.name)
        )}, CustomerId: ${customerId}`
      );
    });
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
