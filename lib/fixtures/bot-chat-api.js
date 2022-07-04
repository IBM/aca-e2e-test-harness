/*
  © Copyright IBM Corporation 2017, 2022. All Rights Reserved.
  SPDX-License-Identifier: EPL-2.0
*/
const R = require('ramda');
const request = require('request-promise');

const DEFAULT_TIMEOUT = 7000;

function postMessage(domain, conversationId, text, timeout) {
  const params = {
    conversationId: conversationId,
    message: {
      text: text,
    },
  };
  const options = {
    method: 'POST',
    uri: `${domain}/api/v1/conversations/messages`,
    json: true,
    body: params,
    timeout: timeout || DEFAULT_TIMEOUT,
    transform: body => R.path(['conversationId'], body),
  };
  return request.post(options);
}

function getMessage(domain, conversationId, timeout) {
  const options = {
    method: 'GET',
    uri: `${domain}/api/v1/conversations/${conversationId}/messages`,
    json: true,
    timeout: timeout || DEFAULT_TIMEOUT,
    transform: body => R.path(['message', 'text'], body),
  };
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
