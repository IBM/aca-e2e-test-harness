/*
  © Copyright IBM Corporation 2017, 2022. All Rights Reserved.
  SPDX-License-Identifier: EPL-2.0
*/
const path = require('path');
const winston = require('winston');
const { scriptParser, runOnlyLimiter } = require('../fixtures');
const R = require('ramda');

module.exports = (dotenvCfg, extra) => {
  const cfg = R.mergeRight(
    {
      testCasePath: process.env.TEST_CASES_PATH,
      runOnly: process.env.RUNONLY,
      workers: process.env.TEST_WORKERS,
      ci: process.env.CIMODE,
      leaveOpen: process.env.LEAVE_OPEN,
      debug: process.env.DEBUG,
      env: process.env.ENV,
      space: process.env.SPACE,
      testCount: process.env.TEST_COUNT,
      suite: process.env.SUITE,
      msgDelay: process.env.MSG_DELAY,
      logfile: process.env.LOG_FILE,
      headless: process.env.HEADLESS,
      queryParams: process.env.QUERY_PARAMS,
      csv: process.env.CSV,
    },
    extra
  );

  const configureLogger = logger => {
    logger.remove(winston.transports.Console);
    if (cfg.logfile) logger.add(winston.transports.File, { filename: cfg.logfile });
    logger.add(winston.transports.Console, {
      colorize: true,
      timestamp: true,
      level: cfg.ci === 'true' ? 'info' : cfg.debug || 'silly',
    });
    return logger;
  };
  const log = configureLogger(winston);

  // Run alternative test suite yml. Else run default.
  cfg.cases = cfg.suite ? `${cfg.suite}.yml` : cfg.cases;

  if (dotenvCfg.error)
    log.warn(`Unable to load dotenv configuration. Using environment vars. Error: ${JSON.stringify(dotenvCfg.error)}`);
  log.info('CONFIGURATION: ', cfg);

  if (!cfg.testCasePath || !cfg.cases)
    throw new Error(`Test case path and test cases must be defined. ${cfg.testCasePath}, ${cfg.cases}`);
  let testCases = scriptParser(path.join(cfg.testCasePath, cfg.cases));
  testCases = runOnlyLimiter(testCases, cfg.runOnly);

  // Run the test cases again and again up to X tests in total
  const testCount = cfg.testCount ? parseInt(cfg.testCount) : testCases.length;
  testCases = Array(testCount)
    .fill(true)
    .map((item, i) => {
      const tc = testCases[i % testCases.length];
      return Object.assign({}, tc, { name: `${i + 1} :: ${tc.name}` });
    });

  const delay = cfg.msgDelay ? parseInt(cfg.msgDelay) : 0;

  const channel = cfg.channel ? cfg.channel : '';
  const leaveOpen = cfg.leaveOpen === 'true' ? 'true' : undefined;

  return { log, testCases, delay, channel, leaveOpen, cfg };
};
