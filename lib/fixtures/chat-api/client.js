/*
  © Copyright IBM Corporation 2017, 2022. All Rights Reserved.
  SPDX-License-Identifier: EPL-2.0
*/
const EventEmitter = require('events');
const log = require('winston');
const { botChatAPI } = require('.');

class ChatApiClient extends EventEmitter {
  constructor(name, opts) {
    super(opts);
    if (!opts.url) {
      throw new Error('missing url');
    }
    this.name = name;
    this.id =
      Math.random()
        .toString(36)
        .toUpperCase()
        .substr(2, 16 - 2) + 'AT';
    this.url = opts.url;
    this.poll = true;
    this.auth = opts.auth;
  }

  async init(metadata) {
    return new Promise(async resolve => {
      let transformedMetadata;
      if (metadata) {
        transformedMetadata = this.transform(metadata);
      }
      let convId = await botChatAPI.postMessage(this.url, this.id, '', transformedMetadata, this.auth);
      resolve(convId);

      let message = null;
      while (this.poll) {
        await botChatAPI.sleep(100);
        message = await botChatAPI.getMessage(this.url, this.id, this.auth);
        if (message) {
          this.emit('message', message);
          log.silly(`[${this.name}]:[${this.id}] - POLLER-RECV`, message);
          message = null;
        }
      }
    });
  }

  send(message, context, currentTime) {
    let transformedMetadata;
    let metadata = [];
    if (currentTime) {
      metadata.push(currentTime);
    }
    if (context) {
      metadata.push(...context);
    }
    if (metadata.length) {
      transformedMetadata = this.transform(metadata);
    }
    botChatAPI.postMessage(this.url, this.id, message, transformedMetadata, this.auth);
    log.silly(`[${this.name}]:[${this.id}] - SEND`, `message: ${message}, metadata: ${metadata}`);
  }

  disconnect() {
    this.poll = false;
  }

  transform(metadata) {
    let result = [];
    metadata.map(x => {
      result.push({ key: Object.keys(x)[0], value: Object.values(x)[0] });
    });
    return result;
  }
}

module.exports = (id, config) => new ChatApiClient(id, config);
