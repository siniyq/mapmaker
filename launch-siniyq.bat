@echo off
echo ===============================================
echo        Запуск https://siniyq.xyz
echo ===============================================
echo.

:: Убеждаемся что Docker работает
echo Проверка MapMaker...
docker ps --filter "name=mapmaker" | findstr "mapmaker" >nul
if %errorlevel% neq 0 (
    echo Запуск Docker контейнеров...
    docker-compose -f docker-compose-external-db.yml up -d
    timeout /t 5 >nul
)

echo ✅ MapMaker готов
echo.

:: Останавливаем существующую службу чтобы избежать конфликтов
echo Останавливаем существующий туннель...
net stop cloudflared >nul 2>&1

echo.
echo 🌍 Запуск туннеля для siniyq.xyz...
echo.
echo ┌─────────────────────────────────────────────┐
echo │                                             │
echo │    🎉 Ваш сайт доступен по адресу:         │
echo │                                             │
echo │         https://siniyq.xyz                  │
echo │                                             │
echo │    Для остановки нажмите Ctrl+C            │
echo │                                             │
echo └─────────────────────────────────────────────┘
echo.

:: Запускаем прямой туннель для домена
"C:\Program Files (x86)\cloudflared\cloudflared.exe" tunnel --hostname siniyq.xyz --url http://localhost:80 