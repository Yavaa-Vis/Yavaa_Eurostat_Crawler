'use strict';

/**
 * logging module
 */

const
      ExitHook = require('exit-hook'), //exit hook
      Path = require('path'), //path utils
      Cfg = require('./config.js'), //configuration
      Logger = require('./logger.class.js');

const
      loggers = {},
      GLOBAL = new Logger('', Cfg.loggingLvl),
      errorsLogged = [];

function logError(msg) {
  errorsLogged.push(msg);
}

function name2identifier(fname) {
  return Path.parse(fname).name;
}

module.exports = {
  init: function() {
    return new Promise((fulfill, reject) => {
      //possible database hook

      GLOBAL.onErr(logError);
      GLOBAL.not('logging level 0b' + Cfg.loggingLvl.toString(2));
      fulfill();
    });
  },
  get: function(name) {
    if(!name) {
      return GLOBAL;
    }
    name = name2identifier(name);
    if(!(name in loggers)) {
      let logger = new Logger(name, Cfg.loggingLvl);
      logger.hide();
      logger.onErr(logError);
      loggers[name] = logger;
      return logger;
    } else {
      return loggers[name];
    }
  }
};

ExitHook(function() {
  console.log('\n\nlist of thrown errors: ' + Logger.colors().RED);
  if(Cfg.DebugMaxFinalErrorOut >= 0){
    errorsLogged.slice(0, Math.min(Cfg.DebugMaxFinalErrorOut, errorsLogged.length)); //against too many errors
  }
  errorsLogged.forEach((err) => {

    // errors bound to datasets can be shown more concise
    if( 'code' in err ) {
      console.log( err.code + ': ', err.name, '(' + err.module + ')' );
    } else {
      console.log(err);
    }

  });
  console.log(Logger.colors().RESET + '\n');
});
