SELECT 
    ds.`code`, 
    ds.`title`, 
    ds.`downloadTSV`,
    ds.`downloadSDMX`
FROM `datasets_withUnit` ds
WHERE ds.`deleted` = 0