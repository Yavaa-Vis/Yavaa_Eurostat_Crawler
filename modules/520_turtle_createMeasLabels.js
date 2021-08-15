'use strict';
/**
 * create a turtle file to hold the concept labels for measurement concepts
 */

// includes
const Cfg           = require( './config' ),
      DB            = require( __dirname + '/db' ),
      Fs            = require( 'mz/fs' );

module.exports = async function createMeasLabels() {

  // load queries to DB connector
  await DB.loadQueries( [
    {key: 'label_getMeasConcepts',  file: 'Label_getMeasConcepts.sql'},
  ]);

  // query database for concept label matches
  const data = [];
  await DB.query( 'label_getMeasConcepts')
    .each( async (promise) => {

      // wait for data
      const row = await promise;

      // insert into data
      data.push(
        '<' + row.concept + '> skos:prefLabel "' + row.shortTitle + '"@en .'
      );

    });

  // add prefixes
  data.unshift( '@prefix skos:     <http://www.w3.org/2004/02/skos/core#> .' );

  // write to file again
  await Fs.writeFile( Cfg.measDictFil, data.join( '\n' ) );

};