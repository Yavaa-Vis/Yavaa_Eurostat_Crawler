SELECT 
    ds.`code`, 
    ds.`shortTitle`, 
    ds.`title`, 
    `measvalues`.`min`, 
    `measvalues`.`max`, 
    `measvalues`.`unit`,
    `measvalues`.`concept`
FROM `datasets_withUnit` ds
INNER JOIN `measvalues` USING ( `dsid` )
WHERE ds.`deleted` = 0