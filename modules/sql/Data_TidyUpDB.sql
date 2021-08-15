DELETE FROM `dimvalues` WHERE `dimvalid` NOT IN 
(SELECT `link_ds_dimvals`.`dimvalid` FROM `link_ds_dimvals`);
DELETE FROM `dimensions` WHERE `dimid` NOT IN 
(SELECT `dimvalues`.`dimid` FROM `dimvalues`);