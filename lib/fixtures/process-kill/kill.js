/*
  © Copyright IBM Corporation 2017, 2022. All Rights Reserved.
  SPDX-License-Identifier: EPL-2.0
*/
const treekill = require('tree-kill');

function treeKill(pid, killtype) {
  return new Promise((resolve, reject) => {
    treekill(pid, killtype, function(err) {
      if (err) reject(err);
      resolve();
    });
  });
}

module.exports = {
  treeKill,
};
