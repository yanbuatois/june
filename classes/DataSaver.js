const fs = require('fs').promises;
const path = require('path');
const mkdirp = require('mkdirp');

const config = require('../config');

class DataSaver {
  constructor(api, savePath = path.join(config.root, 'data')) {
    this.api = api;
    console.log(savePath);
    this.path = savePath;
    console.log('hi');
    mkdirp.sync(this.path);
  }

  async save(filename = 'tokens.json') {
    if (this.api.accessToken) {
      await this.saveData(filename, this.api.accessToken);
      return true;
    }
    else {
      return false;
    }
  }

  async load(filename = 'tokens.json') {
    try {
      // const jsonContent = await fs.readFile(filepath, {
      //   encoding: 'utf-8',
      // });
      const jsonContent = await this.loadData(filename);
      if (jsonContent) {
        this.api.accessToken = jsonContent;
        return true;
      }
      return false;
    } catch (err) {
      return false;
    }
  }

  saveData(filename, content) {
    const jsonContent = JSON.stringify(content);
    const filePath = path.join(this.path, filename);

    return fs.writeFile(filePath, jsonContent, {
      encoding: 'utf-8',
    });
  }

  async loadData(filename) {
    try {
      const filePath = path.join(this.path, filename);

      const jsonContent = await fs.readFile(filePath, {
        encoding: 'utf-8',
      });

      return jsonContent ? JSON.parse(jsonContent) : false;
    } catch (err) {
      return false;
    }
  }
}

module.exports = DataSaver;
