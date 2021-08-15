PRAGMA foreign_keys = ON;

-- datasets
CREATE TABLE IF NOT EXISTS `datasets` (
    `dsid` INTEGER PRIMARY KEY,
    `code` TEXT NOT NULL UNIQUE, 
    `title` TEXT NOT NULL, 
    `shortTitle` TEXT,
    `downloadTSV` TEXT NOT NULL, 
    `downloadSDMX` TEXT, 
    `modifiedDate` TEXT,
    `updateDate` TEXT,
    `deleted` INTEGER NOT NULL DEFAULT 0
);

-- distinct dimensions
CREATE TABLE IF NOT EXISTS `dimensions` (
  `dimid` INTEGER,
  `name`  TEXT NOT NULL UNIQUE,
  `label` TEXT,
  PRIMARY KEY(`dimid`)
);

-- dimensions' values
CREATE TABLE IF NOT EXISTS `dimvalues` ( 
  `dimvalid` INTEGER, 
  `dimid` INTEGER NOT NULL, 
  `values` TEXT, `exportid` INTEGER DEFAULT -1, 
  PRIMARY KEY(`dimvalid`), 
  FOREIGN KEY(`dimid`) REFERENCES `dimensions`(`dimid`) ON DELETE CASCADE 
);

-- link between datasets and dimension values
CREATE TABLE IF NOT EXISTS `link_ds_dimvals` (
    `dsid` INTEGER NOT NULL REFERENCES `datasets`(`dsid`) ON DELETE CASCADE,
    `dimvalid` INTEGER NOT NULL REFERENCES `dimvalues`(`dimvalid`) ON DELETE CASCADE,
    `pos` INTEGER NOT NULL
);

-- measurement concepts (after unification)
CREATE TABLE IF NOT EXISTS `meas_concepts` (
  `shortTitle`  TEXT NOT NULL,
  `concept` TEXT NOT NULL
);

-- measurement values
CREATE TABLE IF NOT EXISTS `measvalues` (
  `dsid`  INTEGER NOT NULL UNIQUE,
  `min` TEXT NOT NULL,
  `max` TEXT NOT NULL,
  `unit`  TEXT NOT NULL DEFAULT 'tbd',
  `concept` TEXT,
  FOREIGN KEY(`dsid`) REFERENCES `datasets`(`dsid`) ON DELETE CASCADE
);

-- unit mapping
CREATE TABLE IF NOT EXISTS `unit_mapping` ( 
  `short` TEXT, 
  `url` TEXT, 
  PRIMARY KEY(`short`) 
);

-- unit to quantity mapping
CREATE TABLE IF NOT EXISTS `unit_quant` ( 
  `unit` TEXT NOT NULL, 
  `quant` TEXT, 
  PRIMARY KEY(`unit`) 
);

-- units by dataset
CREATE TABLE IF NOT EXISTS `unit_toc` (
  `ds_code` TEXT,
  `unit`  TEXT,
  PRIMARY KEY(`ds_code`)
);