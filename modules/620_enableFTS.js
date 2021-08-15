'use strict';
/**
 * enable Full Text Search on the index
 *
 *
 * assumes GraphDB: http://graphdb.ontotext.com/documentation/standard/full-text-search.html
 */

//includes
const Cfg          = require( __dirname + '/config' ),
      Log          = require( './logging.js' ).get(module.filename),
      RequestP    = require( 'request-promise-native' ),
      Request     = require( 'request' );


module.exports = async function(){

  Log.not( 'Creating FullTextSearch index' );

  // settings
  const querySettings = `
  PREFIX luc: <http://www.ontotext.com/owlim/lucene#>
  INSERT DATA {
    luc:index             luc:setParam "uris" .
    luc:include           luc:setParam "literals" .
    luc:moleculeSize      luc:setParam "1" .
    luc:includePredicates luc:setParam "${Cfg.indexPredicates.join( ' ' )}" .
  }`;

  // create index
  const queryCreate = `
  PREFIX luc: <http://www.ontotext.com/owlim/lucene#>
  INSERT DATA {
    luc:${Cfg.indexName}   luc:createIndex   "true" .
  }`;

  // update index
  const queryUpdate = `
  PREFIX luc: <http://www.ontotext.com/owlim/lucene#>
  INSERT DATA {
    luc:${Cfg.indexName}   luc:updateIndex _:b1 .
  }`;

  // run query
  let res;
  res = await updateSPARQL( Cfg.uploadTarget, querySettings );
  Log.not( `   index settings: ${res == '' ? 'OK' : res}` );
  res = await updateSPARQL( Cfg.uploadTarget, queryCreate );
  Log.not( `   index creation: ${res == '' ? 'OK' : res}` );
  res = await updateSPARQL( Cfg.uploadTarget, queryUpdate );
  Log.not( `   index update: ${res == '' ? 'OK' : res}` );

};

/**
 * send the index creation queries to the endpoint
 */
async function updateSPARQL( url, query ) {

  // request options
  const opt = {
    url:      url,
    method:   'POST',
    headers:  {
      ... Cfg.downloadHeaders,
      'Content-Type': 'application/x-www-form-urlencoded',
      'Accept':       'application/json',
    },
    form: { 'update': query },

    // request-module specific settings
    followOriginalHttpMethod: true,
  };

  return RequestP( opt );

}


//if called directly, execute the file
if ( !module.parent ) {
  module.exports().catch( e => console.log(e) );
}