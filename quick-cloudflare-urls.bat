@echo off
echo ===============================================
echo    Быстрые URL для MapMaker через Cloudflare
echo ===============================================
echo.

echo Проверка Docker контейнеров...
docker ps --filter "name=mapmaker" --format "table {{.Names}}\t{{.Status}}" 2>nul
if %errorlevel% neq 0 (
    echo Запуск Docker контейнеров...
    docker-compose -f docker-compose-external-db.yml up -d
    echo.
)

echo Docker контейнеры готовы ✓
echo.

echo Выберите какой сервис открыть публично:
echo 1. Веб-интерфейс MapMaker (порт 80)
echo 2. API MapMaker (порт 8080)
echo.
set /p choice="Введите номер (1-2): "

if "%choice%"=="1" goto :web_tunnel
if "%choice%"=="2" goto :api_tunnel
goto :web_tunnel

:web_tunnel
echo.
echo Создание быстрого туннеля для веб-интерфейса...
echo.
echo ВАЖНО: Скопируйте URL который появится!
echo Для остановки нажмите Ctrl+C
echo.
"C:\Program Files (x86)\cloudflared\cloudflared.exe" tunnel --url http://localhost:80
goto :end

:api_tunnel
echo.
echo Создание быстрого туннеля для API...
echo.
echo ВАЖНО: Скопируйте URL который появится!
echo Для остановки нажмите Ctrl+C
echo.
"C:\Program Files (x86)\cloudflared\cloudflared.exe" tunnel --url http://localhost:8080
goto :end

:end
echo.
echo Туннель закрыт.
pause 