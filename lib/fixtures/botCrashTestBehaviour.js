/*
  © Copyright IBM Corporation 2017, 2022. All Rights Reserved.
  SPDX-License-Identifier: EPL-2.0
*/
const request = require('request-promise');
const DEFAULT_TIMEOUT = 7000;
// Shuts down bot
const shutDownBot = url => {
  const options = {
    method: 'GET',
    uri: `${url}/test?id=101`,
    headers: {
      'content-type': 'text/plain',
    },
    timeout: DEFAULT_TIMEOUT,
  };
  return request(options);
};

// Checks if bot is available
const waitOnline = (url, interval) => {
  const options = {
    method: 'GET',
    uri: url,
    headers: {
      'content-type': 'application/json',
    },
    json: true,
    timeout: DEFAULT_TIMEOUT,
  };
  return new Promise((resolve, reject) => {
    setInterval(() => {
      request(options)
        .then(res => {
          if (res.status === 'online') {
            resolve(res);
          } else {
            reject(res);
          }
        })
        .catch(err => {
          reject(`Got error: ${err.message}`);
        });
    }, interval);
  });
};

module.exports = {
  shutDownBot,
  waitOnline,
};
