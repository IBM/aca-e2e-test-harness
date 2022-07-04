/*
   IBM Services Artificial Intelligence Development Toolkit ISAIDT

   Licensed Materials - Property of IBM
   6949-70S

   © Copyright IBM Corp. 2019 All Rights Reserved
   US Government Users Restricted Rights - Use, duplication or disclosure restricted by GSA ADP Schedule Contract with IBM Corp.
*/
const diff = require('jest-diff');
const R = require('ramda');
const expect = require('expect');

function toMatchScript(received, expected, runnerType) {
  let pass = true;
  expected = R.reject(R.propSatisfies(type => type && type !== runnerType, 'type'))(expected);
  let expectedFuzzy = expected.map(e => R.omit(['partial', 'type', 'context', 'timeout'], e));

  expected.forEach((line, idx) => {
    const receivedLine = received[idx];
    if (!receivedLine) {
      pass = false;
      return;
    }

    pass =
      pass &&
      Object.keys(receivedLine).length === Object.keys(R.omit(['partial', 'type', 'context', 'timeout'], line)).length;
    const matchFn = (r, e) => {
      if (typeof e === 'string' && e.includes('||')) {
        let synonyms = e.split('||');
        let res = [];
        synonyms.forEach(synonym => {
          let syn = synonym.trim();
          res.push(line.partial ? r.includes(syn) : r === syn);
        });
        return res.some(item => {
          return item === true;
        });
      } else return line.partial ? r.includes(e) : r === e;
    };

    pass = pass && Object.keys(receivedLine).filter(key => !matchFn(receivedLine[key], line[key])).length == 0;
    expectedFuzzy[idx] = R.mapObjIndexed((val, key) => (matchFn(val, line[key]) ? val : line[key]), receivedLine);
  });

  const passMessage = () =>
    'Expected script not to fuzzy match:\n' +
    `  ${this.utils.printExpected(expected)}\n` +
    'Received:\n' +
    `  ${this.utils.printReceived(received)}`;

  const failMessage = () => {
    const diffString = diff(expectedFuzzy, received, {
      expand: this.expand,
    });
    return (
      'Expected script to fuzzy match:\n' +
      `  ${this.utils.printExpected(expected)}\n` +
      'Received:\n' +
      `  ${this.utils.printReceived(received)}` +
      (diffString ? `\n\nDifference:\n\n${diffString}` : '')
    );
  };

  const message = pass ? passMessage : failMessage;
  return {
    message,
    pass,
  };
}

expect.extend({
  toMatchScript,
});

module.exports = toMatchScript;
