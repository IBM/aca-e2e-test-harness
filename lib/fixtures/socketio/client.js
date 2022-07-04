/*
  © Copyright IBM Corporation 2017, 2022. All Rights Reserved.
  SPDX-License-Identifier: EPL-2.0
*/
const EventEmitter = require('events');
const log = require('winston');
const io = require('socket.io-client');
// const jwt = require('jsonwebtoken');

class SocketIoClient extends EventEmitter {
  constructor(name, opts) {
    super(opts);
    if (!opts.url) {
      throw new Error('missing url');
    }
    this.name = name;
    this.id = Math.random()
      .toString(36)
      .replace(/[^a-zA-Z0-9]+/g, '');
    this.url = opts.url;
    this.path = opts.path;
    this.authUrl = opts.authUrl;
    this.username = opts.username;
    this.password = opts.password;
    this.secretOrPrivateKey = opts.secretOrPrivateKey;
    this.profileEmail = opts.profileEmail;
    this.profileCountryCode = opts.profileCountryCode;
    this.pingInterval = 55000;
    this.iat = Math.floor(Date.now() / 1000 - 10); // current - 10s for synchronisation fail
    this.exp = Math.floor(Date.now() / 1000) + 600; // current + 10 minutes
    this.profile = {
      clientId: this.url,
      clientProfile: {
        firstName: 'TEST',
        lastName: '',
        emailAddress: this.profileEmail,
        countryCode: `${this.profileCountryCode}`,
        isManager: false,
      },
      iat: this.iat,
      exp: this.exp,
    };
    //this.token = jwt.sign(this.profile, this.secretOrPrivateKey);
  }

  async init() {
    // const authToken = await utils.authenticate(this.authUrl, this.username, this.password);
    this.ws = io(this.url, {
      query: {
        botmasterUserId: this.id,
        'client-id': this.id,
        'wa-service': '',
        // token: this.token,
      },
      reconnectionAttempts: 300,
      path: this.path,
    });
    log.info(this.url, this.path);

    this.ws.on('message', data => {
      log.silly(`[${this.name}]:[${this.id}] - WS-RECV`, data);
      this.emit('message', data);
    });

    this.ws.on('connect', data => {
      log.silly(`[${this.name}]:[${this.id}] - WS-CONNECTED`, data);
      this.emit('message', data);
    });

    this.ws.on('error', evt => {
      log.error('[${this.name}]:WS-ERROR', evt);
      this.emit('error', evt);
    });

    //   // old method here. now we listen client.on in the runner
    //   return new Promise((resolve, reject) => {
    //     setTimeout(() => reject('Timeout while connecting to server'), timeout);
    //     this.ws.once('connect', resolve);
    //     this.ws.once('connect_error', err => {
    //       log.error(`[${this.name}]:[${this.id}]`, 'WS-CONNECT-ERROR', err);
    //       reject(err);
    //     });
    //     this.ws.once('close', (code, reason) => {
    //       log.info(`[${this.name}]:[${this.id}]`, 'WS-CLOSE', code, reason);
    //       reject({ code, reason });
    //     });
    //   });
    // }

    // async waitForMessage(timeout) {
    //   return new Promise((resolve, reject) => {
    //     this.ws.once('error', err => reject({ msg: 'error while waiting for message', err }));
    //     setTimeout(() => reject('timeout while waiting for message'), timeout);
    //     this.ws.once('message', resolve);
    //   });
  }

  // waitForMsg() {
  //     this.ws.on('error', err => reject({ msg: 'error while waiting for message', err }));
  //     this.ws.on('message');
  // }

  send(message) {
    log.info(`[${this.name}]:[${this.id}] - WS-SEND`, message);
    const msg = !message || message === ' ' ? '' : message;
    this.ws.emit('message', { message: { text: msg } });
  }

  disconnect() {
    this.ws.close();
    this.ws = null;
  }
}

module.exports = (id, config) => new SocketIoClient(id, config);
