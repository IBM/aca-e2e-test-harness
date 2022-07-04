/*
  © Copyright IBM Corporation 2017, 2022. All Rights Reserved.
  SPDX-License-Identifier: EPL-2.0
*/
const YAML = require('yamljs');
const R = require('ramda');

const getGreetingBlock = (id, source) => R.omit(['id'], source['greeting-blocks'].filter(g => g.id === id)[0]).block;
const getGreeting = (id, source) => R.omit(['id'], source.greetings.filter(g => g.id === id)[0]);
const getPredefinedContext = (id, source) => R.omit(['id'], source.predefinedContext.filter(c => c.id === id)[0]);

function loadScript(file) {
  const scriptSource = YAML.load(file);

  return scriptSource['test-cases'].map(testCase => ({
    name: testCase.name,
    skill: testCase.skill,
    typing: testCase.typing, // for socket-io only. For now
    channel: testCase.channel, // for async only. For now
    crashTest: testCase.crashTest === true ? true : false, // for async only. For now
    context: testCase.context
      ? R.flatten(
          testCase.context.map(context => {
            if (context['predefinedContext'] !== undefined)
              return getPredefinedContext(context['predefinedContext'], scriptSource);
            return context;
          })
        )
      : undefined, // for setting context in chat api runner
    script: R.flatten(
      testCase.script.map(line => {
        if (line['greeting-block'] !== undefined) {
          return getGreetingBlock(line['greeting-block'], scriptSource).map(line => {
            if (line['greeting'] !== undefined) return getGreeting(line['greeting'], scriptSource);
            return line;
          });
        }

        if (line['greeting'] !== undefined) return getGreeting(line['greeting'], scriptSource);
        if (line['buttons'] !== undefined && typeof line['buttons'] !== 'string')
          return { buttons: JSON.stringify(line['buttons']) };
        return line;
      })
    ),
  }));
}

module.exports = loadScript;
