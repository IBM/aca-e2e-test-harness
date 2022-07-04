/*
  © Copyright IBM Corporation 2017, 2022. All Rights Reserved.
  SPDX-License-Identifier: EPL-2.0
*/
const { Nuance } = require('../../runners');

const { cfg, runner } = Nuance();

describe(`Running Nuance regression test, Client ID: ${cfg.clientId}, GrantType: ${cfg.grantType}.`, () => {
  beforeEach(() => jest.setTimeout(1200000));

  runner();
});
