@echo off
echo.

call "C:\Program Files\nodejs\nodevars.bat"

CD Z:\VMShare

:loop

node Z:\VMShare\init.js %1
echo Crashed...

goto loop

