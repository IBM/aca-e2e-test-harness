/*
  © Copyright IBM Corporation 2017, 2022. All Rights Reserved.
  SPDX-License-Identifier: EPL-2.0
*/
const LPUtils = require('./utils');
const LPWebSocket = require('./socket');
const EventEmitter = require('events');
const atob = require('atob');

const apiRequestTypes = [
  'cqm.SubscribeExConversations',
  'ms.PublishEvent',
  'cm.ConsumerRequestConversation',
  'ms.SubscribeMessagingEvents',
  'InitConnection',
  'cm.UpdateConversationField',
];

class LPClient extends EventEmitter {
  constructor(opts) {
    super(opts);
    if (!opts.accountId) {
      throw new Error('missing accountId');
    }
    this.accountId = opts.accountId;
    this.externalJwt = opts.externalJwt;
    this.openConversations = {};
  }

  init() {
    // Request an LP internal JWT - either by unauthenticated signup, or an authentication with external JWT
    const jwtPromise = this.externalJwt
      ? LPUtils.authenticate(this.accountId, this.externalJwt)
      : LPUtils.signUp(this.accountId);
    return jwtPromise.then(data => {
      const jwt = data.jwt;
      return LPUtils.getDomain(this.accountId, 'asyncMessagingEnt').then(data => {
        const ws = new LPWebSocket();
        return ws
          .connect('wss://' + data.baseURI + '/ws_api/account/' + this.accountId + '/messaging/consumer?v=3')
          .then(openedSocket => {
            return this._handleOpenedSocket(openedSocket, jwt);
          });
      });
    });
  }

  send(message) {
    if (Object.keys(this.openConversations)[0]) {
      return this._publishTo(Object.keys(this.openConversations)[0], message);
    } else {
      let _this = this;
      return this.socket.consumerRequestConversation().then(function(resp) {
        return _this._publishTo(resp.body.conversationId, message);
      });
    }
  }

  closeConversation() {
    // Return a promise which resolves when we have confirmation of unsubscription
    if (Object.keys(this.openConversations)[0]) {
      const p = new Promise(resolve => {
        this.once('conversationsChange', resolve);
      });
      const q = this.socket.updateConversationField({
        conversationId: Object.keys(this.openConversations)[0],
        conversationField: [
          {
            field: 'ConversationStateField',
            conversationState: 'CLOSE',
          },
        ],
      });
      return Promise.all([p, q]);
    } else {
      return Promise.resolve();
    }
  }

  chatClosed() {
    // current vs previous
    return this.convId == this.lastConvId;
  }

  disconnect() {
    return this.socket.close();
  }

  _handleOpenedSocket(socket, jwt) {
    this.socket = socket;
    this.socket.registerRequests(apiRequestTypes);
    this.me = this._myId(jwt);

    this.socket.initConnection({}, [{ type: '.ams.headers.ConsumerAuthentication', jwt: jwt }]);

    this.socket.onNotification(this._withType('MessagingEvent'), this._handleMessagingEventNotification.bind(this));

    // We need an up to date list of conversations, and it's requested by the lib,
    // so let's wait for it
    const p = new Promise(resolve => {
      this.once('conversationsChange', resolve);
    });
    // subscribe to conversation updates before asking for them
    this._handleExConversation();
    // ask for them
    this.socket.subscribeExConversations({ convState: ['OPEN'] });
    return p;
  }

  _handleMessagingEventNotification(body) {
    let _this = this;
    body.changes.forEach(function(change) {
      switch (change.event.type) {
        case 'ContentEvent': {
          if (change.originatorId !== _this.me) _this.emit('message', change.event.message);
          break;
        }
        case 'RichContentEvent': {
          if (change.originatorId !== _this.me) _this.emit('message', JSON.stringify(change.event.content));
          break;
        }
      }
    });
  }

  _handleExConversation() {
    this.socket.onNotification(this._isConversationChange(), notificationBody => {
      return this._handleConversationNotification(notificationBody, this.openConversations);
    });
  }

  _handleConversationNotification(notificationBody, openConversations) {
    let _this = this;
    notificationBody.changes.forEach(function(change) {
      if (change.type === 'UPSERT') {
        if (!openConversations[change.result.convId]) {
          _this.convId = change.result.convId;
          openConversations[change.result.convId] = change.result;
          _this.socket.subscribeMessagingEvents({
            fromSeq: 0,
            dialogId: change.result.convId,
          });
        }
      } else if (change.type === 'DELETE') {
        _this.lastConvId = change.result.convId;
        delete openConversations[change.result.convId];
      }
    });
    // A rather blunt instrument, but this code is full of race conditions.
    // Can't fix them all.
    this.emit('conversationsChange', openConversations);
  }

  _publishTo(conversationId, message) {
    this.socket.publishEvent({
      dialogId: conversationId,
      event: {
        type: 'ContentEvent',
        contentType: 'text/plain',
        message: message,
      },
    });
  }

  _isConversationChange() {
    return function(notification) {
      return notification.type === 'cqm.ExConversationChangeNotification';
    };
  }

  _withType(type) {
    return function(notification) {
      return notification.type.includes(type);
    };
  }

  _myId(jwt) {
    return JSON.parse(atob(jwt.split('.')[1])).sub;
  }
}

module.exports = LPClient;
