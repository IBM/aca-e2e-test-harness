/*
  © Copyright IBM Corporation 2017, 2022. All Rights Reserved.
  SPDX-License-Identifier: EPL-2.0
*/
const dotenv = require('dotenv');
const Bottleneck = require('bottleneck');
const R = require('ramda');
const Joi = require('joi');

const Promise = require('bluebird');
const Client = require('../fixtures/chat-api/client');
const config = require('./config');
const { generateRandom } = require('../fixtures/generate-random');

const runnerType = 'chat-api';

require('../matchers/e2e-script-matcher');

const setup = (dotenvpath = process.env['DOTENV_PATH']) => {
  let rawAttachments = process.env[`${process.env.SPACE}_${process.env.ENV}_chat_api_assert_raw_attachments`];
  const { log, testCases, cfg } = config(dotenv.config({ path: dotenvpath }), {
    config_path: dotenvpath,
    cases: process.env[`${process.env.SPACE}_${process.env.ENV}_chat_api_cases`],
    domain: process.env[`${process.env.SPACE}_${process.env.ENV}_chat_api_domain`],
    skipScriptLines: process.env[`${process.env.SPACE}_${process.env.ENV}_chat_api_skip_script_lines`],
    rawAttachments: rawAttachments === false || rawAttachments === 'false' ? false : true, // dotenv workaround included
  });

  let auth;
  switch (process.env[`${process.env.SPACE}_${process.env.ENV}_chat_api_auth`]) {
    // Add additional auth logic here
    case 'basic':
      auth = {
        user: process.env[`${process.env.SPACE}_${process.env.ENV}_chat_api_username`],
        password: process.env[`${process.env.SPACE}_${process.env.ENV}_chat_api_password`],
      };
      break;
    default:
      log.warn('This type of auth is not supported! Authentication parameters are not set!');
      break;
  }

  // Schedule 8 tests at once, unless overriden
  const limiter = new Bottleneck({ maxConcurrent: cfg.workers ? parseInt(cfg.workers) : 8 });

  const WAIT_FOR_MESSAGE_TIME = 25000;
  const WAIT_FOR_ANOTHER_MESSAGE_TIME = 25000;

  const SKIP_SCRIPT_LINES = cfg.skipScriptLines || 0;

  // Test runner
  async function runTest(testCase) {
    testCase.script = R.reject(R.propSatisfies(type => type && type !== runnerType, 'type'))(testCase.script);
    const startTime = Date.now();
    const client = Client(testCase.name, {
      url: cfg.domain,
      auth: auth,
    });

    log.info(`[${testCase.name}]:[initClient] - INIT`);

    let conversationId = await client.init(testCase.context);
    log.info(`[${testCase.name}]:[initClient] [${conversationId}] - NEW CONVERSATION`);
    log.info(`[${testCase.name}]:[initClient] [${conversationId}] - metadata:`, testCase.context);

    // Ready to go
    log.debug(`[${testCase.name}]:[initClient] [${conversationId}] - DONE: ${Date.now() - startTime}`);

    return new Promise(resolve => {
      let index = SKIP_SCRIPT_LINES;
      let result = [];

      function sleep(time) {
        let nextMessage = testCase.script[index + 1];
        if (nextMessage) {
          log.info(
            `[${
              testCase.name
            }]:[initClient] [${conversationId}] - SLEEPING: ${time} ms before message: ${JSON.stringify(nextMessage)}`
          );
        } else {
          log.info(`[${testCase.name}]:[initClient] [${conversationId}] - SLEEPING: ${time} ms`);
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

      const validateButtons = buttonPayload => {
        const buttonSchema = Joi.object().keys({
          type: Joi.string().required(),
          attributes: Joi.array().optional(),
          attachments: Joi.array()
            .items(
              Joi.object().keys({
                type: Joi.string()
                  .valid('text')
                  .required(),
                title: Joi.string().required(),
                payload: Joi.string()
                  .required()
                  .valid(Joi.ref('title')),
              })
            )
            .required(),
        });

        const validation = buttonSchema.validate(buttonPayload);
        if (validation.error) {
          log.error(
            `[${testCase.name}]:[buttonsReceived] [${conversationId}] - ${JSON.stringify(
              buttonPayload
            )} -  ERROR: ${Date.now() - startTime}`
          );
          throw new Error(
            `E2E test harness received incorrect button payload: ${
              validation.error
            }, Payload received from the adapter: ${JSON.stringify(buttonPayload)}`
          );
        }
        let parsedButtonArray = [];
        buttonPayload.attachments.map(attachment => parsedButtonArray.push(attachment.title));
        return parsedButtonArray;
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
            if (message.text) result.push({ bot: message.text });
            if (message.attachment && cfg.rawAttachments) {
              result.push({ attachment: message.attachment });
            } else if (message.attachment && message.attachment.type && message.attachment.type == 'buttons') {
              let parsedButtons = validateButtons(message.attachment);
              log.info(JSON.stringify(parsedButtons));
              result.push({ buttons: JSON.stringify(parsedButtons) });
            } else if (message.attachment) {
              result.push({ unexpectedAttachment: message.attachment });
            }
            const line = testCase.script[index];
            if (!line || (!line.bot && !line.quick_replies && !line.attachment && !line.buttons)) {
              // Unexpected message - abort immediately
              return done();
            }
            index++;
            if (message.text && message.attachment) index++;
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
            const currentTime = testCase.script[index].timeout ? { currentTime: 1607348967 } : null; // set currentTime that has already passed
            const context = testCase.script[index].context;
            client.send(message, context, currentTime);
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
      // try {
      await client.disconnect();
      // } catch (err) {
      //   return { err };
      // }
      log.info(`[${testCase.name}]:[finally] [${conversationId}] - END: ${Date.now() - startTime}`);
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
