/*
  IBM Services Artificial Intelligence Development Toolkit ISAIDT

  Licensed Materials - Property of IBM
  6949-70S

  © Copyright IBM Corp. 2019 All Rights Reserved
  US Government Users Restricted Rights - Use, duplication or disclosure restricted by GSA ADP Schedule Contract with IBM Corp.
*/
const R = require('ramda');
const request = require('request-promise');

const DEFAULT_TIMEOUT = 14000;

function sendMessage(domain, chatId, message, channel, timeout) {
  const options = {
    method: 'POST',
    uri: domain,
    body: {
      channel: channel,
      chatid: chatId,
      text: String(message),
    },
    json: true,
    transform2xxOnly: true,
    transform: body => R.path(['payload', 'message', 'text'])(body),
    timeout: timeout || DEFAULT_TIMEOUT,
  };
  return request(options);
}

function getMessage(url, chatId, timeout) {
  const options = {
    method: 'POST',
    uri: url,
    body: {
      chatid: chatId,
    },
    json: true,
    resolveWithFullResponse: true,
    timeout: timeout || DEFAULT_TIMEOUT,
  };
  return request(options);
}

function sleep(time) {
  return new Promise(resolve => setTimeout(resolve, time));
}

module.exports = {
  sendMessage,
  getMessage,
  sleep,
};
