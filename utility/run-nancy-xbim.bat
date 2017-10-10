set old_cd=%cd%
cd %~dp0
cd ..\service\ifc\bin\release
nancy-xbim.exe

cd %old_cd%