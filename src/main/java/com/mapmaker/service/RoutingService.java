package com.mapmaker.service;

// import com.graphhopper.GHRequest; // Локальный GH больше не нужен
// import com.graphhopper.GHResponse;
// import com.graphhopper.GraphHopper;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;
import org.springframework.web.client.RestTemplate;
import org.springframework.web.util.UriComponentsBuilder;
import org.springframework.http.ResponseEntity;
import org.springframework.http.HttpStatus;

import org.json.JSONObject; // Для парсинга ответа API
import org.json.JSONArray;

@Service
public class RoutingService {

    // private final GraphHopper graphHopper; // Убираем локальный GH
    private final RestTemplate restTemplate;

    // Ключ API GraphHopper
    @Value("${graphhopper.api.key:219b0a47-70f9-4036-a2f0-14470b011033}")
    private String apiKey;

    // Внедряем RestTemplate (добавьте @Bean в основной класс приложения или конфигурацию)
    public RoutingService(RestTemplate restTemplate) {
        // this.graphHopper = graphHopper; // Убираем
        this.restTemplate = restTemplate;
    }

    private static final String DIRECTIONS_API_URL = "https://graphhopper.com/api/1/route";

    /**
     * Рассчитывает маршрут между двумя точками через GraphHopper Directions API.
     *
     * @param startLat Широта начальной точки
     * @param startLon Долгота начальной точки
     * @param endLat   Широта конечной точки
     * @param endLon   Долгота конечной точки
     * @param profile  Профиль маршрутизации ("foot", "bike", "car")
     * @return JSONObject, содержащий ответ от API (GeoJSON и другую информацию) или null при ошибке.
     */
    public JSONObject getRoute(double startLat, double startLon, double endLat, double endLon, String profile) {
        UriComponentsBuilder builder = UriComponentsBuilder.fromHttpUrl(DIRECTIONS_API_URL)
                .queryParam("point", startLat + "," + startLon)
                .queryParam("point", endLat + "," + endLon)
                .queryParam("profile", profile)
                .queryParam("points_encoded", "false") // Получаем координаты в виде [lon, lat]
                .queryParam("instructions", "true") // Получаем инструкции по маршруту
                .queryParam("calc_points", "true") // Получаем точки геометрии маршрута
                .queryParam("key", apiKey);

        try {
            ResponseEntity<String> response = restTemplate.getForEntity(builder.toUriString(), String.class);

            if (response.getStatusCode() == HttpStatus.OK && response.getBody() != null) {
                // Просто возвращаем тело ответа как JSONObject
                // Вы можете добавить более сложный парсинг, если нужно извлечь конкретные части
                return new JSONObject(response.getBody());
            } else {
                System.err.println("Error from GraphHopper API: " + response.getStatusCode() + " " + response.getBody());
                return null;
            }
        } catch (Exception e) {
            System.err.println("Error calling GraphHopper API: " + e.getMessage());
            e.printStackTrace();
            return null;
        }
    }
    
    /**
     * Строит тематический маршрут через несколько точек интереса.
     * Маршрут типа A -> B -> C -> ... -> A
     * 
     * @param points список точек в формате [[lat1,lon1], [lat2,lon2], ...]
     * @param profile профиль маршрутизации ("foot", "bike", "car")
     * @return JSONObject с маршрутом или null при ошибке
     */
    public JSONObject getThematicRoute(double[][] points, String profile) {
        if (points == null || points.length < 2) {
            System.err.println("Ошибка: недостаточно точек для построения маршрута");
            return null;
        }

        System.out.println("Построение тематического маршрута, точек: " + points.length);
        System.out.println("Используемый API-ключ GraphHopper: " + apiKey);

        // С бесплатным API-ключом у нас есть ограничения на количество точек (максимум 4-5)
        // и нет возможности использовать параметр optimize=true
        // Поэтому делаем несколько запросов и объединяем результаты

        JSONObject result = new JSONObject();
        JSONArray paths = new JSONArray();

        double totalDistance = 0;
        long totalTime = 0;

        try {
            // Перебираем точки парами и строим маршрут между каждой парой
            for (int i = 0; i < points.length - 1; i++) {
                double[] start = points[i];
                double[] end = points[i + 1];

                System.out.println("Строим сегмент " + (i+1) + " маршрута: [" + start[0] + "," + start[1] + "] -> [" + end[0] + "," + end[1] + "]");

                UriComponentsBuilder builder = UriComponentsBuilder.fromHttpUrl(DIRECTIONS_API_URL)
                    .queryParam("point", start[0] + "," + start[1])
                    .queryParam("point", end[0] + "," + end[1])
                    .queryParam("profile", profile)
                    .queryParam("points_encoded", "false")
                    .queryParam("instructions", "true")
                    .queryParam("calc_points", "true")
                    .queryParam("key", apiKey);

                String url = builder.toUriString();
                System.out.println("URL запроса GraphHopper для сегмента " + (i+1) + ": " + url);

                try {
                    ResponseEntity<String> response = restTemplate.getForEntity(url, String.class);

                    if (response.getStatusCode() == HttpStatus.OK && response.getBody() != null) {
                        JSONObject segmentResponse = new JSONObject(response.getBody());
                        JSONArray segmentPaths = segmentResponse.getJSONArray("paths");
                        
                        if (segmentPaths.length() > 0) {
                            JSONObject path = segmentPaths.getJSONObject(0);
                            totalDistance += path.getDouble("distance");
                            totalTime += path.getLong("time");
                            
                            // Для первого сегмента создаем основной path
                            if (i == 0) {
                                paths.put(path);
                                System.out.println("Первый сегмент маршрута создан, расстояние: " + path.getDouble("distance") + " м");
                            } 
                            // Для последующих сегментов - обновляем данные первого path
                            else {
                                JSONObject firstPath = paths.getJSONObject(0);
                                
                                // Обновляем points
                                if (path.has("points")) {
                                    JSONObject pointsObj = path.getJSONObject("points");
                                    JSONArray coords = pointsObj.getJSONArray("coordinates");
                                    
                                    // Пропускаем первую точку, чтобы избежать дублирования
                                    JSONObject firstPathPoints = firstPath.getJSONObject("points");
                                    JSONArray firstPathCoords = firstPathPoints.getJSONArray("coordinates");
                                    
                                    System.out.println("Добавляем " + (coords.length() - 1) + " координат сегмента " + (i+1) + " к маршруту");
                                    
                                    for (int j = 1; j < coords.length(); j++) {
                                        firstPathCoords.put(coords.get(j));
                                    }
                                } else {
                                    System.err.println("Предупреждение: сегмент " + (i+1) + " не содержит координат точек (points)");
                                }
                                
                                // Обновляем instructions, если нужно
                                if (path.has("instructions") && firstPath.has("instructions")) {
                                    JSONArray instructions = path.getJSONArray("instructions");
                                    JSONArray firstPathInstructions = firstPath.getJSONArray("instructions");
                                    
                                    // Пропускаем первую инструкцию, чтобы избежать дублирования
                                    for (int j = 1; j < instructions.length(); j++) {
                                        firstPathInstructions.put(instructions.get(j));
                                    }
                                } else {
                                    System.err.println("Предупреждение: сегмент " + (i+1) + " не содержит инструкций (instructions)");
                                }
                                
                                System.out.println("Сегмент " + (i+1) + " добавлен к маршруту, расстояние: " + path.getDouble("distance") + " м");
                            }
                        } else {
                            System.err.println("Ошибка: API вернул пустой массив paths для сегмента " + (i+1));
                        }
                    } else {
                        System.err.println("Ошибка от GraphHopper API для сегмента " + (i+1) + ": " + 
                                          response.getStatusCode() + " " + response.getBody());
                        throw new RuntimeException("Ошибка API: " + response.getStatusCode() + " " + response.getBody());
                    }
                } catch (Exception e) {
                    System.err.println("Ошибка при запросе к GraphHopper API для сегмента " + (i+1) + ": " + e.getMessage());
                    throw e; // Пробрасываем ошибку дальше для общей обработки
                }
            }
            
            // Если есть хотя бы один путь
            if (paths.length() > 0) {
                // Обновляем общие данные о маршруте
                JSONObject firstPath = paths.getJSONObject(0);
                firstPath.put("distance", totalDistance);
                firstPath.put("time", totalTime);
                
                // Формируем финальный ответ
                result.put("paths", paths);
                
                System.out.println("Маршрут успешно построен. Общее расстояние: " + totalDistance + " м, время: " + (totalTime / 1000 / 60) + " мин");
                return result;
            } else {
                System.err.println("Ошибка: не удалось построить ни один сегмент маршрута");
                return null;
            }
        } catch (Exception e) {
            System.err.println("Ошибка при построении тематического маршрута: " + e.getMessage());
            e.printStackTrace();
            return null;
        }
    }
} 