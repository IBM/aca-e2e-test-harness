/*
  © Copyright IBM Corporation 2017, 2022. All Rights Reserved.
  SPDX-License-Identifier: EPL-2.0
*/
const { SocketIoRunner } = require('../../runners');

const { cfg, runner } = SocketIoRunner();

describe(`Running Socket.io regression test, url: ${cfg.url}, path: ${cfg.path}.`, () => {
  beforeEach(() => jest.setTimeout(1200000));

  runner();
});
