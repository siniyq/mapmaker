package com.mapmaker.model;

import javax.persistence.*;

@Entity
@Table(name = "user_preferences")
public class UserPreference {
    
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;
    
    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "user_id", nullable = false)
    private User user;
    
    @Column(nullable = false)
    private String poiType;
    
    @Column(nullable = false)
    private PreferenceType preferenceType;
    
    // Перечисление для типа предпочтения
    public enum PreferenceType {
        LIKE,    // Пользователь любит этот тип мест
        DISLIKE  // Пользователь избегает этот тип мест
    }
    
    // Конструкторы
    public UserPreference() {
    }
    
    public UserPreference(User user, String poiType, PreferenceType preferenceType) {
        this.user = user;
        this.poiType = poiType;
        this.preferenceType = preferenceType;
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
    
    public String getPoiType() {
        return poiType;
    }
    
    public void setPoiType(String poiType) {
        this.poiType = poiType;
    }
    
    public PreferenceType getPreferenceType() {
        return preferenceType;
    }
    
    public void setPreferenceType(PreferenceType preferenceType) {
        this.preferenceType = preferenceType;
    }
    
    // Переопределение equals и hashCode для корректной работы в коллекциях
    @Override
    public boolean equals(Object o) {
        if (this == o) return true;
        if (o == null || getClass() != o.getClass()) return false;
        
        UserPreference that = (UserPreference) o;
        
        if (id != null ? !id.equals(that.id) : that.id != null) return false;
        if (user != null ? !user.equals(that.user) : that.user != null) return false;
        return poiType != null ? poiType.equals(that.poiType) : that.poiType == null;
    }
    
    @Override
    public int hashCode() {
        int result = id != null ? id.hashCode() : 0;
        result = 31 * result + (user != null ? user.hashCode() : 0);
        result = 31 * result + (poiType != null ? poiType.hashCode() : 0);
        return result;
    }
} 