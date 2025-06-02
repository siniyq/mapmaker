package com.mapmaker.service;

import com.mapmaker.model.RoutePoint;
import com.mapmaker.model.SavedRoute;
import com.mapmaker.model.User;
import com.mapmaker.repository.SavedRouteRepository;
import com.mapmaker.repository.UserRepository;
import org.json.JSONArray;
import org.json.JSONObject;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.ArrayList;
import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.Optional;

@Service
public class SavedRouteService {

    private final SavedRouteRepository routeRepository;
    private final UserRepository userRepository;

    @Autowired
    public SavedRouteService(SavedRouteRepository routeRepository, UserRepository userRepository) {
        this.routeRepository = routeRepository;
        this.userRepository = userRepository;
    }

    /**
     * Сохранение маршрута для пользователя
     */
    @Transactional
    public SavedRoute saveRoute(Long userId, String name, String profile, double distance, int duration, 
                               String routeData, List<Map<String, Object>> pointsData) {
        
        User user = userRepository.findById(userId)
                .orElseThrow(() -> new IllegalArgumentException("Пользователь не найден"));
        
        // Создаем маршрут
        SavedRoute route = new SavedRoute();
        route.setUser(user);
        route.setName(name);
        route.setProfile(profile);
        route.setDistance(distance);
        route.setDuration(duration);
        route.setRouteData(routeData);
        
        // Сохраняем маршрут для получения ID
        route = routeRepository.save(route);
        
        // Добавляем точки маршрута
        if (pointsData != null && !pointsData.isEmpty()) {
            int order = 0;
            for (Map<String, Object> pointData : pointsData) {
                if (pointData == null) continue;
                
                RoutePoint point = new RoutePoint();
                point.setRoute(route);
                
                // Проверяем наличие координат - поддерживаем оба варианта названий
                Double latitude = null;
                if (pointData.containsKey("latitude")) {
                    Object latObj = pointData.get("latitude");
                    if (latObj instanceof Number) {
                        latitude = ((Number) latObj).doubleValue();
                    }
                } else if (pointData.containsKey("lat")) {
                    Object latObj = pointData.get("lat");
                    if (latObj instanceof Number) {
                        latitude = ((Number) latObj).doubleValue();
                    }
                }
                
                Double longitude = null;
                if (pointData.containsKey("longitude")) {
                    Object lngObj = pointData.get("longitude");
                    if (lngObj instanceof Number) {
                        longitude = ((Number) lngObj).doubleValue();
                    }
                } else if (pointData.containsKey("lng")) {
                    Object lngObj = pointData.get("lng");
                    if (lngObj instanceof Number) {
                        longitude = ((Number) lngObj).doubleValue();
                    }
                }
                
                // Пропускаем точку, если координаты не заданы
                if (latitude == null || longitude == null) {
                    continue;
                }
                
                point.setLatitude(latitude);
                point.setLongitude(longitude);
                
                // Устанавливаем имя и тип
                point.setName(pointData.get("name") != null ? pointData.get("name").toString() : "Точка " + (order + 1));
                point.setType(pointData.get("type") != null ? pointData.get("type").toString() : "waypoint");
                
                // Безопасно устанавливаем рейтинг
                if (pointData.containsKey("rating")) {
                    Object rating = pointData.get("rating");
                    if (rating instanceof Number) {
                        point.setRating(((Number) rating).doubleValue());
                    }
                }
                
                // Устанавливаем URL фотографии, если есть
                if (pointData.containsKey("photoUrl")) {
                    Object photoUrl = pointData.get("photoUrl");
                    if (photoUrl != null) {
                        point.setPhotoUrl(photoUrl.toString());
                    }
                }
                
                // Устанавливаем порядковый номер
                if (pointData.containsKey("sequenceOrder")) {
                    Object seqOrder = pointData.get("sequenceOrder");
                    if (seqOrder instanceof Number) {
                        point.setSequenceOrder(((Number) seqOrder).intValue());
                    } else {
                        point.setSequenceOrder(order);
                    }
                } else {
                    point.setSequenceOrder(order);
                }
                
                route.addPoint(point);
                order++;
            }
            
            // Сохраняем обновленный маршрут с точками
            route = routeRepository.save(route);
        }
        
        return route;
    }

    /**
     * Сохранение маршрута из JSON данных
     */
    @Transactional
    public SavedRoute saveRouteFromJson(Long userId, String name, JSONObject routeJson) {
        try {
        // Извлекаем данные маршрута из JSON
        String profile = routeJson.optString("profile", "foot");
        
        JSONArray paths = routeJson.optJSONArray("paths");
        if (paths == null || paths.length() == 0) {
            throw new IllegalArgumentException("Некорректные данные маршрута: отсутствуют paths");
        }
        
        JSONObject path = paths.getJSONObject(0);
        double distance = path.optDouble("distance", 0) / 1000.0; // переводим в км
        int duration = (int) (path.optLong("time", 0) / 60000); // переводим в минуты
        
        // Извлекаем данные о точках
        List<Map<String, Object>> pointsData = new ArrayList<>();
            
            // Сначала проверяем points в формате объекта с координатами
        JSONObject pointsJson = routeJson.optJSONObject("points");
        if (pointsJson != null && pointsJson.has("coordinates")) {
            JSONArray coordinates = pointsJson.getJSONArray("coordinates");
            for (int i = 0; i < coordinates.length(); i++) {
                    try {
                JSONArray point = coordinates.getJSONArray(i);
                double lng = point.getDouble(0);
                double lat = point.getDouble(1);
                
                pointsData.add(Map.of(
                            "latitude", lat,
                            "longitude", lng,
                            "name", "Точка " + (i + 1),
                            "type", "waypoint",
                            "sequenceOrder", i
                        ));
                    } catch (Exception e) {
                        // Пропускаем некорректные точки
                        System.err.println("Ошибка при обработке точки маршрута: " + e.getMessage());
                    }
                }
            } 
            // Проверяем наличие массива точек
            else if (routeJson.has("points") && routeJson.get("points") instanceof JSONArray) {
                JSONArray pointsArray = routeJson.getJSONArray("points");
                for (int i = 0; i < pointsArray.length(); i++) {
                    try {
                        Object pointObj = pointsArray.get(i);
                        if (pointObj instanceof JSONArray) {
                            // Формат [lat, lng]
                            JSONArray point = (JSONArray) pointObj;
                            if (point.length() >= 2) {
                                double lat = point.getDouble(0);
                                double lng = point.getDouble(1);
                                
                                pointsData.add(Map.of(
                                    "latitude", lat,
                                    "longitude", lng,
                    "name", "Точка " + (i + 1),
                                    "type", "waypoint",
                                    "sequenceOrder", i
                ));
            }
                        } else if (pointObj instanceof JSONObject) {
                            // Формат {lat, lng, ...}
                            JSONObject point = (JSONObject) pointObj;
                            double lat = 0, lng = 0;
                            
                            if (point.has("lat")) {
                                lat = point.getDouble("lat");
                            } else if (point.has("latitude")) {
                                lat = point.getDouble("latitude");
                            } else {
                                continue; // Пропускаем точку без широты
                            }
                            
                            if (point.has("lng")) {
                                lng = point.getDouble("lng");
                            } else if (point.has("longitude")) {
                                lng = point.getDouble("longitude");
                            } else {
                                continue; // Пропускаем точку без долготы
                            }
                            
                            // Создаем Map с полями для точки
                            Map<String, Object> pointMap = new HashMap<>();
                            pointMap.put("latitude", lat);
                            pointMap.put("longitude", lng);
                            pointMap.put("name", point.optString("name", "Точка " + (i + 1)));
                            pointMap.put("type", point.optString("type", "waypoint"));
                            pointMap.put("sequenceOrder", i);
                            
                            if (point.has("rating")) {
                                pointMap.put("rating", point.optDouble("rating"));
                            }
                            
                            // Добавляем URL фотографии, если есть
                            if (point.has("photoUrl")) {
                                pointMap.put("photoUrl", point.optString("photoUrl"));
                            }
                            
                            pointsData.add(pointMap);
                        }
                    } catch (Exception e) {
                        // Пропускаем некорректные точки
                        System.err.println("Ошибка при обработке точки маршрута: " + e.getMessage());
                    }
                }
            }
            
            // Проверяем, есть ли хотя бы одна точка
            if (pointsData.isEmpty()) {
                throw new IllegalArgumentException("Маршрут не содержит точек");
        }
        
        // Сохраняем маршрут
        return saveRoute(userId, name, profile, distance, duration, routeJson.toString(), pointsData);
        } catch (Exception e) {
            throw new IllegalArgumentException("Ошибка при обработке JSON маршрута: " + e.getMessage(), e);
        }
    }

    /**
     * Получение всех маршрутов пользователя
     */
    public List<SavedRoute> getUserRoutes(Long userId) {
        User user = userRepository.findById(userId)
                .orElseThrow(() -> new IllegalArgumentException("Пользователь не найден"));
        
        return routeRepository.findByUserOrderByCreatedAtDesc(user);
    }

    /**
     * Получение маршрута по ID
     */
    public Optional<SavedRoute> getRouteById(Long routeId) {
        return routeRepository.findById(routeId);
    }

    /**
     * Удаление маршрута
     */
    @Transactional
    public void deleteRoute(Long routeId, Long userId) {
        SavedRoute route = routeRepository.findById(routeId)
                .orElseThrow(() -> new IllegalArgumentException("Маршрут не найден"));
        
        // Проверяем, принадлежит ли маршрут пользователю
        if (!route.getUser().getId().equals(userId)) {
            throw new IllegalArgumentException("Маршрут не принадлежит пользователю");
        }
        
        routeRepository.delete(route);
    }

    /**
     * Удаление всех маршрутов пользователя
     */
    @Transactional
    public void deleteAllUserRoutes(Long userId) {
        User user = userRepository.findById(userId)
                .orElseThrow(() -> new IllegalArgumentException("Пользователь не найден"));
        
        routeRepository.deleteByUser(user);
    }
} 