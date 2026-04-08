package com.yisus.store_backend.storeconfig.model;

import jakarta.persistence.*;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;
import org.hibernate.annotations.UpdateTimestamp;

import java.time.LocalDateTime;

/**
 * Configuración general de la tienda. Siempre existe una única fila con id = 1.
 */
@Entity
@Table(name = "store_config")
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class StoreConfig {

    public static final Long SINGLETON_ID = 1L;

    @Id
    private Long id;

    @Column(name = "store_name", nullable = false)
    private String storeName;

    @Column(name = "store_ruc")
    private String storeRuc;

    @Column(name = "store_address")
    private String storeAddress;

    @Column(name = "logo_url")
    private String logoUrl;

    @UpdateTimestamp
    @Column(name = "updated_at", nullable = false)
    private LocalDateTime updatedAt;
}
