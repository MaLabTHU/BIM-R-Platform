set old_cd=%cd%
cd %~dp0
cd ..

node node_modules/mocha/bin/mocha -u exports service/xls/test/test-owlapi.js %*

cd %old_cd%