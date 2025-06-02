package com.mapmaker.controller;

import com.mapmaker.model.RoutePoint;
import com.mapmaker.model.SavedRoute;
import com.mapmaker.model.PointOfInterest;
import com.mapmaker.service.SavedRouteService;
import com.mapmaker.service.UserService;
import org.json.JSONObject;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.ArrayList;
import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.stream.Collectors;

@RestController
@RequestMapping("/api/users/{userId}/routes")
public class SavedRouteController {

    private final SavedRouteService routeService;
    private final UserService userService;

    @Autowired
    public SavedRouteController(SavedRouteService routeService, UserService userService) {
        this.routeService = routeService;
        this.userService = userService;
    }

    @GetMapping
    public ResponseEntity<?> getUserRoutes(@PathVariable Long userId) {
        try {
            List<SavedRoute> routes = routeService.getUserRoutes(userId);
            
            // Преобразуем в формат, удобный для клиента
            List<Map<String, Object>> response = routes.stream()
                    .map(route -> {
                        Map<String, Object> map = new HashMap<>();
                        map.put("id", route.getId());
                        map.put("name", route.getName());
                        map.put("profile", route.getProfile());
                        map.put("distance", route.getDistance());
                        map.put("duration", route.getDuration());
                        map.put("createdAt", route.getCreatedAt().toString());
                        map.put("pointsCount", route.getPoints().size());
                        return map;
                    })
                    .collect(Collectors.toList());
            
            return ResponseEntity.ok(response);
        } catch (IllegalArgumentException e) {
            return ResponseEntity.badRequest().body(Map.of("error", e.getMessage()));
        } catch (Exception e) {
            return ResponseEntity.internalServerError()
                    .body(Map.of("error", "Произошла ошибка при получении маршрутов пользователя"));
        }
    }

    @GetMapping("/{routeId}")
    public ResponseEntity<?> getRouteById(@PathVariable Long userId, @PathVariable Long routeId) {
        try {
            return routeService.getRouteById(routeId)
                    .map(route -> {
                        // Проверяем, принадлежит ли маршрут пользователю
                        if (!route.getUser().getId().equals(userId)) {
                            return ResponseEntity.status(403)
                                    .body(Map.of("error", "Маршрут не принадлежит пользователю"));
                        }
                        
                        // Преобразуем в формат, удобный для клиента
                        Map<String, Object> response = new HashMap<>();
                        response.put("id", route.getId());
                        response.put("name", route.getName());
                        response.put("profile", route.getProfile());
                        response.put("distance", route.getDistance());
                        response.put("duration", route.getDuration());
                        response.put("createdAt", route.getCreatedAt().toString());
                        response.put("routeData", route.getRouteData());
                        
                        // Преобразуем точки маршрута
                        List<Map<String, Object>> points = route.getPoints().stream()
                                .sorted((p1, p2) -> Integer.compare(p1.getSequenceOrder(), p2.getSequenceOrder()))
                                .map(point -> {
                                    Map<String, Object> pointMap = new HashMap<>();
                                    pointMap.put("id", point.getId());
                                    
                                    // Добавляем координаты в обоих форматах для совместимости
                                    pointMap.put("latitude", point.getLatitude());
                                    pointMap.put("longitude", point.getLongitude());
                                    pointMap.put("lat", point.getLatitude());
                                    pointMap.put("lng", point.getLongitude());
                                    
                                    pointMap.put("name", point.getName());
                                    pointMap.put("type", point.getType());
                                    pointMap.put("rating", point.getRating());
                                    pointMap.put("order", point.getSequenceOrder());
                                    pointMap.put("photoUrl", point.getPhotoUrl());
                                    return pointMap;
                                })
                                .collect(Collectors.toList());
                        
                        response.put("points", points);
                        
                        return ResponseEntity.ok(response);
                    })
                    .orElse(ResponseEntity.notFound().build());
        } catch (Exception e) {
            e.printStackTrace(); // Для отладки
            return ResponseEntity.internalServerError()
                    .body(Map.of("error", "Произошла ошибка при получении маршрута: " + e.getMessage()));
        }
    }

    @PostMapping
    public ResponseEntity<?> saveRoute(@PathVariable Long userId, @RequestBody Map<String, Object> request) {
        try {
            String name = (String) request.get("name");
            String profile = (String) request.get("profile");
            
            // Добавляем проверки на null для числовых значений
            double distance = 0.0;
            if (request.get("distance") != null) {
                distance = ((Number) request.get("distance")).doubleValue();
            }
            
            int duration = 0;
            if (request.get("duration") != null) {
                duration = ((Number) request.get("duration")).intValue();
            }
            
            String routeData = request.get("routeData") != null ? request.get("routeData").toString() : "{}";
            
            @SuppressWarnings("unchecked")
            List<Map<String, Object>> pointsData = (List<Map<String, Object>>) request.get("pointsData");
            
            if (pointsData == null) {
                // Если pointsData не передан, проверяем наличие поля points
                @SuppressWarnings("unchecked")
                List<Map<String, Object>> points = (List<Map<String, Object>>) request.get("points");
                if (points != null) {
                    pointsData = points;
                } else {
                    pointsData = new ArrayList<>();
                }
            }
            
            // Преобразуем формат точек, если нужно
            List<Map<String, Object>> normalizedPoints = new ArrayList<>();
            for (Map<String, Object> point : pointsData) {
                if (point == null) continue; // Пропускаем null-точки
                
                Map<String, Object> normalizedPoint = new HashMap<>();
                
                // Проверяем и преобразуем координаты с безопасной обработкой null
                if (point.containsKey("latitude") && point.get("latitude") != null) {
                    normalizedPoint.put("latitude", ((Number) point.get("latitude")).doubleValue());
                } else if (point.containsKey("lat") && point.get("lat") != null) {
                    normalizedPoint.put("latitude", ((Number) point.get("lat")).doubleValue());
                } else {
                    // Если координаты отсутствуют, пропускаем точку
                    continue;
                }
                
                if (point.containsKey("longitude") && point.get("longitude") != null) {
                    normalizedPoint.put("longitude", ((Number) point.get("longitude")).doubleValue());
                } else if (point.containsKey("lng") && point.get("lng") != null) {
                    normalizedPoint.put("longitude", ((Number) point.get("lng")).doubleValue());
                } else {
                    // Если координаты отсутствуют, пропускаем точку
                    continue;
                }
                
                // Копируем остальные поля с безопасной обработкой null
                normalizedPoint.put("name", point.get("name"));
                normalizedPoint.put("type", point.get("type"));
                
                // Безопасная обработка рейтинга
                if (point.containsKey("rating") && point.get("rating") != null) {
                    try {
                        normalizedPoint.put("rating", ((Number) point.get("rating")).doubleValue());
                    } catch (ClassCastException e) {
                        // Если рейтинг не является числом, игнорируем его
                    }
                }
                
                // Безопасная обработка порядка следования
                if (point.containsKey("sequenceOrder") && point.get("sequenceOrder") != null) {
                    try {
                        normalizedPoint.put("sequenceOrder", ((Number) point.get("sequenceOrder")).intValue());
                    } catch (ClassCastException e) {
                        // Если sequenceOrder не является числом, используем индекс
                        normalizedPoint.put("sequenceOrder", normalizedPoints.size());
                    }
                } else {
                    // Если порядок не указан, используем индекс в массиве
                    normalizedPoint.put("sequenceOrder", normalizedPoints.size());
                }
                
                normalizedPoints.add(normalizedPoint);
            }
            
            // Проверяем наличие точек
            if (normalizedPoints.isEmpty()) {
                return ResponseEntity.badRequest().body(Map.of("error", "Маршрут должен содержать хотя бы одну точку"));
            }
            
            // Сохраняем маршрут
            SavedRoute route = routeService.saveRoute(userId, name, profile, distance, duration, routeData, normalizedPoints);
            
            // Преобразуем в формат ответа
            Map<String, Object> response = new HashMap<>();
            response.put("id", route.getId());
            response.put("name", route.getName());
            response.put("profile", route.getProfile());
            response.put("distance", route.getDistance());
            response.put("duration", route.getDuration());
            response.put("pointsCount", route.getPoints().size());
            
            return ResponseEntity.ok(response);
        } catch (IllegalArgumentException e) {
            return ResponseEntity.badRequest().body(Map.of("error", e.getMessage()));
        } catch (Exception e) {
            e.printStackTrace(); // Для отладки
            return ResponseEntity.internalServerError()
                    .body(Map.of("error", "Произошла ошибка при сохранении маршрута: " + e.getMessage()));
        }
    }

    @PostMapping("/from-json")
    public ResponseEntity<?> saveRouteFromJson(@PathVariable Long userId, @RequestBody Map<String, Object> request) {
        try {
            String name = (String) request.get("name");
            String routeJsonStr = request.get("routeJson").toString();
            
            // Преобразуем строку JSON в объект JSONObject
            JSONObject routeJson = new JSONObject(routeJsonStr);
            
            // Сохраняем маршрут
            SavedRoute route = routeService.saveRouteFromJson(userId, name, routeJson);
            
            // Преобразуем в формат ответа
            Map<String, Object> response = new HashMap<>();
            response.put("id", route.getId());
            response.put("name", route.getName());
            response.put("profile", route.getProfile());
            response.put("distance", route.getDistance());
            response.put("duration", route.getDuration());
            response.put("pointsCount", route.getPoints().size());
            
            return ResponseEntity.ok(response);
        } catch (IllegalArgumentException e) {
            return ResponseEntity.badRequest().body(Map.of("error", e.getMessage()));
        } catch (Exception e) {
            return ResponseEntity.internalServerError()
                    .body(Map.of("error", "Произошла ошибка при сохранении маршрута: " + e.getMessage()));
        }
    }

    @DeleteMapping("/{routeId}")
    public ResponseEntity<?> deleteRoute(@PathVariable Long userId, @PathVariable Long routeId) {
        try {
            routeService.deleteRoute(routeId, userId);
            return ResponseEntity.ok(Map.of("message", "Маршрут успешно удален"));
        } catch (IllegalArgumentException e) {
            return ResponseEntity.badRequest().body(Map.of("error", e.getMessage()));
        } catch (Exception e) {
            return ResponseEntity.internalServerError()
                    .body(Map.of("error", "Произошла ошибка при удалении маршрута"));
        }
    }

    @DeleteMapping
    public ResponseEntity<?> deleteAllRoutes(@PathVariable Long userId) {
        try {
            routeService.deleteAllUserRoutes(userId);
            return ResponseEntity.ok(Map.of("message", "Все маршруты успешно удалены"));
        } catch (IllegalArgumentException e) {
            return ResponseEntity.badRequest().body(Map.of("error", e.getMessage()));
        } catch (Exception e) {
            return ResponseEntity.internalServerError()
                    .body(Map.of("error", "Произошла ошибка при удалении маршрутов"));
        }
    }
} 