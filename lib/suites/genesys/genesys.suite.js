/*
  © Copyright IBM Corporation 2017, 2022. All Rights Reserved.
  SPDX-License-Identifier: EPL-2.0
*/
const { Genesys } = require('../../runners');

const { runner } = Genesys();

describe(`Running Genesys regression test`, () => {
  beforeEach(() => jest.setTimeout(1200000));

  runner();
});
