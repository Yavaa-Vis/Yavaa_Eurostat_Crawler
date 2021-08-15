'use strict';
/**
 * download the dimension dictionary and augment the dimensions
 * in the database with their respective labels
 */

// includes
const downloadFile  = require( __dirname + '/util/downloadFile' ),
      Cfg           = require( './config' ),
      Fs            = require( 'mz/fs' ),
      DB            = require( __dirname + '/db' ),
      Log           = require( './logging.js' ).get(module.filename),
      Async         = require( 'async' );

module.exports = async function getDimLabels() {

  // log
  Log.not( 'setting labels for dimensions' );

  // load queries to DB connector
  await DB.loadQueries( [
    {key: 'label_setDimLabel',  file: 'Label_setDimLabel.sql'},
  ]);
  const query = DB.query( 'label_setDimLabel' );

  // download dic label file
  await downloadFile( Cfg.dimDict, Cfg.dimDictFile );

  // load contents
  const content = await Fs.readFile( Cfg.dimDictFile, 'utf8' );

  // process line by line
  const res = content
    .trim()
    .split( '\n' )
    .map( function( line ){
      return line.split( '\t' )
        .map( function( el ){
          return el.trim();
        });
    });

  // add to database
  const queue = Async.queue( async (task, cb) => {

    // update in database
    await query.run({
      '$code':  task[0].toLowerCase(),
      '$label': task[1],
    });

    // done
    cb();

  });
  queue.push( res );

  // we are done here, when the queue is empty
  return new Promise( (fulfill) => queue.drain( fulfill ) );

};