#!/usr/bin/env node

/*
   IBM Services Artificial Intelligence Development Toolkit ISAIDT

   Licensed Materials - Property of IBM
   6949-70S

   © Copyright IBM Corp. 2019 All Rights Reserved
   US Government Users Restricted Rights - Use, duplication or disclosure restricted by GSA ADP Schedule Contract with IBM Corp.
*/

const program = require('commander');
const jest = require('jest-cli');
const path = require('path');
const dotenv = require('dotenv');

const testSuiteRunner = async (suite, space, env, id) => {

  const reporters = program.csv
  ? ['default', 'jest-junit', ['<rootDir>/lib/reporters/e2e-custom-jest-reporter.js', { path: program.testCasePath, suite: program.suite }]]
  : ['default', 'jest-junit'];

  const options = {
    testEnvironment: 'node',
    projects: ['<rootDir>/lib/suites'],
    silent: true,
    testMatch: ['**/*.suite.js?(x)'],
    rootDir: path.join(__dirname, '..'),
    verbose: true,
    _: suite,
    config: '{}',
    reporters: reporters,
    // haste: '{ "providesModuleNodeModules": ["@ibm-aca/aca-test-e2e-harness"] }',
    testPathIgnorePatterns: [
      '<rootDir>/packages/.*/node_modules/',
      '<rootDir>/node_modules/',
      '<rootDir>/.*/__tests__/fixtures/.*',
      '<rootDir>/fixtures/',
      '<rootDir>/.*coverage',
      '<rootDir>/.*target',
      '<rootDir>/.*build',
      '<rootDir>/tests',
      '<rootDir>/.history',
      '<rootDir>/aca-core/',
    ],
  };
  let suites = suite;
  if (suite.length > 1) suites = `[${suites.join('+')}]`;
  process.env['JEST_JUNIT_OUTPUT'] = `./test_reports/e2e/junit-e2e-${suites}-${space}-${env}${id ? `-${id}` : ''}.xml`;
  process.env['JEST_CSV_OUTPUT'] = `./test_reports/e2e/csv-e2e-${suites}-${space}-${env}${id ? `-${id}` : ''}.csv`;
  const result = await jest.runCLI(options, options.projects);
  const code = !result || result.results.success ? 0 : 1;
  process.exit(code);
};

program
  .version(require('../package.json').version)
  .option('-p, --test-case-path [path]', 'Path to test cases')
  .option('-o, --run-only <cases>', 'Run only specified test cases. I.e. "1,2" or range "1-10"')
  .option('-c, --ci', 'CI mode with reduced logging')
  .option('-n, --leave-open', 'Leave conversations open, only for LivePerson Async and Nuance')
  .option('-d, --debug', 'Log detailed debug information')
  .option('-e, --env <env>', 'Environment')
  .option('-s, --space <space>', 'Space')
  .option('-w, --workers [workers]', 'Number of parallel workers')
  .option('-r, --repeat [count]', 'Run the test cases again and again up to <count> tests in total')
  .option('--delay [ms]', 'Random delay in ms between human messages', 0)
  .option('-t, --suite [suite]', 'Specific test suite to run')
  .option('-f, --config-file <path>', 'Path to dotenv config file', 'e2e.env')
  .option('-l, --log-file <path>', 'Path to the logfile')
  .option('-g, --generate', "Generates LivePerson's visitor, session and context IDs")
  .option('-h, --headless', "Run Chromium tests in headless mode")
  .option('-q, --queryParams <params>', "client custom for passing query params")
  .option('--csv', "Create csv report. Only works with -t [suite]");

if (program.configFile) process.env.DOTENV_PATH = program.configFile;
dotenv.config({ path: process.env['DOTENV_PATH'] });

program
  .command('e2e-genesys')
  .description('run Genesys e2e tests')
  .action(() => testSuiteRunner(['genesys.suite'], program.space, program.env, program.id));
program
  .command('e2e-wva')
  .description('run WVA training tests')
  .action(() => testSuiteRunner(['wva.suite'], program.space, program.env, program.id));
program
  .command('e2e-liveperson-sync')
  .description('run LivePerson sync tests')
  .action(() => testSuiteRunner(['liveperson-sync.suite'], program.space, program.env, program.id));
program
  .command('e2e-liveperson-sync-chrome')
  .description('run LivePerson sync tests on Chrome')
  .action(() => testSuiteRunner(['liveperson-sync-chrome.suite'], program.space, program.env, program.id));
program
  .command('e2e-liveperson-async')
  .description('run LivePerson async tests')
  .action(() => testSuiteRunner(['liveperson-async.suite'], program.space, program.env, program.id));
program
  .command('e2e-socket-io')
  .description('run Socket.io tests')
  .action(() => testSuiteRunner(['socket-io.suite'], program.space, program.env, program.id));
program
  .command('e2e-ui-backend')
  .description('run UI Backend tests')
  .action(() => testSuiteRunner(['ui-backend.suite'], program.space, program.env, program.id));
program
  .command('e2e-nuance')
  .description('run Nuance e2e tests')
  .action(() => testSuiteRunner(['nuance.suite'], program.space, program.env, program.id));
program
  .command('e2e-bot-chat-api')
  .description('run Bot Chat API tests')
  .action(() => testSuiteRunner(['bot-chat-api.suite'], program.space, program.env, program.id));
program
  .command('e2e-imi')
  .description('run IMI e2e tests')
  .action(() => testSuiteRunner(['imi.suite'], program.space, program.env, program.id));
program
  .command('e2e-all')
  .description('run all tests')
  .action(async () => {
    const envs = {
      socketIo: process.env[`${program.space}_${program.env}_socketio_enabled`],
      uiBackend: process.env[`${program.space}_${program.env}_ui_backend_enabled`],
      chatApi: process.env[`${program.space}_${program.env}_chat_api_enabled`],
      genesys: process.env[`${program.space}_${program.env}_genesys_enabled`],
      lpSync: process.env[`${program.space}_${program.env}_lp_sync_enabled`],
      lpSyncChrome: process.env[`${program.space}_${program.env}_lp_sync_chrome_enabled`],
      lpAsync: process.env[`${program.space}_${program.env}_lp_async_enabled`],
      nuanceApi: process.env[`${program.space}_${program.env}_nuance_api_enabled`],
      wva: process.env[`${program.space}_${program.env}_wva_enabled`],
      imi: process.env[`${program.space}_${program.env}_imi_enabled`],
    };

    let suites = [];

    if (envs.socketIo) suites.push('socket-io.suite');
    if (envs.uiBackend) suites.push('ui-backend.suite');
    if (envs.chatApi) suites.push('bot-chat-api.suite');
    if (envs.lpSync) suites.push('liveperson-sync.suite');
    if (envs.lpSyncChrome) suites.push('liveperson-sync-chrome.suite');
    if (envs.lpAsync) suites.push('liveperson-async.suite');
    if (envs.nuanceApi) suites.push('nuance.suite');
    if (envs.imi) suites.push('imi.suite');
    
    // deprecated runners, but still there
    if (envs.genesys) suites.push('genesys.suite');
    if (envs.wva) suites.push('wva.suite');
    
    testSuiteRunner(suites, program.space, program.env, program.id, envs);
  });
program.parse(process.argv);


if (!program.testCasePath && !program.suite) {
  // eslint-disable-next-line no-console
  console.error('Either test case path or suite must be specified.');
  process.exit(1);
}

if (!program.space || !program.env) {
  // eslint-disable-next-line no-console
  console.error('Space and environment must be specified');
  process.exit(1);
}

if (program.testCasePath) process.env.TEST_CASES_PATH = program.testCasePath;
if (program.runOnly) process.env.RUNONLY = program.runOnly;
if (program.ci) process.env.CIMODE = program.ci;
if (program.leaveOpen) process.env.LEAVE_OPEN = program.leaveOpen;
if (program.debug) process.env.DEBUG = program.debug;
if (program.env) process.env.ENV = program.env;
if (program.space) process.env.SPACE = program.space;
if (program.workers) process.env.TEST_WORKERS = program.workers;
if (program.repeat) process.env.TEST_COUNT = program.repeat;
if (program.delay) process.env.MSG_DELAY = program.delay;
if (program.suite) process.env.SUITE = program.suite;
if (program.configFile) process.env.DOTENV_PATH = program.configFile;
if (program.logFile) process.env.LOG_FILE = program.logFile;
if (program.generate) process.env.GENERATE = program.generate;
if (program.headless) process.env.HEADLESS = program.headless;
if (program.queryParams) process.env.QUERY_PARAMS = program.queryParams;
if (program.csv) process.env.CSV = program.csv;