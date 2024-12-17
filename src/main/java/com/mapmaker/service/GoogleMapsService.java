package com.mapmaker.service;

import org.springframework.stereotype.Service;
import org.springframework.beans.factory.annotation.Autowired;
import com.google.maps.GeoApiContext;
import com.google.maps.PlacesApi;
import com.google.maps.FindPlaceFromTextRequest;
import com.google.maps.model.*;
import com.mapmaker.util.DatabaseHelper;
import com.mapmaker.config.DatabaseConfig;

import java.sql.Connection;
import java.sql.PreparedStatement;
import java.sql.ResultSet;
import java.util.UUID;
import java.util.HashSet;
import java.util.Set;

@Service
public class GoogleMapsService {
    private static final String API_KEY = DatabaseConfig.getProperty("google.maps.api.key");
    private final GeoApiContext context;
    
    // Расширяем сетку точек для покрытия всего Витебска
    private static final LatLng[] VITEBSK_POINTS = {
        // Центральная часть
        new LatLng(55.1904, 30.2049),  // центр
        // Северная часть
        new LatLng(55.2104, 30.2049),
        new LatLng(55.2104, 30.1849),
        new LatLng(55.2104, 30.2249),
        // Южная часть
        new LatLng(55.1704, 30.2049),
        new LatLng(55.1704, 30.1849),
        new LatLng(55.1704, 30.2249),
        // Восточная часть
        new LatLng(55.1904, 30.2349),
        new LatLng(55.2004, 30.2349),
        new LatLng(55.1804, 30.2349),
        // Западная часть
        new LatLng(55.1904, 30.1749),
        new LatLng(55.2004, 30.1749),
        new LatLng(55.1804, 30.1749),
        // Дополнительные точки для лучшего покрытия
        new LatLng(55.1954, 30.2149),  // северо-восток центра
        new LatLng(55.1954, 30.1949),  // северо-запад центра
        new LatLng(55.1854, 30.2149),  // юго-восток центра
        new LatLng(55.1854, 30.1949), // юго-запад центра
        new LatLng(55.1722, 30.2741)   // билево
    };
    
    private static final int RADIUS = 2000; // уменьшаем радиус для более точного поиска

    @Autowired
    public GoogleMapsService(GeoApiContext context) {
        this.context = context;
    }

    public void fetchPlaces() {
        try {
            clearOldData();
            
            System.out.println("Начинаем сбор данных...");
            
            System.out.println("Сбор данных о ресторанах...");
            searchPlaces("restaurant");
            
            System.out.println("Сбор данных о барах...");
            searchPlaces("bar");
            
            System.out.println("Сбор данных о кафе...");
            searchPlaces("cafe");
            
            System.out.println("Сбор данных о банках...");
            searchPlaces("bank");
            
            System.out.println("Сбор данных об аптеках...");
            searchPlaces("pharmacy");
            
            System.out.println("Сбор данных о спортзалах...");
            searchPlaces("gym");
            
            System.out.println("Сбор данных завершен");
            context.shutdown();
        } catch (Exception e) {
            System.err.println("Ошибка при сборе данных: " + e.getMessage());
            e.printStackTrace();
        }
    }

    public void searchPlaces(String type) throws Exception {
        Set<String> processedPlaceIds = new HashSet<>();

        for (LatLng point : VITEBSK_POINTS) {
            PlacesSearchResponse response = PlacesApi.nearbySearchQuery(context, point)
                .radius(RADIUS)
                .type(getPlaceType(type))
                .await();

            processResults(response, type, processedPlaceIds);
            Thread.sleep(2000); // Задержка между запросами

            // Обработка дополнительных страниц результатов
            String nextPageToken = response.nextPageToken;
            while (nextPageToken != null) {
                Thread.sleep(2000); // Обязательная задержка для работы с nextPageToken
                response = PlacesApi.nearbySearchQuery(context, point)
                    .radius(RADIUS)
                    .type(getPlaceType(type))
                    .pageToken(nextPageToken)
                    .await();
                
                processResults(response, type, processedPlaceIds);
                nextPageToken = response.nextPageToken;
            }
        }
        
        System.out.println("Всего найдено уникальных мест типа " + type + ": " + processedPlaceIds.size());
    }

    private void processResults(PlacesSearchResponse response, String type, Set<String> processedPlaceIds) {
        for (PlacesSearchResult place : response.results) {
            if (!processedPlaceIds.contains(place.placeId)) {
                savePlaceToDatabase(place, type);
                processedPlaceIds.add(place.placeId);
            }
        }
    }

    private void savePlaceToDatabase(PlacesSearchResult place, String type) {
        if (place == null || place.geometry == null || place.geometry.location == null) {
            System.err.println("Пропущено место из-за отсутствия данных");
            return;
        }

        String sql = """
            INSERT INTO public.points_of_interest (name, type, rating, location, place_id)
            VALUES (?, ?, ?, ST_SetSRID(ST_MakePoint(?, ?), 4326), ?)
            ON CONFLICT (place_id) 
            DO UPDATE SET 
                name = EXCLUDED.name,
                rating = EXCLUDED.rating,
                location = EXCLUDED.location
            RETURNING id
        """;

        try (Connection conn = DatabaseHelper.getConnection();
             PreparedStatement pstmt = conn.prepareStatement(sql)) {
            
            // Устанавливаем параметры с проверкой на null
            pstmt.setString(1, place.name != null ? place.name : "Без названия");
            pstmt.setString(2, type);
            pstmt.setDouble(3, place.rating > 0 ? place.rating : 0.0);
            pstmt.setDouble(4, place.geometry.location.lng);
            pstmt.setDouble(5, place.geometry.location.lat);
            pstmt.setString(6, place.placeId != null ? place.placeId : UUID.randomUUID().toString());

            try (ResultSet rs = pstmt.executeQuery()) {
                if (rs.next()) {
                    System.out.println("Успешно сохранено/обновлено место: " + place.name + 
                                     " (ID: " + rs.getInt(1) + ")");
                }
            }
        } catch (Exception e) {
            System.err.println("Ошибка при сохранении места " + place.name + ": " + e.getMessage());
            e.printStackTrace();
        }
    }

    private void clearOldData() {
        try (Connection conn = DatabaseHelper.getConnection();
             PreparedStatement pstmt = conn.prepareStatement(
                 "TRUNCATE TABLE public.points_of_interest RESTART IDENTITY")) {
            pstmt.executeUpdate();
            System.out.println("Старые данные успешно очищены");
        } catch (Exception e) {
            System.err.println("Ошибка при очистке старых данных: " + e.getMessage());
            e.printStackTrace();
        }
    }

    private PlaceType getPlaceType(String type) {
        return switch (type.toUpperCase()) {
            case "RESTAURANT" -> PlaceType.RESTAURANT;
            case "BAR" -> PlaceType.BAR;
            case "CAFE" -> PlaceType.CAFE;
            case "BANK" -> PlaceType.BANK;
            case "PHARMACY" -> PlaceType.PHARMACY;
            case "GYM" -> PlaceType.GYM;
            default -> throw new IllegalArgumentException("Неизвестный тип: " + type);
        };
    }
}