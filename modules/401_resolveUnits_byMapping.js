'use strict';
/**
 * insert the manually defined unit mappings to the database
 */

const
      DB  = require( './db.js' ),
      Log = require( './logging.js' ).get(module.filename),
      Cfg = require( './config.js' ),
      CSV = require( 'papaparse' ),
      Fs  = require( 'mz/fs' );

module.exports = async function() {

  // log
  Log.not( 'applying custom unit mappings ...' );

  // load custom mappings
  const content = await Fs.readFile( Cfg.DataPath + 'custom_units.csv', 'utf8' ),
        data    = CSV.parse( content,{
          skipEmptyLines: true
        }).data;

  // load queries to DB connector
  await DB.loadQueries( [
    {key: 'unit_updateunit',  file: 'Unit_updateUnit.sql'},
  ]);

  // insert to database
  let changes = 0;
  for( let i=0; i<data.length; i++ ) {

    await DB.query( 'unit_updateunit' )
      .run({
        '$code': data[i][0],
        '$unit': data[i][1],
      })
      .then( (stmt) => changes += stmt.rowsAffected() );

  }

  // done
  Log.not( '   set custom mappings: ' + changes + ' from ' + data.length + ' mappings' );

};