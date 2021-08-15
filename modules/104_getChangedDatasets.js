'use strict';
/**
 * module checks the database for existance and modification of the datasets
 * returns array of promises (fulfilling with dataset if work needs to be done)
 */

const
      Cfg = require('./config.js'), //configuration
      DB = require('./db.js'), //database access
      Log = require('./logging.js').get(module.filename); //logging

const
      getDataset    = DB.query('getDataset'),
      insertDataset = DB.query('insertDataset');

/*
 * checks the database if the dataset needs to be updated
 * params: dataset
 * returns: promise (fulfilled with dataset if update necessary)
 */
async function checkDB(dataset) {

  try {

    // get information from DB, if existing
    const row = await getDataset.get({ //database query
      $code: dataset.code
    });

    if (row == undefined) { //no entry in db

      // preparing db query
      const param = {};
      Object.keys(dataset)
        .forEach((key) => { //preparing parameters for query
          const tmpkey = '$' + key;
          if(insertDataset.statement.sql.indexOf(tmpkey) >= 0) { //add param only if it exists in the query statement
            param[tmpkey] = dataset[key];
          }
        });
      Log.log('"' + dataset.code + '" - new dataset');

      // insert dataset to database
      const res = await insertDataset.run(param);
      Log.log('"' + dataset.code + '" - inserted into database');
      dataset.dsid = res.getLastID(); //keep rowid

      // done
      return dataset;

    } else { //query successful - dataset exists in database

      // memorize ID
      dataset.dsid = row.dsid; //keep rowid

      if((row.modifiedDate == dataset.modifiedDate) && (row.updateDate == dataset.updateDate)) {

        // not modified
        Log.log('"' + dataset.code + '" - not modified');
        return null;

      } else {

        // modification found
        Log.log('"' + dataset.code + '" - modification detected');
        return dataset;

      }

    }

  } catch(e) {

    // log the error
    Log.err( e );

    // skip dataset from this on
    return null;

  }

}

module.exports = async function(datasets) {

  // check for new or modified entries
  const reqs = datasets.map( (ds) => checkDB(ds) );

  // wait for all to finish
  return Promise.all( reqs );

};