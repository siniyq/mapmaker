@echo off
echo Запуск утилиты обновления данных о культурных местах...

rem Компилируем проект
call mvn -q compile

rem Создаем строку classpath со всеми зависимостями
call mvn -q dependency:build-classpath -Dmdep.outputFile=target\classpath.txt

rem Считываем classpath из файла
set /p CP=<target\classpath.txt

rem Добавляем наши классы в classpath
set CP=target\classes;%CP%

echo Класспас создан, запускаем утилиту...

rem Запускаем утилиту обновления культурных мест
echo Запуск утилиты CulturalUpdater...
java -cp %CP% com.mapmaker.CulturalUpdater

echo.
echo Нажмите любую клавишу для выхода...
pause > nul 