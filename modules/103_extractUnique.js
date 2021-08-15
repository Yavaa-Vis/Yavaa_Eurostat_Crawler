'use strict';
/**
 * module extracts leaf information about the datasets from cheerio
 * returns array of all (non duplicated) datasets
 */

const
      Cfg = require('./config.js'), //configuration
      Log = require('./logging.js').get(module.filename); //logging

/*
 * extract dataset related data from an XML node
 * @params  {Cheerio}     $entry      the XML node to extract from
 * @returns {Object}                  dataset description
 */
function getDataset($entry) {
  return { //extract data from xml-leaf
    //$entry: $entry, //for later extraction
    code:         $entry.find('nt\\:code').text().trim(),
    title:        $entry.find('nt\\:title[language="en"]').text().trim(),
    modifiedDate: $entry.find('nt\\:lastmodified').text().trim(),
    updateDate:   $entry.find('nt\\:lastupdate').text().trim(),
    downloadTSV:  $entry.find('nt\\:downloadlink[format="tsv"]').text().trim(),
    downloadSDMX: $entry.find('nt\\:downloadlink[format="sdmx"]').text().trim(),
    unit:         $entry.find('nt\\:unit[language="en"]').text().trim(),
    valueCount:   +$entry.find('nt\\:values').text().trim(),
  };
}

/**
 * dataset validator
 * params: dataset
 * returns: true if dataset is valid
 */
function checkDataset(ds) {

  if( !ds.code ) {
    return [ false, 'no code' ];
  }

  if( !ds.downloadTSV ) {
    return [ false, 'no TSV file' ];
  }

  if( ds.valueCount > Cfg.downloadMaxElements ) {
    return [ false, 'to many items' ];
  }

  return [ true, null ];
}

module.exports = function($cheerio) {

  // logging
  Log.not('analyzing TOC...');

  // get all leaves == all datasets
  const leaves      = $cheerio.root().find('nt\\:leaf[type="dataset"], nt\\:leaf[type="table"]'),
        datasets    = [],         // collection of datasets
        uniqueCodes = new Set();  // against duplicated datasets

  // process all datasets
  let total = 0, errors = 0;
  for( let i=0; i<leaves.length; i++ ) {

    // shortcut
    const leaf = leaves[i];

    // get dataset
    const dataset = getDataset( $cheerio(leaf) );

    // check for duplicates
    if(uniqueCodes.has(dataset.code)) {
      Log.log('"' + dataset.code + '" - duplication detected');
      continue;
    }
    uniqueCodes.add(dataset.code);

    // validate dataset
    total += 1;
    const [valid, reason] = checkDataset(dataset);
    if( valid ) {
      datasets.push(dataset);
    } else {
      Log.not( `invalid dataset "${dataset.code}": ${reason}` );
      errors += 1;
    }

  }

  Log.not( `Datasets: ${total} (total) | ${errors} (erroneous}` );

  return datasets;
};