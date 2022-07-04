/*
  © Copyright IBM Corporation 2017, 2022. All Rights Reserved.
  SPDX-License-Identifier: EPL-2.0
*/
const dotenv = require('dotenv');
const Bottleneck = require('bottleneck');
const R = require('ramda');

const Promise = require('bluebird');
const Client = require('../fixtures/socketio/client');
const config = require('./config');
const { generateRandom } = require('../fixtures/generate-random');

const runnerType = 'socketio';

// Comes with v4.0
// const lineGenerator = require('../fixtures/human-line-generator');

require('../matchers/e2e-script-matcher');

const setup = (dotenvpath = process.env['DOTENV_PATH']) => {
  const { log, testCases, cfg } = config(dotenv.config({ path: dotenvpath }), {
    config_path: dotenvpath,
    username: process.env[`${process.env.SPACE}_${process.env.ENV}_socketio_auth_username`],
    password: process.env[`${process.env.SPACE}_${process.env.ENV}_socketio_auth_password`],
    authUrl: process.env[`${process.env.SPACE}_${process.env.ENV}_socketio_auth_url`],
    url: process.env[`${process.env.SPACE}_${process.env.ENV}_socketio_url`],
    secretOrPrivateKey: process.env[`${process.env.SPACE}_${process.env.ENV}_socketio_secretOrPrivateKey`],
    path: process.env[`${process.env.SPACE}_${process.env.ENV}_socketio_path`],
    cases: process.env[`${process.env.SPACE}_${process.env.ENV}_socketio_cases`],
    skipScriptLines: process.env[`${process.env.SPACE}_${process.env.ENV}_socketio_skip_script_lines`],
    profileEmail: process.env[`${process.env.SPACE}_${process.env.ENV}_socketio_profile_email`],
    profileCountryCode: process.env[`${process.env.SPACE}_${process.env.ENV}_socketio_profile_country_code`],
  });

  // Schedule 8 tests at once, unless overriden
  const limiter = new Bottleneck({ maxConcurrent: cfg.workers ? parseInt(cfg.workers, 10) : 8 });

  const WAIT_FOR_MESSAGE_TIME = 15000;
  const WAIT_FOR_ANOTHER_MESSAGE_TIME = 10000;

  const SKIP_SCRIPT_LINES = cfg.skipScriptLines || 0;

  // Test runner
  async function runTest(testCase) {
    const email = testCase.email ? testCase.email : cfg.profileEmail || '';
    const countryCode = testCase.country ? testCase.country : cfg.profileCountryCode || '';
    testCase.script = R.reject(R.propSatisfies(type => type && type !== runnerType, 'type'))(testCase.script);
    const startTime = Date.now();
    const client = Client(testCase.name, {
      url: cfg.url,
      path: cfg.path,
      authUrl: cfg.authUrl,
      username: cfg.username,
      password: cfg.password,
      secretOrPrivateKey: cfg.secretOrPrivateKey,
      profileEmail: email,
      profileCountryCode: countryCode,
    });

    log.info(`[${testCase.name}]:[initClient] - INIT`);

    await client.init(WAIT_FOR_MESSAGE_TIME);
    log.debug(`[${testCase.name}]:[initClient] - DONE: ${Date.now() - startTime}`);

    // add test case name to use in socket logging
    // client.socket.testCase = testCase.name;

    // Close any existing conversation - we want a clean slate
    // Again, we want to wait until this has *finished* before continuing
    // log.debug(`[${testCase.name}]:[initClient] - CLOSE: ${Date.now() - startTime}`);
    // await client.disconnect();

    // Ready to go
    log.debug(`[${testCase.name}]:[initClient] - DONE: ${Date.now() - startTime}`);

    return new Promise(resolve => {
      let index = SKIP_SCRIPT_LINES;
      let result = [];

      function sleep(time) {
        let nextMessage = testCase.script[index + 1];
        if (nextMessage) {
          log.info(
            `[${testCase.name}]:[initClient] - SLEEPING: ${time} ms before message: ${JSON.stringify(nextMessage)}`
          );
        } else {
          log.info(`[${testCase.name}]:[initClient] - SLEEPING: ${time} ms`);
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
        client.disconnect();
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

          if (
            message &&
            message.message &&
            (message.message.text || message.message.quick_replies || message.message.attachment)
          ) {
            // We got a message from the bot
            // log.info('bbbbbbbbb', message);
            if (message.message.text) result.push({ bot: message.message.text });
            if (message.message.attachment) result.push({ attachment: JSON.stringify(message.message.attachment) });
            if (message.message.quick_replies)
              result.push({ quick_replies: JSON.stringify(message.message.quick_replies) });
            const line = testCase.script[index];
            if (!line || (!line.bot && !line.quick_replies && !line.attachment)) {
              // Unexpected message - abort immediately
              return done();
            }
            index++;
            if (message.message.text && message.message.quick_replies) index++;
            if (message.message.text && message.message.attachment) index++;
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
          next();

          // If counter is beyond the end of the script, stop - this is the expected behaviour
          if (index >= testCase.script.length) {
            return done();
          }

          // Get the timeout ticking again
          messageTimeout = setTimeout(
            () => {
              log.warn(`[${testCase.name}]] - TIMEOUT: ${Date.now() - startTime}`);
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
            client.send(message);
            if (
              (index === SKIP_SCRIPT_LINES && testCase.script[index].human) ||
              (index === SKIP_SCRIPT_LINES + 1 && testCase.script[index].human)
            ) {
              log.info(`[${testCase.name}]:[initClient] - NEW CONVERSATION`);
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
        log.error(`[${testCase.name}]] - ERROR: ${Date.now() - startTime}`, err);
        return done({ err });
      }
    }).finally(async () => {
      log.debug(`[${testCase.name}]:[finally] - CLEANUP: ${Date.now() - startTime}`);
      try {
        await client.disconnect();
      } catch (err) {
        return { err };
      }
      log.info(`[${testCase.name}]:[finally] - END: ${Date.now() - startTime}`);
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
