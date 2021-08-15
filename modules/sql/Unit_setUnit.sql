WITH unitDim AS (
	SELECT dimid
	FROM dimensions
	WHERE name='unit'
),
singleUnitCL AS (
	SELECT dimvalid, 
         substr( "values", 3, length("values")-4 ) AS unit -- a little hack until JSON is natively supported
	FROM dimvalues
	INNER JOIN unitDim USING (dimid)
	WHERE "values" NOT LIKE '%","%'
),
singleUnitDS AS (
	SELECT dsid, dimvalid, unit
	FROM link_ds_dimvals
	INNER JOIN singleUnitCL USING (dimvalid)
	INNER JOIN datasets USING (dsid)
),
dsToUnit AS (
	SELECT dsid, url AS unit
	FROM singleUnitDS
  INNER JOIN unit_mapping ON (singleUnitDs.unit = unit_mapping.short ) 
)

UPDATE
	measvalues
SET unit = (SELECT unit FROM dsToUnit WHERE dsToUnit.dsid=measvalues.dsid)
WHERE unit='tbd'
	AND EXISTS (SELECT unit FROM dsToUnit WHERE dsToUnit.dsid=measvalues.dsid)