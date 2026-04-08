package com.yisus.store_backend.category.controller;

import com.yisus.store_backend.category.dto.CategoryCreateDTO;
import com.yisus.store_backend.category.dto.CategoryDTO;
import com.yisus.store_backend.category.dto.CategoryPaginatedResponse;
import com.yisus.store_backend.category.dto.CategoryUpdateDTO;
import com.yisus.store_backend.category.dto.CategoryUpdateStatusDTO;
import com.yisus.store_backend.category.service.CategoryService;
import com.yisus.store_backend.common.dto.MessageResponse;
import com.yisus.store_backend.common.dto.PaginatedResponse;
import com.yisus.store_backend.common.util.PaginationValidator;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.media.Content;
import io.swagger.v3.oas.annotations.media.Schema;
import io.swagger.v3.oas.annotations.responses.ApiResponse;
import io.swagger.v3.oas.annotations.responses.ApiResponses;
import io.swagger.v3.oas.annotations.security.SecurityRequirement;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Pageable;
import org.springframework.data.domain.Sort;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/categories")
@RequiredArgsConstructor
@Tag(name = "Category", description = "Category endpoints")
@SecurityRequirement(name = "Bearer Authentication")
public class CategoryController {
    private final CategoryService categoryService;

    @GetMapping
    @PreAuthorize("hasAuthority('categories.read')")
    @Operation(summary = "Get all categories", description = "Retrieve all categories with optional search and pagination")
    @ApiResponses(value = {
        @ApiResponse(responseCode = "200", description = "Categories retrieved successfully", 
            content = @Content(schema = @Schema(implementation = CategoryDTO.class))),
        @ApiResponse(responseCode = "200", description = "Categories retrieved successfully (paginated)", 
            content = @Content(schema = @Schema(implementation = CategoryPaginatedResponse.class)))
    })
    public ResponseEntity<?> getAllCategories(@RequestParam(required = false) String search,
                                              @RequestParam(required = false) Integer limit,
                                              @RequestParam(required = false) Integer offset,
                                              HttpServletRequest request) {
        if(limit != null && offset != null){
            PaginationValidator.validatePaginationParams(limit, offset);
            int page = (offset + limit - 1) / limit;
            Pageable pageable = PageRequest.of(page, limit, Sort.by("id").ascending());
            Page<CategoryDTO> categoryPage = categoryService.getAllCategoriesPaginated(search, pageable);
            PaginatedResponse<CategoryDTO> response = PaginationValidator.buildPaginatedResponse(
                    categoryPage,
                    limit,
                    offset,
                    request.getRequestURI(),
                    request.getQueryString()
            );
            return ResponseEntity.ok(response);
        }
        else {
            List<CategoryDTO> categories = categoryService.getAllCategories(search);
            return ResponseEntity.ok(categories);
        }
    }

    @GetMapping("/{id}")
    @PreAuthorize("hasAuthority('categories.read')")
    public ResponseEntity<CategoryDTO> getCategoryById(@PathVariable Long id) {
        CategoryDTO category = categoryService.getCategoryById(id);
        return ResponseEntity.ok(category);
    }

    @PostMapping
    @PreAuthorize("hasAuthority('categories.create')")
    public ResponseEntity<CategoryDTO> createCategory(@Valid @RequestBody CategoryCreateDTO request) {
        CategoryDTO category = categoryService.createCategory(request);
        return ResponseEntity.status(HttpStatus.CREATED).body(category);
    }

    @PutMapping("/{id}")
    @PreAuthorize("hasAuthority('categories.update')")
    public ResponseEntity<CategoryDTO> updateCategory(@PathVariable Long id, @RequestBody CategoryUpdateDTO request) {
        CategoryDTO category = categoryService.updateCategory(id, request);
        return ResponseEntity.ok(category);
    }

    @PatchMapping("/{id}/status")
    @PreAuthorize("hasAuthority('categories.update')")
    public ResponseEntity<MessageResponse> updateStatus(@PathVariable Long id, @Valid @RequestBody CategoryUpdateStatusDTO request) {
        categoryService.updateStatus(id, request.getIsActive());
        return ResponseEntity.ok(new MessageResponse("Status updated successfully"));
    }
}
