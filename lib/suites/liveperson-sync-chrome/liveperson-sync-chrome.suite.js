/*
  © Copyright IBM Corporation 2017, 2022. All Rights Reserved.
  SPDX-License-Identifier: EPL-2.0
*/
const { LivePersonSyncChrome } = require('../../runners');

const { runner } = LivePersonSyncChrome();

describe(`Running LivePerson regression test on Chromium using Puppeteer.`, () => {
  beforeEach(() => jest.setTimeout(1200000));

  runner();
});
