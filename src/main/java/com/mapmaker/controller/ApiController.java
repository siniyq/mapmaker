package com.mapmaker.controller;

import com.mapmaker.model.PointOfInterest;
import com.mapmaker.repository.PointOfInterestRepository;
import com.mapmaker.util.DatabaseHelper;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;
import com.mapmaker.service.RoutingService;
import org.json.JSONObject;
import org.json.JSONArray;
import com.mapmaker.util.OsmBoundaryExtractor;
import java.io.File;

import java.sql.Connection;
import java.sql.PreparedStatement;
import java.sql.ResultSet;
import java.util.ArrayList;
import java.util.List;
import java.util.Map;
import java.util.HashMap;
import java.sql.SQLException;
import java.util.Collections;
import java.io.IOException;
import java.nio.file.Files;
import java.nio.file.Path;
import java.nio.file.Paths;
import java.io.FileNotFoundException;

@RestController
@RequestMapping("/api")
public class ApiController {

    private final RoutingService routingService;
    private final PointOfInterestRepository poiRepository;
    private final OsmBoundaryExtractor osmBoundaryExtractor;

    @Autowired
    public ApiController(RoutingService routingService, PointOfInterestRepository poiRepository, 
                        OsmBoundaryExtractor osmBoundaryExtractor) {
        this.routingService = routingService;
        this.poiRepository = poiRepository;
        this.osmBoundaryExtractor = osmBoundaryExtractor;
    }

    @GetMapping("/route")
    public ResponseEntity<String> getRoute(
            @RequestParam double startLat,
            @RequestParam double startLon,
            @RequestParam double endLat,
            @RequestParam double endLon,
            @RequestParam String profile) {
        
        JSONObject routeResponse = routingService.getRoute(startLat, startLon, endLat, endLon, profile);

        if (routeResponse != null) {
            return ResponseEntity.ok(routeResponse.toString());
            } else {
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR).body("{\"error\": \"Error calculating route\"}");
        }
    }

    @GetMapping("/thematic-route")
    public ResponseEntity<String> getThematicRoute(
            @RequestParam(value = "points") String pointsStr,
            @RequestParam String profile) {
        
        try {
            System.out.println("Получен запрос на тематический маршрут: points=" + pointsStr + ", profile=" + profile);
            
            // Парсим строку точек в формате "lat1,lon1;lat2,lon2;lat3,lon3..."
            String[] pointsArray = pointsStr.split(";");
            double[][] points = new double[pointsArray.length][2];
            
            System.out.println("Количество точек для маршрута: " + pointsArray.length);
            
            for (int i = 0; i < pointsArray.length; i++) {
                String[] latLon = pointsArray[i].split(",");
                points[i][0] = Double.parseDouble(latLon[0]);
                points[i][1] = Double.parseDouble(latLon[1]);
                System.out.println("Точка " + (i+1) + ": [" + points[i][0] + ", " + points[i][1] + "]");
            }
            
            JSONObject routeResponse = routingService.getThematicRoute(points, profile);
            
            if (routeResponse != null) {
                System.out.println("Успешно получен тематический маршрут");
                return ResponseEntity.ok(routeResponse.toString());
            } else {
                System.err.println("Ошибка: routingService.getThematicRoute вернул null");
                return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR)
                        .body("{\"error\": \"Error calculating thematic route\"}");
            }
        } catch (Exception e) {
            System.err.println("Ошибка при построении тематического маршрута: " + e.getMessage());
            e.printStackTrace();
            return ResponseEntity.status(HttpStatus.BAD_REQUEST)
                    .body("{\"error\": \"Invalid points format or route calculation error: " + e.getMessage() + "\"}");
        }
    }

    @GetMapping("/pois")
    public ResponseEntity<List<PointOfInterest>> getPoisByType(
            @RequestParam List<String> types) {
        try {
            System.out.println("Получен запрос на POI с типами: " + types);
            
            // Используем прямой SQL запрос вместо JPA репозитория
            List<PointOfInterest> pois = getPointsOfInterestByTypes(types);
            
            System.out.println("Найдено POI: " + (pois != null ? pois.size() : "null"));
            return ResponseEntity.ok(pois);
        } catch (Exception e) {
            System.err.println("Error fetching POIs by type: " + e.getMessage());
            e.printStackTrace();
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR).body(null);
        }
    }
    
    /**
     * Получает точки интереса по их типам напрямую из базы данных
     */
    private List<PointOfInterest> getPointsOfInterestByTypes(List<String> types) throws Exception {
        List<PointOfInterest> result = new ArrayList<>();
        
        if (types == null || types.isEmpty()) {
            return result;
        }
        
        // Формируем SQL запрос с параметрами для IN клаузы
        StringBuilder sql = new StringBuilder(
            "SELECT id, name, type, rating, ST_X(location::geometry) as longitude, " +
            "ST_Y(location::geometry) as latitude, place_id, vicinity, address, photo_url " +
            "FROM points_of_interest WHERE type IN ("
        );
        
        for (int i = 0; i < types.size(); i++) {
            sql.append(i > 0 ? ", ?" : "?");
        }
        sql.append(")");
        
        try (Connection conn = DatabaseHelper.getConnection();
             PreparedStatement pstmt = conn.prepareStatement(sql.toString())) {
            
            // Устанавливаем параметры для IN клаузы
            for (int i = 0; i < types.size(); i++) {
                pstmt.setString(i + 1, types.get(i));
            }
            
            try (ResultSet rs = pstmt.executeQuery()) {
                while (rs.next()) {
                    PointOfInterest poi = new PointOfInterest(
                        rs.getString("name"),
                        rs.getString("type"),
                        rs.getDouble("rating"),
                        rs.getDouble("latitude"),
                        rs.getDouble("longitude"),
                        rs.getString("place_id")
                    );
                    poi.setId(rs.getLong("id"));
                    
                    // Дополнительные поля, если они есть
                    try {
                        String vicinity = rs.getString("vicinity");
                        if (vicinity != null && !vicinity.isEmpty()) {
                            poi.setVicinity(vicinity);
                        }
                    } catch (SQLException e) {
                        // Игнорируем ошибку, если колонки нет
                    }
                    
                    try {
                        String address = rs.getString("address");
                        if (address != null && !address.isEmpty()) {
                            poi.setAddress(address);
                        }
                    } catch (SQLException e) {
                        // Игнорируем ошибку, если колонки нет
                    }
                    
                    try {
                        String photoUrl = rs.getString("photo_url");
                        if (photoUrl != null && !photoUrl.isEmpty()) {
                            System.out.println("Получен photo_url для " + poi.getName() + ": " + photoUrl);
                            poi.setPhotoUrl(photoUrl);
                        }
                    } catch (SQLException e) {
                        // Игнорируем ошибку, если колонки нет
                        System.err.println("Ошибка при получении photo_url: " + e.getMessage());
                    }
                    
                    result.add(poi);
                }
            }
        }
        
        return result;
    }

    @GetMapping("/heatmap-data")
    public ResponseEntity<Map<String, Object>> getHeatmapData(
            @RequestParam String type,
            @RequestParam(required = false, defaultValue = "rating") String metric) {
        try {
            System.out.println("Запрос тепловой карты для типа: " + type + ", метрика: " + metric);

            // Получаем POI выбранного типа
            List<PointOfInterest> pois = getPointsOfInterestByTypes(Collections.singletonList(type));
            
            System.out.println("Получено POI для тепловой карты: " + pois.size());
            
            // Проверка данных
            if (pois.isEmpty()) {
                System.err.println("Ошибка: нет данных для тепловой карты типа " + type);
                Map<String, Object> errorResult = new HashMap<>();
                errorResult.put("error", "No data available for heatmap");
                errorResult.put("points", new ArrayList<>());
                return ResponseEntity.ok(errorResult);
            }
            
            // Проверяем данные
            boolean hasRating = false;
            double totalRating = 0;
            
            for (PointOfInterest poi : pois.subList(0, Math.min(pois.size(), 10))) {
                System.out.println("Пример POI: id=" + poi.getId() + 
                                 ", name=" + poi.getName() + 
                                 ", lat=" + poi.getLatitude() + 
                                 ", lng=" + poi.getLongitude() +
                                 ", rating=" + poi.getRating());
                if (poi.getRating() != null && poi.getRating() > 0) {
                    hasRating = true;
                    totalRating += poi.getRating();
                }
            }
            
            if ("rating".equals(metric) && !hasRating) {
                System.err.println("Предупреждение: нет данных о рейтинге для тепловой карты типа " + type);
                // Можем переключиться на density
                metric = "density";
                System.out.println("Переключение на метрику density");
            }
            
            if (hasRating && pois.size() >= 10) {
                System.out.println("Средний рейтинг (первые 10 точек): " + (totalRating / Math.min(pois.size(), 10)));
            }
            
            // Загружаем границы города
            // Исправляем путь для обеспечения независимости от текущей директории
            Path path = Paths.get(System.getProperty("user.dir"), "src", "main", "java", "com", "mapmaker", "data", "vitebsk.geojson");
            if (!Files.exists(path)) {
                System.err.println("Файл границ города не найден по пути: " + path);
                throw new FileNotFoundException("Файл границ города не найден: " + path);
            }
            System.out.println("Файл границ города найден: " + path);
            String geojsonStr = Files.readString(path);
            JSONObject geojson = new JSONObject(geojsonStr);
            
            // Получаем координаты границы города (первый полигон)
            JSONArray coordinates = geojson.getJSONArray("features")
                .getJSONObject(0)
                .getJSONObject("geometry")
                .getJSONArray("coordinates")
                .getJSONArray(0)
                .getJSONArray(0);

            // Находим границы города для оптимизации
            double minLat = Double.MAX_VALUE;
            double maxLat = Double.MIN_VALUE;
            double minLng = Double.MAX_VALUE;
            double maxLng = Double.MIN_VALUE;
            
            // Создаем простую реализацию проверки точки внутри полигона
            List<Map<String, Double>> cityPolygon = new ArrayList<>();
                
            for (int i = 0; i < coordinates.length(); i++) {
                JSONArray point = coordinates.getJSONArray(i);
                double lng = point.getDouble(0);
                double lat = point.getDouble(1);
                
                Map<String, Double> coordMap = new HashMap<>();
                coordMap.put("lat", lat);
                coordMap.put("lng", lng);
                cityPolygon.add(coordMap);
                
                minLat = Math.min(minLat, lat);
                maxLat = Math.max(maxLat, lat);
                minLng = Math.min(minLng, lng);
                maxLng = Math.max(maxLng, lng);
            }
            
            // Фильтруем точки: оставляем только те, что внутри границ города
            List<PointOfInterest> filteredPois = new ArrayList<>();
            for (PointOfInterest poi : pois) {
                if (isInBounds(poi.getLatitude(), poi.getLongitude(), minLat, maxLat, minLng, maxLng)) {
                    // Добавляем точку, если она находится внутри прямоугольника границ
                    // Для большей точности можно было бы проверять вхождение в полигон города
                    filteredPois.add(poi);
                }
            }
            
            System.out.println("Отфильтровано POI в границах города: " + filteredPois.size());
            
            // Преобразуем в формат для тепловой карты
            Map<String, Object> result = new HashMap<>();
            List<Map<String, Object>> points = new ArrayList<>();
            
            if ("density".equals(metric)) {
                // Для метрики плотности создаем сетку
                Map<String, Integer> grid = new HashMap<>();
                
                // Для разных типов мест используем разные размеры сетки
                double gridSize;
                switch(type) {
                    case "cafe":
                    case "restaurant":
                    case "bar":
                        gridSize = 0.0015; // Примерно 150 метров
                        break;
                    case "school":
                    case "hospital": 
                        gridSize = 0.003; // Примерно 300 метров
                        break;
                    default:
                        gridSize = 0.002; // Примерно 200 метров
                        break;
                }
                
                System.out.println("Используем размер сетки: " + gridSize + " для типа: " + type);
                
                // Создаем сетку и считаем количество точек в каждой ячейке
                for (PointOfInterest poi : filteredPois) {
                    // Округляем координаты до сетки
                    String gridKey = Math.round(poi.getLatitude() / gridSize) + ":" + 
                                    Math.round(poi.getLongitude() / gridSize);
                    grid.put(gridKey, grid.getOrDefault(gridKey, 0) + 1);
                }
                
                // Преобразуем сетку в точки для тепловой карты
                for (Map.Entry<String, Integer> cell : grid.entrySet()) {
                    String[] coords = cell.getKey().split(":");
                    double lat = Double.parseDouble(coords[0]) * gridSize;
                    double lng = Double.parseDouble(coords[1]) * gridSize;
                    
                    Map<String, Object> point = new HashMap<>();
                    point.put("lat", lat);
                    point.put("lng", lng);
                    point.put("value", cell.getValue()); // Количество точек в ячейке
                    points.add(point);
                }
                
                System.out.println("Создано " + points.size() + " точек для тепловой карты плотности");
            } else {
                // Для метрики рейтинга используем точки как есть
                for (PointOfInterest poi : filteredPois) {
                    Map<String, Object> point = new HashMap<>();
                    point.put("lat", poi.getLatitude());
                    point.put("lng", poi.getLongitude());
                    
                    double value = poi.getRating() != null ? poi.getRating() : 3.0; // По умолчанию средний рейтинг
                    point.put("value", value);
                    points.add(point);
                }
                
                System.out.println("Создано " + points.size() + " точек для тепловой карты рейтинга");
            }
            
            // Если точек слишком мало, используем метод интерполяции или выводим предупреждение
            if (points.size() < 5) {
                System.out.println("Предупреждение: недостаточно точек для построения качественной тепловой карты");
            }
            
            result.put("points", points);
            return ResponseEntity.ok(result);
        } catch (Exception e) {
            System.err.println("Ошибка при подготовке данных для тепловой карты: " + e.getMessage());
            e.printStackTrace();
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR).body(null);
        }
    }
    
    /**
     * Проверяет, находится ли точка в заданных границах
     */
    private boolean isInBounds(double lat, double lng, double minLat, double maxLat, double minLng, double maxLng) {
        return lat >= minLat && lat <= maxLat && lng >= minLng && lng <= maxLng;
    }

    @GetMapping("/city-boundary")
    public ResponseEntity<List<Map<String, Double>>> getCityBoundary(
            @RequestParam(required = false, defaultValue = "Витебск") String cityName) {
        try {
            // Исправляем путь для обеспечения независимости от текущей директории
            File osmFile = new File(System.getProperty("user.dir"), 
                    "src/main/java/com/mapmaker/data/vitebskaya.pbf");
            
            if (!osmFile.exists()) {
                System.err.println("Файл OSM не найден по пути: " + osmFile.getAbsolutePath());
                throw new FileNotFoundException("Файл OSM не найден: " + osmFile.getAbsolutePath());
            }
            
            System.out.println("Файл OSM найден: " + osmFile.getAbsolutePath());
            
            // Получаем границы города из OSM файла
            List<Map<String, Double>> boundary = osmBoundaryExtractor.getCityBoundary(osmFile, cityName);
            
            if (boundary != null && !boundary.isEmpty()) {
                return ResponseEntity.ok(boundary);
            } else {
                return ResponseEntity.noContent().build();
            }
        } catch (Exception e) {
            System.err.println("Ошибка при получении границы города: " + e.getMessage());
            e.printStackTrace();
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR).body(null);
        }
    }

    @GetMapping("/vitebsk-geojson")
    public ResponseEntity<String> getVitebskGeoJson() throws IOException {
        // Исправляем путь для обеспечения независимости от текущей директории
        Path path = Paths.get(System.getProperty("user.dir"), "src", "main", "java", "com", "mapmaker", "data", "vitebsk.geojson");
        if (!Files.exists(path)) {
            System.err.println("Файл границ города не найден по пути: " + path);
            throw new FileNotFoundException("Файл границ города не найден: " + path);
        }
        System.out.println("Файл границ города найден: " + path);
        String geojson = Files.readString(path);
        return ResponseEntity.ok().body(geojson);
    }

    /*
    @GetMapping("/stats/{type}")
    public Map<String, Integer> getStats(@PathVariable String type) {
        Map<String, Integer> stats = new HashMap<>();
        String sql = "SELECT type, COUNT(*) as count FROM points_of_interest WHERE type = ? GROUP BY type";
        try (Connection conn = DatabaseHelper.getConnection();
             PreparedStatement pstmt = conn.prepareStatement(sql)) {
            
            pstmt.setString(1, type);
            ResultSet rs = pstmt.executeQuery();
            
            if (rs.next()) {
                stats.put(rs.getString("type"), rs.getInt("count"));
            } else {
                 stats.put(type, 0);
            }
        } catch (SQLException e) {
            e.printStackTrace();
            return new HashMap<>();
        }
        return stats;
    }
    */
} 