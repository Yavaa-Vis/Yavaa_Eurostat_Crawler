'use strict';
/**
 * module creates turtle file components for every dimension except time
 */

const
      Cfg = require('./config.js'), //configuration
      DB = require('./db.js'), //database access
      Log = require('./logging.js').get(module.filename), //logging
      Turtle = require('./turtleTemplate.js');

const
      getDistribution = DB.query('getDistribution'),
      templateList = {
        //global {code}, {title}, {dists}, {distNames}, {dims}
        main: 'dsd.ttl',
        //distribution {name}, {target}, {type}
        distr: 'dsd_distr.ttl',
      };

module.exports = async function(datasets) {
  Log.not('creating turtle files for datasets...');

  // distribution {name}, {target}, {type}
  let written = 0,
      errors = 0;

  // load turtle templates
  const templates = await Turtle.loadAll(templateList);
  Log.log('loaded turtle main templates');

  // get dataset distributions
  const dropped = [];
  const results = await getDistribution.each( async (promise) => {//for every dataset

    // get the row
    const row = await promise;

    // skip disabled datasets
    if( datasets[ row.code ] === false ) {
      return;
    }

    let
        dists = [],
        distNames = [],
        name,
        dims = datasets[ row.code ] || [];
    if( (dims === false) || (dims.length == 0)) {
      datasets[ row.code ] = false;
      dropped.push( row.code );
      return;
    }

    if(row.downloadTSV != null) { //check for tsv link
      name = ':' + row.code + '_dist_tsv';
      distNames.push(name);
      dists.push({
        name: name,
        target: row.downloadTSV,
        type: 'text/tsv'
      });
    }
    if(row.downloadSDMX != null) { //check for sdmx link
      name = ':' + row.code + '_dist_sdmx';
      distNames.push(name);
      dists.push({
        name: name,
        target: row.downloadSDMX,
        type: 'xml/sdmx'
      });
    }

    // build replacement
    const dataset = {
      code: row.code,
      title: row.title,
      dists: dists,
      distNames: distNames.join(', '),
      dims: dims.join(',\n')
    };

    // generate turtle templates for every download link
    const turtleDists = await Turtle.replaceAll(templates.distr, dataset.dists);
    dataset.dists = turtleDists.join('\n'); //join generated templates

    // build main template
    const turtle = await Turtle.replace(templates.main, dataset);
    await Turtle.save(turtle, Cfg.turtleOutputDatasetsDir + dataset.code);

    Log.log('"' + dataset.code + '" - turtle file created');
    written += 1;


  });

  // done
  results.errors.forEach((err) => Log.err(err));
  Log.not( 'turtle files created: ' + written );
  Log.not( 'datasets dropped: ' + dropped.length );
  return datasets;

};