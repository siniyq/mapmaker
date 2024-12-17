package com.mapmaker.model;

public class PointOfInterest {
    private Long id;
    private String name;
    private String type;
    private double rating;
    private String placeId;
    private double latitude;
    private double longitude;

    // Конструктор
    public PointOfInterest(String name, String type, double rating, double latitude, double longitude, String placeId) {
        this.name = name;
        this.type = type;
        this.rating = rating;
        this.latitude = latitude;
        this.longitude = longitude;
        this.placeId = placeId;
    }

    // Геттеры
    public Long getId() { return id; }
    public String getName() { return name; }
    public String getType() { return type; }
    public double getRating() { return rating; }
    public String getPlaceId() { return placeId; }
    public double getLatitude() { return latitude; }
    public double getLongitude() { return longitude; }
}
