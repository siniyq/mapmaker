package com.mapmaker.service;

import org.json.JSONObject;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;

/**
 * Сервис роутинга использующий локальный GraphHopper
 */
@Service
public class UnifiedRoutingService {

    @Autowired
    private LocalRoutingService localRoutingService;

    /**
     * Рассчитывает маршрут используя локальный GraphHopper
     */
    public JSONObject getRoute(double startLat, double startLon, double endLat, double endLon, String profile) {
        System.out.println("Используем локальный GraphHopper");
        
        if (localRoutingService != null && localRoutingService.isReady()) {
            return localRoutingService.getRoute(startLat, startLon, endLat, endLon, profile);
        } else {
            System.err.println("ОШИБКА: Локальный GraphHopper не готов! Проверьте карту и настройки.");
            JSONObject error = new JSONObject();
            error.put("error", "local_graphhopper_not_ready");
            error.put("message", "Локальный GraphHopper не инициализирован. Проверьте файл карты maps/vitebskaya.pbf");
            return error;
        }
    }

    /**
     * Строит тематический маршрут используя локальный GraphHopper
     */
    public JSONObject getThematicRoute(double[][] points, String profile) {
        System.out.println("Используем локальный GraphHopper для тематического маршрута");
        
        if (localRoutingService != null && localRoutingService.isReady()) {
            return localRoutingService.getThematicRoute(points, profile);
        } else {
            System.err.println("ОШИБКА: Локальный GraphHopper не готов для тематического маршрута!");
            JSONObject error = new JSONObject();
            error.put("error", "local_graphhopper_not_ready");
            error.put("message", "Локальный GraphHopper не инициализирован. Проверьте файл карты maps/vitebskaya.pbf");
            return error;
        }
    }

    /**
     * Возвращает информацию о текущем режиме роутинга
     */
    public JSONObject getRoutingStatus() {
        JSONObject status = new JSONObject();
        status.put("mode", "local");
        
        boolean isReady = localRoutingService != null && localRoutingService.isReady();
        status.put("local_ready", isReady);
        
        return status;
    }
} 