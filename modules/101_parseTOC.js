'use strict';
/**
 * module loads the toc-xml file and parses it with cheerio
 * returns cheerio xml element
 */

const
      Cheerio = require('cheerio'), //core jQuery
      Fs = require('fs'), //file system
      Cfg = require('./config.js'), //configuration
      Log = require('./logging.js').get(module.filename); //logging

const cheerioLoaderFlags = {xmlMode: true, lowerCaseTags: true};

module.exports = function() {
  Log.not( 'loading TOC...' );
  let xml = Fs.readFileSync(Cfg.tocInputFile, 'utf8'); //read xml
  Log.not( 'parsing TOC...' );
  let $cheerio = Cheerio.load(xml, cheerioLoaderFlags); //parse xml
  Log.not( '   ... done' );
  return $cheerio;
};