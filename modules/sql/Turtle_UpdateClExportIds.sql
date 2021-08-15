WITH valid AS (
	SELECT DISTINCT `dimvalid`
	  FROM `link_ds_dimvals`
	  INNER JOIN `datasets_withUnit` ds USING ( `dsid` )
	  INNER JOIN `dimvalues` v USING ( `dimvalid` )
	  INNER JOIN `dimensions` dim USING ( `dimid` )
	  WHERE ds.`code` NOT IN ( $filtereddatasets )
	  AND ds.`deleted` = 0
	  AND dim.`name` != 'time'
)
Update `dimvalues`
  SET `exportid`= (
     SELECT COUNT(*)
     FROM `dimvalues` d2
     WHERE d2.`dimid`= `dimvalues`.`dimid`
     AND d2.`values` < `dimvalues`.`values`
  )
WHERE `dimvalid` IN ( SELECT * FROM valid )