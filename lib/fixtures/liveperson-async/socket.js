/*
  © Copyright IBM Corporation 2017, 2022. All Rights Reserved.
  SPDX-License-Identifier: EPL-2.0
*/
const Promise = require('bluebird');
const WebSocket = require('ws');
const log = require('winston');
const mem = require('./store_conversation_id')();

class LPWebSocket {
  constructor() {
    this.pendingRequests = {};
    this.notificationHandlers = [];
    this.pingInterval = 55000;
  }
  connect(url) {
    let _this = this;
    return new Promise((resolve, reject) => {
      this.ws = new WebSocket(url);

      this.ws.on('open', () => {
        this.ping();
        return resolve(_this);
      });
      this.ws.on('message', data => {
        _this._onMessage(data);
      });
      this.ws.on('close', (code, reason) => {
        log.info(`[${_this.testCase}]`, 'WS-CLOSE', code, reason);
        clearTimeout(this.timoutId);
        _this.ws = null;
        reject({ code, reason });
      });
      this.ws.on('error', evt => {
        log.error('WS-ERROR', evt);
        clearTimeout(this.timoutId);
      });
    });
  }

  ping() {
    this.ws.ping();
    this.timoutId = setTimeout(() => {
      log.info(`[${this.testCase}] - WS-PING`);
      this.ping();
    }, this.pingInterval);
  }

  close() {
    clearTimeout(this.timoutId);
    this.ws.terminate();
    this.ws = null;
  }

  onNotification(filterFunc, _onNotification) {
    this.notificationHandlers.push({
      filter: filterFunc,
      cb: _onNotification,
    });
  }

  registerRequests(arr) {
    let _this = this;
    arr.forEach(function(reqType) {
      return (_this[_this._toFuncName(reqType)] = function(body, headers) {
        return _this._onRequest(reqType, body, headers);
      });
    });
  }

  _toFuncName(reqType) {
    let str = reqType.substr(1 + reqType.lastIndexOf('.'));
    return str.charAt(0).toLowerCase() + str.slice(1);
  }

  _onRequest(type, body, headers) {
    let _this = this;
    return new Promise(function(resolve, reject) {
      // Abandon if we're in a bad state
      if (!_this.ws) {
        reject('WebSocket unexpectedly closed!');
      }

      var obj = {
        kind: 'req',
        type: type,
        body: body || {},
        id: Math.floor(Math.random() * 1e9),
        headers: headers,
      };
      _this.pendingRequests[obj.id] = function(type, code, body) {
        return resolve({
          type: type,
          code: code,
          body: body,
        });
      };
      log.silly(`[${_this.testCase}] - WS-SEND`, obj);
      const str = JSON.stringify(obj);
      _this.ws.send(str);
    });
  }

  _onMessage(message) {
    let obj = JSON.parse(message);
    log.silly(`[${this.testCase}] - WS-RECV`, obj);
    if (obj.kind === 'resp' && obj.type === 'cm.RequestConversationResponse') {
      mem.set(`${this.testCase}`, obj.body.conversationId);
    }
    if (obj.kind === 'resp') {
      var id = obj.reqId;
      delete obj.reqId;
      delete obj.kind;
      this.pendingRequests[id].call(this, obj.type, obj.code, obj.body);
      delete this.pendingRequests[id];
    } else if (obj.kind === 'notification') {
      this.notificationHandlers.forEach(function(handler) {
        if (handler.filter.call(this, obj)) {
          handler.cb.call(this, obj.body);
        }
      });
    }
  }
}

module.exports = LPWebSocket;
