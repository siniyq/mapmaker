package com.mapmaker.service;

import org.json.JSONObject;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;

/**
 * Унифицированный сервис роутинга который может использовать либо API либо локальный GraphHopper
 */
@Service
public class UnifiedRoutingService {

    @Autowired
    private RoutingService apiRoutingService;
    
    @Autowired(required = false)
    private LocalRoutingService localRoutingService;

    @Value("${routing.mode:api}")
    private String routingMode;

    /**
     * Рассчитывает маршрут используя выбранный режим
     */
    public JSONObject getRoute(double startLat, double startLon, double endLat, double endLon, String profile) {
        System.out.println("Режим роутинга: " + routingMode);
        
        if ("local".equals(routingMode)) {
            if (localRoutingService != null && localRoutingService.isReady()) {
                System.out.println("Используем локальный GraphHopper");
                return localRoutingService.getRoute(startLat, startLon, endLat, endLon, profile);
            } else {
                System.err.println("ОШИБКА: Локальный GraphHopper не готов! Проверьте карту и настройки.");
                JSONObject error = new JSONObject();
                error.put("error", "local_graphhopper_not_ready");
                error.put("message", "Локальный GraphHopper не инициализирован. Проверьте файл карты maps/vitebskaya.pbf");
                return error;
            }
        } else {
            System.out.println("Используем GraphHopper API");
            return apiRoutingService.getRoute(startLat, startLon, endLat, endLon, profile);
        }
    }

    /**
     * Строит тематический маршрут используя выбранный режим
     */
    public JSONObject getThematicRoute(double[][] points, String profile) {
        System.out.println("Режим роутинга: " + routingMode);
        
        if ("local".equals(routingMode)) {
            if (localRoutingService != null && localRoutingService.isReady()) {
                System.out.println("Используем локальный GraphHopper для тематического маршрута");
                return localRoutingService.getThematicRoute(points, profile);
            } else {
                System.err.println("ОШИБКА: Локальный GraphHopper не готов для тематического маршрута!");
                JSONObject error = new JSONObject();
                error.put("error", "local_graphhopper_not_ready");
                error.put("message", "Локальный GraphHopper не инициализирован. Проверьте файл карты maps/vitebskaya.pbf");
                return error;
            }
        } else {
            System.out.println("Используем GraphHopper API для тематического маршрута");
            return apiRoutingService.getThematicRoute(points, profile);
        }
    }

    /**
     * Возвращает информацию о текущем режиме роутинга
     */
    public JSONObject getRoutingStatus() {
        JSONObject status = new JSONObject();
        status.put("mode", routingMode);
        
        if ("local".equals(routingMode)) {
            boolean isReady = localRoutingService != null && localRoutingService.isReady();
            status.put("local_ready", isReady);
            if (!isReady) {
                status.put("fallback_to_api", true);
            }
        }
        
        return status;
    }
} 