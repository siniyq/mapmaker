package com.mapmaker.model;

import javax.persistence.*; // Используем javax для Spring Boot 2.7.0
import com.fasterxml.jackson.annotation.JsonRawValue;
import com.fasterxml.jackson.annotation.JsonProperty;

@Entity
@Table(name = "points_of_interest") // Указываем имя таблицы из DatabaseHelper
public class PointOfInterest {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY) // Используем автоинкремент БД
    private Long id;

    @Column(nullable = false)
    private String name;

    @Column(nullable = false)
    private String type;

    @Column // Рейтинг может быть null
    private Double rating;

    @Column(unique = true)
    private String placeId;

    @Column(nullable = false)
    private double latitude;

    @Column(nullable = false)
    private double longitude;

    @Column
    private String vicinity;

    @Column
    private String address;

    @Column
    @JsonRawValue // Это указывает Jackson не экранировать JSON-строку
    private String photoUrl;  // URL фотографии места

    // Пустой конструктор для JPA
    public PointOfInterest() {}

    // Конструктор с полями (опционально, если нужен)
    public PointOfInterest(String name, String type, Double rating, double latitude, double longitude, String placeId) {
        this.name = name;
        this.type = type;
        this.rating = rating;
        this.latitude = latitude;
        this.longitude = longitude;
        this.placeId = placeId;
    }

    // Геттеры (и Сеттеры, если нужны для вашего кода)
    public Long getId() { return id; }
    public String getName() { return name; }
    public String getType() { return type; }
    public Double getRating() { return rating; }
    public String getPlaceId() { return placeId; }
    public double getLatitude() { return latitude; }
    public double getLongitude() { return longitude; }
    public String getVicinity() { return vicinity; }
    public String getAddress() { return address; }
    
    @JsonProperty("photoUrl") // Явно указываем имя поля для сериализации
    public String getPhotoUrl() { return photoUrl; }

    // Опционально: Сеттеры (JPA может использовать reflection, но они могут быть полезны)
    public void setId(Long id) { this.id = id; }
    public void setName(String name) { this.name = name; }
    public void setType(String type) { this.type = type; }
    public void setRating(Double rating) { this.rating = rating; }
    public void setPlaceId(String placeId) { this.placeId = placeId; }
    public void setLatitude(double latitude) { this.latitude = latitude; }
    public void setLongitude(double longitude) { this.longitude = longitude; }
    public void setVicinity(String vicinity) { this.vicinity = vicinity; }
    public void setAddress(String address) { this.address = address; }
    public void setPhotoUrl(String photoUrl) { this.photoUrl = photoUrl; }
}
