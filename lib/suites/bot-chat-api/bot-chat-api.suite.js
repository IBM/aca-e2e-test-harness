/*
  © Copyright IBM Corporation 2017, 2022. All Rights Reserved.
  SPDX-License-Identifier: EPL-2.0
*/
const { BotChatAPIRunner } = require('../../runners');

const { runner } = BotChatAPIRunner();

describe(`Running BotChatAPIRunner regression test`, () => {
  beforeEach(() => jest.setTimeout(1200000));

  runner();
});
