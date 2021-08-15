SELECT 
    `link_ds_dimvals`.`pos`, 
    `dimvalues`.`values`, 
    ds.`code` 
FROM `link_ds_dimvals` 
INNER JOIN `dimvalues`              USING ( `dimvalid` ) 
INNER JOIN `datasets_withUnit` ds   USING ( `dsid` ) 
INNER JOIN `dimensions`             USING ( `dimid` ) 
WHERE `dimensions`.`name` = 'time'
  AND ds.deleted = 0