WITH unitDim AS (
	SELECT dimid
	FROM dimensions
	WHERE name='unit'
),
singleUnitCL AS (
	SELECT dimvalid, 
		   substr( "values", 3, length("values")-4 ) AS unit -- a little hack until JSON is natively supported
	FROM dimvalues
	INNER JOIN unitDim USING (dimid)
	WHERE "values" NOT LIKE '%","%'
)

SELECT DISTINCT unit 
FROM singleUnitCL
ORDER BY unit;