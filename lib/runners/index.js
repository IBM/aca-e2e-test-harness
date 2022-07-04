/*
   IBM Services Artificial Intelligence Development Toolkit ISAIDT

   Licensed Materials - Property of IBM
   6949-70S

   © Copyright IBM Corp. 2019 All Rights Reserved
   US Government Users Restricted Rights - Use, duplication or disclosure restricted by GSA ADP Schedule Contract with IBM Corp.
*/
const Genesys = require('./e2e-runner.genesys');
const WVA = require('./e2e-runner.wva');
const LivePersonSync = require('./e2e-runner.liveperson.sync');
const LivePersonSyncChrome = require('./e2e-runner.liveperson.sync.chrome');
const LivePersonAsync = require('./e2e-runner.liveperson.async');
const SocketIoRunner = require('./e2e-runner.socket.io');
const UiBackendRunner = require('./e2e-runner.ui.backend');
const BotChatAPIRunner = require('./e2e-runner.bot-chat-api');
const Nuance = require('./e2e-runner.nuance');
const Imi = require('./e2e-runner.imi');

module.exports = {
  Genesys,
  WVA,
  LivePersonSync,
  LivePersonSyncChrome,
  LivePersonAsync,
  SocketIoRunner,
  UiBackendRunner,
  BotChatAPIRunner,
  Nuance,
  Imi,
};
