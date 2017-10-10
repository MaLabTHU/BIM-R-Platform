set old_cd=%cd%
cd %~dp0
cd ..
node node-server.js

cd %old_cd%