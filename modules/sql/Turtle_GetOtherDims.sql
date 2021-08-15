SELECT 
    `link_ds_dimvals`.`pos`, 
    `dimvalues`.`exportid`, 
    `dimensions`.`name`, 
    ds.`code` 
FROM `link_ds_dimvals` 
INNER JOIN `dimvalues`              USING ( `dimvalid` ) 
INNER JOIN `dimensions`             USING ( `dimid` ) 
INNER JOIN `datasets_withUnit` ds   USING ( `dsid` ) 
WHERE `dimensions`.`name` != 'time'
  AND exportid > -1
  AND ds.deleted = 0