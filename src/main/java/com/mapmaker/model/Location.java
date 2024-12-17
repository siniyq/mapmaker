package com.mapmaker.model;

public class Location {
    private String name;
    private double rating;
    private double latitude;
    private double longitude;

    public Location(String name, double rating, double latitude, double longitude) {
        this.name = name;
        this.rating = rating;
        this.latitude = latitude;
        this.longitude = longitude;
    }

    public String getName() {
        return name;
    }

    public double getRating() {
        return rating;
    }

    public double getLatitude() {
        return latitude;
    }

    public double getLongitude() {
        return longitude;
    }
}