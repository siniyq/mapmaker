package com.mapmaker.service;

import org.springframework.stereotype.Service;
import org.springframework.beans.factory.annotation.Autowired;
import com.mapmaker.repository.PointOfInterestRepository;
import org.json.JSONObject;

@Service
public class HeatmapService {
    
    @Autowired
    private PointOfInterestRepository repository;

    public JSONObject generateHeatmapJson(String type) {
        return repository.findAllByType(type);
    }

    public JSONObject generateAllPlacesJson() {
        return repository.findAll();
    }
}
