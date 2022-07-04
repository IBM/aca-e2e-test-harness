/*
  IBM Services Artificial Intelligence Development Toolkit ISAIDT

  Licensed Materials - Property of IBM
  6949-70S

  © Copyright IBM Corp. 2019 All Rights Reserved
  US Government Users Restricted Rights - Use, duplication or disclosure restricted by GSA ADP Schedule Contract with IBM Corp.
*/
const dotenv = require('dotenv');
const Bottleneck = require('bottleneck');
const R = require('ramda');

const runnerType = 'imi';

const { imi } = require('../fixtures');
const { generateRandom } = require('../fixtures/generate-random');
const config = require('./config');

require('../matchers/e2e-script-matcher');

const setup = (dotenvpath = process.env['DOTENV_PATH']) => {
  const { log, testCases, delay, cfg } = config(dotenv.config({ path: dotenvpath }), {
    config_path: dotenvpath,
    sendMessageURI: process.env[`${process.env.SPACE}_${process.env.ENV}_imi_send_message_url`],
    getMessageURI: process.env[`${process.env.SPACE}_${process.env.ENV}_imi_get_message_url`],
    clientId: process.env[`${process.env.SPACE}_${process.env.ENV}_imi_clientId`],
    cases: process.env[`${process.env.SPACE}_${process.env.ENV}_imi_cases`],
    skipScriptLines: process.env[`${process.env.SPACE}_${process.env.ENV}_imi_skip_script_lines`],
  });

  const limiter = new Bottleneck({ maxConcurrent: cfg.workers ? parseInt(cfg.workers) : 8 });
  const SKIP_SCRIPT_LINES = cfg.skipScriptLines || 0;

  const MAX_CHAT_WAIT_COUNT = 60;

  async function runTest(testCase) {
    const dialog_id = await generateRandom(true, 18, '');
    let result = [];
    try {
      let randomDelay;
      testCase.script = R.reject(R.propSatisfies(type => type && type !== runnerType, 'type'))(testCase.script);

      log.info(`START [${testCase.name}] [DIALOG][ID]:${dialog_id}`);
      for (let index = SKIP_SCRIPT_LINES; index < testCase.script.length; index++) {
        const chat_line = testCase.script[index];
        if (chat_line.bot || chat_line.quick_replies || chat_line.bot_event) {
          let waitCount = 0;
          let somethingUsefulReceived = false;
          let eventTypes = [
            'update_intents',
            'log_agent_announcement',
            'chat_closure',
            'handover_to_agent',
            'delivery_receipt',
          ];
          const startTime = Date.now();
          log.silly(`LINE START:${index} [${testCase.name}]: start time:${startTime} [DIALOG][ID]:${dialog_id}`);
          while (!somethingUsefulReceived && waitCount <= MAX_CHAT_WAIT_COUNT) {
            await imi.sleep(1000);
            waitCount++;
            let res = await imi.getMessage(cfg.getMessageURI, dialog_id);
            let text = R.path(['body', 'payload', 'message', 'text'])(res);
            let eventType = R.path(['event_type'])(res);
            let items = R.path([
              'body',
              'payload',
              'message',
              'interactiveData',
              'data',
              'listPicker',
              'sections',
              '0',
              'items',
            ])(res);

            if (text) {
              somethingUsefulReceived = true;
              log.silly(
                `LINE END:${index} [${testCase.name}]:${waitCount} - END: ${Date.now() -
                  startTime} [DIALOG][ID]:${dialog_id} - ${text}`
              );
              result.push({ bot: text });
            }

            if (items) {
              let results = '';
              somethingUsefulReceived = true;
              if (Array.isArray(items) && items.length > 0) {
                for (let i = 0; i < items.length - 1; i++) {
                  results += `${items[i].title}|`;
                }
                results += `${items[items.length - 1].title}`;
              }
              log.silly(
                `LINE END:${index} [${testCase.name}]:${waitCount} - END: ${Date.now() -
                  startTime} [DIALOG][ID]:${dialog_id} - ${results}`
              );
              result.push({ quick_replies: results });
            }

            if (eventTypes.includes(eventType)) {
              somethingUsefulReceived = true;
              log.silly(
                `LINE END:${index} [${testCase.name}]:${waitCount} - END: ${Date.now() -
                  startTime} [DIALOG][ID]:${dialog_id} - ${eventType}`
              );
              result.push({ bot_event: eventType });
            }
          }
          if (waitCount >= MAX_CHAT_WAIT_COUNT) {
            return Promise.resolve({ result });
          }
        } else if (chat_line.human) {
          randomDelay = delay ? generateRandom(false, delay) : 0;
          await imi.sleep(randomDelay);
          await imi.sendMessage(cfg.sendMessageURI, dialog_id, chat_line.human, testCase.channel);
          result.push({ human: chat_line.human });
        } else if (chat_line.sleep) {
          let time = chat_line.sleep;
          await imi.sleep(time);
          result.push({ sleep: time });
        } else if (chat_line.rsleep) {
          let time = generateRandom(false, chat_line.rsleep);
          await imi.sleep(time);
          result.push({ rsleep: chat_line.rsleep });
        }
      }
    } catch (err) {
      log.error(`END-ERROR [${testCase.name}][DIALOG][ID]:${dialog_id}`);
      return Promise.resolve({ err });
    }
    log.info(`END - SUCCESS [${testCase.name}][DIALOG][ID]:${dialog_id}`);
    return Promise.resolve({ result });
  }

  const runner = () =>
    testCases.map(testCase => {
      const p = limiter.schedule(runTest, testCase);

      it(`Test case ${testCase.name}`, () => {
        return p.then(res => {
          expect(res.err).toBeUndefined();
          expect(res.result).toMatchScript(testCase.script.slice(SKIP_SCRIPT_LINES), runnerType);
        });
      });
    });

  return { cfg, runner };
};

module.exports = setup;
