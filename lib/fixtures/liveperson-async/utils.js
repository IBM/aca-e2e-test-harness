/*
  © Copyright IBM Corporation 2017, 2022. All Rights Reserved.
  SPDX-License-Identifier: EPL-2.0
*/
const request = require('request-promise');

const DEFAULT_TIMEOUT = 7000;

class LPUtils {
  static getDomain(accountId, service, timeout) {
    var options = {
      uri: `https://adminlogin.liveperson.net/csdr/account/${accountId}/service/${service}/baseURI.json`,
      qs: {
        version: '1.0',
      },
      json: true,
      timeout: timeout || DEFAULT_TIMEOUT,
    };
    return request.get(options);
  }

  static signUp(accountId, timeout) {
    return LPUtils.getDomain(accountId, 'idp').then(data => {
      const idpDomain = data.baseURI;
      var options = {
        uri: `https://${idpDomain}/api/account/${accountId}/signup`,
        json: true,
        timeout: timeout || DEFAULT_TIMEOUT,
      };
      return request.post(options);
    });
  }

  static authenticate(accountId, external_jwt, timeout) {
    return LPUtils.getDomain(accountId, 'idp').then(data => {
      const idpDomain = data.baseURI;
      var options = {
        uri: `https://${idpDomain}/api/account/${accountId}/authenticate`,
        json: {
          authCode: external_jwt,
        },
        timeout: timeout || DEFAULT_TIMEOUT,
      };
      return request.post(options);
    });
  }
}

module.exports = LPUtils;
