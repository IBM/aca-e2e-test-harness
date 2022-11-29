/*
  © Copyright IBM Corporation 2017, 2022. All Rights Reserved.
  SPDX-License-Identifier: EPL-2.0
*/
const R = require('ramda');
const request = require('request-promise');

const DEFAULT_TIMEOUT = 7000;

function postMessage(domain, conversationId, text, metadata, auth, timeout) {
  const params = {
    conversationId: conversationId,
    message: {
      text,
    },
    client: {
      metadata: metadata ? metadata : [],
    },
  };
  let options = {
    method: 'POST',
    uri: `${domain}/api/v1/conversations/messages`,
    json: true,
    body: params,
    timeout: timeout || DEFAULT_TIMEOUT,
    transform: body => R.path(['conversationId'], body),
  };
  if(auth) options.auth = auth;

  return request.post(options);
}

function getMessage(domain, conversationId, auth, timeout) {
  let options = {
    method: 'GET',
    uri: `${domain}/api/v1/conversations/${conversationId}/messages`,
    json: true,
    timeout: timeout || DEFAULT_TIMEOUT,
    transform: body => R.path(['message'], body),
  };
  if(auth) options.auth = auth;

  return request(options);
}

function sleep(time) {
  return new Promise(resolve => setTimeout(resolve, time));
}

module.exports = {
  postMessage,
  getMessage,
  sleep,
};
