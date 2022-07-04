/*
  © Copyright IBM Corporation 2017, 2022. All Rights Reserved.
  SPDX-License-Identifier: EPL-2.0
*/
function generateRandom(alphanumeric, length, channel) {
  if (alphanumeric) {
    // return random string + channel + watermark AT (automated test)
    return `${Math.random()
      .toString(36)
      .toUpperCase()
      .substr(2, length - 2)}${channel}AT`;
  } else {
    // return random digit. Length means max value in this case
    return Math.floor(Math.random() * length);
  }
}

module.exports = {
  generateRandom,
};
