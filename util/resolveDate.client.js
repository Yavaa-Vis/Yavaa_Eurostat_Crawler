'use strict';
/**
 * client to resolve datetime values to timestamp values
 * according to the definitions of Yavaa core
 */

// includes
var ChildProcess  = require( 'child_process' );

// link to the worker process
var resolver;

// cache for defer objects associated
var reqCache = {};

// current id to use
var reqCacheId = 0;

// queue outgoing messages to not jam the communication line
const outQueue = [];


/**
 * handle messages by the service worker
 * @param {Object}  msg
 */
function processResolved( msg ) {

  // make sure msg is an array
  if( !(msg instanceof Array) ) {
    msg = [ msg ];
  }

  // upon errors, kill all processes
  if( 'error' in msg ){
    console.log( msg );
    kill();
    process.exit();
  }

  // process all retrieved results
  for( let i=0; i<msg.length; i++ ) {

    // shortcut
    let item = msg[i];

    if( 'err' in item ) {

      // something went wrong
      reqCache[ item.id ].reject( item.err + ' (type:' + item.item.type + ')' );

    } else {

      // convert result to a date object
      var d = new Date( item.result );

      // resolve the respective promise
      reqCache[ item.id ]( d );

    }

    // remove the promise from cache
    reqCache[ item.id ] = undefined;

  }

}


// send queue at some interval
let outTimer = setInterval( () => {

  if( (outQueue.length > 0) && resolver ) {

    resolver.send( outQueue );
    outQueue.length = 0;

  }

});

/**
 * will kill the resolving server
 * @returns
 */
function kill(){
  // close the worker process
  if( resolver ) {
    resolver.kill();
    resolver.disconnect();
    resolver = null;
    clearInterval( outTimer );
  }
}

// export a singleton for access
module.exports = {

  /**
   * setup the service
   */
  init: function(){

    // close old service, if present
    if( resolver ) {
      this.close();
    }

    // setup the (new) worker process
    resolver = ChildProcess.fork( __dirname + '/resolveDate.service.js',
                                  [],
                                  {
                                    cwd:      __dirname,
                                    execArgv: []
                                  });
    resolver.on( 'message', processResolved );
  },

  /**
   * kill the service
   */
  close: kill,

  /**
   * resolve a given date string for a given type
   * returns a timestamp
   * @param {String}  date    the date string
   * @param {String}  type    URI identifier for the date format
   * @returns {Number}        the respective timestamp
   */
  resolve: function( date, type ){
    return new Promise( (resolve, reject) => {

      // check, if worker is active
      if( !resolver ) {
        reject( new Error( 'DateResolver not initialized!' ) );
      }

      // get an id for this request
      var reqId = reqCacheId++;

      // add to cache
      reqCache[ reqId ] = resolve;

      // send request to service worker
      outQueue.push({
        id:   reqId,
        type: type,
        str:  date
      });

    });

  }


};