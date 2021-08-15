UPDATE measvalues
SET unit=$unit
WHERE dsid=(SELECT dsid FROM datasets WHERE code=$code)