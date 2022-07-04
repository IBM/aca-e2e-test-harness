/*
  © Copyright IBM Corporation 2017, 2022. All Rights Reserved.
  SPDX-License-Identifier: EPL-2.0
*/
const request = require('request-promise');

const DEFAULT_TIMEOUT = 7000;

function authorize(url, host, client_id, grant_type, auth, username, password) {
  const options = {
    method: 'POST',
    uri: `${url}/oauth-server/oauth/token`,
    form: {
      client_id: client_id,
      grant_type: grant_type,
      username,
      password,
    },
    headers: {
      Host: host,
      'Content-Type': 'application/x-www-form-urlencoded',
      charset: 'utf-8',
      Authorization: auth,
    },
    json: true,
    timeout: DEFAULT_TIMEOUT,
  };
  return request(options);
}

function agentAvailability(url, businessUnitID, siteID, token, agentGroupID) {
  const options = {
    method: 'GET',
    uri: `${url}/engagementAPI/v2/customer/agentAvailability?siteID=${siteID}&businessUnitID=${businessUnitID}&agentGroupID=${agentGroupID}&output=JSON`,
    headers: {
      Authorization: token,
    },
    json: true,
    timeout: DEFAULT_TIMEOUT,
  };
  return request(options);
}

function getEngagement(url, businessUnitID, siteID, token, InitialMessage, agentGroupID) {
  const options = {
    method: 'GET',
    uri: `${url}/engagementAPI/v2/customer/engagement?siteID=${siteID}&businessUnitID=${businessUnitID}&InitialMessage=${InitialMessage}&agentGroupID=${agentGroupID}&output=JSON`,
    headers: {
      Authorization: token,
    },
    json: true,
    timeout: DEFAULT_TIMEOUT,
    simple: false,
  };
  return request(options);
}

function getMessage(url, engagementID, customerID, token, timeout) {
  const options = {
    method: 'GET',
    uri: `${url}/engagementAPI/v2/customer/message?customerID=${customerID}&engagementID=${engagementID}&instantResponse=true&output=JSON`,
    // requestEntireTranscript: true,
    headers: {
      Authorization: token,
    },
    json: true,
    // simple: false,
    resolveWithFullResponse: true,
    timeout: timeout || DEFAULT_TIMEOUT,
    // transform2xxOnly: true,
    // transform: body => R.compose(R.path(['messages', '0']))(body),
  };
  return request(options);
}

function sendMessage(url, customerID, engagementID, token, messageText, messageType, state) {
  const options = {
    method: 'POST',
    uri: `${url}/engagementAPI/v2/customer/message`,
    form: {
      customerID,
      engagementID,
      messageText,
      messageType,
      state,
    },
    headers: {
      Authorization: token,
      'Content-Type': 'application/x-www-form-urlencoded',
    },
    json: true,
    resolveWithFullResponse: true,
    simple: false,
    timeout: DEFAULT_TIMEOUT,
  };
  return request(options);
}

function customerIsTyping(url, customerID, engagementID, token, isTyping, timeout) {
  const options = {
    method: 'POST',
    uri: `${url}/engagementAPI/v2/customer/customerIsTyping?customerID=${customerID}&engagementID=${engagementID}&isTyping=${isTyping}`,
    headers: {
      Authorization: token,
    },
    json: true,
    timeout: timeout || DEFAULT_TIMEOUT,
  };
  return request(options);
}

function closeEngagement(url, customerID, engagementID, token) {
  return sendMessage(url, customerID, engagementID, token, undefined, 'stateChange', 'closed');
}

function sleep(time) {
  return new Promise(resolve => setTimeout(resolve, time));
}

module.exports = {
  authorize,
  agentAvailability,
  getEngagement,
  getMessage,
  sendMessage,
  customerIsTyping,
  closeEngagement,
  sleep,
};
