set old_cd=%cd%
cd %~dp0
cd ..

node node_modules/mocha/bin/mocha -u exports service/dat/test/test-standard-db.js %*

cd %old_cd%