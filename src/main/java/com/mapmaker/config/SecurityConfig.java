package com.mapmaker.config;

import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.security.config.annotation.web.builders.HttpSecurity;
import org.springframework.security.config.annotation.web.configuration.EnableWebSecurity;
import org.springframework.security.crypto.bcrypt.BCryptPasswordEncoder;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.security.web.SecurityFilterChain;

@Configuration
@EnableWebSecurity
public class SecurityConfig {
    
    /**
     * Создает бин PasswordEncoder для шифрования паролей пользователей
     */
    @Bean
    public PasswordEncoder passwordEncoder() {
        return new BCryptPasswordEncoder();
    }
    
    /**
     * Конфигурация Spring Security
     */
    @Bean
    public SecurityFilterChain securityFilterChain(HttpSecurity http) throws Exception {
        http
            .csrf().disable() // Отключаем CSRF для упрощения
            .authorizeRequests()
                // Разрешаем доступ ко всем статическим ресурсам и публичным страницам
                .antMatchers("/", "/map", "/register", "/login", "/css/**", "/js/**").permitAll()
                // Разрешаем доступ ко всем API-эндпоинтам
                .antMatchers("/api/**").permitAll()
                // Остальные запросы требуют аутентификации (например, страницы администрирования)
                .anyRequest().authenticated()
            .and()
            // Отключаем форму входа, так как используем собственную JSON-аутентификацию
            .formLogin().disable()
            // Настраиваем выход
            .logout()
                .logoutSuccessUrl("/map") // Редирект после выхода
                .permitAll()
            .and()
            // Отключаем HTTP Basic Auth
            .httpBasic().disable();
        
        return http.build();
    }
} 