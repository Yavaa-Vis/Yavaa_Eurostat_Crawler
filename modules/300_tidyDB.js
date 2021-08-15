'use strict';
/**
 * module removes unused rows in the database
 */

const
      DB = require('./db.js'), //database access
      Log = require('./logging.js').get(module.filename); //logging

module.exports = function() {
  Log.not('cleaning database...');
  return DB.execFile('Data_TidyUpDB.sql');
};