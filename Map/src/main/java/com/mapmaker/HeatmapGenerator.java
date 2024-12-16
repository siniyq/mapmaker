package com.mapmaker;

import org.springframework.stereotype.Component;
import java.sql.Connection;
import java.sql.PreparedStatement;
import java.sql.ResultSet;
import org.json.JSONObject;
import org.json.JSONArray;
import java.io.FileWriter;
import java.util.ArrayList;
import java.util.List;

@Component
public class HeatmapGenerator {
    private static final int GRID_SIZE = 50;
    private static final double SMOOTHING_RADIUS = 0.003;
    
    private static final double MIN_LAT = 55.1532;
    private static final double MAX_LAT = 55.2308;
    private static final double MIN_LNG = 30.1833;
    private static final double MAX_LNG = 30.3092;

    private static class Place {
        final double lat;
        final double lng;
        final double rating;

        Place(double lat, double lng, double rating) {
            this.lat = lat;
            this.lng = lng;
            this.rating = rating;
        }
    }

    private static class CellStats {
        final int count;
        final double avgRating;
        final double intensity;

        CellStats(int count, double avgRating, double intensity) {
            this.count = count;
            this.avgRating = avgRating;
            this.intensity = intensity;
        }
    }

    public JSONObject generateHeatmapJson(String type) {
        JSONObject featureCollection = new JSONObject();
        featureCollection.put("type", "FeatureCollection");
        JSONArray features = new JSONArray();

        try (Connection conn = DatabaseHelper.getConnection()) {
            List<Place> places = getAllPlaces(conn, type);
            System.out.println("Found " + places.size() + " places of type: " + type);

            if (!places.isEmpty()) {
                double latStep = (MAX_LAT - MIN_LAT) / GRID_SIZE;
                double lngStep = (MAX_LNG - MIN_LNG) / GRID_SIZE;

                for (int i = 0; i < GRID_SIZE; i++) {
                    for (int j = 0; j < GRID_SIZE; j++) {
                        double cellMinLat = MIN_LAT + (i * latStep);
                        double cellMinLng = MIN_LNG + (j * lngStep);
                        double cellMaxLat = cellMinLat + latStep;
                        double cellMaxLng = cellMinLng + lngStep;
                        double centerLat = (cellMinLat + cellMaxLat) / 2;
                        double centerLng = (cellMinLng + cellMaxLng) / 2;

                        CellStats stats = calculateIntensity(centerLat, centerLng, places);
                        
                        if (stats.intensity > 0.1) { // Увеличили порог видимости
                            features.put(createCellFeature(
                                cellMinLat, cellMaxLat, cellMinLng, cellMaxLng, 
                                stats
                            ));
                        }
                    }
                }
            }
        } catch (Exception e) {
            e.printStackTrace();
        }

        featureCollection.put("features", features);
        return featureCollection;
    }

    private CellStats calculateIntensity(double lat, double lng, List<Place> places) {
        double totalWeight = 0;
        double weightedRating = 0;
        int count = 0;

        for (Place place : places) {
            double distance = calculateDistance(lat, lng, place.lat, place.lng);
            if (distance <= SMOOTHING_RADIUS) {
                double weight = Math.exp(-(distance * distance) / 
                    (2 * SMOOTHING_RADIUS * SMOOTHING_RADIUS));
                totalWeight += weight;
                weightedRating += place.rating * weight;
                count++;
            }
        }

        if (count == 0) {
            return new CellStats(0, 0, 0);
        }

        double avgRating = weightedRating / totalWeight;
        double intensity = Math.min(1.0, 
            (count / 5.0) * 0.7 + (avgRating / 5.0) * 0.3
        );

        return new CellStats(count, avgRating, intensity);
    }

    private List<Place> getAllPlaces(Connection conn, String type) throws Exception {
        List<Place> places = new ArrayList<>();
        String sql = """
            SELECT ST_X(location::geometry) as lng, 
                   ST_Y(location::geometry) as lat, 
                   rating 
            FROM points_of_interest 
            WHERE type = ?
        """;
        
        try (PreparedStatement pstmt = conn.prepareStatement(sql)) {
            pstmt.setString(1, type);
            ResultSet rs = pstmt.executeQuery();
            
            while (rs.next()) {
                places.add(new Place(
                    rs.getDouble("lat"),
                    rs.getDouble("lng"),
                    rs.getDouble("rating")
                ));
            }
        }
        return places;
    }

    private double calculateDistance(double lat1, double lng1, double lat2, double lng2) {
        return Math.sqrt(
            Math.pow(lat1 - lat2, 2) + 
            Math.pow(lng1 - lng2, 2)
        );
    }

    private JSONObject createCellFeature(double minLat, double maxLat, 
                                       double minLng, double maxLng, 
                                       CellStats stats) {
        JSONObject feature = new JSONObject();
        feature.put("type", "Feature");

        JSONObject geometry = new JSONObject();
        geometry.put("type", "Polygon");
        JSONArray coordinates = new JSONArray();
        JSONArray polygon = new JSONArray();

        // Создаем более гладкий полигон с дополнительными точками
        int steps = 4; // количество промежуточных точек
        for (int i = 0; i <= steps; i++) {
            double lat = minLat + (maxLat - minLat) * i / steps;
            polygon.put(new double[]{minLng, lat});
        }
        for (int i = 0; i <= steps; i++) {
            double lng = minLng + (maxLng - minLng) * i / steps;
            polygon.put(new double[]{lng, maxLat});
        }
        for (int i = steps; i >= 0; i--) {
            double lat = minLat + (maxLat - minLat) * i / steps;
            polygon.put(new double[]{maxLng, lat});
        }
        for (int i = steps; i >= 0; i--) {
            double lng = minLng + (maxLng - minLng) * i / steps;
            polygon.put(new double[]{lng, minLat});
        }

        coordinates.put(polygon);
        geometry.put("coordinates", coordinates);

        JSONObject properties = new JSONObject();
        properties.put("count", stats.count);
        properties.put("rating", stats.avgRating);
        properties.put("intensity", stats.intensity);

        feature.put("geometry", geometry);
        feature.put("properties", properties);

        return feature;
    }
}
