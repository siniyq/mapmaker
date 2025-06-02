package com.mapmaker.model;

import javax.persistence.*;
import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.List;

@Entity
@Table(name = "saved_routes")
public class SavedRoute {
    
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;
    
    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "user_id", nullable = false)
    private User user;
    
    @Column(nullable = false)
    private String name;
    
    @Column(nullable = false)
    private String profile; // foot, bike, car
    
    @Column
    private double distance; // в километрах
    
    @Column
    private int duration; // в минутах
    
    @Column(name = "created_at", nullable = false)
    private LocalDateTime createdAt;
    
    @Column(length = 5000) // Для длинных маршрутов
    private String routeData; // Сериализованные данные маршрута в JSON
    
    @OneToMany(mappedBy = "route", cascade = CascadeType.ALL, orphanRemoval = true)
    private List<RoutePoint> points = new ArrayList<>();
    
    // Конструкторы
    public SavedRoute() {
        this.createdAt = LocalDateTime.now();
    }
    
    public SavedRoute(User user, String name, String profile, double distance, int duration, String routeData) {
        this.user = user;
        this.name = name;
        this.profile = profile;
        this.distance = distance;
        this.duration = duration;
        this.routeData = routeData;
        this.createdAt = LocalDateTime.now();
    }
    
    // Геттеры и сеттеры
    public Long getId() {
        return id;
    }
    
    public void setId(Long id) {
        this.id = id;
    }
    
    public User getUser() {
        return user;
    }
    
    public void setUser(User user) {
        this.user = user;
    }
    
    public String getName() {
        return name;
    }
    
    public void setName(String name) {
        this.name = name;
    }
    
    public String getProfile() {
        return profile;
    }
    
    public void setProfile(String profile) {
        this.profile = profile;
    }
    
    public double getDistance() {
        return distance;
    }
    
    public void setDistance(double distance) {
        this.distance = distance;
    }
    
    public int getDuration() {
        return duration;
    }
    
    public void setDuration(int duration) {
        this.duration = duration;
    }
    
    public LocalDateTime getCreatedAt() {
        return createdAt;
    }
    
    public void setCreatedAt(LocalDateTime createdAt) {
        this.createdAt = createdAt;
    }
    
    public String getRouteData() {
        return routeData;
    }
    
    public void setRouteData(String routeData) {
        this.routeData = routeData;
    }
    
    public List<RoutePoint> getPoints() {
        return points;
    }
    
    public void setPoints(List<RoutePoint> points) {
        this.points = points;
    }
    
    // Вспомогательные методы
    public void addPoint(RoutePoint point) {
        points.add(point);
        point.setRoute(this);
    }
    
    public void removePoint(RoutePoint point) {
        points.remove(point);
        point.setRoute(null);
    }
} 