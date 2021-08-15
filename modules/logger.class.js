'use strict';

/**
 * logging class
 */

const mom = require('moment'); //time utils

const colors = {
        RED: '\u001b[31m',
        LRED: '\u001b[31;1m',
        GREEN: '\u001b[32m',
        LGREEN: '\u001b[32;1m',
        YELLOW: '\u001b[33m',
        LYELLOW: '\u001b[33;1m',
        WHITE: '\u001b[37m',
        LBLACK: '\u001b[30;1m',
        RESET: '\u001b[0m'
      },
      loggingLvls = {
        ALL: 0b111,
        NONE: 0b000,

        ERRLVL: 0b100,
        NOTLVL: 0b010,
        LOGLVL: 0b001
      };

function e2o(mod, err) {
  return {
    name: (err.name || err.Error)+': '+err.message,
    module: err.module || mod,
    //file: err.fileName,
    //line: err.lineNumber,
    code: err.code,
    stack: err.stack || err.syscall
  };
}

/**
 * logger class
 */
module.exports = class Logger {
  static colors() {
    return colors;
  }
  static lvls() {
    return loggingLvls;
  }

  constructor(name, lvl = loggingLvls.ALL) {
    this.active = true; //enabled/disabled switch
    this.hidden = false; //use other colors
    this.loggingLvl = lvl;
    this.name = name;
    this.errCallbacks = []; //error
    this.errColor = colors.RED; //error color
    this.errColorIA = colors.LRED; //error color state: hidden
    this.notCallbacks = []; //notification
    this.notColor = colors.LYELLOW; //notification color
    this.notColorIA = colors.YELLOW; //notification color state: hidden
    this.logCallbacks = []; //log / default out
    this.logColor = colors.WHITE; //log color
    this.logColorIA = colors.LBLACK; //log color state: hidden
  }

  disable() {
    this.active = false;
  }
  enable() {
    this.active = true;
  }
  hide() {
    this.hidden = true;
  }
  show() {
    this.hidden = false;
  }

  Error(obj_or_msg, code = '') { //creates error with message (string) or capsules it logging ready
    let err;
    if(obj_or_msg instanceof Error) {
      err = obj_or_msg;
    }else {
      err = new Error(obj_or_msg); //create error with message
    }
    err.module = err.module || this.name;
    err.code = err.code || code;
    return err;
  }

  err(err, shown = true ) {
    if(this.active && (this.loggingLvl & loggingLvls.ERRLVL) && shown) {
      const msg = (err instanceof Error) ? err.message : err;
      console.log((this.hidden?this.errColorIA:this.errColor) + this.getTime(), '[Error]', this.name + ':', msg, colors.RESET);
    }
    this.runCallbacks(this.errCallbacks, e2o(this.name, err));
  }
  onErr(handler) {
    if(typeof handler === 'function')
      this.errCallbacks.push(handler);
  }
  setErrCol(col) {
    this.errColor = col;
  }

  not(not) {
    if(this.active && (this.loggingLvl & loggingLvls.NOTLVL))
      console.log((this.hidden?this.notColorIA:this.notColor) + this.getTime(), '[Notif]', this.name + ':', not, colors.RESET);
    this.runCallbacks(this.notCallbacks, this.name + ':' + not);
  }
  onNot(handler) {
    if(typeof handler === 'function')
      this.notCallbacks.push(handler);
  }
  setNotCol(col) {
    this.notColor = col;
  }

  log(log) {
    if(this.active && (this.loggingLvl & loggingLvls.LOGLVL))
      console.log((this.hidden?this.logColorIA:this.logColor) + this.getTime(), '[Info ]', this.name + ':', log, colors.RESET);
    this.runCallbacks(this.logCallbacks, this.name + ':' + log);
  }
  onLog(handler) {
    if(typeof handler === 'function')
      this.logCallbacks.push(handler);
  }
  setLogCol(col) {
    this.logColor = col;
  }

  getTime() {
    return mom().format('HH:mm:ss');
  }
  runCallbacks(callbacks, out) {
    callbacks.forEach((cb) => {
      cb(out);
    });
  }
};