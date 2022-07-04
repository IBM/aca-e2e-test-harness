/*
  © Copyright IBM Corporation 2017, 2022. All Rights Reserved.
  SPDX-License-Identifier: EPL-2.0
*/
const request = require('request-promise');

const DEFAULT_TIMEOUT = 7000;

function getJWT(uri, expiry, auth, customerId, skill, subject, timeout) {
  const body = {
    // subject must be unique, it defines a unique chat on LP
    sub: subject,
    lp_sdes: [
      {
        type: 'ctmrinfo',
        info: {
          customerId: customerId,
          companyBranch: skill,
        },
      },
      {
        type: 'personal',
        personal: {
          firstname: 'Lance',
          lastname: 'Bishop',
          contacts: [
            {
              email: 'cgo.remoterecord@gmail.com',
              phone: '02072070106',
            },
          ],
        },
      },
    ],
  };

  const options = {
    method: 'POST',
    uri: `${uri}${expiry}`,
    headers: {
      'content-type': 'application/json',
      authorization: auth,
      'cache-control': 'no-cache',
    },
    body: body,
    json: true,
    timeout: timeout || DEFAULT_TIMEOUT,
  };

  return request(options);
}

module.exports = {
  getJWT,
};
