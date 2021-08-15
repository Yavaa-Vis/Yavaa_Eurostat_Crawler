'use strict';
/**
 * insert the manually defined measurement labels in the database
 *
 * (default labels will be overridden)
 */

const
      DB  = require( './db.js' ),
      Log = require( './logging.js' ).get(module.filename),
      Cfg = require( './config.js' ),
      CSV = require( 'papaparse' ),
      Fs  = require( 'mz/fs' );

module.exports = async function() {

  // log
  Log.not( 'applying custom dimension labels ...' );

  // load custom mappings
  const content = await Fs.readFile( Cfg.DataPath + 'custom_measLabels.csv', 'utf8' ),
        data    = CSV.parse( content,{
          skipEmptyLines: true
        }).data;

  // load queries to DB connector
  await DB.loadQueries( [
    {key: 'label_setMeasLabel',  file: 'Label_setMeasLabel.sql'},
  ]);

  // insert to database
  let changes = 0;
  for( const entry of data ) {

    await DB.query( 'label_setMeasLabel' )
      .run({
        '$concept': entry[0],
        '$label':   entry[1],
      })
      .then( (stmt) => changes += stmt.rowsAffected() );

  }

  // done
  Log.not( '   set custom dimension labels: ' + changes + ' from ' + data.length + ' mappings' );

};