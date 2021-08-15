'use strict';
/**
 * push all files from the upload tmp folder to the repository
 */

// includes
const sendFile     = require( __dirname + '/util/sendFile' ),
      Cfg          = require( __dirname + '/config' ),
      Log          = require( './logging.js' ).get(module.filename),
      Fs           = require( 'mz/fs' ),
      Request      = require( 'request' );

module.exports = async function push2repo() {

  // clear repo
  Log.not( 'truncating repository @ ' + Cfg.uploadTarget );
  await Request({
    url: Cfg.uploadTarget,
    method: 'DELETE',
  });
  Log.not( '   ... done' );

  // read upload directory
  const files = await Fs.readdir( Cfg.uploadTmp );

  // send all files
  for( let i=0; i<files.length; i++ ) {

    try {
      Log.not( 'sending: ' + files[i] );
      await sendFile( Cfg.uploadTmp + files[i], Cfg.uploadTarget );
      Log.not( '   ... sent' );
    } catch( e ) {
      throw new Error( 'Could not send ' + files[i] + ': ' + e );
    }

  }

};
