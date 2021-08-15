'use strict';
/**
 * module checks if toc-xml file is up to date
 * else it will be re-downloaded
 */

const
      Moment        = require('moment'), //time utils
      Fs            = require('fs'), //file system
      Url           = require('url'),
      Http          = require('http'),
      Cfg           = require('./config.js'), //configuration
      Log           = require('./logging.js').get(module.filename), //logging
      downloadFile  = require( __dirname + '/util/downloadFile' );

module.exports = function() {

  let download = false; //toc needs download?
  try{
    Fs.accessSync(Cfg.tocInputFile, Fs.constants.F_OK); //check file exists

    let fstats = Fs.statSync(Cfg.tocInputFile);
    let modtime = Moment(fstats.mtime); //get last modified date
    Log.not('TOC xml-file from ' + modtime.fromNow());
    let minutesSinceLastChange = -modtime.diff(Moment(), 'minutes'); //difference between last modified date and now (in minutes)

    //file was last modified long ago
    if(minutesSinceLastChange > Cfg.tocRedownloadTimeDiff) {
      download = true;
    }
  }catch(FileNotFound) { //file doesn't exist
    download = true;
  }

  if(download) {
    Log.not('downloading TOC...');
    return downloadFile(Cfg.inputURL, Cfg.tocInputFile, Cfg.downloadTimeout);
  } else {
    return undefined;
  }
};