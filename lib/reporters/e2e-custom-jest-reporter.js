/*
  © Copyright IBM Corporation 2017, 2022. All Rights Reserved.
  SPDX-License-Identifier: EPL-2.0
*/
const fs = require('fs');
const YAML = require('yamljs');
const log = require('winston');

class AllResultsCsvReporter {
  constructor(globalConfig, options) {
    this._globalConfig = globalConfig;
    this._options = options;

    // console.log('Options: ', this._options);
  }

  onRunComplete(contexts, results) {
    try {
      let result4csv = ['"#","Name","Result","Error","Script"'];
      const testCases = results.testResults[0].testResults;
      for (const testCase of testCases) {
        let num = testCase.title.match(new RegExp('Test case' + '(.*)' + '::'));
        let name = testCase.title.match(new RegExp('::' + '(.*)'));
        let status = testCase.status.replace(/["]/g, `""`);
        let failureMessage = testCase.failureMessages[0] ? testCase.failureMessages[0].replace(/["]/g, `""`) : 'N/A';

        const scriptSource = YAML.load(`./${this._options.path}/${this._options.suite}.yml`);
        const result = scriptSource['test-cases'].filter(script => testCase.title.includes(script.name));
        delete result[0].name;
        const script = JSON.stringify(result[0]).replace(/["]/g, `""`);

        let line = `\n"${num[1].trim()}","${name[1].trim()}","${status}","${failureMessage}","${script}"`;
        line = line.replace(/[\u001b\u009b][[()#;?]*(?:[0-9]{1,4}(?:;[0-9]{0,4})*)?[0-9A-ORZcf-nqry=><]/g, '');

        result4csv.push(`${line}`);
      }

      fs.writeFileSync(process.env.JEST_CSV_OUTPUT, result4csv.join(''), { encoding: 'utf8' });
    } catch (e) {
      log.err('CSC Reporter Error. Did you use -t option?', e);
    }
  }
}

module.exports = AllResultsCsvReporter;
