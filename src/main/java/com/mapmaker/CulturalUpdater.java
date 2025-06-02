package com.mapmaker;

import com.mapmaker.service.CulturalPlacesService;
import com.mapmaker.util.DatabaseHelper;

/**
 * Утилитный класс для обновления данных о культурных местах
 * без запуска полного Spring Boot приложения
 */
public class CulturalUpdater {
    
    public static void main(String[] args) {
        try {
            System.out.println("Запуск утилиты обновления данных о культурных местах");
            
            // Инициализируем базу данных
            System.out.println("Инициализация базы данных...");
            DatabaseHelper.initializeDatabase();
            System.out.println("Инициализация базы данных завершена");
            
            // Создаем сервис для культурных мест
            CulturalPlacesService culturalService = new CulturalPlacesService(null);
            
            // Очищаем существующие данные
            System.out.println("Очистка существующих данных о культурных местах...");
            culturalService.clearCulturalPlaces();
            
            // Запускаем сбор данных о культурных местах
            System.out.println("Начинаем сбор данных о культурных местах (музеи, парки, театры и т.д.)...");
            culturalService.fetchCulturalPlaces();
            
            System.out.println("Сбор данных о культурных местах успешно завершен");
            
        } catch (Exception e) {
            System.err.println("Ошибка при обновлении данных о культурных местах: " + e.getMessage());
            e.printStackTrace();
        }
    }
} 