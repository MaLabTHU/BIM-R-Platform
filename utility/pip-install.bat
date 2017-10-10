set old_cd=%cd%
cd %~dp0

..\environment\python\scripts\pip install -r ..\environment\python\requirements.txt
python portable_python.py ..\environment\python\scripts

cd %old_cd%