package com.mapmaker.controller;

import org.springframework.stereotype.Controller;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.ResponseBody;
import org.springframework.beans.factory.annotation.Autowired;
import com.mapmaker.service.HeatmapService;
import org.springframework.web.bind.annotation.PathVariable;

@Controller
public class MapController {
    
    @Autowired
    private HeatmapService heatmapService;

    @GetMapping("/")
    public String showMap() {
        return "map";
    }

    @GetMapping("/heatmap/{type}")
    @ResponseBody
    public String getHeatmap(@PathVariable String type) {
        String placeType = switch (type) {
            case "restaurants" -> "restaurant";
            case "bars" -> "bar";
            case "cafes" -> "cafe";
            case "banks" -> "bank";
            case "pharmacy" -> "pharmacy";
            case "gym" -> "gym";
            default -> throw new IllegalArgumentException("Неизвестный тип: " + type);
        };
        
        return heatmapService.generateHeatmapJson(placeType).toString();
    }
}
