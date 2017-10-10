set old_cd=%cd%
cd %~dp0

mkdir convert
mkdir convert\x64
copy /y xbim-convert\bin\release\xbim-convert.exe.config convert\convert.exe.config
copy /y xbim-convert\bin\release\xbim-convert.exe convert\convert.exe
copy /y xbim-convert\bin\release\*.dll convert\*.dll
copy /y xbim-convert\bin\release\x64\*.dll convert\x64\*.dll

cd %old_cd%