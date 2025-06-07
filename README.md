# 🗺️ MapMaker - Интеллектуальная система построения карт и маршрутов

MapMaker - это полнофункциональное веб-приложение для создания интерактивных карт с тепловыми картами заведений, построения персонализированных маршрутов и анализа пространственных данных.

## 🌟 Основные возможности

### 📊 Тепловые карты (Heatmaps)
- **Карта плотности** - визуализация концентрации заведений
- **Карта рейтингов** - отображение качества мест по оценкам
- Динамическое переключение между режимами
- Настраиваемые параметры отображения

### 🛣️ Построение маршрутов
- **Кратчайшие маршруты** между точками
- **Тематические маршруты** (рестораны, культурные места)
- **Персонализированные маршруты** на основе предпочтений
- Интеграция с Google Maps и GraphHopper

### 🏛️ Управление POI (Points of Interest)
- Рестораны, кафе, бары
- Музеи, театры, парки
- Автоматический сбор данных из Google Places API
- Система рейтингов и отзывов

### 👤 Персонализация
- Система аутентификации пользователей
- Сохранение предпочтений
- История посещений
- Персональные рекомендации

## 🚀 Доступ к приложению

### 🌐 Публичный адрес:
- https://www.siniyq.xyz  

### ⚡ Быстрый запуск:
```bash
# Запуск публичного сайта
launch-siniyq.bat

# Локальная разработка
docker-compose -f docker-compose-external-db.yml up -d
```

## 🛠️ Технологический стек

### Backend
- **Java 17** - основной язык программирования
- **Spring Boot 2.7.0** - веб-фреймворк
- **Spring Security** - аутентификация и авторизация
- **Spring Data JPA** - работа с базой данных
- **PostgreSQL + PostGIS** - пространственная база данных
- **Hibernate Spatial** - ORM для геоданных

### Frontend
- **HTML5 + CSS3** - разметка и стили
- **JavaScript ES6+** - клиентская логика
- **Leaflet.js** - интерактивные карты
- **Thymeleaf** - серверные шаблоны

### API и интеграции
- **Google Maps API** - геокодирование и места
- **Google Places API** - информация о заведениях
- **GraphHopper** - локальный роутинг
- **OpenStreetMap** - картографические данные

### DevOps
- **Docker + Docker Compose** - контейнеризация
- **Nginx** - reverse proxy и статические файлы
- **Cloudflare Tunnel** - безопасный доступ
- **Maven** - сборка проекта

## 📁 Структура проекта

```
MapMaker/
├── 📂 src/main/java/com/mapmaker/          # Исходный код Java
│   ├── 📂 controller/                      # REST контроллеры
│   │   ├── ApiController.java              # Основные API endpoints
│   │   ├── POIController.java              # Управление точками интереса
│   │   ├── SavedRouteController.java       # Сохраненные маршруты
│   │   └── UserController.java             # Управление пользователями
│   ├── 📂 service/                         # Бизнес-логика
│   ├── 📂 model/                           # Модели данных
│   ├── 📂 repository/                      # Репозитории JPA
│   ├── 📂 config/                          # Конфигурация Spring
│   └── Main.java                           # Главный класс приложения
├── 📂 src/main/resources/
│   ├── 📂 static/                          # Статические ресурсы
│   │   ├── 📂 js/                          # JavaScript модули
│   │   │   ├── heatmap.js                  # Тепловые карты
│   │   │   ├── route-renderer.js           # Отрисовка маршрутов
│   │   │   ├── personalization.js         # Персонализация
│   │   │   └── cultural-route.js           # Культурные маршруты
│   │   └── 📂 css/                         # Стили CSS
│   ├── 📂 templates/                       # HTML шаблоны
│   └── application.properties              # Конфигурация приложения
├── 📂 init-scripts/                        # SQL скрипты инициализации
├── 📂 nginx/                               # Конфигурация Nginx
├── docker-compose-external-db.yml          # Docker Compose для продакшена
├── Dockerfile                              # Образ приложения
├── pom.xml                                 # Maven зависимости
└── README.md                               # Этот файл
```

## 🔧 Установка и настройка

### Предварительные требования
- **Docker Desktop** 
- **PostgreSQL 12+** с расширением PostGIS
- **Java 17** (для локальной разработки)
- **Maven 3.6+** (для сборки)

### 1. Клонирование проекта
```bash
git clone <repository-url>
cd MapMaker
```

### 2. Настройка базы данных
```sql
-- Подключиться к PostgreSQL и выполнить:
CREATE DATABASE mapmaker;
\c mapmaker;
CREATE EXTENSION postgis;
```

### 3. Настройка переменных окружения
Создайте файл `config-docker.properties`:
```properties
google.api.key=ВАШ_GOOGLE_API_КЛЮЧ
db.host=host.docker.internal
db.port=5432
db.name=mapmaker
db.user=postgres
db.password=1234
```

### 4. Запуск через Docker
```bash
# Сборка и запуск контейнеров
docker-compose -f docker-compose-external-db.yml up -d

# Просмотр логов
docker-compose -f docker-compose-external-db.yml logs -f

# Остановка
docker-compose -f docker-compose-external-db.yml down
```

### 5. Локальная разработка
```bash
# Установка зависимостей
mvn clean install

# Запуск приложения
mvn spring-boot:run

# Или через Maven exec
mvn exec:java -Dexec.mainClass="com.mapmaker.Main"
```

## 📡 API Endpoints

### 🗺️ Карты и данные
```http
GET /api/restaurants              # Список всех ресторанов
GET /api/cultural-places          # Культурные места
GET /api/heatmap/density         # Данные для тепловой карты плотности
GET /api/heatmap/rating          # Данные для тепловой карты рейтингов
```

### 🛣️ Маршруты
```http
POST /api/route                   # Построение маршрута
GET /api/route/{id}              # Получение маршрута по ID
POST /api/route/thematic         # Тематический маршрут
POST /api/route/cultural         # Культурный маршрут
```

### 👤 Пользователи
```http
POST /api/users/register         # Регистрация
POST /api/users/login           # Авторизация
GET /api/users/profile          # Профиль пользователя
PUT /api/users/preferences      # Обновление предпочтений
```

### 📍 Points of Interest
```http
GET /api/poi                     # Список POI с фильтрами
POST /api/poi                    # Создание нового POI
PUT /api/poi/{id}               # Обновление POI
DELETE /api/poi/{id}            # Удаление POI
```

## 🎛️ Конфигурация

### application.properties
```properties
# Сервер
server.port=8080
server.servlet.context-path=/

# База данных
spring.datasource.url=jdbc:postgresql://localhost:5432/mapmaker
spring.datasource.username=postgres
spring.datasource.password=1234

# JPA/Hibernate
spring.jpa.hibernate.ddl-auto=update
spring.jpa.show-sql=false
spring.jpa.properties.hibernate.dialect=org.hibernate.spatial.dialect.postgis.PostgisPG10Dialect

# Безопасность
security.jwt.secret=secret-key
security.jwt.expiration=86400000
```

### docker-compose-external-db.yml
```yaml
version: '3.8'
services:
  mapmaker-app:
    build: .
    ports:
      - "8080:8080"
    environment:
      - SPRING_PROFILES_ACTIVE=docker
    volumes:
      - ./config-docker.properties:/app/config.properties
    
  nginx:
    image: nginx:alpine
    ports:
      - "80:80"
    volumes:
      - ./nginx.conf:/etc/nginx/nginx.conf
    depends_on:
      - mapmaker-app
```

## 🔄 Обновление данных

### Обновление ресторанов и кафе
```bash
java -jar target/mapmaker-1.0-SNAPSHOT.jar forceUpdate
```

### Обновление культурных мест
```bash
java -jar target/mapmaker-1.0-SNAPSHOT.jar updateCultural
```

### Через Docker
```bash
docker-compose -f docker-compose-external-db.yml exec mapmaker-app \
  java -jar /app/mapmaker-1.0-SNAPSHOT.jar forceUpdate
```


## 🚀 Развертывание

### Локальное развертывание
```bash
# Запуск для разработки
docker-compose -f docker-compose-external-db.yml up -d
```

### Публичное развертывание
```bash
# Запуск с доменом siniyq.xyz
launch-siniyq.bat

# Временные URL через Cloudflare
quick-cloudflare-urls.bat
```

### Мониторинг
```bash
# Логи приложения
docker-compose -f docker-compose-external-db.yml logs -f mapmaker-app

# Логи Nginx
docker-compose -f docker-compose-external-db.yml logs -f nginx

# Статус контейнеров
docker-compose -f docker-compose-external-db.yml ps
```

## 🛡️ Безопасность

- ✅ **HTTPS** через Cloudflare SSL
- ✅ **JWT токены** для аутентификации  
- ✅ **CORS** настройки для безопасности
- ✅ **Изолированная среда** Docker
- ✅ **Reverse proxy** через Nginx
- ✅ **Защищенные API endpoints**

