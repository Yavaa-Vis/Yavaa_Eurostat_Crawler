"use strict";
/**
 * use the units given in source.csv to create an OM1-compliant RDF file
 * (add units missing in OM)
 */

// libs
const CSV = require( 'papaparse' ),
      Fs  = require( 'mz/fs' );

module.exports = async function(){

  // namespaces used
  const ns = {
      unit: 'http://yavaa.org/ns/units/',
      dim:  'http://yavaa.org/ns/dimension/'
  };

  // load templates
  const templ = {
    dim:            await Fs.readFile( __dirname + '/templates/dimension.ttl', 'utf8' ),

    head:           await Fs.readFile( __dirname + '/templates/head.ttl', 'utf8' ),

    unit_singular:  await Fs.readFile( __dirname + '/templates/unit_singular.ttl', 'utf8' ),
    unit_convert:   await Fs.readFile( __dirname + '/templates/unit_convert.ttl', 'utf8' ),

    unit_division:        await Fs.readFile( __dirname + '/templates/unit_division.ttl', 'utf8' ),
    unit_reciprocal:      await Fs.readFile( __dirname + '/templates/unit_reciprocal.ttl', 'utf8' ),
    unit_multiplication:  await Fs.readFile( __dirname + '/templates/unit_multiplication.ttl', 'utf8' ),
  };

  // read source files
  let content = await Fs.readFile( __dirname + '/source/units.csv', 'utf8' );
  const sourceUnit = CSV.parse( content,{
    header: true,
    skipEmptyLines: true,
  }).data;
  content = await Fs.readFile( __dirname + '/source/dims.csv', 'utf8' );
  const sourceDim = CSV.parse( content,{
    header: true,
    skipEmptyLines: true,
  }).data;
  content = await Fs.readFile( __dirname + '/source/unitComposition.csv', 'utf8' );
  const sourceCompound = CSV.parse( content,{
    header: true,
    skipEmptyLines: true,
  }).data;


  // collect outputs
  const out = [ templ.head ];

  // collect required vs defined units/dims for simple consistency check
  const reqEntities = new Set(),
        defEntities = new Set();

  /* XXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXX Units XXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXX */

  for( let unit of sourceUnit ) {

    // add defined
    defEntities.add( ns.unit + unit.shortname );

    // build conversion, if needed
    let convert = '';
    if( unit.convertsTo ) {
      convert = templ.unit_convert
                        .replace( /{shortname}/g, unit.shortname )
                        .replace( /{base}/g,      unit.convertsTo )
                        .replace( /{factor}/g,    unit.convertsWith )
                      ;

      // add required
      reqEntities.add( unit.convertsTo );

    }

    // build unit-entry
    const entry = templ.unit_singular
                     .replace( /{name}/g,       unit.name )
                     .replace( /{shortname}/g,  unit.shortname )
                     .replace( /{symbol}/g,     unit.symbol )
                     .replace( /{dimension}/g,  unit.dimension )
                     .replace( /{convert}/g,    convert )
                     ;

    // add to output
    out.push( entry );

  }

  /* XXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXX Unit-Compounds XXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXX */
  for( let unit of sourceCompound ) {

    // add defined
    defEntities.add( ns.unit + unit.shortname );

    // there are different kinds of compound units
    let entry;
    if( unit.operator == '/' ) {

      if ( unit.op1 == '1' ) {

        // reciprocal
        entry = templ.unit_reciprocal
                        .replace( /{name}/g,       unit.name )
                        .replace( /{shortname}/g,  unit.shortname )
                        .replace( /{base}/g,       unit.op2 )
                        ;

      } else {

        // division
        entry = templ.unit_division
                        .replace( /{name}/g,       unit.name )
                        .replace( /{shortname}/g,  unit.shortname )
                        .replace( /{num}/g,        unit.op1 )
                        .replace( /{denom}/g,      unit.op2 )
                        ;

      }

    } else {

      // multiplication
      entry = templ.unit_multiplication
                       .replace( /{name}/g,       unit.name )
                       .replace( /{shortname}/g,  unit.shortname )
                       .replace( /{term_1}/g,     unit.op1 )
                       .replace( /{term_2}/g,     unit.op2 )
                       ;

    }

    // add to output
    out.push( entry );

  }

  /* XXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXX Dims XXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXX */
  for( let dim of sourceDim ) {

    // add defined
    defEntities.add( ns.dim + dim.name );

    // build entry
    const entry = templ.dim
                     .replace( /{name}/g,      dim.name )
                     .replace( /{desc}/g,      dim.desc )
                     .replace( /{expLen}/g,    dim.expLen )
                     .replace( /{expMass}/g,   dim.expMass )
                     .replace( /{expTime}/g,   dim.expTime )
                     .replace( /{expEl}/g,     dim.expEl )
                     .replace( /{expTemp}/g,   dim.expTemp )
                     .replace( /{expAmount}/g, dim.expAmount )
                     .replace( /{expLum}/g,    dim.expLum )
                     ;

    // add to output
    out.push( entry );

  }

  /* XXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXX DONE XXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXX */

  // write to file
  await Fs.writeFile( __dirname + '/result/units.ttl', out.join( '\n' ) );
  if ( !module.parent ) {
    console.log( 'written to file:', __dirname + '/result/units.ttl' );
    console.log( '' );
  }

  // consistency check
  for( let entity of reqEntities ) {

    // just those in our namespace
    if( !entity.includes( ns.unit ) && !entity.includes(ns.dim) ) {
      continue;
    }

    // validate
    if( !defEntities.has( entity ) ) {
      console.log( 'Inconsistency found:', entity );
    }

  }

};


// if called directly, execute the file
if ( !module.parent ) {
  module.exports().catch( e => console.log(e) );
}