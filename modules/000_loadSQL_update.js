'use strict';
/**
 * loads sql queries for dataset insertion and updating
 */

const
      DB  = require('./db.js'), //database access
      Log = require('./logging.js').get(module.filename); //logging

module.exports = async function() {

  await DB.loadQueries([
    {key: 'getDataset',         file: 'Data_GetDataset.sql'},
    {key: 'getDatasetCodes',    file: 'Data_getDatasetCodes.sql'},
    {key: 'getDim',             file: 'Data_GetDimension.sql'},
    {key: 'getDimVal',          file: 'Data_GetDimValue.sql'},
    {key: 'insertDataset',      file: 'Data_InsertDataset.sql'},
    {key: 'insertDim',          file: 'Data_InsertDimension.sql'},
    {key: 'insertDimVal',       file: 'Data_InsertDimValue.sql'},
    {key: 'insertLinkDSDimVal', file: 'Data_InsertLinkDSDimVal.sql'},
    {key: 'insertMeasVals',     file: 'Data_InsertMeasValues.sql'},
    {key: 'updateMeasVals',     file: 'Data_UpdateMeasValues.sql'},
    {key: 'updateDates',        file: 'Data_UpdateDates.sql'},
    {key: 'deleteOldLinks',     file: 'Data_DeleteOldLinksDSDimVal.sql'},
    {key: 'setDatasetDeleted',  file: 'Data_setDatasetDeleted.sql'},
    {key: 'setDatasetUndeleted',file: 'Data_setDatasetUndeleted.sql'},
  ]);

  Log.not('DB queries loaded');

};