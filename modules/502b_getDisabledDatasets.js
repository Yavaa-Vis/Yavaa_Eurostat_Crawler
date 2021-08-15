'use strict';
/**
 * retrieve list of disabled datasets and init dataset template collection
 */

const
      Log     = require( './logging.js' ).get(module.filename), // logging
      Fs      = require( 'mz/fs' ),
      Path    = require( 'path' );

module.exports = async function() {

  // fetch filtered (ignored) datasets from file
  const filePath = Path.join( __dirname, 'data', 'datasets_filtered.tsv' ),
        filteredDatasets = (await Fs.readFile( filePath, 'utf8' ))
          .trim()
          .split( '\n' )
          .map( (code) => code.trim() );

  // disable in datasets object
  const datasets = {};
  for( const code of filteredDatasets ) {
    datasets[ code ] = false;
  }

  // logging
  Log.not('retrieved disabled datasets');

  return datasets;

};