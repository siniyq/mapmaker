package com.mapmaker;

import java.sql.Connection;
import java.sql.DriverManager;
import java.sql.Statement;
import java.sql.SQLException;

public class DatabaseHelper {
    private static final String URL = "jdbc:postgresql://localhost:5432/mapmaker";
    private static final String USER = "postgres";
    private static final String PASSWORD = "1234";

    public static void initializeDatabase() {
        try (Connection conn = getConnection();
             Statement stmt = conn.createStatement()) {
            
            // Включаем расширение PostGIS
            stmt.execute("CREATE EXTENSION IF NOT EXISTS postgis");
            
            // Создаем таблицу с явным указанием схемы
            stmt.execute("""
                CREATE TABLE IF NOT EXISTS public.points_of_interest (
                    id SERIAL PRIMARY KEY,
                    name VARCHAR(255) NOT NULL,
                    type VARCHAR(50) NOT NULL,
                    rating DECIMAL(3,1),
                    location GEOMETRY(Point, 4326),
                    place_id VARCHAR(255) UNIQUE,
                    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
                )
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
            Class.forName("org.postgresql.Driver");
            return DriverManager.getConnection(URL, USER, PASSWORD);
        } catch (ClassNotFoundException e) {
            throw new SQLException("PostgreSQL JDBC драйвер не найден", e);
        }
    }
}