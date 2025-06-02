package com.mapmaker.controller;

import org.springframework.web.bind.annotation.RestController;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestParam;
import java.sql.Connection;
import java.sql.PreparedStatement;
import java.sql.ResultSet;
import java.util.List;
import java.util.ArrayList;
import java.util.HashMap;
import java.util.Map;
import org.springframework.http.ResponseEntity;
import org.springframework.http.HttpStatus;
import com.mapmaker.util.DatabaseHelper;
import org.json.JSONArray;
import java.sql.SQLException;
import java.util.Collections;

@RestController
@RequestMapping("/api")
public class POIController {
    
    @GetMapping("/standard-pois")
    public ResponseEntity<List<Map<String, Object>>> getPOIs(@RequestParam String types) {
        List<Map<String, Object>> results = new ArrayList<>();
        String[] typeArray = types.split(",");
        
        try (Connection conn = DatabaseHelper.getConnection()) {
            
            StringBuilder queryBuilder = new StringBuilder(
                "SELECT id, name, type, rating, place_id, latitude, longitude, vicinity, address, photo_url FROM points_of_interest WHERE ");
            
            // Строим условие IN для типов
            queryBuilder.append("type IN (");
            for (int i = 0; i < typeArray.length; i++) {
                if (i > 0) {
                    queryBuilder.append(", ");
                }
                queryBuilder.append("?");
            }
            queryBuilder.append(")");
            
            if (typeArray.length > 0) {
                // Добавляем сортировку по рейтингу
                queryBuilder.append(" ORDER BY rating DESC");
                
                try (PreparedStatement pstmt = conn.prepareStatement(queryBuilder.toString())) {
                    // Устанавливаем значения для IN
                    for (int i = 0; i < typeArray.length; i++) {
                        pstmt.setString(i + 1, typeArray[i].trim());
                    }
                    
                    try (ResultSet rs = pstmt.executeQuery()) {
                        while (rs.next()) {
                            Map<String, Object> poi = new HashMap<>();
                            poi.put("id", rs.getInt("id"));
                            poi.put("name", rs.getString("name"));
                            poi.put("type", rs.getString("type"));
                            poi.put("rating", rs.getDouble("rating"));
                            poi.put("placeId", rs.getString("place_id"));
                            poi.put("latitude", rs.getDouble("latitude"));
                            poi.put("longitude", rs.getDouble("longitude"));
                            poi.put("vicinity", rs.getString("vicinity"));
                            poi.put("address", rs.getString("address"));
                            
                            // Обрабатываем photo_url (который хранится как JSON массив)
                            String photoUrlJson = rs.getString("photo_url");
                            if (photoUrlJson != null) {
                                try {
                                    JSONArray photos = new JSONArray(photoUrlJson);
                                    if (photos.length() > 0) {
                                        poi.put("photoUrl", photos.getString(0)); // Берем первое фото
                                        poi.put("photos", photos.toList()); // Все фото
                                    }
                                } catch (Exception e) {
                                    System.err.println("Ошибка при разборе JSON с фото: " + e.getMessage());
                                }
                            }
                            
                            results.add(poi);
                        }
                    }
                }
            }
            
            return ResponseEntity.ok(results);
        } catch (Exception e) {
            e.printStackTrace();
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR)
                .body(List.of(Map.of("error", "Ошибка при получении данных: " + e.getMessage())));
        }
    }
    
    @GetMapping("/cultural-pois")
    public ResponseEntity<List<Map<String, Object>>> getCulturalPOIs(@RequestParam(required = false) String types) {
        List<Map<String, Object>> results = new ArrayList<>();
        
        try (Connection conn = DatabaseHelper.getConnection()) {
            
            StringBuilder queryBuilder = new StringBuilder(
                "SELECT id, name, type, rating, place_id, latitude, longitude, vicinity, address, photo_url FROM cultural_places");
            
            // Если указаны конкретные типы, добавляем фильтрацию
            if (types != null && !types.trim().isEmpty()) {
                String[] typeArray = types.split(",");
                queryBuilder.append(" WHERE type IN (");
                for (int i = 0; i < typeArray.length; i++) {
                    if (i > 0) {
                        queryBuilder.append(", ");
                    }
                    queryBuilder.append("?");
                }
                queryBuilder.append(")");
                
                // Добавляем сортировку по рейтингу
                queryBuilder.append(" ORDER BY rating DESC");
                
                try (PreparedStatement pstmt = conn.prepareStatement(queryBuilder.toString())) {
                    // Устанавливаем значения для IN
                    for (int i = 0; i < typeArray.length; i++) {
                        pstmt.setString(i + 1, typeArray[i].trim());
                    }
                    
                    try (ResultSet rs = pstmt.executeQuery()) {
                        while (rs.next()) {
                            Map<String, Object> poi = new HashMap<>();
                            poi.put("id", rs.getInt("id"));
                            poi.put("name", rs.getString("name"));
                            poi.put("type", rs.getString("type"));
                            poi.put("rating", rs.getDouble("rating"));
                            poi.put("placeId", rs.getString("place_id"));
                            poi.put("latitude", rs.getDouble("latitude"));
                            poi.put("longitude", rs.getDouble("longitude"));
                            poi.put("vicinity", rs.getString("vicinity"));
                            poi.put("address", rs.getString("address"));
                            
                            // Обрабатываем photo_url (который хранится как JSON массив)
                            String photoUrlJson = rs.getString("photo_url");
                            if (photoUrlJson != null) {
                                try {
                                    JSONArray photos = new JSONArray(photoUrlJson);
                                    if (photos.length() > 0) {
                                        poi.put("photoUrl", photos.getString(0)); // Берем первое фото
                                        poi.put("photos", photos.toList()); // Все фото
                                    }
                                } catch (Exception e) {
                                    System.err.println("Ошибка при разборе JSON с фото: " + e.getMessage());
                                }
                            }
                            
                            results.add(poi);
                        }
                    }
                }
            } else {
                // Если типы не указаны, получаем все культурные места, отсортированные по рейтингу
                queryBuilder.append(" ORDER BY rating DESC");
                
                try (PreparedStatement pstmt = conn.prepareStatement(queryBuilder.toString())) {
                    try (ResultSet rs = pstmt.executeQuery()) {
                        while (rs.next()) {
                            Map<String, Object> poi = new HashMap<>();
                            poi.put("id", rs.getInt("id"));
                            poi.put("name", rs.getString("name"));
                            poi.put("type", rs.getString("type"));
                            poi.put("rating", rs.getDouble("rating"));
                            poi.put("placeId", rs.getString("place_id"));
                            poi.put("latitude", rs.getDouble("latitude"));
                            poi.put("longitude", rs.getDouble("longitude"));
                            poi.put("vicinity", rs.getString("vicinity"));
                            poi.put("address", rs.getString("address"));
                            
                            // Обрабатываем photo_url (который хранится как JSON массив)
                            String photoUrlJson = rs.getString("photo_url");
                            if (photoUrlJson != null) {
                                try {
                                    JSONArray photos = new JSONArray(photoUrlJson);
                                    if (photos.length() > 0) {
                                        poi.put("photoUrl", photos.getString(0)); // Берем первое фото
                                        poi.put("photos", photos.toList()); // Все фото
                                    }
                                } catch (Exception e) {
                                    System.err.println("Ошибка при разборе JSON с фото: " + e.getMessage());
                                }
                            }
                            
                            results.add(poi);
                        }
                    }
                }
            }
            
            return ResponseEntity.ok(results);
        } catch (Exception e) {
            e.printStackTrace();
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR)
                .body(List.of(Map.of("error", "Ошибка при получении данных о культурных местах: " + e.getMessage())));
        }
    }
    
    @GetMapping("/cultural/types")
    public ResponseEntity<List<Map<String, Object>>> getCulturalPlaceTypes() {
        List<Map<String, Object>> results = new ArrayList<>();
        
        try (Connection conn = DatabaseHelper.getConnection();
             PreparedStatement pstmt = conn.prepareStatement(
                 "SELECT DISTINCT type, COUNT(*) as count FROM cultural_places GROUP BY type ORDER BY count DESC")) {
            
            try (ResultSet rs = pstmt.executeQuery()) {
                while (rs.next()) {
                    Map<String, Object> typeInfo = new HashMap<>();
                    typeInfo.put("type", rs.getString("type"));
                    typeInfo.put("count", rs.getInt("count"));
                    results.add(typeInfo);
                }
            }
            
            return ResponseEntity.ok(results);
        } catch (Exception e) {
            e.printStackTrace();
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR)
                .body(List.of(Map.of("error", "Ошибка при получении типов культурных мест: " + e.getMessage())));
        }
    }
    
    /**
     * Построение культурного тематического маршрута, включающего несколько типов мест
     * 
     * @param count - количество точек маршрута (по умолчанию 3)
     * @param types - типы мест для включения в маршрут (опционально)
     * @param includeMuseum - всегда включать хотя бы один музей (по умолчанию true)
     * @param includePark - всегда включать хотя бы один парк (по умолчанию true)
     * @return Список точек для маршрута, перемешанных в случайном порядке
     */
    @GetMapping("/cultural-thematic-route")
    public ResponseEntity<Map<String, Object>> getCulturalThematicRoute(
            @RequestParam(required = false, defaultValue = "3") int count,
            @RequestParam(required = false) String types,
            @RequestParam(required = false, defaultValue = "true") boolean includeMuseum,
            @RequestParam(required = false, defaultValue = "true") boolean includePark) {
        
        Map<String, Object> response = new HashMap<>();
        
        try (Connection conn = DatabaseHelper.getConnection()) {
            
            // Список выбранных точек для маршрута
            List<Map<String, Object>> selectedPoints = new ArrayList<>();
            
            System.out.println("Запрошен культурный маршрут с параметрами: count=" + count + 
                              ", types=" + types + ", includeMuseum=" + includeMuseum + 
                              ", includePark=" + includePark);
            
            // 1. Если указано включать музей, получаем 1 музей (но не более 1)
            if (includeMuseum) {
                int museumLimit = Math.min(1, count); // Не более 1 музея, но не больше total count
                List<Map<String, Object>> museums = getPointsByType(conn, "museum", museumLimit);
                if (!museums.isEmpty()) {
                    selectedPoints.addAll(museums);
                    System.out.println("Добавлен музей: " + museums.get(0).get("name"));
                }
            }
            
            // Проверяем, не превысили ли лимит точек
            if (selectedPoints.size() >= count) {
                response.put("points", selectedPoints);
                response.put("count", selectedPoints.size());
                return ResponseEntity.ok(response);
            }
            
            // 2. Если указано включать парк, получаем 1 парк (но не более 1)
            if (includePark) {
                int parkLimit = Math.min(1, count - selectedPoints.size()); // Не более 1 парка
                if (parkLimit > 0) {
                    List<Map<String, Object>> parks = getPointsByType(conn, "park", parkLimit);
                    if (!parks.isEmpty()) {
                        selectedPoints.addAll(parks);
                        System.out.println("Добавлен парк: " + parks.get(0).get("name"));
                    }
                }
            }
            
            // Проверяем, не превысили ли лимит точек
            if (selectedPoints.size() >= count) {
                response.put("points", selectedPoints);
                response.put("count", selectedPoints.size());
                return ResponseEntity.ok(response);
            }
            
            // 3. Если указаны конкретные типы мест, добавляем их
            if (types != null && !types.trim().isEmpty()) {
                String[] typeArray = types.split(",");
                for (String type : typeArray) {
                    // Проверяем, не превысили ли лимит точек
                    if (selectedPoints.size() >= count) {
                        break;
                    }
                    
                    // Пропускаем типы, которые уже добавлены
                    if ((type.equals("museum") && includeMuseum) || 
                        (type.equals("park") && includePark)) {
                        continue;
                    }
                    
                    List<Map<String, Object>> pointsOfType = getPointsByType(conn, type, 1);
                    if (!pointsOfType.isEmpty()) {
                        selectedPoints.addAll(pointsOfType);
                        System.out.println("Добавлено место типа " + type + ": " + pointsOfType.get(0).get("name"));
                    }
                }
            }
            
            // 4. Добавляем случайные культурные места, чтобы заполнить до нужного количества
            if (selectedPoints.size() < count) {
                int remaining = count - selectedPoints.size();
                
                List<Map<String, Object>> randomPoints = getRandomCulturalPoints(conn, remaining, selectedPoints);
                if (!randomPoints.isEmpty()) {
                    selectedPoints.addAll(randomPoints);
                    for (Map<String, Object> point : randomPoints) {
                        System.out.println("Добавлено случайное место: " + point.get("name") + " (" + point.get("type") + ")");
                    }
                }
            }
            
            // 5. Перемешиваем точки в случайном порядке
            Collections.shuffle(selectedPoints);
            
            response.put("points", selectedPoints);
            response.put("count", selectedPoints.size());
            
            return ResponseEntity.ok(response);
        } catch (Exception e) {
            e.printStackTrace();
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR)
                .body(Map.of("error", "Ошибка при создании тематического маршрута: " + e.getMessage()));
        }
    }
    
    /**
     * Получает указанное количество точек заданного типа
     */
    private List<Map<String, Object>> getPointsByType(Connection conn, String type, int limit) throws SQLException {
        List<Map<String, Object>> results = new ArrayList<>();
        
        String sql = "SELECT id, name, type, rating, place_id, latitude, longitude, vicinity, address, photo_url " +
                     "FROM cultural_places WHERE type = ? ORDER BY rating DESC LIMIT ?";
        
        try (PreparedStatement pstmt = conn.prepareStatement(sql)) {
            pstmt.setString(1, type);
            pstmt.setInt(2, limit);
            
            try (ResultSet rs = pstmt.executeQuery()) {
                while (rs.next()) {
                    Map<String, Object> poi = new HashMap<>();
                    poi.put("id", rs.getInt("id"));
                    poi.put("name", rs.getString("name"));
                    poi.put("type", rs.getString("type"));
                    poi.put("rating", rs.getDouble("rating"));
                    poi.put("placeId", rs.getString("place_id"));
                    poi.put("latitude", rs.getDouble("latitude"));
                    poi.put("longitude", rs.getDouble("longitude"));
                    poi.put("vicinity", rs.getString("vicinity"));
                    poi.put("address", rs.getString("address"));
                    
                    // Обрабатываем photo_url (который хранится как JSON массив)
                    String photoUrlJson = rs.getString("photo_url");
                    if (photoUrlJson != null) {
                        try {
                            JSONArray photos = new JSONArray(photoUrlJson);
                            if (photos.length() > 0) {
                                poi.put("photoUrl", photos.getString(0)); // Берем первое фото
                                poi.put("photos", photos.toList()); // Все фото
                            }
                        } catch (Exception e) {
                            System.err.println("Ошибка при разборе JSON с фото: " + e.getMessage());
                        }
                    }
                    
                    results.add(poi);
                }
            }
        }
        
        return results;
    }
    
    /**
     * Получает указанное количество случайных культурных мест, исключая уже выбранные
     */
    private List<Map<String, Object>> getRandomCulturalPoints(Connection conn, int limit, List<Map<String, Object>> excludePoints) throws SQLException {
        List<Map<String, Object>> results = new ArrayList<>();
        
        // Формируем список исключаемых ID
        List<Integer> excludeIds = new ArrayList<>();
        for (Map<String, Object> point : excludePoints) {
            excludeIds.add((Integer) point.get("id"));
        }
        
        // Строим SQL запрос с исключением уже выбранных точек
        StringBuilder sql = new StringBuilder(
            "SELECT id, name, type, rating, place_id, latitude, longitude, vicinity, address, photo_url " +
            "FROM cultural_places WHERE 1=1");
        
        if (!excludeIds.isEmpty()) {
            sql.append(" AND id NOT IN (");
            for (int i = 0; i < excludeIds.size(); i++) {
                if (i > 0) sql.append(",");
                sql.append("?");
            }
            sql.append(")");
        }
        
        sql.append(" ORDER BY RANDOM() LIMIT ?");
        
        try (PreparedStatement pstmt = conn.prepareStatement(sql.toString())) {
            int paramIndex = 1;
            
            // Устанавливаем параметры для исключаемых ID
            for (Integer id : excludeIds) {
                pstmt.setInt(paramIndex++, id);
            }
            
            // Устанавливаем лимит
            pstmt.setInt(paramIndex, limit);
            
            try (ResultSet rs = pstmt.executeQuery()) {
                while (rs.next()) {
                    Map<String, Object> poi = new HashMap<>();
                    poi.put("id", rs.getInt("id"));
                    poi.put("name", rs.getString("name"));
                    poi.put("type", rs.getString("type"));
                    poi.put("rating", rs.getDouble("rating"));
                    poi.put("placeId", rs.getString("place_id"));
                    poi.put("latitude", rs.getDouble("latitude"));
                    poi.put("longitude", rs.getDouble("longitude"));
                    poi.put("vicinity", rs.getString("vicinity"));
                    poi.put("address", rs.getString("address"));
                    
                    // Обрабатываем photo_url (который хранится как JSON массив)
                    String photoUrlJson = rs.getString("photo_url");
                    if (photoUrlJson != null) {
                        try {
                            JSONArray photos = new JSONArray(photoUrlJson);
                            if (photos.length() > 0) {
                                poi.put("photoUrl", photos.getString(0)); // Берем первое фото
                                poi.put("photos", photos.toList()); // Все фото
                            }
                        } catch (Exception e) {
                            System.err.println("Ошибка при разборе JSON с фото: " + e.getMessage());
                        }
                    }
                    
                    results.add(poi);
                }
            }
        }
        
        return results;
    }
} 