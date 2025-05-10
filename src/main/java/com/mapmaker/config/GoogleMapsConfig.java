package com.mapmaker.config;

import org.springframework.context.annotation.Configuration;
import org.springframework.context.annotation.Bean;
import com.google.maps.GeoApiContext;

@Configuration
public class GoogleMapsConfig {
    
    @Bean
    public GeoApiContext geoApiContext() {
        return new GeoApiContext.Builder()
            .apiKey(DatabaseConfig.getProperty("google.maps.api.key"))
            .build();
    }
}
