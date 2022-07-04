/*
  © Copyright IBM Corporation 2017, 2022. All Rights Reserved.
  SPDX-License-Identifier: EPL-2.0
*/
const { LivePersonSync } = require('../../runners');

const { cfg, runner } = LivePersonSync();

describe(`Running LivePerson regression test, Account ID: ${cfg.accountId}, Skill: ${cfg.skill}.`, () => {
  beforeEach(() => jest.setTimeout(1200000));

  runner();
});
