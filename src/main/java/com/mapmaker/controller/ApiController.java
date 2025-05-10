package com.mapmaker.controller;

import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;
import com.mapmaker.util.DatabaseHelper;

import java.sql.Connection;
import java.sql.PreparedStatement;
import java.sql.ResultSet;
import java.sql.SQLException;
import java.util.HashMap;
import java.util.Map;

@RestController
@RequestMapping("/api")
public class ApiController {

    @GetMapping("/stats/{type}")
    public Map<String, Object> getStats(@PathVariable String type) {
        Map<String, Object> stats = new HashMap<>();
        
        try (Connection conn = DatabaseHelper.getConnection()) {
            String sql;
            PreparedStatement pstmt;
            
            if ("all".equalsIgnoreCase(type)) {
                sql = "SELECT COUNT(*) as count, AVG(rating) as avg_rating FROM points_of_interest";
                pstmt = conn.prepareStatement(sql);
            } else {
                sql = "SELECT COUNT(*) as count, AVG(rating) as avg_rating FROM points_of_interest WHERE type = ?";
                pstmt = conn.prepareStatement(sql);
                pstmt.setString(1, type.toLowerCase());
            }
            
            ResultSet rs = pstmt.executeQuery();
            
            if (rs.next()) {
                stats.put("count", rs.getInt("count"));
                double avgRating = rs.getDouble("avg_rating");
                stats.put("averageRating", avgRating > 0 ? avgRating : 0.0);
            } else {
                stats.put("count", 0);
                stats.put("averageRating", 0.0);
            }
            
        } catch (SQLException e) {
            e.printStackTrace();
            stats.put("error", "Ошибка получения статистики: " + e.getMessage());
            stats.put("count", 0);
            stats.put("averageRating", 0.0);
        }
        
        return stats;
    }
} 