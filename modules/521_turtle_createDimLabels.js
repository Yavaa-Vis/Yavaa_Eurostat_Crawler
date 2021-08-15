'use strict';
/**
 * create a turtle file to hold the concept labels for dimension concepts
 */

// includes
const Cfg           = require( './config' ),
      DB            = require( __dirname + '/db' ),
      Log           = require( './logging.js' ).get(module.filename),
      Fs            = require( 'mz/fs' );

module.exports = async function createMeasLabels() {

  // log
  Log.not( 'creating turtle file for dimension concepts\' labels' );

  // load queries to DB connector
  await DB.loadQueries( [
    {key: 'label_getDimConcepts',  file: 'Label_getDimConcepts.sql'},
  ]);

  // query database for concept label matches
  const data = [];
  await DB.query( 'label_getDimConcepts')
    .each( async (promise) => {

      // wait for data
      const row = await promise;

      // insert into data
      data.push(
        '<' + 'http://eurostat.linked-statistics.org/dic/'
                    + row.name
                    + '> skos:prefLabel "'
                    + row.label
                    + '"@en ; .'
      );

    });

  // add prefixes
  data.unshift( '@prefix skos:     <http://www.w3.org/2004/02/skos/core#> .' );

  // write to file again
  await Fs.writeFile( Cfg.dimDictProcessedFile, data.join( '\n' ) );

};