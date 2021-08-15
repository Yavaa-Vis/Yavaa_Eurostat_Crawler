'use strict';
/**
 * module creates turtle files for every codelist
 */

const
      Cfg     = require('./config.js'), // configuration
      DB      = require('./db.js'),     // database access
      Log     = require('./logging.js').get(module.filename), // logging
      Turtle  = require('./turtleTemplate.js');

const getCodelists = DB.query('getCodelists');

module.exports = async function() {

  Log.not('creating turtle files...');

  // update the codelists export ids
  await DB.query( 'updateClExportIds' ).run();
  Log.not('updated exportids for codelists');

  // mapping of codelists numbers
  const clMap = {};

  // codelist {name}, {entries}
  try{

    // get template
    const template = await Turtle.load('codelist.ttl');
    Log.log('loaded turtle codelist template');

    // write files
    const results = await getCodelists.each( async (promise) => {
      try{

        // wait for statement
        const row = await promise;

        // insert into template
        const turtle = await Turtle.replace(template, { //replace placeholders
          name: Cfg.turtlePrefixCodelist + row.name + '_' + row.exportid, //build url
          entries: JSON.parse(row.values) //get codelist array
            .map((elem) => ('<' + Cfg.turtlePrefixEntries + row.name + '#' + elem + '>')) //build entry urls
            .join(',\n    ')
        });

        // store resulting turtle
        await Turtle.save(turtle, Cfg.turtleOutputCodelistsDir + row.name + '_' +row.exportid); //save in file

        // done
        Log.log('"' + row.name + '_' + row.exportid + '" - file saved');

      }
      catch(err) {
        throw Log.err( Log.Error(err) );
      }
    });

    // finish up
    results.errors.forEach((err) => Log.err(err));
    Log.not((results.results.length - results.errors.length) + ' codelist turtle files created');
    return results;

  } catch(err){
    // for debugging
    throw Log.err( Log.Error(err) );
  }

};