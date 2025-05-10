package com.mapmaker.controller;

import org.springframework.stereotype.Controller;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.ResponseBody;
import org.springframework.beans.factory.annotation.Autowired;
import com.mapmaker.service.HeatmapService;
import org.springframework.web.bind.annotation.PathVariable;
import com.mapmaker.util.DatabaseHelper;

import java.sql.Connection;
import java.sql.PreparedStatement;
import java.sql.ResultSet;
import java.sql.SQLException;
import java.util.ArrayList;
import java.util.HashMap;
import java.util.Map;
import java.util.List;

@Controller
public class MapController {
    
    @Autowired
    private HeatmapService heatmapService;

    @GetMapping("/")
    public String redirectToMap() {
        return "redirect:/map";
    }

    @GetMapping("/map")
    public String showMap() {
        return "map";
    }

    @GetMapping("/heatmap/{type}")
    @ResponseBody
    public Map<String, Object> getHeatmap(@PathVariable String type) {
        // Приводим тип к нижнему регистру для унификации
        String lowerType = type.toLowerCase();
        
        // Определяем фактический тип для запроса
        String placeType = switch (lowerType) {
            case "restaurants" -> "restaurant";
            case "bars" -> "bar"; 
            case "cafes" -> "cafe";
            case "banks" -> "bank";
            case "restaurant", "bar", "cafe", "bank", "pharmacy", "gym", "school", "test" -> lowerType;
            case "all" -> lowerType;
            default -> {
                System.out.println("Неизвестный тип: " + lowerType + ", используем 'all'");
                yield "all";
            }
        };
        
        System.out.println("Запрошен тип: " + lowerType + ", используем: " + placeType);
        
        Map<String, Object> result = new HashMap<>();
        List<Map<String, Object>> features = new ArrayList<>();
        
        try (Connection conn = DatabaseHelper.getConnection()) {
            String sql;
            PreparedStatement stmt;
            
            // Подготавливаем SQL-запрос в зависимости от типа
            if ("all".equalsIgnoreCase(placeType)) {
                sql = "SELECT id, name, type, rating, ST_X(location::geometry) as lng, ST_Y(location::geometry) as lat FROM points_of_interest";
                stmt = conn.prepareStatement(sql);
            } else {
                sql = "SELECT id, name, type, rating, ST_X(location::geometry) as lng, ST_Y(location::geometry) as lat FROM points_of_interest WHERE type = ?";
                stmt = conn.prepareStatement(sql);
                stmt.setString(1, placeType);
            }
            
            ResultSet rs = stmt.executeQuery();
            
            // Преобразуем результаты в GeoJSON
            while (rs.next()) {
                Map<String, Object> feature = new HashMap<>();
                Map<String, Object> geometry = new HashMap<>();
                Map<String, Object> properties = new HashMap<>();
                
                // Геометрия - точка с координатами
                geometry.put("type", "Point");
                double[] coordinates = {rs.getDouble("lng"), rs.getDouble("lat")};
                geometry.put("coordinates", coordinates);
                
                // Свойства - название, тип, рейтинг и др.
                properties.put("id", rs.getInt("id"));
                properties.put("name", rs.getString("name"));
                properties.put("type", rs.getString("type"));
                properties.put("rating", rs.getDouble("rating"));
                
                // Полный объект
                feature.put("type", "Feature");
                feature.put("geometry", geometry);
                feature.put("properties", properties);
                
                features.add(feature);
            }
            
            result.put("type", "FeatureCollection");
            result.put("features", features);
            
        } catch (SQLException e) {
            e.printStackTrace();
            result.put("error", e.getMessage());
        }
        
        return result;
    }

    @GetMapping("/heatmap/all")
    @ResponseBody
    public Map<String, Object> getAllPlaces() {
        return getHeatmap("all");
    }
}
