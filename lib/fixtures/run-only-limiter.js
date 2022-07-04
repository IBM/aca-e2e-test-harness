/*
  © Copyright IBM Corporation 2017, 2022. All Rights Reserved.
  SPDX-License-Identifier: EPL-2.0
*/
const rangeParser = require('parse-numeric-range');

function reduceCasesToRun(allTestCases, runOnlyVariable) {
  const runOnlyTestCases = rangeParser.parse(runOnlyVariable ? runOnlyVariable : '');
  if (runOnlyTestCases.length == 0) {
    return allTestCases;
  }
  let result = [];
  runOnlyTestCases.forEach(runOnlyTestCase => {
    allTestCases.forEach(testCase => {
      if (testCase.name.split('-')[0].trim() === String(runOnlyTestCase)) {
        result.push(testCase);
      }
    });
  });
  return result;
}

module.exports = reduceCasesToRun;
