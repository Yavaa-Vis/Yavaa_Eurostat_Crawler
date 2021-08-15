'use strict';
/**
 * module checks, if datasets from the database are still part of the table of contents
 */

const
      DB  = require('./db.js'), //database access
      Log = require('./logging.js').get(module.filename); //logging


module.exports = async function( datasets ) {

  // load queries
  const getCodes      = DB.query( 'getDatasetCodes' ),
        setDeleted    = DB.query( 'setDatasetDeleted' ),
        setUndeleted  = DB.query( 'setDatasetUndeleted' );

  // get all (active) dataset codes
  const dbDatasets = (await getCodes.all())
    .map( (el) => el.code );

  // get list of TOC datasets
  const tocDatasets = new Set( datasets.map( (el) => el.code ) );

  // make sure TOC got parsed accurately
  if( tocDatasets.size < 1 ) {
    Log.err( 'No datasets in TOC!' );
    return;
  }

  // get datasets, that are not present in TOC anymore
  const delDatasets = dbDatasets.filter( (c) => !tocDatasets.has( c ) );

  // update datasets
  let queries = delDatasets.map( (c) => setDeleted.run( { $code: c } ) );

  // wait for all to finish
  await Promise.all( queries );
  Log.not( `removed ${queries.length} datasets from database - no TOC entry anymore` );

  // make sure all active datasets are also active in database
  queries = [ ... tocDatasets ].map( (c) => setUndeleted.run( { $code: c } ) );

  // wait for all to finish
  await Promise.all( queries );

  Log.not( `active datasets remaining: ${tocDatasets.size}` );

};