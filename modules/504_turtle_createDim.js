'use strict';
/**
 * module creates turtle file components for every dimension except time
 */

const
      Cfg     = require('./config.js'), //configuration
      DB      = require('./db.js'), //database access
      Log     = require('./logging.js').get(module.filename), //logging
      Turtle  = require('./turtleTemplate.js');

const
      getDims = DB.query('getDims');

module.exports = async function(datasets) {

  //dimension by codelist {order}, {match}, {label}, {codelist}
  const template = await Turtle.load('dsd_col_dim_cl.ttl'); //load turtle template
  Log.log('loaded turtle dim template');

  const results = await getDims.each( async (promise) => { //for every dimension

    // get the row
    const row = await promise;

    try {

      // skip already disabled rows
      if( (row.code in datasets) && (datasets[ row.code ] === false) ) {
        return;
      }

      // replace placeholders
      const turtle = await Turtle.replace(template, {
        order:    row.pos,
        label:    row.name,
        match:    Cfg.turtlePrefixEntries + row.name,
        codelist: Cfg.turtlePrefixCodelist + row.name + '_' + row.exportid
      });

      // add to dataset
      datasets[ row.code ] = datasets[ row.code ] || [];
      datasets[ row.code ].push(turtle);

    } catch( err ) {

      // invalidate dataset
      datasets[ row.code ] = false;

      // log for debugging
      throw Log.Error(err);

    }

  }); // getDims.each()

  // logging
  results.errors.forEach((err) => Log.err(err, false ));
  Log.not((results.results.length - results.errors.length) + ' dimensions turtle templates created');

  // forwards list by dataset
  return datasets;

};