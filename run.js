'use strict';
/** run script
 *
 */

const
      CLA     = require( 'command-line-args' ),     // parsing command line arguments
      Logging = require( './modules/logging.js'),   // logging
      DB      = require( './modules/db.js'),        // database access
      Cfg     = require( './modules/config' );

// *************************************************** Command Line Arguments

// parse command line arguments
const options = CLA([
  { name: 'start', alias: 's', type: String, defaultValue: [ 'start' ], defaultOption: true },
  { name: 'help',  alias: 'h', type: Boolean }
]);

if( options.help ) {
  console.log( 'use like: node run.js --start toc' );
  process.exit();
}

// *************************************************** Job Progress
let
    jobSize = 0,  // number of tasks
    Log;

/**
 * count number of datasets need to be processed
 * @param jobs
 * @returns
 */
function countJobsTotal( jobs) {
  return jobs.filter( (j) => j ).length;
}

// default error handler
process.on('unhandledRejection', r => { console.log( 'Unhandled rejection:', r ); process.exit(); });

(async function(){

  //*************************************************** INIT

  // start the database connection and initialize logging
  await Logging.init();
  Log = Logging.get();

  // init database
  await DB.init();

  // load sql queries for dataset insertion and updating
  await require('./modules/000_loadSQL_update.js')();

  // parsing workflow with separate entry points
  switch( options.start ) {

    // *************************************************** PHASE 1
    default:
    case 'start':
    case 'toc':
      // download TOC xml
      await require('./modules/100_downloadTOC.js')();
      // load TOC xml and cheerio
      const $cheerio = await require('./modules/101_parseTOC.js')();
      // parse cheerio; extract (unique) dataset information
      const tocDatasets = await require('./modules/103_extractUnique.js')( $cheerio );
      // check db for deleted datasets
      await require('./modules/105_tagDeletedDatasets.js')( tocDatasets );
      // check db for modified/new datasets
      let changedDatasets = await require('./modules/104_getChangedDatasets.js')( tocDatasets );
      // logging
      Log.not( 'done processing TOC' );

      // TODO to enable this startpoint, we need to pull the datasets from the database again; will involve changes to 4_getChangedDatasets
      // case 'update':
      // counts total number of jobs
      jobSize = await countJobsTotal( changedDatasets );
      Log.not( `changed datasets: ${jobSize} of ${changedDatasets.length}` );
      // download & process data and metadata
      changedDatasets = await require('./modules/200_download_processData.js')( changedDatasets );
      // save metadata and update the dataset in the database
      changedDatasets = await require('./modules/201_saveMetadata.js')( changedDatasets );
      // done with updating
      Log.log( changedDatasets.length + ' datasets processed');

    case 'clean':
      // clean up of database
      await require('./modules/300_tidyDB.js')();
      // close queries for dataset insertion and updating
      await DB.closeQueries();

    case 'units':
      // attach unit information for datasets with unique unit column
      await require('./modules/400_resolveUnits_byCol.js')();
      // attach unit information from custom mapping
      await require('./modules/401_resolveUnits_byMapping.js')();
      // attach unit information from TOC
      await require('./modules/402_resolveUnits_byTOC.js')( tocDatasets );
      // attach remaining unit related information
      await require('./modules/405_addMoreUnitInfo.js')();

    case 'concepts':
      // assign concepts to measurements
      await require('./modules/450_resolveMeasConcepts.js')();

    case 'labels':
      // get dimension labels
      await require( './modules/470_getDimLabels')();
      // set custom dimension labels
      await require( './modules/471_applyCustomDimLabels')();
      // set custom measurement concept labels
      await require( './modules/472_applyCustomMeasLabels')();


      // phase 2 should be triggered separately
      break;

      // *************************************************** PHASE 2
    case 'export':
      // load sql queries for creating turtle files
      await require('./modules/500_loadSQL_extract.js')();
      // clean output folders
      await require('./modules/501_cleanFolders.js')();
      await require('./modules/502_turtle_createCL.js')();

      // need to make sure time/date triples are already in the triple store
      // otherwise createTimeDim wont work
      await require( './modules/util/sendFile')( Cfg.YavaaBase + '/ontology/datatypes_time.ttl', Cfg.uploadTarget );

      // mark disabled datasets
      let exportDatasets = await require( './modules/502b_getDisabledDatasets.js' )();

      // add dimensions
      exportDatasets = await require('./modules/503_turtle_createTimeDim.js')( exportDatasets );
      exportDatasets = await require('./modules/504_turtle_createDim.js')( exportDatasets );
      exportDatasets = await require('./modules/505_turtle_createMeas.js')( exportDatasets );
      // filter some datasets
      exportDatasets = await require( './modules/550_filterMultiUnit.js')( exportDatasets );
      // store files
      await require('./modules/506_turtle_saveFiles.js')( exportDatasets );
      // get measure concept labels
      await require( './modules/520_turtle_createMeasLabels')();
      // get dimension concept labels
      await require( './modules/521_turtle_createDimLabels')();
      // add custom labels labels
      await require( './modules/530_turtle_createCustomLabels')();

    case 'push':
      // collect all files in the upload directory
      await require( './modules/600_collectResults')();
      // push results to triple store
      await require( './modules/610_push2repo')();
      // enable full text search
      await require( './modules/620_enableFTS')();

  }

  // *************************************************** EXIT

  // close queries for dataset insertion and updating
  await DB.closeQueries();
  await DB.vacuum();

}())
  .catch( (err) => { console.log( 'Error', err ); Log.err(err); } )
  .finally( () => Log.not('program finished') );
