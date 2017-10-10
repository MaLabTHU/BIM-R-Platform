rem environment start
set VS=C:\Program Files (x86)\Microsoft Visual Studio 14.0
set Py64bit=C:\Program Files\Python 3.5
set PyLib_debug=python35_d.lib
set PyLib_release=python35.lib
rem environment end

set C_DLL=interface
set C_EXE=test
set Python_C=ifc

set old_cd=%cd%
cd %~dp0

echo ==== 64bit release ====

rem configuration start
set ifcenginedll=ifcenginedll\64bit-Windows-VS2013-MT
set outdir=64bit-release
rem configuration end

mkdir %outdir%

swig -python -DWIN64 %Python_C%.i
call "%VS%\VC\vcvarsall.bat" amd64
cl %C_DLL%.c /I"%ifcenginedll%" "%ifcenginedll%\ifcengine.lib" /LD /D "_WINDOWS" /D "WIN64" /Fa%outdir%\ /Fo%outdir%\ /Fe%outdir%\%C_DLL%.dll
lib %outdir%\%C_DLL%.obj /out:%outdir%\%C_DLL%.lib
cl %Python_C%_wrap.c /I"%Py64bit%\include" "%Py64bit%\libs\%PyLib_release%" "%outdir%\%C_DLL%.lib" "%ifcenginedll%\ifcengine.lib" /LD /D "WIN64" /Fa%outdir%\ /Fo%outdir%\ /Fe%outdir%\_%Python_C%.pyd

del %Python_C%_wrap.c

move /y ifc.py %outdir%\ifc.py
copy /y %ifcenginedll%\ifcengine.dll %outdir%\ifcengine.dll
copy /y test\* %outdir%\*
"%Py64bit%\python.exe" %outdir%\test.py

echo ==== 64bit release install ====

rem configuration start
set outdir=64bit-release
set targetdir=..\pyifcengine
rem configuration end

copy /y %outdir%\ifc.py %targetdir%\ifc.py
copy /y %outdir%\_ifc.pyd %targetdir%\_ifc.pyd
copy /y %outdir%\ifcengine.dll %targetdir%\ifcengine.dll

cd %old_cd%