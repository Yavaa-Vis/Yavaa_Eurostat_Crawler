WITH concepts AS (
  SELECT datasets.dsid, meas_concepts.concept
  FROM datasets
  INNER JOIN meas_concepts ON (lower( datasets.shortTitle ) = lower(meas_concepts.shortTitle) )
)

UPDATE measvalues
SET concept = (
  SELECT concepts.concept
  FROM concepts
  WHERE concepts.dsid=measvalues.dsid
)