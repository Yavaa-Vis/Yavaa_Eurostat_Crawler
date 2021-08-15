# Yavaa - Eurostat Crawler

Creates a repository of dataset descriptions for the datasets stored in [Eurostat's Bulk Download Facility](http://ec.europa.eu/eurostat/estat-navtree-portlet-prod/BulkDownloadListing?dir=data).
Descriptions will be converted to Yavaa metadata format and be pushed to a specified triple store.

## Setup

Requirements:
* [Node.js](https://nodejs.org) (tested with version 16)

Installation:
* Clone the repository
* Install dependencies via `npm i`

## Execution

Adjust configuration in `modules/config.js`, if necessary.
In particular, make sure YavaaBase is pointing to the Yavaa sources.

Download the dictionaries:
```
node runDownloadDic.js
```

Execute the crawler:
```
node run.js [--start x]
```

The optional parameter `--start` controls the starting point of the pipeline.
The default value is `toc`.
The following steps will be executed in order for the full pipeline.
All data is stored in `/data/data.db3` to enable incremental updates.

1. `toc`
    * Download and parse [table of contents](http://ec.europa.eu/eurostat/estat-navtree-portlet-prod/BulkDownloadListing?sort=1&file=table_of_contents.xml) .
    * Download changed/new datasets.
    * Extract metadata.
2. `clean`
    * Clean the database (remove orphan entries etc.)
3. `units`
    * Attach units, if (a) single unit column, (b) custom mapping, or (c) a unit in the TOC is given.
    * Add quantity kinds to all units.
4. `concepts`
    * Resolve concepts for the measurement of each dataset.
5. `labels`
    * Add labels to dimensions.
    * Apply custom labels.
6. `export`
    * Export all dataset's metadata as RDF in `.ttl` files.
    * Create RDF files for labels of dimensions and measurements.
7. `push`
    * Import all RDF into triple store. Includes created dataset descriptions as well as static RDF content.

## Dependencies

The following external resources will be used and (partially) included into the triple store:
* [Eurostat: Dictionaries](https://ec.europa.eu/eurostat/estat-navtree-portlet-prod/BulkDownloadListing?sort=1&dir=dic=)
* [Eurostat: Datasets](https://ec.europa.eu/eurostat/estat-navtree-portlet-prod/BulkDownloadListing?sort=1&dir=data)
* [OM 1.8: Units of Measure](http://www.wurvoc.org/page/om-1.8)
