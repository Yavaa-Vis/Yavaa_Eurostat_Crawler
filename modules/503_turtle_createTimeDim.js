'use strict';
/**
 * module creates turtle file components for every codelist in the time dimension
 */

const
      Cfg     = require('./config.js'), //configuration
      DB      = require('./db.js'), //database access
      Log     = require('./logging.js').get(module.filename), //logging
      Turtle  = require('./turtleTemplate.js');

const
      getTimeDim = DB.query('getTimeDim');

module.exports = async function( datasets ) {

  //time {order}, {match}, {label}, {type}, {min}, {max}
  const template = await Turtle.load('dsd_col_dim_time.ttl'); //load turtle template
  Log.not('loaded turtle time template');

  // retrieve all time dimensions
  const results = await getTimeDim.each( async (promise) => { //for every time codelist

    // get the row
    const row = await promise;

    try {

      // skip disabled datasets
      if( datasets[ row.code ] === false ) {
        return;
      }

      // get format and metadata of time codelist
      const timeValue = await parseTime(row);

      // create entry
      const turtle = await Turtle.replace(template, {
        order:  row.pos,
        match:  Cfg.turtlePrefixEntries + 'time',
        label:  'time',
        type:   timeValue.type,
        min:    timeValue.min,
        max:    timeValue.max
      });

      // add to dataset
      datasets[ row.code ] = datasets[ row.code ] || [];
      datasets[ row.code ].push(turtle);

    } catch ( err ) {

      // remember to skip this entry
      datasets[ row.code ] = false;

      // log errors for debugging
      throw Log.Error( err );

    }

  }); // getTimeDim.each();

  // close dateResolver
  shutdown();

  // logging
  results.errors.forEach((err) => Log.err( err, false ));
  Log.not((results.results.length - results.errors.length) + ' time turtle templates created');

  return datasets;

};


// *************************************************** DATE VALUES

const
      dateResolver = require('../util/resolveDate.client.js');

//initialize date resolver
dateResolver.init();

//types of time columns
const timeTypes = {
  'Q':  'http://yavaa.org/ns/yavaa#instant-YYYY_Q',
  'M':  'http://yavaa.org/ns/yavaa#instant-YYYY_MM',
  'MD': 'http://yavaa.org/ns/yavaa#instant-YYYY_MM_DD',
  'S':  'http://yavaa.org/ns/yavaa#instant-YYYY_S',
  '':   'http://yavaa.org/ns/yavaa#instant-YYYY',
  '_':  'http://yavaa.org/ns/yavaa#timespan-YYYY'
};

/**
 * extract min, max and type for given time codelist
 * type is just a rough heuristic
 * @param {Object} row - sql row from query
 * @returns {Promise} - parsed time codelists
 */
function parseTime(row) {

  let timeList = JSON.parse(row.values); //get time codelist
  return new Promise((fulfill, reject) => {
    const min = timeList[0],
          max = timeList[timeList.length-1],
          type = timeTypes[min.replace(/\d/g, '')],
          entry = {
            type: type,
            min: min,
            max: max
          };

    // unknown type
    if(entry.type === undefined) {
      reject(Log.Error('no definition for format like "' + min + '"', row.code));
      return;
    }

    // inconsistent types
    for( let i=1; i<timeList.length; i++ ) {
      if( type !== timeTypes[ timeList[i].replace(/\d/g, '') ] ) {
        reject( Log.Error('inconsistent date format "' + min + '" vs. "' + timeList[i] + '"', row.code));
        return;
      }
    }

    // parse the values
    Promise.all([
      dateResolver.resolve(entry.min, entry.type)
        .then((date) => (entry.min = date.toISOString())),
      dateResolver.resolve(entry.max, entry.type)
        .then((date) => (entry.max = date.toISOString()))
    ]).then(() => {
      fulfill(entry);
    })
      .catch( (e) => reject(e) );

  });
}

function shutdown() {
  //close dateResolver
  dateResolver.close();
}