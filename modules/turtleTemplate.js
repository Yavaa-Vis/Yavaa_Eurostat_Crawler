'use strict';
/**
 * module provides methods to load turtle templates or save turtle files
 */

const
      Fs = require('fs'), //file system
      Limit = require('simple-rate-limiter'), //call rate/speed limiter
      Cfg = require('./config.js'), //configuration
      Log = require('./logging.js').get(module.filename); //logging

const
      delayedOperation = Limit(function(data, callback) { //init delayed function access
        callback(new Promise((fulfill, reject) => { //return promise from saving
          Fs.writeFile(data.file + '.ttl', data.content, (err) => {
            if(err) {
              reject(err);
            } else {
              fulfill(true);
            }
          });
        }));
      }).to(20).per(50); //max 20 files per 50ms

function removeAllFilesInDirectory(path) {
  return Promise.resolve(
    Fs.readdirSync(path).forEach(function(file, index) { //iterate through directory
      let curPath = (path + '/' + file).trim();
      if(Fs.lstatSync(curPath).isFile() && curPath.endsWith('.ttl')) { //check if it is a turtle file
        Fs.unlinkSync(curPath); //delete file
      }
    })
  );
}

module.exports = {
  load: function(filename) {
    return new Promise((fulfill, reject) => {
      Fs.readFile(Cfg.turtleTemplatesPath + filename, 'utf8', (err, data) => {
        if(err) {
          reject(err);
        } else {
          fulfill(data);
        }
      });
    });
  },

  //params: {key: filename, ...}
  loadAll: function(params) {
    let tmp = [];
    Object.keys(params).forEach((key) => {
      tmp.push(
        module.exports.load(params[key])
          .then((template) => {
            return {
              key: key,
              template: template
            };
          })
      );
    });
    return Promise.all(tmp)
      .then((values) => {
        values.forEach((obj) => {
          params[obj.key] = obj.template;
        });
        return params;
      });
  },

  /**
     * replacing all keywords in the template with the values
     * params:
     *  - template
     *  - params {key: value, ...}
     */
  replace: function(template, params) {
    return new Promise((fulfill, reject) => {
      let regex;
      Object.keys(params).forEach((key) => {
        regex = new RegExp('{' + key + '}', 'g');
        template = template.replace(regex, params[key]);
      });
      fulfill(template);
    });
  },

  /**
     * replacing all keywords the template with the values for each entry in the array
     * params:
     *  - template
     *  - params [{key: value, ...}]
     */
  replaceAll: function(template, paramsArray) {
    return Promise.all(paramsArray.map((params) => module.exports.replace(template, params)));
  },

  /**
     * saves template to file
     * params:
     *  - turtle
     *  - (filename)
     * returns: promise (fulfills with true after file was written)
     */
  save: function(turtle, file) {
    return new Promise((fulfill, reject) => {
      delayedOperation({ //delayed function invocation (against opening too many files)
        file: file,
        content: turtle
      }, (promise) => promise
        .then(() => fulfill(true))
        .catch((err) => reject(err))
      );
    });
  },

  removeOldFiles: function(dir) {
    return removeAllFilesInDirectory(dir);
  }
};