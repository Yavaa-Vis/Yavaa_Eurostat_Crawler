'use strict';
/**
 * module saves a processed dataset to the database
 */

const
      Cfg = require('./config.js'), //configuration
      DB  = require('./db.js'), //database access
      Log = require('./logging.js').get(module.filename); //logging

const
      insertDim           = DB.query('insertDim'),
      insertDimVal        = DB.query('insertDimVal'),
      insertLinkDSDimVal  = DB.query('insertLinkDSDimVal'),
      insertMeasVals      = DB.query('insertMeasVals'),
      getDim              = DB.query('getDim'),
      getDimVal           = DB.query('getDimVal'),
      updateMeasVals      = DB.query('updateMeasVals'),
      updateDates         = DB.query('updateDates'),
      deleteOldLinks      = DB.query('deleteOldLinks');

/*
 * executes database query
 * params: query-ready dataset
 * returns: promise
 */
async function updateDataset(dataset) {

  // skip declined datasets
  if( !dataset ) {
    return null;
  }

  try {

    // log
    Log.log('"' + dataset.code + '" - saving data...');

    // shortcuts
    let
        dims      = dataset.result.dims,
        dimVals   = dataset.result.dimVals,
        measVals  = dataset.result.measVals;
    delete dataset.result;

    // sort dimension values
    Object.keys( dimVals )
      .forEach( key => dimVals[key].sort() );

    // remove now invalid old dataset-dimensionvalue-links
    await deleteOldLinks.run({$dsid: dataset.dsid});

    // insert new dimensions
    const requests = dims.map( async (dim) => {

      // insert dimension
      const dimParam = {
        $name: dim.name
      };
      let res = await insertDim.run( dimParam );

      // update dimid
      if( res.getChangeCount() == 1 ) {

        // new dimension
        dim.dimid = res.getLastID();

      } else {

        // already existing dimension: get dimid
        const row = await getDim.get( dimParam );
        dim.dimid = row.dimid;

      }

      // insert dimension values
      const dimvalParam = {
        $dimid: dim.dimid,
        $values: JSON.stringify(dimVals[dim.name])
      };
      res = await insertDimVal.run( dimvalParam );

      // update dimvalid
      if(res.getChangeCount() == 1) {

        // new dimval
        dim.dimvalid = res.getLastID();

      } else {

        // already existing dimension: get dimid
        const row = await getDimVal.get( dimvalParam );
        dim.dimvalid = row.dimvalid;

      }

      // link dimval and dim
      await insertLinkDSDimVal.run({
        $dsid: dataset.dsid,
        $dimvalid: dim.dimvalid,
        $pos: dim.pos
      });

    });

    // wait for all dimensions to be inserted
    await Promise.all( requests );

    // insert measurement
    const measParam = {
      $dsid: dataset.dsid,
      $min: measVals.min,
      $max: measVals.max
    };
    let res = await insertMeasVals.run( measParam );

    // if could not insert, we need to update
    if(res.getChangeCount() != 1) {
      await updateMeasVals.run( measParam );
    }

    // update modified dates
    await updateDates.run({
      $code: dataset.code,
      $modifiedDate: dataset.modifiedDate,
      $updateDate: dataset.updateDate,
      $shortTitle: trimTitle(dataset.title)
    });

    // done
    Log.not('"' + dataset.code + '" - data saved');
    return dataset;

  } catch( e ) {

    // log errors for debugging
    throw Log.Error(e, dataset.code);

  }

}

/*
 * tries to trim a title to its main content
 * params: title to trim
 * returns: trimmed title
 */
function trimTitle(title) {
  for(let i = 0, p = -1; i < Cfg.titleStopwords.length; i++){
    p = title.indexOf(Cfg.titleStopwords[i]);
    if(p >= 0) {
      title = title.slice(0, p);
    }
  }
  return title;
}

module.exports = async function(datasets) {

  // check for new or modified entries
  const reqs = datasets.map( (ds) => updateDataset(ds) );

  // wait for all to finish
  return Promise.all( reqs );

};