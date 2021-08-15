'use strict';
/**
 * module imports more unit related data into the database
 */

const
      DB = require('./db.js'),        // database access
      Log = require('./logging.js').get(module.filename); // logging

module.exports = async function() {

  Log.not( 'adding more unit information' );

  // import unit - quantity mapping
  await DB.truncate( 'unit_quant' );
  await DB.importCSV( 'unit_quant', 'unit_quant' );
  Log.not( '   imported unit quantity mapping' );

};