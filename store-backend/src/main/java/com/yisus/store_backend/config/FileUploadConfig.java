package com.yisus.store_backend.config;

import org.springframework.beans.factory.annotation.Value;
import org.springframework.context.annotation.Configuration;
import jakarta.servlet.MultipartConfigElement;
import org.springframework.context.annotation.Bean;
import org.springframework.web.servlet.config.annotation.ResourceHandlerRegistry;
import org.springframework.web.servlet.config.annotation.WebMvcConfigurer;

@Configuration
public class FileUploadConfig implements WebMvcConfigurer {

    @Value("${file.upload-dir:uploads}")
    private String uploadDir;

    @Override
    public void addResourceHandlers(ResourceHandlerRegistry registry) {
        // Expose uploads directory as static resource
        registry.addResourceHandler("/uploads/**")
                .addResourceLocations("file:" + uploadDir + "/");
    }

    /**
     * Configura el límite de tamaño de uploads directamente en el contenedor Jakarta Servlet.
     * Parámetros: location, maxFileSize (bytes), maxRequestSize (bytes), fileSizeThreshold.
     * -1 = sin límite, 0 en threshold = todo en memoria.
     */
    @Bean
    public MultipartConfigElement multipartConfigElement() {
        return new MultipartConfigElement("", 52_428_800L, 52_428_800L, 0);
    }
}
