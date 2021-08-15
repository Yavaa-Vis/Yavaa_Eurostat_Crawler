'use strict';
/**
 * connect all files in the given folder into a single file
 *
 * parameters:
 * - folder       ... the base folder to extract files from
 * - target       ... the target file
 * - options
 * -- remWhitespace     ... remove starting/trailing whitespaces ?                - default: true
 * -- remComments       ... remove (SPARQL) comments?                             - default: true
 * -- consolidateSpaces ... replace multiple consecutive spaces by a single one?  - default: true
 * -- remEmptyLines     ... remove empty lines?                                   - default: true
 * -- addFilenames      ... adds (SPARQL) comments for before each file           - default: true
 * -- keepLinebreaks    ... keep existing linebreaks?                             - default: false
 * -- preface           ... string to print before file contents                  - default: ''
 * -- postface          ... string to print after file contents                   - default: ''
 * - filter       ... (optional) function to be applied to each file's content before appending
 */

// includes
const Fs   = require( 'mz/fs' ),
      Path = require( 'path' );

// regular expressions
const regexp = {
  spaces:         /[ ]+/g,
  endSpaces:      /(^[^\S\r\n]+)|([^\S\r\n]+$)/gm,    // http://stackoverflow.com/a/5568828/1169798
  comments:       /# .*$/gm,
  emptyLines:     /^\s*$/gm,
  linebreaks:     /\r?\n|\r/g,
};

module.exports = async function(  folder,
  target,
  options = {},
  filter,
  fileFilter ) {

  // default options
  const defaultOptions = {
    remWhitespace:      true,
    remComments:        true,
    consolidateSpaces:  true,
    remEmptyLines:      true,
    addFilenames:       true,
    keepLinebreaks:     false,
    preface:            '',
    postface:           '',
  };
  options = Object.assign( {}, defaultOptions, options );

  // open stream to target file
  const targetStream = promisify( Fs.createWriteStream( target ) );

  // write preface
  await targetStream.write( options.preface );

  // read folder contents
  let files = await Fs.readdir( folder );
  files = files.filter( (f) => {

    // get stats object
    const stats = Fs.lstatSync( folder + Path.sep + f );

    // we want only files
    return stats.isFile();

  });

  // walk through all files
  let fileCount = 0;
  for( let i=0; i<files.length; i++ ) {

    // if a file filter is set, use it
    if( fileFilter && !fileFilter( files[i] ) ) {
      continue;
    }

    // read file contents
    let content = await Fs.readFile( folder + Path.sep + files[i], 'utf8' );

    // pass through filter, if present
    if( filter ) {
      content = await filter( content );
    }

    // consolidate spaces
    if( options.consolidateSpaces ){
      content = content.replace( regexp.spaces, ' ' );
    }

    // remove trailing and starting spaces
    if( options.remWhitespace ) {
      content = content.replace( regexp.endSpaces, '' );
    }

    // remove comments
    if( options.remComments ) {
      content = content.replace( regexp.comments, '' );
    }

    // remove empty lines
    if( options.remEmptyLines ) {
      content = content.replace( regexp.emptyLines, '' )
        .trim();
    }

    // remove line breaks
    if( !options.keepLinebreaks ) {
      content = content.replace( regexp.linebreaks, '' );
    }

    // write to result file
    if( options.addFilenames ) {
      await targetStream.write( '# ' + files[i] + '\n' );
    }
    await targetStream.write( content );
    await targetStream.write( '\n' );

    // stats
    fileCount += 1;

  }

  // close the target file
  targetStream.end( options.postface );

  return fileCount;

};



// XXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXX Helper XXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXX

/**
 * currently modernize does not proxy the writeableStream object,
 * so we have to do it
 */
function promisify( stream ) {

  // reference to old version
  const _oldWrite = stream.write;

  // replace by proxy
  stream.write = function( content ) {
    return new Promise( (ful, rej) => {
      _oldWrite.call( stream, content, ( err ) =>{
        if( err ) {
          rej( err );
        } else {
          ful( true );
        }
      });
    });
  };

  return stream;
}