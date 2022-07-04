#!/usr/bin/env node
/*
  © Copyright IBM Corporation 2017, 2022. All Rights Reserved.
  SPDX-License-Identifier: EPL-2.0
*/

const fs = require('fs');
const program = require('commander');

const { generateSigned } = require('./fixtures/jwt');

program
  .version('0.1.0')
  .option('-c, --key <key>', "Key to sign the JWT with, containing '-----BEGIN RSA PRIVATE KEY-----'")
  .option('--keyfile <keyfile>', "Key to sign the JWT with, containing '-----BEGIN RSA PRIVATE KEY-----'")
  .option('-b, --company-branch <branch>', 'The companyBranch to add to the JWT')
  .option('-t, --customer-type <type>', 'The customerType to set in the JWT')
  .option('-s, --subject <name>', 'The unique subject to set in the JWT')
  .option('-x, --expires <seconds>', 'Length of time (in seconds) the JWT should be valid for')
  .option('-fn, --first-name <first-name>', 'First name of user')
  .option('-ln, --last-name <last-name>', 'Last name of user')
  .parse(process.argv);

// Validate
if (
  !program.companyBranch ||
  !program.customerType ||
  !program.subject ||
  !program.expires ||
  (!program.key && !program.keyfile)
) {
  program.help();
}

// Get the private key from a file if necessary
if (program.keyfile) {
  program.key = fs.readFileSync(program.keyfile);
  if (!program.key) {
    // eslint-disable-next-line no-console
    console.error(`Could not read keyfile ${program.keyfile}`);
    process.exit(1);
  }
}

// Generate the JWT
const jwt = generateSigned(program.key, {
  subject: program.subject,
  companyBranch: program.companyBranch,
  customerType: program.customerType,
  expires: program.expires,
  firstName: program.firstName,
  lastName: program.lastName,
});

// eslint-disable-next-line no-console
console.log(jwt);
