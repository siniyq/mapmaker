package com.mapmaker.repository;

import com.mapmaker.model.PointOfInterest;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;

@Repository
public interface PointOfInterestRepository extends JpaRepository<PointOfInterest, Long> {

    // Метод для поиска POI по списку типов
    // Spring Data JPA автоматически сгенерирует реализацию
    List<PointOfInterest> findByTypeIn(List<String> types);
}
