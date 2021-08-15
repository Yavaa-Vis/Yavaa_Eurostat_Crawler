WITH unitDim AS ( -- get dimension id for dimension "unit"
  SELECT dimid
  FROM dimensions
  WHERE name='unit'
),
dimvalIds AS ( -- get dimval ids for all lists with more than one value
  SELECT dimvalid
  FROM dimvalues
  INNER JOIN unitDim USING (dimid)
  WHERE "values" LIKE '%","%' -- those with multiple values; hack until JSON is supported
)
SELECT datasets.code AS code
FROM datasets
INNER JOIN link_ds_dimvals USING (dsid)
INNER JOIN dimvalIds USING (dimvalid)