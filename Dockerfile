# Используем актуальный образ Eclipse Temurin JDK 17
FROM eclipse-temurin:17-jdk-alpine AS builder

# Устанавливаем рабочую директорию
WORKDIR /app

# Копируем файлы Maven
COPY pom.xml .
COPY src ./src

# Устанавливаем Maven
RUN apk add --no-cache maven

# Собираем приложение
RUN mvn clean package -DskipTests

# Второй этап - рантайм
FROM eclipse-temurin:17-jre-alpine

# Устанавливаем рабочую директорию
WORKDIR /app

# Копируем JAR файл из стадии сборки
COPY --from=builder /app/target/*.jar app.jar

# Открываем порт
EXPOSE 8080

# Запускаем приложение
ENTRYPOINT ["java", "-jar", "app.jar"] 