package com.mapmaker;

import org.springframework.boot.SpringApplication;
import org.springframework.boot.autoconfigure.SpringBootApplication;
import org.springframework.context.annotation.ComponentScan;
import com.mapmaker.util.DatabaseHelper;
import com.google.maps.GeoApiContext;
import com.mapmaker.config.DatabaseConfig;
import org.springframework.context.ConfigurableApplicationContext;
import com.mapmaker.service.GoogleMapsService;

@SpringBootApplication
@ComponentScan("com.mapmaker")
public class Main {
    public static void main(String[] args) {
        try {
            // Сначала инициализируем базу данных
            DatabaseHelper.initializeDatabase();
            
            // Проверяем нужно ли принудительно обновить данные
            boolean forceUpdate = args.length > 0 && "forceUpdate".equals(args[0]);
            
            // Проверяем и собираем данные если нужно
            if (DatabaseHelper.isDataEmpty() || forceUpdate) {
                System.out.println("Начинаем сбор данных...");
                GeoApiContext context = new GeoApiContext.Builder()
                    .apiKey(DatabaseConfig.getProperty("google.maps.api.key"))
                    .build();
                    
                GoogleMapsService service = new GoogleMapsService(context);
                service.fetchPlaces();
                
                context.shutdown();
                System.out.println("Сбор данных завершен");
            }
            
            // Затем запускаем Spring приложение
            ConfigurableApplicationContext context = SpringApplication.run(Main.class, args);
            
        } catch (Exception e) {
            System.err.println("Ошибка при запуске приложения: " + e.getMessage());
            e.printStackTrace();
        }
    }
}
