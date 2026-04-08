package com.yisus.store_backend.user.controller;

import com.yisus.store_backend.common.dto.MessageResponse;
import com.yisus.store_backend.common.dto.PaginatedResponse;
import com.yisus.store_backend.common.util.PaginationValidator;
import com.yisus.store_backend.user.dto.ChangePasswordDTO;
import com.yisus.store_backend.user.dto.CreateUserDTO;
import com.yisus.store_backend.user.dto.UpdateProfileDTO;
import com.yisus.store_backend.user.dto.UpdateUserDTO;
import com.yisus.store_backend.user.dto.UserDTO;
import com.yisus.store_backend.user.dto.UserPaginatedResponse;
import com.yisus.store_backend.user.dto.UserStatusDTO;
import com.yisus.store_backend.user.model.User;
import com.yisus.store_backend.user.service.UserService;

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
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.multipart.MultipartFile;

import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/users")
@RequiredArgsConstructor
@Tag(name = "User", description = "User endpoints")
@SecurityRequirement(name = "Bearer Authentication")
public class UserController {
    private final UserService userService;

    @Operation(
            summary = "Get user profile",
            description = "Returns information about the currently authenticated user, including their role and all associated permissions"
    )
    @ApiResponses(value = {
            @ApiResponse(responseCode = "200", description = "User profile retrieved successfully",
                    content = @Content(schema = @Schema(implementation = UserDTO.class))),
            @ApiResponse(responseCode = "401", description = "Unauthorized - Invalid or expired token",
                    content = @Content),
            @ApiResponse(responseCode = "403", description = "Forbidden - User is not authenticated",
                    content = @Content),
            @ApiResponse(responseCode = "500", description = "Internal server error",
                    content = @Content)
    })
    @GetMapping("/profile")
    public ResponseEntity<UserDTO> getUserProfile(Authentication authentication) {
        String email = authentication.getName();
        return ResponseEntity.ok(userService.getUserProfile(email));
    }

    @Operation(
            summary = "Get all users",
            description = "Returns a list of all users in the system"
    )
    @ApiResponses(value = {
            @ApiResponse(responseCode = "200", description = "Users retrieved successfully",
                    content = @Content(schema = @Schema(implementation = UserDTO.class))),
            @ApiResponse(responseCode = "200", description = "Users retrieved successfully (paginated)",
                    content = @Content(schema = @Schema(implementation = UserPaginatedResponse.class))),
            @ApiResponse(responseCode = "401", description = "Unauthorized - User is not authenticated",
                    content = @Content),
            @ApiResponse(responseCode = "403", description = "Forbidden - Insufficient permissions",
                    content = @Content),
            @ApiResponse(responseCode = "500", description = "Internal server error",
                    content = @Content)
    })
    @GetMapping
    @PreAuthorize("hasAuthority('users.read')")
    public ResponseEntity<?> getAllUsers(@RequestParam(required = false) Integer limit, @RequestParam(required = false) Integer offset, @RequestParam(required = false) String search, HttpServletRequest request) {
        if(limit != null && offset != null){
            PaginationValidator.validatePaginationParams(limit, offset);

            int page = (offset + limit - 1) / limit;
            Pageable pageable = PageRequest.of(page, limit, Sort.by("id").ascending());
            Page<UserDTO> usersPage = userService.getAllUsersPaginated(search, pageable);
            PaginatedResponse<UserDTO> response = PaginationValidator.buildPaginatedResponse(
                    usersPage,
                    limit,
                    offset,
                    request.getRequestURI(),
                    request.getQueryString()
            );
            return ResponseEntity.ok(response);
        } else {
            List<UserDTO> users = userService.getAllUsers(search);
            return ResponseEntity.ok(users);
        }
    }

    @Operation(
            summary = "Retrieve user data by ID",
            description = "Retrieves user data by ID"
    )
    @ApiResponses(value = {
            @ApiResponse(responseCode = "200", description = "User data retrieved successfully",
                    content = @Content(schema = @Schema(implementation = UserDTO.class))),
            @ApiResponse(responseCode = "401", description = "Unauthorized - User is not authenticated",
                    content = @Content),
            @ApiResponse(responseCode = "403", description = "Forbidden - Insufficient permissions",
                    content = @Content),
            @ApiResponse(responseCode = "404", description = "User not found",
                    content = @Content),
            @ApiResponse(responseCode = "500", description = "Internal server error",
                    content = @Content)
    })
    @GetMapping("/{id}")
    @PreAuthorize("hasAuthority('users.read')")
    public ResponseEntity<UserDTO> getUserById(@PathVariable Long id) {
        return ResponseEntity.ok(userService.getUserById(id));
    }

    @Operation(
            summary = "Create a new user",
            description = "Creates a new user with the provided information"
    )
    @ApiResponses(value = {
            @ApiResponse(responseCode = "201", description = "User created successfully",
                    content = @Content(schema = @Schema(implementation = UserDTO.class))),
            @ApiResponse(responseCode = "400", description = "Bad request - Email already exists",
                    content = @Content),
            @ApiResponse(responseCode = "401", description = "Unauthorized - User is not authenticated",
                    content = @Content),
            @ApiResponse(responseCode = "403", description = "Forbidden - Insufficient permissions",
                    content = @Content),
            @ApiResponse(responseCode = "500", description = "Internal server error",
                    content = @Content)
    })
    @PostMapping
    @PreAuthorize("hasAuthority('users.create')")
    public ResponseEntity<UserDTO> createUser(@Valid @RequestBody CreateUserDTO request) {
        return ResponseEntity.status(HttpStatus.CREATED).body(userService.createUser(request));
    }

    @Operation(
            summary = "Update user information",
            description = "Updates the user information with the provided information"
    )
    @ApiResponses(value = {
            @ApiResponse(responseCode = "200", description = "User updated successfully",
                    content = @Content(schema = @Schema(implementation = UserDTO.class))),
            @ApiResponse(responseCode = "400", description = "Bad request",
                    content = @Content),
            @ApiResponse(responseCode = "401", description = "Unauthorized - User is not authenticated",
                    content = @Content),
            @ApiResponse(responseCode = "403", description = "Forbidden - Insufficient permissions",
                    content = @Content),
            @ApiResponse(responseCode = "404", description = "User not found",
                    content = @Content),
            @ApiResponse(responseCode = "500", description = "Internal server error",
                    content = @Content)
    })
    @PutMapping("/{id}")
    @PreAuthorize("hasAuthority('users.update')")
    public ResponseEntity<UserDTO> updateUser(@PathVariable Long id, @Valid @RequestBody UpdateUserDTO request) {
        return ResponseEntity.ok(userService.updateUser(id, request));
    }

    @Operation(
            summary = "Deactivate user",
            description = "Deactivates a user by setting their status to inactive"
    )
    @ApiResponses(value = {
            @ApiResponse(responseCode = "200", description = "User deactivated successfully",
                    content = @Content(schema = @Schema(implementation = MessageResponse.class))),
            @ApiResponse(responseCode = "401", description = "Unauthorized - User is not authenticated",
                    content = @Content),
            @ApiResponse(responseCode = "403", description = "Forbidden - Insufficient permissions",
                    content = @Content),
            @ApiResponse(responseCode = "404", description = "User not found",
                    content = @Content),
            @ApiResponse(responseCode = "500", description = "Internal server error",
                    content = @Content)
    })
    @DeleteMapping("/{id}")
    @PreAuthorize("hasAuthority('users.delete')")
    public ResponseEntity<MessageResponse> deleteUser(@PathVariable Long id) {
        userService.deleteUser(id);
        return ResponseEntity.ok(new MessageResponse("User deactivated successfully"));
    }

    @Operation(
            summary = "Update user status",
            description = "Updates the status of a user (activate/deactivate)"
    )
    @ApiResponses(value = {
            @ApiResponse(responseCode = "200", description = "User status updated successfully",
                    content = @Content(schema = @Schema(implementation = MessageResponse.class))),
            @ApiResponse(responseCode = "401", description = "Unauthorized - User is not authenticated",
                    content = @Content),
            @ApiResponse(responseCode = "403", description = "Forbidden - Insufficient permissions",
                    content = @Content),
            @ApiResponse(responseCode = "404", description = "User not found",
                    content = @Content),
            @ApiResponse(responseCode = "500", description = "Internal server error",
                    content = @Content)
    })
    @PatchMapping("/{id}/status")
    @PreAuthorize("hasAuthority('users.update')")
    public ResponseEntity<MessageResponse> updateUserStatus(@PathVariable Long id, @Valid @RequestBody UserStatusDTO statusDTO) {
        userService.updateUserStatus(id, statusDTO.getIsActive());
        return ResponseEntity.ok(new MessageResponse("User status updated successfully"));
    }

    @Operation(summary = "Update own profile", description = "Allows the authenticated user to update their own name and email")
    @PutMapping("/profile")
    public ResponseEntity<UserDTO> updateProfile(Authentication authentication, @Valid @RequestBody UpdateProfileDTO dto) {
        Long userId = ((User) authentication.getPrincipal()).getId();
        return ResponseEntity.ok(userService.updateProfile(userId, dto));
    }

    @Operation(summary = "Upload avatar", description = "Allows the authenticated user to upload a profile picture")
    @PostMapping("/profile/avatar")
    public ResponseEntity<UserDTO> uploadAvatar(Authentication authentication, @RequestParam("file") MultipartFile file) {
        Long userId = ((User) authentication.getPrincipal()).getId();
        return ResponseEntity.ok(userService.uploadAvatar(userId, file));
    }

    @Operation(summary = "Delete avatar", description = "Removes the authenticated user's profile picture")
    @DeleteMapping("/profile/avatar")
    public ResponseEntity<UserDTO> deleteAvatar(Authentication authentication) {
        Long userId = ((User) authentication.getPrincipal()).getId();
        return ResponseEntity.ok(userService.deleteAvatar(userId));
    }

    @Operation(summary = "Change password", description = "Allows the authenticated user to change their password")
    @PostMapping("/profile/change-password")
    public ResponseEntity<MessageResponse> changePassword(Authentication authentication, @Valid @RequestBody ChangePasswordDTO dto) {
        Long userId = ((User) authentication.getPrincipal()).getId();
        userService.changePassword(userId, dto);
        return ResponseEntity.ok(new MessageResponse("Password changed successfully"));
    }
}
