package com.mapmaker.config;

import org.springframework.context.annotation.Configuration;
import org.springframework.context.annotation.Bean;
import java.sql.Connection;
import java.sql.DriverManager;
import java.io.IOException;
import java.io.InputStream;
import java.util.Properties;

@Configuration
public class DatabaseConfig {
    private static final Properties properties = new Properties();

    static {
        try (InputStream input = DatabaseConfig.class.getClassLoader().getResourceAsStream("config.properties")) {
            properties.load(input);
        } catch (IOException e) {
            e.printStackTrace();
        }
    }

    @Bean
    public Connection databaseConnection() {
        try {
            return DriverManager.getConnection(
                getProperty("db.url"),
                getProperty("db.username"),
                getProperty("db.password")
            );
        } catch (Exception e) {
            throw new RuntimeException("Failed to connect to database", e);
        }
    }

    public static String getProperty(String key) {
        return properties.getProperty(key);
    }
}
