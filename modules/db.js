'use strict';

/**
 * database
 */

const
      ExitHook  = require('exit-hook'), //exit hook
      Fs        = require('fs'), //file system
      SQLite    = require('sqlite3'), //sqlite db access (.verbose();)
      Cfg       = require('./config.js'), //configuration
      Log       = require('./logging.js').get(module.filename); //logging

/**
 * loads and prepares sql file
 * params:
 *  - DB: database connection
 *  - query: {key: access key, file: sql file, (params)}
 * returns: promise (when query is prepared)
 */
function loadAndPrepareQuery(DB, obj) {
  let sql = Fs.readFileSync(Cfg.SQLPath + obj.file, 'utf8');
  if(obj.params) {
    Object.keys(obj.params).forEach((key) => {
      sql = sql.replace(key, obj.params[key]);
    });
  }
  return (new PreparedStatement(DB, obj.key)).prepare(sql);
}

/**
 * loads and prepares sql files and puts them in the $accessMap
 * params:
 *  - DB: database connection
 *  - queries: [{key: access key, file: sql file, (params)}, ...]
 *  - accessMap: map saving the new key-statement-pairs
 * returns: promise (when every query is prepared)
 */
function loadAndPrepareQueries(DB, queries, accessMap) {
  queries.forEach((query) => (query.key = query.key.toLowerCase().trim()));
  return Promise
    .all(queries.map((obj) => loadAndPrepareQuery(DB, obj)))
    .then((results) => {
      results.forEach((result) => (accessMap[result.name] = result));
    });
}

const DBAccess = {
  DB: undefined,
  DBQueries: {},

  /**
     * initializing of the database
     * params: none
     * returns: promise (when database tables where created)
     */
  init: function() {
    DBAccess.DB = new SQLite.cached.Database(Cfg.DBDebugInMemory?':memory:':Cfg.DBFile);
    Log.not('DB access opened');
    return DBAccess.execFile('Data_CreateTables.sql')
      .then( (createTableSQL) => {
        return Promise.all([
          createTableSQL,
          DBAccess.execFile('Data_CreateViews.sql'),
        ]);
      })
      .then( ([ sql, ]) => { //validate database
        Log.not('DB validating...');

        let
            tables = {},
            thisTable;
        sql.match( /`\w+` ([A-Z ]*NOT NULL)?\(?/g ).forEach((match) => { //extract table and column names
          if(match.endsWith('(')) { //is table name
            thisTable = match.slice(1, -3);
            tables[thisTable] = {};
          } else { //else column name
            if(match.endsWith('NOT NULL')){
              tables[thisTable][match.slice(1, match.indexOf('`', 1))] = true;
            } else {
              tables[thisTable][match.slice(1, -2)] = false;
            }
          }
        });

        return loadAndPrepareQuery(DBAccess.DB, { //query for tables in database
          file: 'DB_ValidateTables.sql'
        }).then((valTableQuery) => valTableQuery.each((promTable) => promTable.then((rowTable) => { //for every table (name) in the database
          if(!(rowTable.name in tables)) {
            return; //existing table not found in sql
            //throw new Error("DB Error: unknown table " + rowTable.name);
          }
          return loadAndPrepareQuery(DBAccess.DB, { //query for columns in table
            file: 'DB_ValidateColumns.sql',
            params: {$tablename: rowTable.name}
          }).then((valColQuery) => (
            valColQuery.each((promCol) => promCol.then((rowCol) => { //for every column (name) in the table
              if(rowCol.name in tables[rowTable.name]) { //column name found
                if(tables[rowTable.name][rowCol.name] != rowCol.notnull) {
                  throw new Error('DB Error: table ' + rowTable.name + ', column ' + rowCol.name + ' - wrong setting for NOT NULL');
                }
                delete tables[rowTable.name][rowCol.name];
              }/* else {
                            throw new Error("DB Error: table " + rowTable.name + " - unknown column " + rowCol.name);
                        }*/
            }))
          )).then((valColResults) => {
            valColResults.errors.forEach((err) => Log.err(err)); //error handling
            Object.keys(tables[rowTable.name]).forEach((column) =>
              Log.err('DB Error: table ' + rowTable.name + ' - missing column ' + column)
            );
            if((Object.keys(tables[rowTable.name]).length != 0) || (valColResults.errors.length != 0)) {
              throw new Error('DB Error: table ' + rowTable.name + ' - problem with following columns: ' + JSON.stringify(tables[rowTable.name]));
            }
            delete tables[rowTable.name]; //table existed
            return valColResults.query.close();
          });
        }))).then((valTableResults) => {
          valTableResults.errors.forEach((err) => Log.err(err)); //error handling
          Object.keys(tables).forEach((table) =>
            Log.err('DB Error: missing table ' + table)
          );
          if((Object.keys(tables).length != 0) || (valTableResults.errors.length != 0)) {
            throw new Error('DB Error: problem with following tables: ' + JSON.stringify(tables));
          }
          return valTableResults.query.close();
        }).then(() => {
          Log.not('DB validation complete');
        }).catch((err) => {
          throw Log.Error(err); //for debugging
        });
      });
  },

  /**
     * get a prepared statement by key
     * params: key
     * returns: statement
     */
  query: function(key) {
    if( key.toLowerCase().trim() in DBAccess.DBQueries ) {
      return DBAccess.DBQueries[key.toLowerCase().trim()];
    } else {
      throw Error( 'Unknown query: ' + key );
    }

  },

  /**
     * loads and prepares sql files as statements
     * params: [...{key: access key, file: sql file}]
     * returns: promise
     */
  loadQueries: function(kfArray) {
    return loadAndPrepareQueries(DBAccess.DB, kfArray, DBAccess.DBQueries);
  },

  /**
     * runs sql from a file
     * params: filename
     * returns: promise (executed sql string when successfully finished)
     */
  execFile: function(filename) {
    return new Promise((fulfill, reject) => {
      let sql = Fs.readFileSync(Cfg.SQLPath + filename, 'utf8'); //load sql
      DBAccess.DB.exec(sql, (err) => {
        if(err == null) {
          fulfill(sql);
        } else {
          reject(err);
        }
      });
    });
  },


  /**
     * import CSV file to table
     * params: filename, table
     * returns: promise (
     */
  importCSV: function importCSV( filename, table, filter ) {

    // load dependencies
    const CSV   = require( 'papaparse' ),
          Fs    = require( 'fs' );

    // load CSV file
    const content = Fs.readFileSync( Cfg.DataPath + filename + '.csv', 'utf8' ),
          parsed  = CSV.parse( content,{
            skipEmptyLines: true
          });

    // check for errors
    if( parsed.errors.length > 0 ) {
      throw new Error( parsed.errors );
    }

    // trim all cells
    parsed.data.forEach( (row) => {
      for( let i=0; i<row.length; i++ ) {
        if( typeof row[i]  == 'string' ) {
          row[i] = row[i].trim();
        }
      }
    });

    // add to database
    return this.importTable( parsed.data, table, filter );

  },

  /**
     * import the given data array to a database table
     * @params {Array}      data       the data to import
     * @params {String}     table      name of the table to import to
     * @params {Function*}  filter     remove some entries
     * @return {Promise}
     */
  importTable: function importTable( data, table, filter ) {

    // includes
    const Async = require( 'async' );

    // filter the list, if filter function is given
    if( filter ) {
      data = data.filter( filter );
    }

    // short-circuit, if there's nothing to import
    if( data.length < 1 ) {
      return Promise.resolve();
    }

    // build insert query
    let query = Array( data[0].length )
      .fill( '$v' )
      .map( (el, ind) => el + ind )
      .join( ', ' );
    query = 'INSERT INTO ' + table + ' VALUES (' + query + ')';
    const vals = {};

    return new Promise( (fulfill, reject) => {

      // prepare statement
      const stmt = new PreparedStatement( DBAccess.DB, table + '_insert' );
      stmt.prepare( query )
        .then( () => {

          // create an async queue
          const queue = Async.queue( ( row, callback ) => {

            // set values
            for( let i=0; i<row.length; i++ ) {
              vals[ '$v' + i ] = row[i];
            }

            // insert
            stmt.run( vals )
              .then( () => {
                callback();
              })
              .catch( ( err ) => {
                reject( err );
                // cancel queue
                // http://stackoverflow.com/a/23556048/1169798
                queue.tasks = [];
              });

          });

          // return when done
          queue.drain( fulfill );

          // add data
          queue.push( data );

        })
        .catch( reject );

    });

  },

  /**
     * truncate a table
     */
  truncate: function truncate( table ) {
    return new Promise((fulfill, reject) => {
      DBAccess.DB.run('DELETE FROM ' + table, (err) => {
        if(err == null) {
          fulfill(true);
        } else {
          reject(err);
        }
      });
    });
  },

  /**
     * optimizes database
     */
  vacuum: function() {
    return new Promise((fulfill, reject) => {
      DBAccess.DB.run('VACUUM', (err) => {
        if(err == null) {
          fulfill(true);
        } else {
          reject(err);
        }
      });
    });
  },

  /**
     * finalizes and deletes all database queries
     */
  closeQueries: function() {
    return Promise.all(
      Object.keys(DBAccess.DBQueries).map((key) => {
        return DBAccess.DBQueries[key].close()
          .then(() => {
            delete DBAccess.DBQueries[key];
          });
      })
    );
  },

  /**
     * closes database access
     */
  close: async function() {
    return Promise.resolve(DBAccess.DB.close);
  }
};

module.exports = DBAccess;

ExitHook(function() {
  DBAccess.close();
  Log.log('DB access closed');
});

/**
 *
 */
class PreparedStatement {
  constructor(DB, name = '') {
    this.statement = undefined;
    this.db = DB;
    this.name = name || '';
  }

  prepare(query, params = []) { //prepare statement (with parameters)
    return new Promise((fulfill, reject) => {
      this.statement = this.db.prepare(query, params, (err) => {
        if(err != null) {
          reject(err);
        } else {
          fulfill(this);
        }
      });
    });
  }

  run(params = []) { //execute run on statement (with parameters)
    return new Promise((fulfill, reject) => {
      this.statement.run(params, (err) => {
        if(err != null) {
          reject(err);
        } else {
          fulfill(this);
        }
      });
    });
  }

  /**
     * number of rows affect by last execution
     * only set for changing queries
     */
  rowsAffected() {
    return this.statement.changes;
  }

  get(params = []) { //execute get on statement (with parameters)
    return new Promise((fulfill, reject) => {
      this.statement.get(params, (err, row) => {
        if(err != null) {
          reject(err);
        } else {
          fulfill(row);
        }
      });
    });
  }


  /**
     * retrieve all results of the query as an array with one entry per row
     */
  all(params = []) { //execute get on statement (with parameters)
    return new Promise((fulfill, reject) => {
      this.statement.all(params, (err, rows) => {
        if(err != null) {
          reject(err);
        } else {
          fulfill(rows);
        }
      });
    });
  }

  //execute each on statement (with parameters),
  //callback returns promise (with row value); callback should return promise
  //returns promise (resolves in row count after completion of callbacks)
  each(callback, params = []) {
    let
        promiseArray = [],
        errorArray = [];
    return new Promise((fulfill, reject) => {
      this.statement.each(params, (err, row) => {
        let rowPromise = new Promise((inner_fulfill, inner_reject) => {
          if(err != null) {
            inner_reject(err);
          } else {
            inner_fulfill(row);
          }
        });
        promiseArray.push(
          Promise.resolve(callback(rowPromise)) //convert callback result to promise (if needed)
            .catch((err) => errorArray.push(err)) //catch errors in promise
        );
      }, (err, rowCount) => { //fulfill promise after completion
        if(err != null) {
          reject(err);
        } else {
          fulfill(rowCount);
        }
      }
      );
    }).then(() => (
      Promise.all(promiseArray) //wait until row-promises have finished
        .then((results) => ({
          results: results,
          errors: errorArray,
          query: this
        }))
    ));
  }

  close() { //closes statement for further queries
    return new Promise((fulfill, reject) => {
      this.statement.finalize((err) => {
        if(err != null) {
          reject(err);
        } else {
          fulfill(true);
        }
      });
    });
  }

  getChangeCount() {
    return this.statement.changes;
  }

  getLastID() {
    return this.statement.lastID;
  }
}