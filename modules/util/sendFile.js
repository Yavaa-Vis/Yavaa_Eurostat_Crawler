"use strict";
/**
 * send the contents of the given file to the target using an HTTP connection
 */

// includes
const Http  = require( 'http' ),
      Url   = require( 'url' ),
      Fs    = require( 'fs' ),
      Path  = require( 'path' );

module.exports = function( file, url ) {

  return new Promise( (fulfill, reject) => {

    // set request options
    const opt = Url.parse( url );
    opt[ 'headers' ] = {
        'Accept': 'application/json'
    };
    opt[ 'method' ] = 'POST';
    switch( Path.extname( file ) ) {
      case '.ttl': opt.headers['Content-Type'] = 'application/x-turtle;charset=UTF-8'; break;
      case '.xml': opt.headers['Content-Type'] = 'application/rdf+xml;charset=UTF-8';  break;
      default: reject( new Error( 'Unknown file extension: ' + Path.extname( file ) ) );
    }

    // create request
    const request = Http.request( opt );
    request.shouldKeepAlive = false;

    // collect response
    request.on('response', function( r ) {

      const response = [];
      r.on( 'data', function( chunk ){
        response.push( chunk );
      });
      r.on( 'end', function(){

        // assemble response
        const str = response.join('');

        // was the request sucessfull ?
        switch( r.statusCode ) {
          case 204: fulfill( str ); break;
          default:  reject( new Error( str ) );
        }

        // clear result
        response.length = 0;
      });
      r.on( 'error', function( e ){
        response.length = 0;
        reject( e );
        request = undefined;
        r = undefined;
      });

    });

    // error handling
    request.on( 'error', function( err ){
      reject( err );
    });

    // pipe file
    const fileStream = Fs.createReadStream( file );
    fileStream.pipe( request );
    fileStream.on( 'end', () => request.end() );

  });

};