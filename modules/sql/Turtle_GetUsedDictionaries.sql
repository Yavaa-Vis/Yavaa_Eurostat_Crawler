SELECT DISTINCT dim.name
FROM dimensions dim
INNER JOIN dimvalues USING (dimid)
INNER JOIN link_ds_dimvals USING (dimvalid)
INNER JOIN datasets_withUnit USING (dsid)
WHERE deleted = 0
ORDER by dim.name