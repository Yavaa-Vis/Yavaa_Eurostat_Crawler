'use strict';
/**
 * Download dictionaries
 */

const Cheerio = require( 'cheerio' ),               // core jQuery
      Cfg     = require( './modules/config.js' ),   // Configuration
      Logger  = require( './modules/logging.js' ),  // logging
      downloadFile = require( './modules/util/downloadFile' ),      // download files
      Fs      = require( 'mz/fs' ),
      Path    = require( 'path' ),
      CSV     = require( 'papaparse' );

// local config
const localCfg = {
  throttle: 500,
};

(async () => {

  // init logging
  await Logger.init();
  const Log = Logger.get( module.filename );

  // download dictionary list
  await downloadFile( Cfg.dicSource, Cfg.dicTmpFile );
  const dicCont = await Fs.readFile( Cfg.dicTmpFile );

  // extract dictionary files
  let $          = Cheerio.load( dicCont ),
      $tableRows = $( 'tr' ),
      files = [];
  for( let i=2; i<$tableRows.length; i++ ) { // skip first two rows as they are headers

    // shortcuts
    const $row = $tableRows.eq( i ),
          cellName = $row.find( 'td:nth-child(1)' ).text(),
          cellDate = $row.find( 'td:nth-child(4)' ).text(),
          cellDL   = $row.find( 'td:nth-child(5) a' ).attr( 'href' );

    // add to results
    files.push({
      name: Path.basename( cellName, '.dic' ).trim(),
      date: cellDate,
      url:  cellDL,
    });

  }
  $ = undefined;
  Log.not('Dictionaries found: ' + files.length );

  // load old file list, if existent
  let oldFiles = [];
  if( await Fs.exists( Cfg.dicOutputFile ) ) {
    oldFiles = require( Cfg.dicOutputFile );
  }

  // filter file list for changes
  files = files.filter( (newF) => !oldFiles.some( (oldF) => (oldF.name == newF.name) && (oldF.date == newF.date) ) );
  Log.not('New/changed dictionaries: ' + files.length );

  // create a lookup for labels to be replaced
  const content       = await Fs.readFile( Cfg.DataPath + 'custom_altValueLabels.csv', 'utf8' ),
        replacements  = CSV.parse( content,{
          skipEmptyLines: true
        }).data
          .reduce( (all,line) => {
            const [codelist, value, label] = line;
            all[ codelist ] = all[ codelist ] || {};
            all[ codelist ][ value ] = label;
            return all;
          }, {});

  // download all new/changed dictionaries
  let done = 0;
  for( let task of files ) {

    // download file
    const url = task.url.startsWith( 'http' )
                  ? task.url
                  : Cfg.dicBaseURL + task.url;
    await downloadFile( url, Cfg.dicTmpFile );

    // read the downloaded file
    const content = await Fs.readFile( Cfg.dicTmpFile, 'utf8' ),
          data    = content.trim()
            .split( '\n' )
            .map( line => line.split( '\t' )
              .map( cell => cell.trim() )
            );

    // create RDF version
    const items = data.map( d => `<${Cfg.turtlePrefixEntries}${task.name}#${d[0]}>` );
    const rdfContent =[ `@prefix skos:    <http://www.w3.org/2004/02/skos/core#> .
@prefix rdf:     <http://www.w3.org/1999/02/22-rdf-syntax-ns#> .

<${Cfg.turtlePrefixEntries}${task.name}> a skos:ConceptScheme ;
skos:notation "${task.name}" ;
skos:hasTopConcept ${items.join( ' , ' )} .
` ];
    for( let [ value, label ] of data ) {

      if( !label ) {
        label = '[missing label]';
      } else if( (task.name in replacements) && (value in replacements[ task.name ]) ) {
        label = replacements[ task.name ][ value ];
      } else {
        label = label.replace( /"/gi, '\'' );
      }
      rdfContent.push( `<${Cfg.turtlePrefixEntries}${task.name}#${value}> skos:prefLabel "${label}"@en;
skos:inScheme <${Cfg.turtlePrefixEntries}${task.name}>;
skos:notation "${value}" ;
a skos:Concept .` );
    }

    // write RDF to File
    await Fs.writeFile( Path.join( Cfg.dicOutputDir, task.name + '.ttl' ), rdfContent.join( '\n' ) );

    // we log every few downloads
    done += 1;
    if( done % 10 == 0 ) {
      Log.not( '   progress ' + done + ' / ' + files.length );
    }

    // throttle down
    await throttle();

  }

  // log
  Log.not( 'Downloaded all dictionaries' );

  // save extracted dictionaries
  await Fs.writeFile( Cfg.dicOutputFile, JSON.stringify( files ) );
  Log.not('saved filelist to ' + Cfg.dicOutputFile);


})()
  .catch( (e) => {
    console.log( e );
  });


async function throttle() {
  return new Promise( resolve => setTimeout( resolve, localCfg.throttle ) );
}