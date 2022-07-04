/*
  © Copyright IBM Corporation 2017, 2022. All Rights Reserved.
  SPDX-License-Identifier: EPL-2.0
*/
const request = require('request-promise');

const DEFAULT_TIMEOUT = 7000;
const DEFAULT_BOT_ID = 'any_bot_id';

function startChat(domain, clientId, clientSecret, timeout, botId) {
  const options = {
    method: 'POST',
    uri: `${domain}/virtualagent/run/api/v1/bots/${botId || DEFAULT_BOT_ID}/dialogs?version=2016-09-16`,
    headers: {
      accept: 'application/json',
      'content-type': 'application/json',
      'X-IBM-Client-Id': clientId,
      'X-IBM-Client-Secret': clientSecret,
    },
    json: true,
    timeout: timeout || DEFAULT_TIMEOUT,
  };
  return request(options);
}

function chat(domain, clientId, clientSecret, dialogId, message, timeout, botId) {
  const options = {
    method: 'POST',
    uri: `${domain}/virtualagent/run/api/v1/bots/${botId ||
      DEFAULT_BOT_ID}/dialogs/${dialogId}/messages?version=2016-09-16`,
    headers: {
      accept: 'application/json',
      'content-type': 'application/json',
      'X-IBM-Client-Id': clientId,
      'X-IBM-Client-Secret': clientSecret,
    },
    body: {
      message: message,
    },
    json: true,
    timeout: timeout || DEFAULT_TIMEOUT,
  };
  return request(options);
}

function sleep(time) {
  return new Promise(resolve => setTimeout(resolve, time));
}

module.exports = { startChat, chat, sleep };
