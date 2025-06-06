package com.mapmaker.service;

import com.graphhopper.GHRequest;
import com.graphhopper.GHResponse;
import com.graphhopper.GraphHopper;
import com.graphhopper.ResponsePath;
import com.graphhopper.util.PointList;
import org.json.JSONArray;
import org.json.JSONObject;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.context.annotation.Profile;
import org.springframework.stereotype.Service;

import javax.annotation.PostConstruct;
import java.util.Locale;

/**
 * Локальный сервис роутинга использующий GraphHopper без API
 */
@Service
@Profile("!test")
public class LocalRoutingService {

    @Autowired
    private GraphHopper graphHopper;

    private boolean isInitialized = false;

    @PostConstruct
    public void init() {
        System.out.println("Инициализация локального GraphHopper...");
        try {
            // Импорт/загрузка OSM данных
            graphHopper.importOrLoad();
            isInitialized = true;
            System.out.println("GraphHopper успешно инициализирован!");
        } catch (Exception e) {
            System.err.println("Ошибка инициализации GraphHopper: " + e.getMessage());
            e.printStackTrace();
        }
    }

    /**
     * Рассчитывает маршрут между двумя точками локально
     */
    public JSONObject getRoute(double startLat, double startLon, double endLat, double endLon, String profile) {
        if (!isInitialized) {
            System.err.println("GraphHopper не инициализирован");
            return createErrorResponse("GraphHopper не инициализирован");
        }

        try {
            // Преобразуем profile в соответствии с нашими настройками
            String ghProfile = mapProfile(profile);

            GHRequest request = new GHRequest(startLat, startLon, endLat, endLon)
                    .setProfile(ghProfile)
                    .setLocale(Locale.forLanguageTag("ru"));

            GHResponse response = graphHopper.route(request);

            if (response.hasErrors()) {
                System.err.println("Ошибки GraphHopper: " + response.getErrors());
                return createErrorResponse("Ошибка построения маршрута: " + response.getErrors().toString());
            }

            // Конвертируем ответ в наш JSON формат
            return convertToJSON(response);

        } catch (Exception e) {
            System.err.println("Ошибка при расчете маршрута: " + e.getMessage());
            e.printStackTrace();
            return createErrorResponse("Внутренняя ошибка: " + e.getMessage());
        }
    }

    /**
     * Строит тематический маршрут через несколько точек
     */
    public JSONObject getThematicRoute(double[][] points, String profile) {
        if (!isInitialized) {
            return createErrorResponse("GraphHopper не инициализирован");
        }

        if (points == null || points.length < 2) {
            return createErrorResponse("Недостаточно точек для построения маршрута");
        }

        try {
            String ghProfile = mapProfile(profile);
            JSONObject result = new JSONObject();
            JSONArray paths = new JSONArray();

            double totalDistance = 0;
            long totalTime = 0;
            JSONArray allCoordinates = new JSONArray();
            JSONArray allInstructions = new JSONArray();

            // Строим маршрут через все точки последовательно
            for (int i = 0; i < points.length - 1; i++) {
                double[] start = points[i];
                double[] end = points[i + 1];

                GHRequest request = new GHRequest(start[0], start[1], end[0], end[1])
                        .setProfile(ghProfile)
                        .setLocale(Locale.forLanguageTag("ru"));

                GHResponse response = graphHopper.route(request);

                if (response.hasErrors()) {
                    System.err.println("Ошибка сегмента " + (i+1) + ": " + response.getErrors());
                    continue;
                }

                ResponsePath path = response.getBest();
                totalDistance += path.getDistance();
                totalTime += path.getTime();

                // Добавляем координаты
                PointList pointList = path.getPoints();
                for (int j = (i == 0 ? 0 : 1); j < pointList.size(); j++) {
                    JSONArray coord = new JSONArray();
                    coord.put(pointList.getLon(j));
                    coord.put(pointList.getLat(j));
                    allCoordinates.put(coord);
                }

                // Добавляем инструкции
                path.getInstructions().forEach(instruction -> {
                    JSONObject instrObj = new JSONObject();
                    instrObj.put("text", instruction.getName());
                    instrObj.put("distance", instruction.getDistance());
                    instrObj.put("time", instruction.getTime());
                    allInstructions.put(instrObj);
                });
            }

            // Формируем результат
            JSONObject pathResult = new JSONObject();
            pathResult.put("distance", totalDistance);
            pathResult.put("time", totalTime);

            JSONObject points_obj = new JSONObject();
            points_obj.put("type", "LineString");
            points_obj.put("coordinates", allCoordinates);
            pathResult.put("points", points_obj);
            pathResult.put("instructions", allInstructions);

            paths.put(pathResult);
            result.put("paths", paths);

            System.out.println("Тематический маршрут построен: " + totalDistance + "м, " + (totalTime/1000/60) + " мин");
            return result;

        } catch (Exception e) {
            System.err.println("Ошибка при построении тематического маршрута: " + e.getMessage());
            e.printStackTrace();
            return createErrorResponse("Ошибка построения маршрута: " + e.getMessage());
        }
    }

    /**
     * Преобразует наши профили в профили GraphHopper
     */
    private String mapProfile(String profile) {
        switch (profile.toLowerCase()) {
            case "foot":
                return "foot";
            case "bike":
                return "bike";
            case "car":
                return "car";
            default:
                return "car";
        }
    }

    /**
     * Конвертирует ответ GraphHopper в наш JSON формат
     */
    private JSONObject convertToJSON(GHResponse response) {
        JSONObject result = new JSONObject();
        JSONArray paths = new JSONArray();

        ResponsePath path = response.getBest();
        JSONObject pathObj = new JSONObject();

        // Основная информация
        pathObj.put("distance", path.getDistance());
        pathObj.put("time", path.getTime());

        // Координаты маршрута
        PointList pointList = path.getPoints();
        JSONObject pointsObj = new JSONObject();
        pointsObj.put("type", "LineString");
        
        JSONArray coordinates = new JSONArray();
        for (int i = 0; i < pointList.size(); i++) {
            JSONArray coord = new JSONArray();
            coord.put(pointList.getLon(i));  // Долгота первая
            coord.put(pointList.getLat(i));  // Широта вторая
            coordinates.put(coord);
        }
        pointsObj.put("coordinates", coordinates);
        pathObj.put("points", pointsObj);

        // Инструкции навигации
        JSONArray instructions = new JSONArray();
        path.getInstructions().forEach(instruction -> {
            JSONObject instrObj = new JSONObject();
            instrObj.put("text", instruction.getName());
            instrObj.put("distance", instruction.getDistance());
            instrObj.put("time", instruction.getTime());
            instrObj.put("sign", instruction.getSign());
            instructions.put(instrObj);
        });
        pathObj.put("instructions", instructions);

        paths.put(pathObj);
        result.put("paths", paths);

        return result;
    }

    /**
     * Создает ответ с ошибкой
     */
    private JSONObject createErrorResponse(String message) {
        JSONObject error = new JSONObject();
        error.put("error", "local_routing_error");
        error.put("message", message);
        return error;
    }

    public boolean isReady() {
        return isInitialized;
    }
} 