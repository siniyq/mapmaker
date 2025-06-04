# MapMaker с Docker и Cloudflare

Полностью настроенный MapMaker проект с доменом **siniyq.xyz**.

## 🚀 Быстрый старт

### Запуск сайта по адресу https://siniyq.xyz:
```bash
launch-siniyq.bat
```

### Запуск только Docker (для разработки):
```bash
docker-compose -f docker-compose-external-db.yml up -d
```

## 🌍 Ваши адреса:

- **🌐 Основной сайт**: https://siniyq.xyz (веб-интерфейс MapMaker)
- **🌐 С WWW**: https://www.siniyq.xyz (то же самое с www)
- **⚡ API**: https://api.siniyq.xyz (REST API для разработчиков)

## 📁 Файлы проекта:

### Основные:
- `launch-siniyq.bat` - запуск вашего домена siniyq.xyz
- `docker-compose-external-db.yml` - конфигурация Docker
- `quick-cloudflare-urls.bat` - временные URL (если нужно)

### Конфигурация:
- `Dockerfile` - образ приложения
- `nginx.conf` - настройки веб-сервера
- `application-docker.properties` - настройки Spring Boot
- `config-docker.properties` - API ключи

### Документация:
- `README.md` - этот файл
- `ГОТОВО.md` - краткая справка по использованию

## ⚙️ Требования:

- Docker Desktop
- PostgreSQL (локальная база данных)
- Cloudflared (уже установлен как служба Windows)

## 🛠️ Основные команды:

```bash
# Публичный запуск
launch-siniyq.bat

# Локальная разработка
docker-compose -f docker-compose-external-db.yml up -d

# Остановка
docker-compose -f docker-compose-external-db.yml down

# Временные URL (если нужно)
quick-cloudflare-urls.bat

# Логи
docker-compose -f docker-compose-external-db.yml logs -f
```

## 🔧 Настройка базы данных:

- **Хост**: host.docker.internal:5432
- **База**: mapmaker
- **Пользователь**: postgres
- **Пароль**: 1234

## 🔒 Безопасность:

- ✅ HTTPS автоматически через Cloudflare
- ✅ Reverse proxy через Nginx
- ✅ Изолированная среда Docker
- ✅ Защищенные API endpoints

## 🎯 Использование:

### Для пользователей:
Поделитесь ссылкой: **https://siniyq.xyz**

### Для разработчиков:
API доступно по адресу: **https://api.siniyq.xyz**

### Для администрирования:
Запустите `launch-siniyq.bat` для активации сервера

**Ваш MapMaker доступен из любой точки мира! 🚀** 