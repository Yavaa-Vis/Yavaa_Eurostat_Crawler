-- datasets and their measure's quantities
CREATE VIEW IF NOT EXISTS datasets_byQuant AS 
SELECT d.dsid, d.code, d.title, m.unit, u.quant, d.`values`
FROM datasets_withUnit d 
INNER JOIN measvalues m USING (`dsid`) 
INNER JOIN unit_quant u USING (`unit`)
INNER JOIN link_ds_dimvals l USING (`dsid`)
INNER JOIN dimvalues d USING (`dimvalid`)
WHERE `deleted` <> 1 AND dimid=5
ORDER BY unit;

-- datasets, that have no unit attached
CREATE VIEW IF NOT EXISTS datasets_noUnit AS 
WITH dsWunit AS ( 
  SELECT d.dsid, v.dimid 
  FROM datasets d 
  INNER JOIN link_ds_dimvals l ON ( l.dsid = d.dsid ) 
  INNER JOIN dimvalues v ON ( l.dimvalid = v.dimvalid ) 
  WHERE dimid=3 
    AND d.deleted <> 1
) 
SELECT d.* 
FROM `datasets` d 
LEFT OUTER JOIN dsWunit u ON ( d.dsid = u.dsid ) 
LEFT OUTER JOIN datasets_withUnit w ON ( d.dsid = w.dsid ) 
WHERE u.dimid IS NULL 
  AND w.code IS NULL
  AND d.deleted <> 1;

-- datasets, that have a unit attached
CREATE VIEW IF NOT EXISTS `datasets_withUnit` AS 
SELECT d.* 
FROM `datasets` d 
INNER JOIN `measvalues` m ON (d.`dsid` = m.`dsid`) 
WHERE m.`unit` IS NOT NULL 
  AND m.`unit` <> 'tbd'
  AND d.deleted <> 1
ORDER BY d.`shortTitle`;

-- distinct units used
CREATE VIEW IF NOT EXISTS `unit_toc_distinct` AS 
SELECT DISTINCT `unit` 
FROM `unit_toc` 
ORDER BY `unit`;

-- unmapped units
CREATE VIEW IF NOT EXISTS `unit_toc_unmapped` AS 
SELECT DISTINCT t.`unit` 
FROM `unit_toc` t 
LEFT OUTER JOIN `unit_mapping` m ON ( t.`unit` = m.`short` ) 
WHERE m.`url` IS NULL 
ORDER BY t.`unit`;