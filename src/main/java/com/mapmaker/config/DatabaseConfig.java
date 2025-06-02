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
    private static boolean configLoaded = false;

    static {
        try (InputStream input = DatabaseConfig.class.getClassLoader().getResourceAsStream("config.properties")) {
            if (input == null) {
                System.err.println("ВНИМАНИЕ! Файл config.properties не найден в classpath!");
            } else {
            properties.load(input);
                configLoaded = true;
                System.out.println("Файл config.properties успешно загружен, содержит " + properties.size() + " свойств");
                // Выводим все ключи для отладки
                System.out.println("Доступные ключи: " + properties.stringPropertyNames());
            }
        } catch (IOException e) {
            System.err.println("Ошибка при загрузке config.properties: " + e.getMessage());
            e.printStackTrace();
        }
    }

    public static String getProperty(String key) {
        if (!configLoaded) {
            System.err.println("ВНИМАНИЕ! Попытка получить свойство '" + key + "', но конфигурация не была загружена!");
        }
        
        String value = properties.getProperty(key);
        
        if (value == null || value.trim().isEmpty()) {
            System.err.println("ВНИМАНИЕ! Свойство '" + key + "' не найдено или пустое в config.properties");
        }
        
        return value;
    }
}
