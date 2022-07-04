/*
  © Copyright IBM Corporation 2017, 2022. All Rights Reserved.
  SPDX-License-Identifier: EPL-2.0
*/
const { UiBackendRunner } = require('../../runners');

const { cfg, runner } = UiBackendRunner();

describe(`Running UI Backend regression test, url: ${cfg.url}, path: ${cfg.path}.`, () => {
  beforeEach(() => jest.setTimeout(1200000));

  runner();
});
