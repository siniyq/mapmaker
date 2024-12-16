package com.mapmaker;

import org.springframework.boot.SpringApplication;
import org.springframework.boot.autoconfigure.SpringBootApplication;
import org.springframework.context.annotation.ComponentScan;

@SpringBootApplication
@ComponentScan("com.mapmaker")
public class Main {
    public static void main(String[] args) {
        try {
            // Инициализируем базу данных
            DatabaseHelper.initializeDatabase();
            
            // Собираем данные
            GoogleMapsDataCollector collector = new GoogleMapsDataCollector();
            collector.fetchPlaces();
            
            // Запускаем веб-приложение
            SpringApplication.run(Main.class, args);
        } catch (Exception e) {
            System.err.println("Ошибка при запуске приложения: " + e.getMessage());
            e.printStackTrace();
        }
    }
}
