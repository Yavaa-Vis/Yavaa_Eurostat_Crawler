'use strict';
/**
 * loads sql queries for dataset insertion and updating
 * clears turtle output directories
 */

const
      Cfg = require('./config.js'), // configuration
      Log = require('./logging.js').get(module.filename), //logging
      Turtle = require('./turtleTemplate.js');

module.exports = function() {
  return Promise.all([
    Turtle.removeOldFiles(Cfg.turtleOutputCodelistsDir),
    Turtle.removeOldFiles(Cfg.turtleOutputDatasetsDir),
    Turtle.removeOldFiles(Cfg.uploadTmp),
  ]).then(() => {
    Log.not('removed old turtle files');
  }).catch((err) => {
    throw Log.Error(err); //for debugging
  });
};