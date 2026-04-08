package com.yisus.store_backend.user.repository;

import com.yisus.store_backend.user.model.User;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;

import java.util.List;
import java.util.Optional;

@Repository
public interface UserRepository extends JpaRepository<User, Long> {
    Optional<User> findByEmail(String email);
    boolean existsByEmail(String email);
    
    List<User> findByIsActiveTrue();

    /** Usuarios activos cuyo rol incluye el permiso dado (p. ej. centrar notificaciones en quien puede verlas). */
    @Query("SELECT DISTINCT u FROM User u JOIN u.role r JOIN r.permissions p WHERE u.isActive = true AND p.name = :permissionName")
    List<User> findActiveByRolePermissionName(@Param("permissionName") String permissionName);

    @Query("SELECT u FROM User u WHERE u.role.name != 'SUPERADMIN'")
    List<User> findAllWithoutSuperAdmin();
    
    @Query("SELECT u FROM User u WHERE u.role.name != 'SUPERADMIN' AND " +
           "(LOWER(u.name) LIKE LOWER(CONCAT('%', :search, '%')) OR " +
           "LOWER(u.email) LIKE LOWER(CONCAT('%', :search, '%')))")
    List<User> findBySearchWithoutSuperAdmin(@Param("search") String search);
    
    @Query("SELECT u FROM User u WHERE u.role.name != 'SUPERADMIN'")
    Page<User> findAllWithoutSuperAdmin(Pageable pageable);
    
    @Query("SELECT u FROM User u WHERE u.role.name != 'SUPERADMIN' AND " +
           "(LOWER(u.name) LIKE LOWER(CONCAT('%', :search, '%')) OR " +
           "LOWER(u.email) LIKE LOWER(CONCAT('%', :search, '%')))")
    Page<User> findBySearchWithoutSuperAdmin(@Param("search") String search, Pageable pageable);
}
