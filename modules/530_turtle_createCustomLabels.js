'use strict';
/**
 * add alternate labels for certain entities
 *
 * (default labels will NOT be overridden, but alternate labels will be set)
 *
 * currently redundant to runDownloadDic.js
 */

const
      Log = require( './logging.js' ).get(module.filename),
      Cfg = require( './config.js' ),
      CSV = require( 'papaparse' ),
      Fs  = require( 'mz/fs' );

module.exports = async function() {

  // log
  Log.not( 'creating alternate labels ...' );

  // load custom mappings
  const content = await Fs.readFile( Cfg.DataPath + 'custom_altValueLabels.csv', 'utf8' ),
        data    = CSV.parse( content,{
          skipEmptyLines: true
        }).data;

  // open output-stream
  const out = await Fs.open( Cfg.customLabelFile, 'w' );
  await Fs.write( out, '@prefix skos: <http://www.w3.org/2004/02/skos/core#> .\n' );
  let items = 0;

  // value custom labels
  for( const [ codelist, value, label ] of data ){

    // add to file
    await Fs.write( out, `<${Cfg.turtlePrefixEntries}${codelist}#${value}> skos:altLabel "${label}" .\n` );
    items += 1;

  }

  // close file
  await Fs.close( out );

  // done
  Log.not( `   set alternate labels: ${items}` );

};