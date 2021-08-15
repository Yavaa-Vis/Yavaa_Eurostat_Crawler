'use strict';
/**
 * module creates turtle file components for measurement columns
 */

const
      Cfg = require('./config.js'),                       // configuration
      DB = require('./db.js'),                            // database access
      Log = require('./logging.js').get(module.filename), // logging
      Turtle = require('./turtleTemplate.js');

const
      getMeasVals = DB.query('getMeasVals');

module.exports = async function( datasets ) {

  // get main template for measurement columns
  // measurement {order}, {match}, {min}, {max}, {label}, {unit}
  const templMeas = await Turtle.load('dsd_col_meas.ttl');

  // get unit template
  // [unit}]
  const templUnit = await Turtle.load( 'dsd_col_unit.ttl' );

  // log
  Log.log('loaded turtle measure template');

  // run for all measurements
  const results = await getMeasVals
    .each( async (promise) => {

      // wait for data to be present
      const row = await promise;

      try {

        // skip disabled datasets
        if( datasets[ row.code ] === false ) {
          return;
        }

        // create unit entry
        const unit = row.unit != 'tbd'
                        ? await Turtle.replace( templUnit, {
                          unit: row.unit
                        })
                        : '';

        // create column entry
        const col = await Turtle.replace( templMeas, {
          order:  datasets[row.code].length + 1,
          label:  row.shortTitle || row.title,
          match:  row.concept,
          min:    row.min,
          max:    row.max,
          unit:   unit
        });

        // only add the column to valid datasets
        if( datasets[ row.code ] ){
          datasets[ row.code ].push( col );
        }

      } catch( e ) {

        // invalidate dataset
        datasets[ row.code ] = false;

        // log for debugging and relay error
        throw Log.Error(err);

      }

    });

  // process results and log
  results.errors.forEach((err) => Log.err(err, false ));
  Log.not((results.results.length - results.errors.length) + ' measure turtle templates created');

  // we're done
  return datasets;

};