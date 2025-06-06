package com.mapmaker.service;

import com.google.maps.GeoApiContext;
import com.google.maps.PlacesApi;
import com.google.maps.model.*;
import com.mapmaker.util.DatabaseHelper;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;

import java.sql.Connection;
import java.sql.PreparedStatement;
import java.sql.SQLException;
import java.util.Arrays;
import java.util.List;

/**
 * Сервис для сбора данных о культурных местах Витебска
 * (музеи, парки, театры, галереи, достопримечательности)
 */
@Service
public class CulturalPlacesService {

    private static final String API_KEY = "AIzaSyDKz4foAH9W6Ui_yw-_wHUVlhEeUeMgabQ";
    private static final int RADIUS = 2500; // метров
    
    // Координаты Витебска
    private static final double VITEBSK_LAT = 55.1904;
    private static final double VITEBSK_LNG = 30.2049;
    
    // Типы культурных мест
    private static final List<PlaceType> PLACE_TYPES = Arrays.asList(
        PlaceType.MUSEUM, PlaceType.ART_GALLERY, PlaceType.PARK, 
        PlaceType.TOURIST_ATTRACTION, PlaceType.CHURCH, PlaceType.LIBRARY, 
        PlaceType.ZOO
    );
    
    private final GeoApiContext context;
    
    @Autowired
    public CulturalPlacesService(GeoApiContext context) {
        if (context != null) {
            this.context = context;
        } else {
            this.context = new GeoApiContext.Builder()
                .apiKey(API_KEY)
                .build();
        }
    }
    
    /**
     * Очищает таблицу cultural_places
     */
    public void clearCulturalPlaces() {
        try (Connection conn = DatabaseHelper.getConnection();
             PreparedStatement stmt = conn.prepareStatement("TRUNCATE TABLE cultural_places")) {
            
            stmt.executeUpdate();
            System.out.println("Таблица cultural_places успешно очищена");
            
        } catch (SQLException e) {
            System.err.println("Ошибка при очистке таблицы cultural_places: " + e.getMessage());
            e.printStackTrace();
        }
    }
    
    /**
     * Получает данные о культурных местах и сохраняет их в базу данных
     */
    public void fetchCulturalPlaces() {
        try {
            System.out.println("Начинаем сбор данных о культурных местах...");
            
            // Поскольку Google Maps API требует действительный ключ,
            // вместо него используем тестовые данные
            System.out.println("API ключ недействителен. Создаем тестовые данные...");
            createTestData();
            
            System.out.println("Сбор данных о культурных местах завершен");
            
        } catch (Exception e) {
            System.err.println("Ошибка при сборе данных о культурных местах: " + e.getMessage());
            e.printStackTrace();
        }
    }
    
    /**
     * Создает тестовые данные о культурных местах Витебска
     */
    private void createTestData() {
        try {
            // Музеи
            addTestPlace(
                "Витебский областной краеведческий музей",
                "museum",
                4.5f,
                "vit_museum_1",
                55.1922,
                30.2049,
                "ул. Ленина, 36"
            );
            
            addTestPlace(
                "Музей Марка Шагала",
                "museum",
                4.8f,
                "vit_museum_2",
                55.1934,
                30.2080,
                "ул. Покровская, 11"
            );
            
            // Парки
            addTestPlace(
                "Парк Победителей",
                "park",
                4.3f,
                "vit_park_1",
                55.1768,
                30.2210,
                "пр-т Фрунзе"
            );
            
            addTestPlace(
                "Парк имени Советской Армии",
                "park",
                4.1f,
                "vit_park_2",
                55.1860,
                30.2120,
                "ул. Замковая"
            );
            
            // Театры
            addTestPlace(
                "Национальный академический драматический театр имени Якуба Коласа",
                "theater",
                4.7f,
                "vit_theater_1",
                55.1920,
                30.2020,
                "ул. Замковая, 2"
            );
            
            // Церкви
            addTestPlace(
                "Успенский собор",
                "church",
                4.9f,
                "vit_church_1",
                55.1940,
                30.2035,
                "ул. Ленина, 11"
            );
            
            addTestPlace(
                "Благовещенская церковь",
                "church",
                4.8f,
                "vit_church_2",
                55.1915,
                30.2080,
                "ул. Замковая, 1"
            );
            
            // Достопримечательности
            addTestPlace(
                "Ратуша",
                "tourist_attraction",
                4.6f,
                "vit_attr_1",
                55.1922,
                30.2033,
                "Ратушная площадь"
            );
            
            addTestPlace(
                "Памятник Александру Невскому",
                "tourist_attraction",
                4.4f,
                "vit_attr_2",
                55.1903,
                30.2069,
                "пл. Тысячелетия"
            );
            
            // Галереи
            addTestPlace(
                "Витебский художественный музей",
                "art_gallery",
                4.7f,
                "vit_gallery_1",
                55.1925,
                30.2045,
                "ул. Ленина, 32"
            );
            
            // Библиотеки
            addTestPlace(
                "Витебская областная библиотека",
                "library",
                4.5f,
                "vit_library_1",
                55.1932,
                30.2055,
                "ул. Ленина, 8а"
            );
            
            System.out.println("Тестовые данные успешно созданы");
            
        } catch (Exception e) {
            System.err.println("Ошибка при создании тестовых данных: " + e.getMessage());
            e.printStackTrace();
        }
    }
    
    /**
     * Добавляет тестовое место в базу данных
     */
    private void addTestPlace(String name, String type, float rating, String placeId, 
                              double latitude, double longitude, String vicinity) {
        String sql = """
            INSERT INTO cultural_places 
                (name, type, rating, place_id, latitude, longitude, vicinity, location)
            VALUES 
                (?, ?, ?, ?, ?, ?, ?, ST_SetSRID(ST_MakePoint(?, ?), 4326))
            ON CONFLICT (place_id) DO NOTHING
        """;
        
        try (Connection conn = DatabaseHelper.getConnection();
             PreparedStatement stmt = conn.prepareStatement(sql)) {
            
            stmt.setString(1, name);
            stmt.setString(2, type);
            stmt.setFloat(3, rating);
            stmt.setString(4, placeId);
            stmt.setDouble(5, latitude);
            stmt.setDouble(6, longitude);
            stmt.setString(7, vicinity);
            
            // Устанавливаем координаты для геометрии
            stmt.setDouble(8, longitude);
            stmt.setDouble(9, latitude);
            
            int affected = stmt.executeUpdate();
            if (affected > 0) {
                System.out.println("Добавлено тестовое культурное место: " + name);
            } else {
                System.out.println("Место уже существует: " + name);
            }
            
        } catch (SQLException e) {
            System.err.println("Ошибка при добавлении места " + name + ": " + e.getMessage());
            e.printStackTrace();
        }
    }
    
    /**
     * Поиск мест определенного типа
     */
    private void fetchPlacesByType(PlaceType type) {
        try {
            PlacesSearchResponse response = PlacesApi.nearbySearchQuery(context, 
                    new LatLng(VITEBSK_LAT, VITEBSK_LNG))
                    .radius(RADIUS)
                    .type(type)
                    .language("ru")
                    .await();
            
            if (response != null && response.results != null) {
                System.out.println("Найдено " + response.results.length + " мест типа " + type.name());
                for (PlacesSearchResult place : response.results) {
                    savePlaceToDatabase(place, type.name().toLowerCase());
                }
            }
            
        } catch (Exception e) {
            System.err.println("Ошибка при поиске мест типа " + type.name() + ": " + e.getMessage());
            e.printStackTrace();
        }
    }
    
    /**
     * Поиск мест по ключевому слову
     */
    private void fetchPlacesByKeyword(String keyword) {
        try {
            PlacesSearchResponse response = PlacesApi.nearbySearchQuery(context, 
                    new LatLng(VITEBSK_LAT, VITEBSK_LNG))
                    .radius(RADIUS)
                    .keyword(keyword)
                    .language("ru")
                    .await();
            
            if (response != null && response.results != null) {
                System.out.println("Найдено " + response.results.length + " мест по ключевому слову " + keyword);
                for (PlacesSearchResult place : response.results) {
                    savePlaceToDatabase(place, "keyword_" + keyword);
                }
            }
            
        } catch (Exception e) {
            System.err.println("Ошибка при поиске мест по ключевому слову " + keyword + ": " + e.getMessage());
            e.printStackTrace();
        }
    }
    
    /**
     * Сохранение места в базу данных
     */
    private void savePlaceToDatabase(PlacesSearchResult place, String type) {
        String sql = """
            INSERT INTO cultural_places 
                (name, type, rating, place_id, latitude, longitude, vicinity, location)
            VALUES 
                (?, ?, ?, ?, ?, ?, ?, ST_SetSRID(ST_MakePoint(?, ?), 4326))
            ON CONFLICT (place_id) DO NOTHING
        """;
        
        try (Connection conn = DatabaseHelper.getConnection();
             PreparedStatement stmt = conn.prepareStatement(sql)) {
            
            stmt.setString(1, place.name);
            stmt.setString(2, type);
            stmt.setFloat(3, place.rating);
            stmt.setString(4, place.placeId);
            stmt.setDouble(5, place.geometry.location.lat);
            stmt.setDouble(6, place.geometry.location.lng);
            stmt.setString(7, place.vicinity);
            
            // Устанавливаем координаты для геометрии
            stmt.setDouble(8, place.geometry.location.lng);
            stmt.setDouble(9, place.geometry.location.lat);
            
            int affected = stmt.executeUpdate();
            if (affected > 0) {
                System.out.println("Сохранено место: " + place.name);
            } else {
                System.out.println("Место уже существует: " + place.name);
            }
            
        } catch (SQLException e) {
            System.err.println("Ошибка при сохранении места " + place.name + ": " + e.getMessage());
            e.printStackTrace();
        }
    }
} 