'use strict';
/**
 * loads sql queries for dataset insertion and updating
 */

const
      Cfg     = require( './config.js' ), // configuration
      DB      = require( './db.js' ), // database access
      Log     = require( './logging.js' ).get(module.filename), // logging
      Fs      = require( 'mz/fs' ),
      Path    = require( 'path' ),
      Turtle  = require( './turtleTemplate.js' );

module.exports = async function() {

  // fetch filtered (ignored) datasets from file
  const filePath = Path.join( __dirname, 'data', 'datasets_filtered.tsv' ),
        filteredDatasets = (await Fs.readFile( filePath, 'utf8' ))
          .trim()
          .split( '\n' )
          .map( (ds) => `'${ds}'` )
          .join( ',' );

  // load queries
  await DB.loadQueries([
    {key: 'getCodelists',       file: 'Turtle_GetCodelists.sql',      params: { $stopwords: Cfg.turtleCodelistStopwords,
                                                                                $filtereddatasets: filteredDatasets } },
    {key: 'getTimeDim',         file: 'Turtle_GetTimeDims.sql'},
    {key: 'getDims',            file: 'Turtle_GetOtherDims.sql'},
    {key: 'getMeasVals',        file: 'Turtle_GetMeasValues.sql'},
    {key: 'getDistribution',    file: 'Turtle_GetDistribution.sql'},
    {key: 'updateClExportIds',  file: 'Turtle_UpdateClExportIds.sql', params: { $filtereddatasets: filteredDatasets } },
  ]);

  // logging
  Log.not('DB queries loaded');

};