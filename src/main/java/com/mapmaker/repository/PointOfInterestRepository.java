package com.mapmaker.repository;

import org.springframework.stereotype.Repository;
import com.mapmaker.util.DatabaseHelper;
import org.json.JSONObject;
import org.json.JSONArray;
import java.sql.*;

@Repository
public class PointOfInterestRepository {
    
    public JSONObject findAllByType(String type) {
        JSONObject featureCollection = new JSONObject();
        featureCollection.put("type", "FeatureCollection");
        JSONArray features = new JSONArray();

        try (Connection conn = DatabaseHelper.getConnection()) {
            String sql = """
                SELECT 
                    ST_Y(location::geometry) as lat,
                    ST_X(location::geometry) as lng,
                    COALESCE(rating, 0) as rating,
                    COUNT(*) OVER (PARTITION BY ST_SnapToGrid(location::geometry, 0.001)) as density
                FROM points_of_interest 
                WHERE type = ?
                GROUP BY location, rating
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

                        double rating = rs.getDouble("rating");

                        feature.put("geometry", geometry);
                        JSONObject properties = new JSONObject();
                        properties.put("rating", rating);
                        feature.put("properties", properties);
                        
                        features.put(feature);
                    }
                }
            }
        } catch (Exception e) {
            e.printStackTrace();
        }

        featureCollection.put("features", features);
        return featureCollection;
    }
}
