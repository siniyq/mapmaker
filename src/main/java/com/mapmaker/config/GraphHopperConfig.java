package com.mapmaker.config;

import com.graphhopper.GraphHopper;
import com.graphhopper.config.CHProfile;
import com.graphhopper.config.Profile;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;

import javax.annotation.PostConstruct;
import java.io.File;
import java.util.Arrays;

@Configuration
public class GraphHopperConfig {

    @Value("${graphhopper.osm.file:maps/vitebskaya.pbf}")
    private String osmFile;

    @Value("${graphhopper.graph.location:data/graphhopper-cache}")
    private String graphLocation;

    @Bean
    public GraphHopper graphHopper() {
        GraphHopper hopper = new GraphHopper();
        
        // Настройка основных параметров
        hopper.setOSMFile(osmFile);
        hopper.setGraphHopperLocation(graphLocation);
        
        // Простая настройка профилей для GraphHopper 8.0
        hopper.setProfiles(Arrays.asList(
            // Основные профили
            new Profile("foot").setVehicle("foot").setWeighting("custom"),
            new Profile("bike").setVehicle("bike").setWeighting("custom"), 
            new Profile("car").setVehicle("car").setWeighting("custom")
        ));

        return hopper;
    }

    @PostConstruct
    public void init() {
        // Создаем директории если их нет
        new File(graphLocation).mkdirs();
        new File("maps").mkdirs();
        
        System.out.println("GraphHopper настроен:");
        System.out.println("- OSM файл: " + osmFile);
        System.out.println("- Кэш: " + graphLocation);
        System.out.println("- Создание директорий завершено");
    }
} 