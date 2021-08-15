'use strict';
/**
 * module extracts metadata from online tsv files
 * including download and per-line-parsing
 */

const
      Cfg     = require('./config.js'), //configuration
      Request = require( 'request' ),
      Url     = require('url'),
      Zlib    = require('zlib'),
      Log     = require('./logging.js').get(module.filename); //logging

const
      numericRegExp = /[^\d.,-:]+/g; //remove all non digit characters except ':', ',', '.', '-' -- http://stackoverflow.com/a/1173622/1169798

/*
 * parses a single input line
 * params: object containing input line and other data
 * returns: nothing
 */
function parseLine(data) { //updates values in $data
  let cells = data.line.value.split('\t'), //split into cells
      vals, index, tmp;

  if(data.line.nr == 0) { // first line == tsv header

    // extract existing columns
    tmp = cells[0].split('\\'); // tmp[0] = y-axis, tmp[1] = x-axis
    tmp = tmp[0].split(',').concat( tmp[1].split(',') );

    // add to result
    data.dims = tmp.map( (el,ind) => {
      return {
        name: el.trim(),  // there might be some superfluous spaces
        pos:  ind+1       // counting begins with 1
      };
    });

    // init distinct values array
    for(let i = 0; i < data.dims.length; i++) {
      data.dimVals[data.dims[i].name] = [];
    }

    // fill x dimensions for first line
    for(let i = 1; i < cells.length; i++) {
      vals = cells[i].split(','); //split values
      for(let j = vals.length; j--;) {
        vals[j] = vals[j].trim();
        index = data.dims.length - j - 1; //index for value
        if(data.dimVals[data.dims[index].name].indexOf(vals[j]) < 0) {
          data.dimVals[data.dims[index].name].push(vals[j]); //add distinct value
        }
      }
    }

  } else {//line of data
    //dimension column
    vals = cells[0].trim().split(',');

    for(let j = vals.length; j--;) {
      vals[j] = vals[j].trim();

      if(data.dimVals[data.dims[j].name].indexOf(vals[j]) < 0) {
        data.dimVals[data.dims[j].name].push(vals[j]); //add distinct value
      }
    }

    //measurement values
    for(let j = 1; j < cells.length; j++) {
      cells[j] = cells[j].replace(numericRegExp, '');

      //adjust min/max values
      if((cells[j].indexOf(':') < 0) && (cells[j] != '')) {
        tmp = parseFloat(cells[j]);
        data.measVals.min = (data.measVals.min < tmp) ? data.measVals.min : tmp;
        data.measVals.max = (data.measVals.max > tmp) ? data.measVals.max : tmp;
      }
    }
  }
}

/*
 * manages delayed download and parsing of data
 * params: dataset
 * returns: promise (resolves in the dataset with results containing the extracted metadata)
 */
function processDataset(dataset) {

  return new Promise( (fulfill, reject) => {

    // retrieve file
    Log.log('"' + dataset.code + '" - retrieving data...');
    const httpReq = Request
      .get({
        uri:      dataset.downloadTSV,
        header:   Cfg.downloadHeaders,
        timeout:  Cfg.downloadTimeout,
      })
      .on( 'error', (e) => {
        httpReq.abort();
        reject( e );
      });

    // pipe through Gunzip and parse TSV
    const results = {
      line: {
        nr: 0, //line number
        value: '' //line to process
      },
      dims: [], //dimension names as {name, pos}
      dimVals: {}, //distinct value lists
      measVals: { //measure value minimum and maximum
        min: Number.POSITIVE_INFINITY,
        max: Number.NEGATIVE_INFINITY
      }
    };
    let buffer = '';
    httpReq.pipe( Zlib.createGunzip() )
      .on('data', function(chunk) { //append data
        try{
          buffer += chunk; //append chunk

          //check for line endings
          for(let pos; (pos = buffer.indexOf('\n')) >= 0; ) { //search line ending - for every found line
            results.line.value = buffer.substr(0, pos); //extract line
            buffer = buffer.slice(++pos); //remove line from buffer
            parseLine(results);
            results.line.nr++;
          }
        } catch(err) {
          reject(err); //catch illegal access error
        }
      })
      .on('end', function() { //connection closed
        delete results.line;
        results.dims.forEach((key) => { //sort distinct value lists
          results.dimVals[key.name].sort();
        });
        fulfill(results); //return metadata
      })
      .on('error', reject );


    // save the results
    Log.log('"' + dataset.code + '" - metadata extracted');

  });

}

/**
 * resolve a promise after given delay
 * used to delay code execution
 * @param timeout
 * @returns
 */
async function delay( timeout ) {
  return new Promise( (fulfill) => {
    setTimeout( fulfill, timeout );
  });
}

/**
 * main function: process all datasets
 * @param promises
 * @returns
 */
module.exports = async function(datasets) {

  // get datasets to be processed
  const activeDs = datasets.filter( (ds) => ds );
  let done = 0;
  for( let ds of activeDs ) {

    // log
    done += 1;
    Log.not( `processing item ${done} of ${activeDs.length}: ${ds.code}` );

    try {

      // trigger processing of dataset
      const meta = await processDataset( ds );
      ds.result = meta;

      // wait before starting the next
      await delay( Cfg.downloadDelay );

    } catch( e ) {

      Log.err( Log.Error( e, ds.code ) );
      const index = datasets.findIndex( (el) => el && (el.code == ds.code) );
      datasets[ index ] = null;

    }

  }

  // done
  return datasets;

};