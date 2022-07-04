/*
  © Copyright IBM Corporation 2017, 2022. All Rights Reserved.
  SPDX-License-Identifier: EPL-2.0
*/
let memory = null;

const createMemoryInstance = () => {
  if (memory) {
    return memory;
  } else {
    memory = new Memory();
    return memory;
  }
};

class Memory {
  constructor() {
    this.mem = [];
  }

  set(testCaseName, convId) {
    this.mem.push({
      name: testCaseName,
      convId: convId,
    });
  }

  get(testCaseName) {
    let filteredItems = this.mem.filter(i => i.name === testCaseName);

    if (filteredItems[0]) {
      return filteredItems[0].convId;
    } else {
      return null;
    }
  }

  // not used, but might be needed
  // remove(testCaseName) {
  //     let filteredItems = this.mem.filter(i => i.name !== testCaseName);
  //     this.mem = filteredItems;
  // }
  // getAll(testCaseName) {
  //     return this.mem;
  // }
}

module.exports = createMemoryInstance;
