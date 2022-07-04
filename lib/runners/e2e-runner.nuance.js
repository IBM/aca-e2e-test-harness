/*
  © Copyright IBM Corporation 2017, 2022. All Rights Reserved.
  SPDX-License-Identifier: EPL-2.0
*/
const dotenv = require('dotenv');
const Bottleneck = require('bottleneck');
const { nuance } = require('../fixtures');
const { generateRandom } = require('../fixtures/generate-random');
const config = require('./config');
const R = require('ramda');

const runnerType = 'nuance';

require('../matchers/e2e-script-matcher');

const setup = (dotenvpath = process.env['DOTENV_PATH']) => {
  const { log, testCases, delay, leaveOpen, cfg } = config(dotenv.config({ path: dotenvpath }), {
    config_path: dotenvpath,
    authUrl: process.env[`${process.env.SPACE}_${process.env.ENV}_nuance_auth_url`],
    authHost: process.env[`${process.env.SPACE}_${process.env.ENV}_nuance_auth_host`],
    apiUrl: process.env[`${process.env.SPACE}_${process.env.ENV}_nuance_api_url`],
    clientId: process.env[`${process.env.SPACE}_${process.env.ENV}_nuance_clientId`],
    clientSecret: process.env[`${process.env.SPACE}_${process.env.ENV}_nuance_clientSecret`],
    grantType: process.env[`${process.env.SPACE}_${process.env.ENV}_nuance_grantType`],
    businessUnitID: process.env[`${process.env.SPACE}_${process.env.ENV}_nuance_businessUnitID`],
    cases: process.env[`${process.env.SPACE}_${process.env.ENV}_nuance_cases`],
    username: process.env[`${process.env.SPACE}_${process.env.ENV}_nuance_username`],
    password: process.env[`${process.env.SPACE}_${process.env.ENV}_nuance_password`],
    agentGroupID: process.env[`${process.env.SPACE}_${process.env.ENV}_nuance_agentGroupID`],
    skipScriptLines: process.env[`${process.env.SPACE}_${process.env.ENV}_nuance_skip_script_lines`],
  });

  // Schedule 8 tests at once, unless overriden
  const limiter = new Bottleneck({ maxConcurrent: cfg.workers ? parseInt(cfg.workers) : 8 });
  const SKIP_SCRIPT_LINES = cfg.skipScriptLines || 0;

  const MAX_CHAT_WAIT_COUNT = 60;

  // Test runner
  async function runTest(testCase) {
    let result = [];
    try {
      const authRes = await nuance.authorize(
        cfg.authUrl,
        cfg.authHost,
        cfg.clientId,
        cfg.grantType,
        `Basic ${Buffer.from(cfg.clientId + ':' + cfg.clientSecret).toString('base64')}`,
        cfg.username,
        cfg.password
      );

      const accessToken = `Bearer ${authRes.access_token}`;
      // log.debug(`[${testCase.name}]: authorize Response: ${JSON.stringify(authRes)}`);
      log.debug(`[${testCase.name}]: ${accessToken}`);

      let siteID;
      let agent;

      testCase.script = R.reject(R.propSatisfies(type => type && type !== runnerType, 'type'))(testCase.script);

      for (let i = 0; i < authRes.sites.length; i++) {
        siteID = authRes.sites[i];
        // log.silly(`[${testCase.name}]: availability ------- start`);
        agent = await nuance.agentAvailability(cfg.apiUrl, cfg.businessUnitID, siteID, accessToken, cfg.agentGroupID);
        log.silly(`[${testCase.name}]: Availability Check for siteID ${siteID} : ${JSON.stringify(agent)}`);
        if (agent.availability) break;
      }

      expect(agent.availability).toBeTruthy();
      expect(agent.status).toBe('online');

      // log.silly(`[${testCase.name}]: engagement ------- start`);

      const initialMsg = await encodeURIComponent(testCase.script[0].human);

      const engagement = await nuance.getEngagement(
        cfg.apiUrl,
        cfg.businessUnitID,
        siteID,
        accessToken,
        initialMsg,
        cfg.agentGroupID
      );

      const engagementID = engagement.engagementID;
      const customerID = engagement.customerID;

      expect(engagement.status).toBe('accepted');

      let randomDelay;

      log.info(`START [${testCase.name}]: ${JSON.stringify(engagement)}`);
      for (let index = SKIP_SCRIPT_LINES; index < testCase.script.length; index++) {
        const chat_line = testCase.script[index];
        if (index == SKIP_SCRIPT_LINES) {
          result.push({ human: chat_line.human });
        }
        if (chat_line.bot) {
          let res;
          let text;
          let messageText;
          let agentId;
          let messageType;
          let waitCount = 0;
          const startTime = Date.now();
          log.silly(`LINE START:${index} [${testCase.name}]: ${JSON.stringify(engagement)} ${startTime}`);
          while (!text && waitCount <= MAX_CHAT_WAIT_COUNT) {
            await nuance.sleep(1000);
            waitCount++;
            res = await nuance.getMessage(cfg.apiUrl, engagementID, customerID, accessToken);
            if (res && res.body && res.body.messages && res.body.messages[0].messageText)
              messageText = res.body.messages[0].messageText;
            if (res && res.body && res.body.messages && res.body.messages[0].agentId)
              agentId = res.body.messages[0].agentId;
            if (res && res.body && res.body.messages && res.body.messages[0].messageType)
              messageType = res.body.messages[0].messageType;
            // log.debug(`[${testCase.name}]: getMessage ${JSON.stringify(res)}`);
            if (messageText && agentId && messageType == 'chatLine') text = res.body.messages[0].messageText;
            // res.body.messages[0] is object, res.body.messages[0].messageText is string.
            // Need to convert messageText to object, take value data.datapass and convert it back to string for e2e matcher
            if (messageText && agentId && messageType == 'agentDataPass')
              text = JSON.stringify(JSON.parse(res.body.messages[0].messageText).data.datapass);
            if (text) {
              // log.debug(`[${testCase.name}]: getMessage ${JSON.stringify(res)}`);
              log.silly(`LINE END:${index} [${testCase.name}]:${waitCount} - END: ${Date.now() - startTime} - ${text}`);
            }
          }

          if (waitCount >= MAX_CHAT_WAIT_COUNT) {
            return Promise.resolve({ result });
          }

          result.push({ bot: text });
        } else if (chat_line.human && index !== 0) {
          randomDelay = delay ? generateRandom(false, delay) : 0;
          await nuance.sleep(randomDelay);
          // log.silly(`[${testCase.name}]: sendMessage ------- start`);
          let resp = await nuance.sendMessage(
            cfg.apiUrl,
            customerID,
            engagementID,
            accessToken,
            chat_line.human,
            'chatLine'
          );
          // log.debug(`[${testCase.name}]: ${resp.statusCode} returned from sendMessage`);
          expect(resp.statusCode).toBe(200);
          result.push({ human: chat_line.human });
        } else if (chat_line.sleep) {
          let time = chat_line.sleep;
          await nuance.sleep(time);
          result.push({ sleep: time });
        } else if (chat_line.rsleep) {
          let time = generateRandom(false, chat_line.rsleep);
          await nuance.sleep(time);
          result.push({ rsleep: chat_line.rsleep });
        }
      }
      if (!leaveOpen) await nuance.closeEngagement(cfg.apiUrl, customerID, engagementID, accessToken);
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
