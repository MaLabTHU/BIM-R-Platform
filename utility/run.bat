set old_cd=%cd%

cd %~dp0
cd ..
start node node-server.js

cd %~dp0
cd ..\service\ifc\bin\release
start nancy-xbim.exe

cd %~dp0
cd ..\service\owl
start java -jar out\artifacts\spark-owlapi.jar

cd %old_cd%