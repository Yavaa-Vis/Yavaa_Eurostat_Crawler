'use strict';
/**
 * download a given url and put the contents into the target file
 * includes the option to set a timeout
 */

// includes
const
      Fs      = require('mz/fs'),
      Request = require( 'request' ),
      Cfg     = require( __dirname + '/../config.js');


module.exports = function downloadFile( url, target, timeout = 5000 ){

  // set request parameter
  const opt = {
    uri:      url,
    headers:  Cfg.downloadHeaders,
    timeout:  timeout,
  };

  return new Promise( (fulfill, reject) => {

    // create connection
    Request.get( opt )
      .on( 'error', reject )
      .pipe( Fs.createWriteStream( target ) )
      .on( 'error', reject )
      .on( 'end', () => fulfill( target ) )
      .on( 'close', () => fulfill( target ) );

  });

};