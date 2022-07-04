/*
  © Copyright IBM Corporation 2017, 2022. All Rights Reserved.
  SPDX-License-Identifier: EPL-2.0
*/
const { WVA } = require('../../runners');

const { cfg, runner } = WVA();

describe(`Running ${cfg.space} regression test on ${cfg.env}`, () => {
  beforeEach(() => jest.setTimeout(1200000));

  runner();
});
