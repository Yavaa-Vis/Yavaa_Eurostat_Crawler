'use strict';
/**
 * MicroService to convert from a date string and its respective format to a timestamp
 *
 * incoming message:
 * {
 *    id: Number,         // reference number for this request
 *    type: String/Url,   // the respective type
 *    str: String         // date String
 * }
 *
 * outgoing message - success
 * {
 *    id: Number,         // reference number
 *    timestamp: Number   // the computed timestamp
 * }
 *
 * outgoing message - error
 * {
 *    id: Number,         // reference number
 *    err: String         // error message
 * }

 */

// includes
var RequireJS = require( 'requirejs' ),
    Path      = require( 'path' );

// configuration
const cfg = {
  yavaaBase: Path.resolve( __dirname + '/../../Yavaa' ),
  sendInterval: 1 * 1000
};


/* XXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXX COMMON XXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXX */

// queue for incoming resolve requests
// needed to prevent race conditions on startup
// (DateParser not yet loaded, but requests coming in)
const inQueue = [];

// queue outgoing messages
// will be send every few milliseconds
// (else the inter process communication gets jammed and will just block)
const outQueue = [];
let outTimer;

// placeholder for the processing worker
// again needed because of possible race conditions on startup
var worker = null;

// is the worker currently busy
var workerBusy = false;

// cache for SimpleDateParser instances
var parserCache = {};

/* XXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXX WORKER XXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXX */

// load RequireJS environment
RequireJS( cfg.yavaaBase + '/js/modules/config/require' )( RequireJS );

RequireJS([ 'load/parser/SimpleDateParser',
            'store/metadata'
],function( SimpleDateParser,
  MetaStore
){

  // assign worker process
  worker = async function(){

    // if queue is empty, stop here
    if( inQueue.length < 1 ) {
      return;
    }

    // skip, if busy
    if( workerBusy ) {
      return;
    }

    // worker is busy
    workerBusy = true;

    // get next element
    var msg = inQueue.pop();

    // check, if respective parser is already present
    if( msg.type in parserCache ) {

      // type is present, we can proceed immediately
      processItem( msg );

    } else {

      // type not present, so we have to get it first
      const resolved = await MetaStore.resolveTimeType( msg.type );
      parserCache[ msg.type ] = SimpleDateParser( resolved[ msg.type ].pattern,
                                                  resolved[ msg.type ].meanings );
      processItem( msg );

    }

  };

  worker().catch( (e) => console.log( e ) );

});


/**
 * process an individual item
 * at this point the respective entry in parserCache should be present
 * @param {Object}  msg
 */
function processItem( item ) {

  // get parser
  var Parser = parserCache[ item.type ];

  // run value through parser
  try {

    // parse
    var result = new Parser( item.str );

    // get timestamp
    var ts = result.hash();

    // send result back
    if( ts ) {
      sendMessage( item, ts );
    } else {
      sendError( item, 'No Hash' );
    }


  } catch(e) {
    console.log( e );
    // something went wrong
    sendError( item, e );

  }

  // resolve next item
  workerBusy = false;
  setImmediate( worker );

}

/* XXXXXXXXXXXXXXXXXXXXXXXXXXXXX COMMUNICATION XXXXXXXXXXXXXXXXXXXXXXXXXXXXX */

/**
 * listen for requests
 */
process.on( 'message', function( msg ){

  // make sure we got an array
  if( !(msg instanceof Array) ) {
    msg = [ msg ];
  }

  // add messages to queue
  for( let i=0; i<msg.length; i++ ) {
    inQueue.push( msg[i] );
  }

  // if worker is available, start it
  if( worker ) {
    worker().catch( (e) => console.log( e ) );
  }

});

/**
 * listen for a shutdown
 */
process.on( 'disconnect', () => {
  console.log( 'disc' );
  clearInterval( outTimer );
});


/**
 * relay result of worker to parent process
 * @param {Object}  id      the processed item
 * @param {Number}  result  resulting timestamp for the request
 */
function sendMessage( item, result ) {
  outQueue.push({
    id: item.id,
    result: result
  });
}


/**
 * relay an error of worker to parent process
 * @param {Object}  item    the processed item
 * @param {Error}   err     error object
 */
function sendError( item, err ) {
  outQueue.push({
    id: item.id,
    error: err,
    err: err.msg || err.message || 'Unknown error',
    item: item
  });
}

// check the outQueue once upon a time
outTimer = setInterval( () => {

  if( outQueue.length > 0 ) {
    process.send( outQueue );
    outQueue.length = 0;
  }

}, cfg.sendInterval );
