/*
  © Copyright IBM Corporation 2017, 2022. All Rights Reserved.
  SPDX-License-Identifier: EPL-2.0
*/
/**
 * Heavily cribbed from sample from Will Odell@LP
 */
var jsonwebtoken = require('jsonwebtoken');

function generateSigned(cert, { expires, subject, companyBranch, customerType, firstName, lastName, customerId }) {
  // Big static JWT payload
  const payload = {
    lp_sdes: [
      {
        type: 'ctmrinfo',
        info: {
          cstatus: 'cancelled',
          ctype: customerType || 'x',
          companyBranch: companyBranch,
          customerId: customerId, // 138766AC - old static Id
          balance: -400.99,
          currency: 'USD',
          socialId: '11256324780',
          imei: '3543546543545688',
          userName: 'bishop13942',
          companySize: 500,
          accountName: 'Hyperdyne Systems',
          role: 'broker',
          lastPaymentDate: {
            day: 15,
            month: 10,
            year: 2014,
          },
          registrationDate: {
            day: 23,
            month: 5,
            year: 2013,
          },
          storeNumber: '123865',
          storeZipCode: '20505',
        },
      },
      {
        type: 'personal',
        personal: {
          firstname: firstName || 'Lance',
          lastname: lastName || 'Bishop',
          age: {
            age: 34,
            year: 1980,
            month: 4,
            day: 15,
          },
          contacts: [
            {
              email: 'bishop13942@hyperdynesystems.com',
              phone: '+1 212-788-8877',
            },
          ],
          gender: 'x',
          language: 'en-US',
          company: 'company',
        },
      },
    ],
  };

  return jsonwebtoken.sign(payload, cert, {
    // subject must be unique, it defines a unique chat on LP
    subject: subject,
    issuer: 'cli',
    algorithm: 'RS256',
    expiresIn: expires,
  });
}

module.exports = {
  generateSigned,
};
