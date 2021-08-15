WITH units AS (
  SELECT t.`ds_code`, m.`url`
  FROM `unit_toc` t
  INNER JOIN `unit_mapping` m ON ( t.`unit` = m.`short` )
),
unitToDs AS (
  SELECT d.`dsid`, u.`url`
  FROM units u
  INNER JOIN `datasets` d ON ( u.`ds_code` = d.`code` )
)

UPDATE
  `measvalues`
SET unit = (SELECT url FROM unitToDs WHERE unitToDs.dsid=measvalues.dsid)
WHERE unit='tbd'
  AND EXISTS (SELECT url FROM unitToDs WHERE unitToDs.dsid=measvalues.dsid)