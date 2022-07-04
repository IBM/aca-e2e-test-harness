/*
  © Copyright IBM Corporation 2017, 2022. All Rights Reserved.
  SPDX-License-Identifier: EPL-2.0
*/
const R = require('ramda');
const request = require('request-promise');

const DEFAULT_TIMEOUT = 7000;

function getDomain(accountId, service, timeout) {
  const options = {
    // method: 'GET',
    uri: `https://adminlogin.liveperson.net/csdr/account/${accountId}/service/${service}/baseURI.json`,
    qs: {
      version: '1.0',
    },
    json: true,
    timeout: timeout || DEFAULT_TIMEOUT,
  };
  return request.get(options);
  //   return response.baseURI;
}

function getChatAvailability(domain, accountId, appKey, constskill, timeout) {
  const options = {
    method: 'GET',
    uri: `https://${domain}/api/account/${accountId}/chat/availability.json?v=1&appKey=${appKey}`,
    qs: {
      skill: constskill,
      // serviceQueue,
      // maxWaitTime
    },
    json: true,
    timeout: timeout || DEFAULT_TIMEOUT,
  };
  // returns: { "availability": true } if 200
  return request(options);
}

function startChat(domain, accountId, appKey, constskill, timeout) {
  const options = {
    method: 'POST',
    uri: `https://${domain}/api/account/${accountId}/chat/request.json?v=1&appKey=${appKey}`,
    body: {
      request: {
        skill: constskill,
        interactionTimeout: 3600,
      },
    },
    resolveWithFullResponse: true,
    json: true,
    timeout: timeout || DEFAULT_TIMEOUT,
  };
  // returns 201 without body if successful with chat link in a location header
  return request(options);
}

function startChatWithId(domain, accountId, appKey, constskill, LETagIds, timeout) {
  const options = {
    method: 'POST',
    uri: `https://${domain}/api/account/${accountId}/chat/request.json?v=1&appKey=${appKey}`,
    body: {
      request: {
        skill: constskill,
        interactionTimeout: 3600,
        LETagVisitorId: LETagIds.LETagVisitorId,
        LETagSessionId: LETagIds.LETagSessionId,
        LETagContextId: LETagIds.LETagContextId,
      },
    },
    resolveWithFullResponse: true,
    json: true,
    timeout: timeout || DEFAULT_TIMEOUT,
  };
  // returns 201 without body if successful with chat link in a location header
  return request(options);
}

function getChatSession(chatSession, appKey, timeout) {
  const options = {
    method: 'GET',
    uri: `${chatSession}.json`,
    qs: {
      v: 1,
      appKey,
    },
    json: true,
    timeout: timeout || DEFAULT_TIMEOUT,
    transform2xxOnly: true,
    // on successful response returns event endpoint for this chat session, e.g.: "https://lo.convep.liveperson.net/api/account/86018400/chat/H2416500806203378089-10a4aa7e3d5a44228a312b495853491eK8389215/events"
    transform: body =>
      R.compose(R.path(['0', '@href']), R.filter(R.propEq('@rel', 'self')), R.path(['chat', 'events', 'link']))(body),
  };
  return request(options);
}

function getChatSessionEvents(chatSession, appKey, id, timeout) {
  const options = {
    method: 'GET',
    uri: `${chatSession}.json`,
    qs: {
      v: 1,
      appKey,
    },
    json: true,
    timeout: timeout || DEFAULT_TIMEOUT,
    transform2xxOnly: true,
    // on successful response returns event endpoint for this chat session, e.g.: "https://lo.convep.liveperson.net/api/account/86018400/chat/H2416500806203378089-10a4aa7e3d5a44228a312b495853491eK8389215/events"
    transform: body =>
      R.compose(R.path(['0', 'text']), R.filter(R.propEq('@id', id)), R.path(['chat', 'events', 'event']))(body),
  };
  return request(options);
}

function addLine(chatSession, appKey, msg, timeout) {
  const options = {
    method: 'POST',
    uri: `${chatSession}.json?v=1&appKey=${appKey}`,
    body: {
      event: {
        '@type': 'line',
        text: msg,
      },
    },
    json: true,
    timeout: timeout || DEFAULT_TIMEOUT,
  };
  return request(options);
}

function sleep(time) {
  return new Promise(resolve => setTimeout(resolve, time));
}

module.exports = {
  getDomain,
  getChatAvailability,
  startChat,
  startChatWithId,
  getChatSession,
  getChatSessionEvents,
  addLine,
  sleep,
};
