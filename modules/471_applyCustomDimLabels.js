'use strict';
/**
 * insert the manually defined dimension labels in the database
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
  const content = await Fs.readFile( Cfg.DataPath + 'custom_dimLabels.csv', 'utf8' ),
        data    = CSV.parse( content,{
          skipEmptyLines: true
        }).data;

  // load queries to DB connector
  await DB.loadQueries( [
    {key: 'label_setDimLabel',  file: 'Label_setDimLabel.sql'},
  ]);

  // insert to database
  let changes = 0;
  for( let i=0; i<data.length; i++ ) {

    await DB.query( 'label_setDimLabel' )
      .run({
        '$code':  data[i][0],
        '$label': data[i][1],
      })
      .then( (stmt) => changes += stmt.rowsAffected() );

  }

  // done
  Log.not( `   set custom measurement labels labels: ${changes} from ${data.length} mappings` );

};
