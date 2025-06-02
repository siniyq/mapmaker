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
    private static final int MAX_PHOTO_WIDTH = 400; // Максимальная ширина фото
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

            System.out.println("Сбор данных о школах...");
            searchPlaces("school");
            
            System.out.println("Сбор данных завершен");
        } catch (Exception e) {
            System.err.println("Ошибка при сборе данных: " + e.getMessage());
            e.printStackTrace();
        }
    }

    public void searchPlaces(String type) throws Exception {
        Set<String> processedPlaceIds = new HashSet<>();
        String nextPageToken = null;

        // Создаем свой GeoApiContext с явно указанным API-ключом
        // Используем другой формат API-ключа для тестирования
        String apiKey = "AIzaSyBQwvM_w_zjXN6uPdanOsbrAsSKkcbNX9M";
        
        System.out.println("Длина API-ключа: " + apiKey.length());
        System.out.println("API-ключ содержит пробелы: " + apiKey.contains(" "));
        
        GeoApiContext localContext = new GeoApiContext.Builder()
            .apiKey(apiKey)
            .build();
        
        try {
        for (LatLng point : VITEBSK_POINTS) {
                System.out.println("Поиск мест типа '" + type + "' рядом с точкой: " + point.lat + ", " + point.lng);
                
                // Получаем тип места и проверяем его
                PlaceType placeType = getPlaceType(type);
                if (placeType == null) {
                    System.out.println("ВНИМАНИЕ: getPlaceType вернул null для типа: " + type);
                    continue;
                }
                
                try {
                    do {
                        System.out.println("Отправка запроса с pageToken: " + (nextPageToken != null ? "имеется" : "null"));
                        
                        // Выполняем запрос напрямую
                        PlacesSearchResponse response;
                        if (nextPageToken != null) {
                            response = PlacesApi.nearbySearchQuery(localContext, point)
                                .radius(RADIUS)
                                .type(placeType)
                                .pageToken(nextPageToken)
                                .await();
                        } else {
                            response = PlacesApi.nearbySearchQuery(localContext, point)
                    .radius(RADIUS)
                                .type(placeType)
                    .await();
                        }
                        
                        if (response == null) {
                            System.out.println("ВНИМАНИЕ: Получен null ответ от API");
                            break;
                        }
                        
                        if (response.results == null) {
                            System.out.println("ВНИМАНИЕ: Результаты в ответе - null");
                        } else {
                            System.out.println("Получено мест: " + response.results.length);
                processResults(response, type, processedPlaceIds);
                        }
                        
                nextPageToken = response.nextPageToken;
                        System.out.println("Следующий pageToken: " + (nextPageToken != null ? "имеется" : "null"));

                if (nextPageToken != null) {
                    Thread.sleep(2000); // Обязательная задержка для работы с nextPageToken
                }
            } while (nextPageToken != null);
                } catch (Exception e) {
                    System.err.println("Ошибка при обработке точки " + point.lat + ", " + point.lng + ": " + e.getMessage());
                    e.printStackTrace();
                    // Продолжаем с другими точками
                }
                
            // Сбрасываем nextPageToken для следующей точки VITEBSK_POINTS
            nextPageToken = null; 
                // Добавим небольшую задержку между обработкой разных VITEBSK_POINTS
            Thread.sleep(2000); 
            }
        } finally {
            // Закрываем локальный контекст
            localContext.shutdown();
        }
        
        System.out.println("Всего найдено уникальных мест типа " + type + ": " + processedPlaceIds.size());
    }

    private void processResults(PlacesSearchResponse response, String type, Set<String> processedPlaceIds) {
        for (PlacesSearchResult place : response.results) {
            if (!processedPlaceIds.contains(place.placeId)) {
                // Если это школа, проверяем, что это не детский сад
                if ("school".equals(type)) {
                    String placeName = place.name != null ? place.name.toLowerCase() : "";
                    
                    // Пропускаем места с названиями, содержащими указание на детский сад
                    if (placeName.contains("детский сад") || 
                        placeName.contains("ясли") || 
                        placeName.contains("kindergarten") || 
                        (placeName.contains("детский") && placeName.contains("сад")) ||
                        placeName.contains("ясли-сад") ||
                        placeName.contains("doshkol") ||
                        placeName.contains("jasli") ||
                        placeName.contains("sad") && placeName.contains("detsk") ||
                        placeName.contains("дошкольн")) {
                        continue;
                    }
                    
                    // Проверим типы места от Google API, если среди них есть daycare или установлен - пропускаем
                    if (place.types != null) {
                        boolean isKindergarten = false;
                        for (String placeType : place.types) {
                            if (placeType.equals("primary_school") || 
                                placeType.equals("secondary_school") || 
                                placeType.equals("high_school")) {
                                // Это школа, оставляем
                                break;
                            }
                            
                            if (placeType.equals("kindergarten") || 
                                placeType.equals("day_care") || 
                                placeType.equals("preschool") ||
                                placeType.equals("establishment") && placeName.contains("сад")) {
                                isKindergarten = true;
                                break;
                            }
                        }
                        
                        if (isKindergarten) {
                            continue;
                        }
                    }
                }
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
        
        // Пропускаем места с рейтингом 0 или null
        if (place.rating <= 0) {
            System.out.println("Пропущено место с нулевым рейтингом: " + place.name);
            return;
        }

        // Получаем URLs фотографий, если доступны (до 5 штук)
        String photoUrl = getPhotoUrls(place);

        String sql = """
            INSERT INTO points_of_interest (
                name, type, rating, place_id, latitude, longitude, vicinity, address, photo_url, location
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ST_SetSRID(ST_MakePoint(?, ?), 4326))
            ON CONFLICT (place_id) 
            DO UPDATE SET 
                name = EXCLUDED.name,
                rating = EXCLUDED.rating,
                photo_url = EXCLUDED.photo_url,
                vicinity = EXCLUDED.vicinity,
                address = EXCLUDED.address,
                location = ST_SetSRID(ST_MakePoint(?, ?), 4326)
            RETURNING id
        """;

        try (Connection conn = DatabaseHelper.getConnection();
             PreparedStatement pstmt = conn.prepareStatement(sql)) {
            
            // Устанавливаем параметры с проверкой на null
            pstmt.setString(1, place.name != null ? place.name : "Без названия");
            pstmt.setString(2, type);
            pstmt.setDouble(3, place.rating > 0 ? place.rating : 0.0);
            pstmt.setString(4, place.placeId != null ? place.placeId : UUID.randomUUID().toString());
            pstmt.setDouble(5, place.geometry.location.lat);
            pstmt.setDouble(6, place.geometry.location.lng);
            pstmt.setString(7, place.vicinity);
            pstmt.setString(8, place.formattedAddress);
            pstmt.setString(9, photoUrl);
            
            // Добавляем параметры для ST_MakePoint в INSERT
            pstmt.setDouble(10, place.geometry.location.lng); // Долгота (X)
            pstmt.setDouble(11, place.geometry.location.lat); // Широта (Y)
            
            // Добавляем параметры для ST_MakePoint в UPDATE
            pstmt.setDouble(12, place.geometry.location.lng); // Долгота (X)
            pstmt.setDouble(13, place.geometry.location.lat); // Широта (Y)

            try (ResultSet rs = pstmt.executeQuery()) {
                if (rs.next()) {
                    System.out.println("Успешно сохранено/обновлено место: " + place.name + 
                                     " (ID: " + rs.getInt(1) + ")" + 
                                     (photoUrl != null ? " с фотографией" : " без фотографии"));
                }
            }
        } catch (Exception e) {
            System.err.println("Ошибка при сохранении места " + place.name + ": " + e.getMessage());
            e.printStackTrace();
        }
    }

    /**
     * Получает URL фотографий для места (до 5 штук)
     * @param place объект с информацией о месте
     * @return JSON массив с URL фотографий или null, если фотографий нет
     */
    private String getPhotoUrls(PlacesSearchResult place) {
        if (place.photos == null || place.photos.length == 0) {
            System.out.println("У места " + place.name + " нет фотографий");
            return null;
        }
        
        System.out.println("Получение фотографий для " + place.name + ": " + place.photos.length + " доступно");
        
        // Получаем API-ключ
        String apiKey = "AIzaSyC8n6OCeLcGqrlUi2FSeUPlUirQA2DrflE"; // Жестко закодированный ключ, который мы знаем что работает
        
        // Создаем JSON массив для хранения URL фотографий
        StringBuilder photoUrlsJson = new StringBuilder("[");
        
        // Максимальное количество фотографий, которые мы хотим получить
        int maxPhotos = Math.min(5, place.photos.length);
        System.out.println("Будет получено максимум " + maxPhotos + " фото");
        
        // Для каждой доступной фотографии (до maxPhotos)
        for (int i = 0; i < maxPhotos; i++) {
            Photo photo = place.photos[i];
            
            // Создаем URL для фотографии с помощью photo_reference
            if (photo.photoReference != null && !photo.photoReference.isEmpty()) {
                String photoUrl = String.format(
                    "https://maps.googleapis.com/maps/api/place/photo?maxwidth=%d&photoreference=%s&key=%s",
                    MAX_PHOTO_WIDTH,
                    photo.photoReference,
                    apiKey
                );
                
                System.out.println("Создан URL для фото " + (i+1) + ": " + photoUrl);
                
                // Добавляем URL в JSON массив
                if (i > 0) {
                    photoUrlsJson.append(",");
                }
                photoUrlsJson.append("\"").append(photoUrl).append("\"");
            } else {
                System.out.println("Фото " + (i+1) + " не имеет действительной ссылки");
            }
        }
        
        photoUrlsJson.append("]");
        String result = photoUrlsJson.toString();
        
        // Если нет фотографий с действительными ссылками, возвращаем null
        if (result.equals("[]")) {
            System.out.println("Не найдено ни одной действительной ссылки на фото");
            return null;
        }
        
        System.out.println("Финальный JSON массив фотографий: " + result);
        return result;
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
        if (type == null) {
            System.err.println("ВНИМАНИЕ: getPlaceType получил null в качестве аргумента");
            return PlaceType.RESTAURANT; // Возвращаем значение по умолчанию
        }
        
        String upperType = type.toUpperCase();
        System.out.println("Преобразуем тип места: " + type + " -> " + upperType);
        
        try {
            return switch (upperType) {
            case "RESTAURANT" -> PlaceType.RESTAURANT;
            case "BAR" -> PlaceType.BAR;
            case "CAFE" -> PlaceType.CAFE;
            case "BANK" -> PlaceType.BANK;
            case "PHARMACY" -> PlaceType.PHARMACY;
            case "GYM" -> PlaceType.GYM;
            case "SCHOOL" -> PlaceType.SCHOOL;
            case "TEST" -> PlaceType.RESTAURANT; // Используем RESTAURANT как плейсхолдер для TEST
                default -> {
                    System.err.println("Неизвестный тип места: " + type);
                    yield PlaceType.ESTABLISHMENT; // Возвращаем общий тип для неизвестных
                }
        };
        } catch (Exception e) {
            System.err.println("Ошибка при определении типа места: " + e.getMessage());
            return PlaceType.ESTABLISHMENT;
        }
    }
}