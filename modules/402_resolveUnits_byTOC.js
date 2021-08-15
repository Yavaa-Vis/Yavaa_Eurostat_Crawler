'use strict';
/**
 * augment measures, where the unit is given in the TOC gather in 10X steps
 *
 * - using the same unit mapping as the other modules
 */

const
      DB = require('./db.js'),        // database access
      Log = require('./logging.js').get(module.filename); // logging

module.exports = async function( datasets ) {

  // log
  Log.not( 'resolving units (by TOC) ...' );

  // insert unit values from TOC
  const unitmap = datasets.filter( (ds) => ds.unit )
    .map( (ds) => [ ds.code, ds.unit ] );

  // empty TOC table before
  await DB.truncate( 'unit_toc' );

  // add to database
  await DB.importTable( unitmap, 'unit_toc' );

  // set units by TOC
  await DB.execFile( 'Unit_setUnit_toc.sql' );

  // log
  Log.not( '   set units for datasets with units set in TOC' );

};