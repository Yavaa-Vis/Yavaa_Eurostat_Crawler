'use strict';
/**
 * module tries to set units, where possible
 *
 * - datasets having a unit column with only one value that is defined in the CSV unit_mapping
 * - predefined units for datasets as specified in the CSV unit_byDs
 */

const
      DB = require('./db.js'),        // database access
      Log = require('./logging.js').get(module.filename); // logging

module.exports = async function() {

  Log.not( 'resolving units ...' );

  // datsets with single unit column
  await DB.truncate( 'unit_mapping' );
  await DB.importCSV( 'unit_mapping', 'unit_mapping', (row) => row[1].trim() != '-' );
  await DB.execFile( 'Unit_setUnit.sql' );

  Log.not( '   set units for datasets with unit column' );

};