package com.mapmaker;

import org.springframework.boot.SpringApplication;
import org.springframework.boot.autoconfigure.SpringBootApplication;
import org.springframework.context.annotation.ComponentScan;
import com.mapmaker.util.DatabaseHelper;
import com.google.maps.GeoApiContext;
import com.mapmaker.config.DatabaseConfig;
import org.springframework.context.ConfigurableApplicationContext;
import com.mapmaker.service.GoogleMapsService;
import com.mapmaker.service.CulturalPlacesService;
import org.springframework.context.annotation.Bean;
import org.springframework.web.client.RestTemplate;

@SpringBootApplication
@ComponentScan("com.mapmaker")
public class Main {
    public static void main(String[] args) {
        try {
            System.out.println("Запуск приложения MapMaker");
            
            // Вывод версии Java для отладки
            System.out.println("Версия Java: " + System.getProperty("java.version"));
            
            // Вывод переданных аргументов
            System.out.println("Переданные аргументы: " + String.join(", ", args));
            
            // Сначала инициализируем базу данных
            System.out.println("Инициализация базы данных...");
            DatabaseHelper.initializeDatabase();
            System.out.println("Инициализация базы данных завершена");
            
            // Проверяем аргументы командной строки
            boolean forceUpdate = args.length > 0 && "forceUpdate".equals(args[0]);
            boolean updateCultural = args.length > 0 && "updateCultural".equals(args[0]);
            
            System.out.println("forceUpdate: " + forceUpdate);
            System.out.println("updateCultural: " + updateCultural);
            
            // Проверяем и собираем стандартные данные если нужно
            if (forceUpdate) {
                System.out.println("Начинаем сбор данных о стандартных местах (рестораны, кафе, бары и т.д.)...");
                    
                // Создаем сервис напрямую
                GoogleMapsService service = new GoogleMapsService(null); // null, так как мы не используем переданный контекст
                service.fetchPlaces();
                
                System.out.println("Сбор данных о стандартных местах завершен");
            } else {
                System.out.println("Сбор данных о стандартных местах пропущен. Используйте параметр 'forceUpdate' для принудительного обновления.");
            }
            
            // Проверяем и собираем данные о культурных местах если нужно
            if (updateCultural) {
                System.out.println("Начинаем сбор данных о культурных местах (музеи, парки, театры и т.д.)...");
                
                // Создаем сервис для культурных мест напрямую
                CulturalPlacesService culturalService = new CulturalPlacesService(null);
                
                // Если указан параметр updateCultural, предварительно очищаем данные о культурных местах
                System.out.println("Очистка существующих данных о культурных местах...");
                culturalService.clearCulturalPlaces();
                
                culturalService.fetchCulturalPlaces();
                
                System.out.println("Сбор данных о культурных местах завершен");
            } else {
                System.out.println("Сбор данных о культурных местах пропущен. Используйте параметр 'updateCultural' для обновления.");
            }
            
            // Если это прямой запуск из командной строки с аргументом updateCultural или forceUpdate,
            // не запускаем Spring Boot приложение
            if (!updateCultural && !forceUpdate) {
                System.out.println("Запуск Spring Boot приложения...");
                ConfigurableApplicationContext context = SpringApplication.run(Main.class, args);
                System.out.println("Spring Boot приложение успешно запущено");
            } else {
                System.out.println("Пропуск запуска Spring Boot приложения, так как это режим обновления данных");
            }
            
        } catch (Exception e) {
            System.err.println("Ошибка при запуске приложения: " + e.getMessage());
            e.printStackTrace();
        }
    }

    @Bean
    public RestTemplate restTemplate() {
        return new RestTemplate();
    }
}
