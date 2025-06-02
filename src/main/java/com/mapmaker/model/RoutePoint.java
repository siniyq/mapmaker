package com.mapmaker.model;

import javax.persistence.*;

@Entity
@Table(name = "route_points")
public class RoutePoint {
    
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;
    
    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "route_id", nullable = false)
    private SavedRoute route;
    
    @Column(nullable = false)
    private double latitude;
    
    @Column(nullable = false)
    private double longitude;
    
    @Column
    private String name;
    
    @Column
    private String type;
    
    @Column
    private Double rating;
    
    @Column
    private int sequenceOrder;
    
    @Column
    private String photoUrl;
    
    // Конструкторы
    public RoutePoint() {
    }
    
    public RoutePoint(SavedRoute route, double latitude, double longitude, String name, String type, Double rating, int sequenceOrder) {
        this.route = route;
        this.latitude = latitude;
        this.longitude = longitude;
        this.name = name;
        this.type = type;
        this.rating = rating;
        this.sequenceOrder = sequenceOrder;
    }
    
    public RoutePoint(SavedRoute route, double latitude, double longitude, String name, String type, Double rating, int sequenceOrder, String photoUrl) {
        this.route = route;
        this.latitude = latitude;
        this.longitude = longitude;
        this.name = name;
        this.type = type;
        this.rating = rating;
        this.sequenceOrder = sequenceOrder;
        this.photoUrl = photoUrl;
    }
    
    // Геттеры и сеттеры
    public Long getId() {
        return id;
    }
    
    public void setId(Long id) {
        this.id = id;
    }
    
    public SavedRoute getRoute() {
        return route;
    }
    
    public void setRoute(SavedRoute route) {
        this.route = route;
    }
    
    public double getLatitude() {
        return latitude;
    }
    
    public void setLatitude(double latitude) {
        this.latitude = latitude;
    }
    
    public double getLongitude() {
        return longitude;
    }
    
    public void setLongitude(double longitude) {
        this.longitude = longitude;
    }
    
    public String getName() {
        return name;
    }
    
    public void setName(String name) {
        this.name = name;
    }
    
    public String getType() {
        return type;
    }
    
    public void setType(String type) {
        this.type = type;
    }
    
    public Double getRating() {
        return rating;
    }
    
    public void setRating(Double rating) {
        this.rating = rating;
    }
    
    public int getSequenceOrder() {
        return sequenceOrder;
    }
    
    public void setSequenceOrder(int sequenceOrder) {
        this.sequenceOrder = sequenceOrder;
    }
    
    public String getPhotoUrl() {
        return photoUrl;
    }
    
    public void setPhotoUrl(String photoUrl) {
        this.photoUrl = photoUrl;
    }
} 