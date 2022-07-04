/*
  © Copyright IBM Corporation 2017, 2022. All Rights Reserved.
  SPDX-License-Identifier: EPL-2.0
*/
const { LivePersonAsync } = require('../../runners');

const { cfg, runner } = LivePersonAsync();

describe(`Running LivePerson Async regression test, Account ID: ${cfg.accountId}.`, () => {
  beforeEach(() => jest.setTimeout(1200000));

  afterAll(() => {
    // Give all the logs time to flush
    return new Promise(resolve => {
      // We wait for a little so the logs flush
      setTimeout(resolve, 500);
    });
  });

  runner();
});
