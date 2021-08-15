'use strict';
/**
 * copy the given list of files to the target directory
 */

// includes
const Fs    = require( 'mz/fs' ),
      Path  = require( 'path' );

module.exports = async function copyFiles( files, target, log ) {

  // make sure, we have an array
  if( !(files instanceof Array) ) {
    files = [ files ];
  }

  // copy all files
  for( let i=0; i<files.length; i++ ) {

    // get target name
    let outName = Path.resolve( target + Path.basename( files[i] ) ),
        inName  = Path.resolve( files[i] );

    // copy
    await copyFile( inName, outName, log );

  }

};

/**
 * copy a single file from $from$ to $to$
 */
function copyFile( from, to, log ) {

  return new Promise( async (fulfill, reject) => {

    // check, if file exists
    try {
      await Fs.access( from );
    } catch( e ) {
      log.err( `   skipped file (does not exits): ${from}` );
      return fulfill();
    }

    // create read stream
    const inStream = Fs.createReadStream( from );

    // create write stream
    const outStream = Fs.createWriteStream( to );

    // pipe to target
    inStream.pipe( outStream );

    // add handlers
    inStream.on( 'error', reject );
    outStream.on( 'error', reject );
    inStream.on( 'end', fulfill );

  });

}