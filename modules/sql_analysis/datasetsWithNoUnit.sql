WITH measNoUnit AS (
	SELECT dsid
	FROM measvalues
	WHERE unit='tbd'
)

SELECT DISTINCT code, title, shortTitle
FROM datasets
INNER JOIN measNoUnit USING ( dsid )