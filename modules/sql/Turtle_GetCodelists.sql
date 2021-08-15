SELECT 
    `dimensions`.`name`, 
    `dimvalues`.`values`,
    `dimvalues`.`exportid`
FROM `dimvalues` 
INNER JOIN `dimensions`             USING ( `dimid` )
INNER JOIN `link_ds_dimvals`        USING ( `dimvalid` )
INNER JOIN `datasets_withUnit` ds   USING ( `dsid` )
WHERE `dimensions`.`name` NOT IN ( $stopwords )
  AND ds.`code` NOT IN ( $filtereddatasets )
  AND ds.deleted = 0
  AND `exportid` > -1
ORDER BY `name` ASC, `values` ASC