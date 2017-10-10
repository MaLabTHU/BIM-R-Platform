set old_cd=%cd%
cd %~dp0
cd ..\service\owl
java -jar out\artifacts\spark-owlapi.jar

cd %old_cd%