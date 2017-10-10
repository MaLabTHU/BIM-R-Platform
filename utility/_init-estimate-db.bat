set old_cd=%cd%
cd %~dp0
cd ..

node node_modules/mocha/bin/mocha -u exports service/xls/test/reset-estimate-db.js -g force
node node_modules/mocha/bin/mocha -u exports service/xls/test/reset-estimate-db.js -g input

node node_modules/mocha/bin/mocha -u exports service/xls/test/test-estimate-db.js -g #loadModel()
node node_modules/mocha/bin/mocha -u exports service/xls/test/test-estimate-db.js -g calcModel()
node node_modules/mocha/bin/mocha -u exports service/xls/test/test-estimate-db.js -g #inferModel()
node node_modules/mocha/bin/mocha -u exports service/xls/test/test-estimate-db.js -g #generateBoqs()

cd %old_cd%