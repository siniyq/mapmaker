package com.mapmaker.util;

import org.springframework.stereotype.Component;
import java.sql.Connection;
import java.sql.DriverManager;
import java.sql.Statement;
import java.sql.SQLException;
import java.sql.ResultSet;

@Component
public class DatabaseHelper {

    public static void initializeDatabase() {
        try (Connection conn = getConnection();
             Statement stmt = conn.createStatement()) {
            
            // Включаем расширение PostGIS
            stmt.execute("CREATE EXTENSION IF NOT EXISTS postgis");
            
            // Создаем таблицу POI
            stmt.execute("""
                CREATE TABLE IF NOT EXISTS public.points_of_interest (
                    id SERIAL PRIMARY KEY,
                    name VARCHAR(255) NOT NULL,
                    type VARCHAR(50) NOT NULL,
                    rating DECIMAL(3,1),
                    location GEOMETRY(Point, 4326),
                    place_id VARCHAR(255) UNIQUE,
                    vicinity VARCHAR(255),
                    address VARCHAR(255),
                    photo_url VARCHAR(1024),
                    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
                )
            """);
            
            // Создаем таблицу пользователей
            stmt.execute("""
                CREATE TABLE IF NOT EXISTS public.users (
                    id SERIAL PRIMARY KEY,
                    username VARCHAR(50) NOT NULL UNIQUE,
                    password VARCHAR(255) NOT NULL,
                    email VARCHAR(100) NOT NULL UNIQUE,
                    first_name VARCHAR(100),
                    last_name VARCHAR(100),
                    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
                    last_login TIMESTAMP
                )
            """);
            
            // Создаем таблицу сохраненных маршрутов
            stmt.execute("""
                CREATE TABLE IF NOT EXISTS public.saved_routes (
                    id SERIAL PRIMARY KEY,
                    user_id INTEGER NOT NULL,
                    name VARCHAR(255) NOT NULL,
                    profile VARCHAR(20) NOT NULL,
                    distance DECIMAL(10,2),
                    duration INTEGER,
                    route_data TEXT,
                    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
                    FOREIGN KEY (user_id) REFERENCES public.users(id) ON DELETE CASCADE
                )
            """);
            
            // Создаем таблицу точек маршрута
            stmt.execute("""
                CREATE TABLE IF NOT EXISTS public.route_points (
                    id SERIAL PRIMARY KEY,
                    route_id INTEGER NOT NULL,
                    latitude DECIMAL(10,8) NOT NULL,
                    longitude DECIMAL(11,8) NOT NULL,
                    name VARCHAR(255),
                    type VARCHAR(50),
                    rating DECIMAL(3,1),
                    sequence_order INTEGER NOT NULL,
                    FOREIGN KEY (route_id) REFERENCES public.saved_routes(id) ON DELETE CASCADE
                )
            """);
            
            // Создаем таблицу предпочтений пользователя
            stmt.execute("""
                CREATE TABLE IF NOT EXISTS public.user_preferences (
                    id SERIAL PRIMARY KEY,
                    user_id INTEGER NOT NULL,
                    poi_type VARCHAR(50) NOT NULL,
                    preference_type VARCHAR(20) NOT NULL, -- LIKE или DISLIKE
                    FOREIGN KEY (user_id) REFERENCES public.users(id) ON DELETE CASCADE,
                    UNIQUE (user_id, poi_type)
                )
            """);
            
            // Создаем таблицу для культурных мест (музеи, парки, театры и т.д.)
            stmt.execute("""
                CREATE TABLE IF NOT EXISTS cultural_places (
                    id SERIAL PRIMARY KEY,
                    name VARCHAR(255) NOT NULL,
                    type VARCHAR(50) NOT NULL,
                    rating FLOAT,
                    place_id VARCHAR(255) UNIQUE,
                    latitude DOUBLE PRECISION NOT NULL,
                    longitude DOUBLE PRECISION NOT NULL,
                    vicinity TEXT,
                    address TEXT,
                    photo_url TEXT,
                    location GEOMETRY(Point, 4326),
                    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
                )
            """);
            
            // Создаем пространственные индексы для обеих таблиц
            stmt.execute("""
                CREATE INDEX IF NOT EXISTS points_of_interest_location_idx
                ON points_of_interest USING GIST (location);
            """);
            
            stmt.execute("""
                CREATE INDEX IF NOT EXISTS cultural_places_location_idx
                ON cultural_places USING GIST (location);
            """);
            
            System.out.println("База данных успешно инициализирована");
            
        } catch (Exception e) {
            System.err.println("Ошибка при инициализации базы данных: " + e.getMessage());
            e.printStackTrace();
            throw new RuntimeException("Не удалось инициализировать базу данных", e);
        }
    }

    public static Connection getConnection() throws SQLException {
        try {
            // Получаем параметры подключения из переменных окружения или используем значения по умолчанию
            String dbHost = System.getenv("DB_HOST") != null ? System.getenv("DB_HOST") : "localhost";
            String dbPort = System.getenv("DB_PORT") != null ? System.getenv("DB_PORT") : "5432";
            String dbName = System.getenv("DB_NAME") != null ? System.getenv("DB_NAME") : "mapmaker";
            String dbUser = System.getenv("DB_USER") != null ? System.getenv("DB_USER") : "postgres";
            String dbPassword = System.getenv("DB_PASSWORD") != null ? System.getenv("DB_PASSWORD") : "1234";
            
            String url = String.format("jdbc:postgresql://%s:%s/%s", dbHost, dbPort, dbName);
            
            System.out.println("Подключение к БД: " + url + " с пользователем: " + dbUser);
            
            return DriverManager.getConnection(url, dbUser, dbPassword);
        } catch (SQLException e) {
            throw new SQLException("Ошибка подключения к базе данных: " + e.getMessage(), e);
        }
    }

    public static boolean isDataEmpty() throws SQLException {
        try (Connection conn = getConnection();
             Statement stmt = conn.createStatement();
             ResultSet rs = stmt.executeQuery("SELECT COUNT(*) FROM points_of_interest")) {
            rs.next();
            return rs.getInt(1) == 0;
        }
    }

    // Метод для проверки, пуста ли таблица с культурными местами
    public static boolean isCulturalDataEmpty() {
        try (Connection conn = getConnection();
             Statement stmt = conn.createStatement()) {
            
            var rs = stmt.executeQuery("SELECT COUNT(*) FROM cultural_places");
            if (rs.next()) {
                int count = rs.getInt(1);
                return count == 0;
            }
            
        } catch (SQLException e) {
            System.err.println("Ошибка при проверке данных о культурных местах: " + e.getMessage());
            // Если произошла ошибка при запросе, возможно таблица не существует
            // Считаем, что данных нет
        }
        
        return true;
    }
}