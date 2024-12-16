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
import java.sql.SQLException;

@Component
public class HeatmapGenerator {
    public JSONObject generateHeatmapJson(String type) {
        JSONObject featureCollection = new JSONObject();
        featureCollection.put("type", "FeatureCollection");
        JSONArray features = new JSONArray();

        try (Connection conn = DatabaseHelper.getConnection()) {
            String sql = """
                SELECT 
                    ST_Y(location::geometry) as lat,
                    ST_X(location::geometry) as lng
                FROM points_of_interest 
                WHERE type = ?
            """;
            
            try (PreparedStatement pstmt = conn.prepareStatement(sql)) {
                pstmt.setString(1, type);
                try (ResultSet rs = pstmt.executeQuery()) {
                    while (rs.next()) {
                        JSONObject feature = new JSONObject();
                        feature.put("type", "Feature");

                        JSONObject geometry = new JSONObject();
                        geometry.put("type", "Point");
                        JSONArray coordinates = new JSONArray();
                        coordinates.put(rs.getDouble("lng"));
                        coordinates.put(rs.getDouble("lat"));
                        geometry.put("coordinates", coordinates);

                        feature.put("geometry", geometry);
                        features.put(feature);
                    }
                }
            }
        } catch (Exception e) {
            e.printStackTrace();
        }

        featureCollection.put("features", features);
        System.out.println("Generated " + features.length() + " features");
        return featureCollection;
    }
}
