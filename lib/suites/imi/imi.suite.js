/*
   IBM Services Artificial Intelligence Development Toolkit ISAIDT

   Licensed Materials - Property of IBM
   6949-70S

   © Copyright IBM Corp. 2019 All Rights Reserved
   US Government Users Restricted Rights - Use, duplication or disclosure restricted by GSA ADP Schedule Contract with IBM Corp.
*/
const { Imi } = require('../../runners');

const { runner } = Imi();

describe(`Running imi regression test`, () => {
  beforeEach(() => jest.setTimeout(1200000));

  runner();
});
