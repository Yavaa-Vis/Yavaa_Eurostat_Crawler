UPDATE `datasets` SET 
`modifiedDate` = $modifiedDate, 
`updateDate` = $updateDate, 
`shortTitle` = $shortTitle 
WHERE `code` = $code