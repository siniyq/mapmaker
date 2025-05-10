package com.mapmaker.util;

import com.mapmaker.config.DatabaseConfig;
import java.sql.Connection;
import java.sql.DriverManager;
import java.sql.Statement;
import java.sql.SQLException;
import java.sql.ResultSet;

public class DatabaseHelper {

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
            return DriverManager.getConnection(
                DatabaseConfig.getProperty("db.url"),
                DatabaseConfig.getProperty("db.username"),
                DatabaseConfig.getProperty("db.password")
            );
        } catch (ClassNotFoundException e) {
            throw new SQLException("PostgreSQL JDBC драйвер не найден", e);
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
}