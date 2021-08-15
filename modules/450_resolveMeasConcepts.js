'use strict';
/**
 * resolve concepts for all measurements taken (one per dataset)
 *
 * custom mappings from custom_measConcepts.csv:
 * renames some auto created concepts to canonized versions
 * structure: from | to
 *
 */

// includes
const DB  = require( './db' ),
      Log = require( './logging.js' ).get(module.filename),
      Cfg = require( './config' ),
      CSV = require( 'papaparse' ),
      Fs  = require( 'mz/fs' );

module.exports = async function resolveMeasConcepts() {

  // log
  Log.not( 'applying measurement concepts ...' );

  // load queries
  await DB.loadQueries( [
    {key: 'label_clearMeasConcepts',  file: 'Label_clearMeasConcepts.sql'},
    {key: 'label_getShorttile',       file: 'Label_getShorttitles.sql'},
    {key: 'label_addMeasConcepts',    file: 'Label_addMeasConcepts.sql'},
    {key: 'label_updateMeasValues',   file: 'Label_updateMeasValues.sql'},
  ]);

  // get all (distinct) shorttitles
  let shortTitles = [];
  await DB.query( 'label_getShorttile' )
    .each( async (promise) => {

      // get data
      const row = await promise;

      // add shorttitle to collection
      shortTitles.push( row.shortTitle );
    });

  // get custom replacements
  const content = await Fs.readFile( Cfg.DataPath + 'custom_measConcepts.csv', 'utf8' ),
        mapping = CSV.parse( content, {
          skipEmptyLines: true
        })
          .data
          .reduce( (all,el) => {
            all[ el[0] ] = el[1];
            return all;
          }, {} );

  // create a concept for each shorttitle
  shortTitles = shortTitles.map( (title) => {
    const autoConcept = createConcept( title );
    const concept = (autoConcept in mapping) ? mapping[ autoConcept ] : autoConcept;
    return {
      $title:   title,
      $concept: concept,
    };
  });

  // clear table
  await DB.query( 'label_clearMeasConcepts' ).run();

  // insert into measure concepts table
  const addQuery = await DB.query( 'label_addMeasConcepts' );
  for( let i=0; i<shortTitles.length; i++ ) {
    await addQuery.run( shortTitles[i] );
  }

  // update measure values table
  const res = await DB.query( 'label_updateMeasValues' ).run();

  // done
  Log.not( `   set measurement concepts: ${shortTitles.length}` );
  Log.not( `   affected datasets: ${res.rowsAffected()}` );

};


/**
 * create a unique concept URL out of the given title
 */
function createConcept( title ) {

  // to camel case
  // http://stackoverflow.com/a/2970667/1169798
  title = title.replace(/(?:^\w|[A-Z]|\b\w)/g, function(letter, index) {
    return index == 0 ? letter.toLowerCase() : letter.toUpperCase();
  })
    .replace( /\s+/g, '' )
    .replace( /\W/gi, '' );

  return Cfg.turtlePrefixMeasures + title;
}