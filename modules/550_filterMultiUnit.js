'use strict';
/**
 * module creates turtle file components for every dimension except time
 */

const
      DB = require('./db.js'),      //database access
      Log = require('./logging.js').get(module.filename); //logging


module.exports = async function(datasets) {

  // load queries to DB connector
  await DB.loadQueries( [
    {key: 'filter_multiunit',  file: 'Filter_multiUnit.sql'},
  ]);

  // run query
  const removals = await DB.query('filter_multiunit').all();
  let removed = 0;
  for( let i=0; i<removals.length; i++ ) {

    // remove only, if present
    if( removals[i].code in datasets ) {
      datasets[ removals[i].code ] = false;
      removed += 1;
    }

  }

  // done
  Log.not( 'Removed datasets for multiple units: ' + removed );
  return datasets;
};