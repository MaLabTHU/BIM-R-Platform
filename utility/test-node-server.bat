set old_cd=%cd%
cd %~dp0
cd ..

node node_modules/mocha/bin/mocha -u exports test-node-server.js %*

cd %old_cd%