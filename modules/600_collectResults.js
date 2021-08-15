'use strict';
/**
 * collect all result files into the upload tmp folder to be ready for upload
 */

// includes
const connectFiles = require( __dirname + '/util/connectFiles' ),
      copyFiles    = require( __dirname + '/util/copyFiles' ),
      downloadFile = require( __dirname + '/util/downloadFile' ),
      Cfg          = require( __dirname + '/config' ),
      DB           = require( __dirname + '/db' ),
      Log          = require( './logging.js' ).get(module.filename),
      Fs           = require( 'mz/fs' ),
      Path         = require( 'path' );

// regular expressions
const regexp = {
  prefixes: /^(@prefix.*)$/gm
};

module.exports = async function push2repo() {

  // common variables
  let prefixes, fileCount;

  // get list of used dictionaries
  await DB.loadQueries( [
    { key: 'getUsedDictionaries',   file: 'Turtle_GetUsedDictionaries.sql' },
  ]);
  const usedDic = (await DB.query( 'getUsedDictionaries' ).all())
    .map( (el) => el.name + '.ttl' );

  // dictionaries
  prefixes = await getPrefixes( __dirname + '/templates/codelist.ttl' ); // this is a working abuse here
  fileCount = await connectFiles( Cfg.dicOutputDir,
                                  Cfg.uploadTmp + '/dictionaries.ttl',
                                  { preface: '' },
                                  (content) => content.replace( regexp.prefixes, '' ),
                                  (filename) => usedDic.includes( filename ) );
  Log.not( `copied dictionaries: #${fileCount}` );

  // codelists
  prefixes = await getPrefixes( __dirname + '/templates/codelist.ttl' );
  fileCount = await connectFiles( Cfg.turtleOutputCodelistsDir,
                                  Cfg.uploadTmp + '/codelists.ttl',
                                  { preface: prefixes.join( ' ' ) + '\n' },
                                  (content) => content.replace( regexp.prefixes, '' ) );
  Log.not( `copied codelists: #${fileCount}` );

  // dataset descriptions
  prefixes = await getPrefixes( __dirname + '/templates/dsd.ttl' );
  fileCount = await connectFiles( Cfg.turtleOutputDatasetsDir,
                                  Cfg.uploadTmp + '/datasets.ttl',
                                  { preface: prefixes.join( ' ' ) + '\n' },
                                  (content) => content.replace( regexp.prefixes, '' ) );
  Log.not( `copied datasets: #${fileCount}` );

  // dimension concept labels
  await copyFiles( Cfg.dimDictProcessedFile, Cfg.uploadTmp, Log );
  Log.not( 'copied dimension concept labels' );

  // measurement concept labels
  await copyFiles( Cfg.measDictFil, Cfg.uploadTmp, Log );
  Log.not( 'copied measurement concept labels' );

  // custom labels
  await copyFiles( Cfg.customLabelFile, Cfg.uploadTmp, Log );
  Log.not( 'copied custom labels' );

  // date time format triples
  await copyFiles( Cfg.YavaaBase + '/ontology/datatypes_time.ttl', Cfg.uploadTmp, Log );
  Log.not( 'copied datetime triples' );

  // unit ontology
  await downloadFile(
    'http://www.wurvoc.org/data/om-1.8.ttl',
    Path.join( Cfg.uploadTmp, 'om.ttl' )
  );
  Log.not( 'downloaded OM-ontology' );

  // additional units
  const addUnitsBase = Path.join( __dirname, '..', 'additionalUnits' );
  await require( Path.join( addUnitsBase, 'createFile.js') )();
  await copyFiles( Path.join( addUnitsBase, 'result', 'units.ttl' ), Cfg.uploadTmp, Log );
  Log.not( 'copied custom units and dimensions' );

  // structural ontology
  await copyFiles( Cfg.YavaaBase + '/ontology/datacubes/cube.ttl', Cfg.uploadTmp, Log );
  Log.not( 'copied datacubes-ontology' );

  // other files
  prefixes = await getPrefixes( Path.join( __dirname, '..', 'additionalRDF', 'prefixes.ttl' ) );
  fileCount = await connectFiles( Path.join( __dirname, '..', 'additionalRDF' ),
                                  Cfg.uploadTmp + '/other.ttl',
                                  { preface: prefixes.join( '\n' ) + '\n' },
                                  (content) => content.replace( regexp.prefixes, '' ) );
  Log.not( `copied additional RDF files: #${fileCount}` );

};

/**
 * extract the prefixes from the given Turtle template
 */
async function getPrefixes( templ ) {

  // load the template
  const content = await Fs.readFile( templ, 'utf8' );

  // extract all prefixes
  const prefixes = [];
  content.replace( regexp.prefixes, (match) => {
    prefixes.push( match );
    return match;
  });

  return prefixes;
}
