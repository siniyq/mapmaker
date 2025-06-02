package com.mapmaker.util;

import java.io.File;
import java.io.FileInputStream;
import java.io.FileReader;
import java.io.IOException;
import java.util.ArrayList;
import java.util.HashMap;
import java.util.List;
import java.util.Map;

import org.springframework.stereotype.Component;
import org.json.JSONArray;
import org.json.JSONObject;
import org.json.JSONTokener;

import crosby.binary.osmosis.OsmosisReader;
import org.openstreetmap.osmosis.core.container.v0_6.EntityContainer;
import org.openstreetmap.osmosis.core.domain.v0_6.Entity;
import org.openstreetmap.osmosis.core.domain.v0_6.Node;
import org.openstreetmap.osmosis.core.domain.v0_6.Relation;
import org.openstreetmap.osmosis.core.domain.v0_6.RelationMember;
import org.openstreetmap.osmosis.core.domain.v0_6.Tag;
import org.openstreetmap.osmosis.core.domain.v0_6.Way;
import org.openstreetmap.osmosis.core.domain.v0_6.WayNode;
import org.openstreetmap.osmosis.core.task.v0_6.Sink;

/**
 * Утилита для извлечения границ города из OSM файла
 */
@Component
public class OsmBoundaryExtractor {

    /**
     * Извлекает полигон границы города из OSM файла
     * 
     * @param osmFile Путь к OSM PBF файлу
     * @param cityName Название города (например, "Витебск")
     * @return Список координат, образующих полигон границы города
     */
    public List<Map<String, Double>> getCityBoundary(File osmFile, String cityName) {
        // Проверяем, есть ли GeoJSON файл с границами города
        File geoJsonFile = new File("src/main/java/com/mapmaker/data/vitebsk.geojson");
        if (geoJsonFile.exists() && "Витебск".equalsIgnoreCase(cityName)) {
            System.out.println("Найден GeoJSON файл с границами города Витебск. Используем его.");
            return getCityBoundaryFromGeoJson(geoJsonFile);
        }
        
        // Если GeoJSON не найден или город не Витебск, пытаемся использовать PBF файл
        final List<Map<String, Double>> boundaryPoints = new ArrayList<>();
        
        try {
            System.out.println("Извлечение границы города " + cityName + " из OSM файла " + osmFile.getPath());
            
            FileInputStream fileInputStream = new FileInputStream(osmFile);
            BoundaryExtractorSink sink = new BoundaryExtractorSink(cityName);
            OsmosisReader reader = new OsmosisReader(fileInputStream);
            reader.setSink(sink);
            reader.run();
            
            boundaryPoints.addAll(sink.getBoundaryPoints());
            
            System.out.println("Извлечено точек границы: " + boundaryPoints.size());
            
            fileInputStream.close();
            
        } catch (Exception e) {
            System.err.println("Ошибка при извлечении границы города: " + e.getMessage());
            e.printStackTrace();
        }
        
        // Если не удалось извлечь границы из файла, используем запасные координаты
        if (boundaryPoints.isEmpty()) {
            System.out.println("Используем запасные координаты границы для города " + cityName);
            
            if ("Витебск".equalsIgnoreCase(cityName)) {
                // Заготовленные координаты границы Витебска
                boundaryPoints.add(Map.of("lat", 55.16945649211022, "lng", 30.297546386718754));
                boundaryPoints.add(Map.of("lat", 55.14964656185613, "lng", 30.224418640136722));
                boundaryPoints.add(Map.of("lat", 55.12663704654494, "lng", 30.16751289367676));
                boundaryPoints.add(Map.of("lat", 55.16278890138967, "lng", 30.11232376098633));
                boundaryPoints.add(Map.of("lat", 55.224519491662974, "lng", 30.11283874511719));
                boundaryPoints.add(Map.of("lat", 55.24605367311376, "lng", 30.280723571777347));
                
                System.out.println("Использовано запасных точек границы: " + boundaryPoints.size());
            } else {
                System.err.println("Нет запасных координат для города: " + cityName);
            }
        }
        
        return boundaryPoints;
    }
    
    /**
     * Извлекает полигон границы города из GeoJSON файла
     * 
     * @param geoJsonFile Файл GeoJSON с границами города
     * @return Список координат, образующих полигон границы города
     */
    private List<Map<String, Double>> getCityBoundaryFromGeoJson(File geoJsonFile) {
        List<Map<String, Double>> boundaryPoints = new ArrayList<>();
        
        try (FileReader reader = new FileReader(geoJsonFile)) {
            JSONTokener tokener = new JSONTokener(reader);
            JSONObject geoJson = new JSONObject(tokener);
            
            // Получаем первую фичу из коллекции (предполагается, что там только одна - граница города)
            JSONArray features = geoJson.getJSONArray("features");
            if (features.length() > 0) {
                JSONObject feature = features.getJSONObject(0);
                JSONObject geometry = feature.getJSONObject("geometry");
                
                // Проверяем, что это MultiPolygon
                if ("MultiPolygon".equals(geometry.getString("type"))) {
                    // Получаем массив координат полигона (берем первый полигон и его внешний контур)
                    JSONArray coordinates = geometry.getJSONArray("coordinates")
                            .getJSONArray(0)  // Первый полигон
                            .getJSONArray(0); // Внешний контур
                    
                    // Преобразуем координаты в формат, используемый в нашем приложении
                    for (int i = 0; i < coordinates.length(); i++) {
                        JSONArray point = coordinates.getJSONArray(i);
                        double lng = point.getDouble(0); // GeoJSON использует [lng, lat]
                        double lat = point.getDouble(1);
                        
                        Map<String, Double> pointMap = new HashMap<>();
                        pointMap.put("lat", lat);
                        pointMap.put("lng", lng);
                        boundaryPoints.add(pointMap);
                    }
                    
                    System.out.println("Извлечено точек границы из GeoJSON: " + boundaryPoints.size());
                }
            }
        } catch (Exception e) {
            System.err.println("Ошибка при чтении GeoJSON файла: " + e.getMessage());
            e.printStackTrace();
        }
        
        return boundaryPoints;
    }

    /**
     * Класс-обработчик для чтения OSM данных и извлечения границы города
     */
    private static class BoundaryExtractorSink implements Sink {
        private final String cityName;
        private Relation cityBoundaryRelation;
        private final Map<Long, Node> nodes = new HashMap<>();
        private final Map<Long, Way> ways = new HashMap<>();
        private final List<Map<String, Double>> boundaryPoints = new ArrayList<>();

        public BoundaryExtractorSink(String cityName) {
            this.cityName = cityName;
        }

        @Override
        public void process(EntityContainer entityContainer) {
            try {
                Entity entity = entityContainer.getEntity();
                
                if (entity instanceof Node) {
                    // Сохраняем все узлы для последующего использования
                    nodes.put(entity.getId(), (Node) entity);
                } else if (entity instanceof Way) {
                    // Сохраняем все пути для последующего использования
                    ways.put(entity.getId(), (Way) entity);
                } else if (entity instanceof Relation) {
                    Relation relation = (Relation) entity;
                    
                    // Ищем relation для указанного города с тегом boundary=administrative
                    boolean isCity = false;
                    boolean isBoundary = false;
                    boolean hasNameMatch = false;
                    
                    for (Tag tag : relation.getTags()) {
                        if (tag.getKey().equals("boundary") && tag.getValue().equals("administrative")) {
                            isBoundary = true;
                        }
                        if (tag.getKey().equals("admin_level") && tag.getValue().equals("6")) {
                            isCity = true;
                        }
                        if ((tag.getKey().equals("name") || tag.getKey().equals("name:ru")) && 
                             tag.getValue().equalsIgnoreCase(cityName)) {
                            hasNameMatch = true;
                        }
                    }
                    
                    if (isCity && isBoundary && hasNameMatch) {
                        cityBoundaryRelation = relation;
                        System.out.println("Найдена граница для города: " + cityName);
                    }
                }
            } catch (Exception e) {
                // Игнорируем ошибки при обработке отдельных элементов
                System.err.println("Ошибка при обработке элемента: " + e.getMessage());
            }
        }

        @Override
        public void complete() {
            if (cityBoundaryRelation != null) {
                processBoundaryRelation();
            } else {
                System.err.println("Граница для города " + cityName + " не найдена");
            }
        }

        private void processBoundaryRelation() {
            System.out.println("Обработка границы города...");
            
            for (RelationMember member : cityBoundaryRelation.getMembers()) {
                if (member.getMemberType().equals(org.openstreetmap.osmosis.core.domain.v0_6.EntityType.Way) && 
                    member.getMemberRole().equals("outer")) {
                    Way way = ways.get(member.getMemberId());
                    if (way != null) {
                        try {
                            processWay(way);
                        } catch (Exception e) {
                            System.err.println("Ошибка при обработке пути: " + e.getMessage());
                        }
                    }
                }
            }
        }

        private void processWay(Way way) {
            for (WayNode wayNode : way.getWayNodes()) {
                try {
                    Node node = nodes.get(wayNode.getNodeId());
                    if (node != null) {
                        Map<String, Double> point = new HashMap<>();
                        point.put("lat", node.getLatitude());
                        point.put("lng", node.getLongitude());
                        boundaryPoints.add(point);
                    }
                } catch (Exception e) {
                    System.err.println("Ошибка при обработке узла: " + e.getMessage());
                }
            }
        }

        public List<Map<String, Double>> getBoundaryPoints() {
            return boundaryPoints;
        }

        @Override
        public void initialize(Map<String, Object> metaData) {
            // Инициализация
        }

        @Override
        public void close() {
            // Освобождение ресурсов
        }
    }
} 