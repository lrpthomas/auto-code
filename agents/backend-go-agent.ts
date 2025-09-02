import { Agent, AgentTask, AgentResult } from '../src/types';
import * as fs from 'fs';
import * as path from 'path';

export class BackendGoAgent implements Agent {
  id = 'backend-go-agent';
  name = 'Go Backend Agent';
  type = 'backend';
  capabilities = ['go', 'gin', 'gorilla-mux', 'gorm', 'rest-api', 'authentication', 'middleware'];

  async initialize(): Promise<void> {
    // Go agent initialization
  }

  async execute(task: AgentTask): Promise<AgentResult> {
    try {
      const requirements = task.requirements;
      const appName = requirements.appName || 'go-api';
      const features = requirements.features || [];
      
      const projectStructure = this.generateProjectStructure(appName, features);
      
      return {
        success: true,
        data: {
          type: 'go-backend',
          structure: projectStructure,
          framework: 'gin',
          features: this.getImplementedFeatures(features)
        },
        metadata: {
          agent: this.name,
          language: 'go',
          framework: 'gin',
          estimatedTime: '2-3 minutes'
        }
      };
    } catch (error) {
      return {
        success: false,
        error: `Go Backend Agent failed: ${error}`
      };
    }
  }

  async cleanup(): Promise<void> {
    // Cleanup resources if needed
  }

  private generateProjectStructure(appName: string, features: string[]): Record<string, string> {
    const structure: Record<string, string> = {};

    // Go module file
    structure['go.mod'] = this.generateGoMod(appName);

    // Main application file
    structure['main.go'] = this.generateMainGo(features);

    // Configuration
    structure['config/config.go'] = this.generateConfig();
    structure['config/database.go'] = this.generateDatabaseConfig(features);

    // Models
    if (features.includes('user-management') || features.includes('authentication')) {
      structure['models/user.go'] = this.generateUserModel();
    }
    structure['models/base.go'] = this.generateBaseModel();

    // Handlers/Controllers
    structure['handlers/health.go'] = this.generateHealthHandler();
    if (features.includes('user-management') || features.includes('authentication')) {
      structure['handlers/auth.go'] = this.generateAuthHandler();
      structure['handlers/user.go'] = this.generateUserHandler();
    }

    // Services
    if (features.includes('user-management') || features.includes('authentication')) {
      structure['services/auth.go'] = this.generateAuthService();
      structure['services/user.go'] = this.generateUserService();
    }

    // Middleware
    structure['middleware/cors.go'] = this.generateCorsMiddleware();
    structure['middleware/logger.go'] = this.generateLoggerMiddleware();
    if (features.includes('authentication')) {
      structure['middleware/auth.go'] = this.generateAuthMiddleware();
    }

    // Repository layer
    if (features.includes('user-management') || features.includes('authentication')) {
      structure['repository/user.go'] = this.generateUserRepository();
    }

    // Utilities
    structure['utils/jwt.go'] = this.generateJwtUtils();
    structure['utils/hash.go'] = this.generateHashUtils();
    structure['utils/response.go'] = this.generateResponseUtils();

    // Routes
    structure['routes/routes.go'] = this.generateRoutes(features);

    // Tests
    structure['handlers/health_test.go'] = this.generateHealthTest();
    if (features.includes('authentication')) {
      structure['handlers/auth_test.go'] = this.generateAuthTest();
    }
    structure['main_test.go'] = this.generateMainTest();

    // Docker configuration
    structure['Dockerfile'] = this.generateDockerfile();
    structure['docker-compose.yml'] = this.generateDockerCompose(appName, features);

    // Environment files
    structure['.env.example'] = this.generateEnvExample(features);

    // README
    structure['README.md'] = this.generateReadme(appName, features);

    // Makefile
    structure['Makefile'] = this.generateMakefile();

    return structure;
  }

  private generateGoMod(appName: string): string {
    return `module ${appName}

go 1.21

require (
	github.com/gin-gonic/gin v1.9.1
	github.com/golang-jwt/jwt/v5 v5.0.0
	github.com/joho/godotenv v1.4.0
	golang.org/x/crypto v0.15.0
	gorm.io/driver/postgres v1.5.4
	gorm.io/driver/sqlite v1.5.4
	gorm.io/gorm v1.25.5
)

require (
	github.com/bytedance/sonic v1.9.1 // indirect
	github.com/chenzhuoyu/base64x v0.0.0-20221115062448-fe3a3abad311 // indirect
	github.com/gabriel-vasile/mimetype v1.4.2 // indirect
	github.com/gin-contrib/sse v0.1.0 // indirect
	github.com/go-playground/locales v0.14.1 // indirect
	github.com/go-playground/universal-translator v0.18.1 // indirect
	github.com/go-playground/validator/v10 v10.14.0 // indirect
	github.com/goccy/go-json v0.10.2 // indirect
	github.com/json-iterator/go v1.1.12 // indirect
	github.com/klauspost/cpuid/v2 v2.2.4 // indirect
	github.com/leodido/go-urn v1.2.4 // indirect
	github.com/mattn/go-isatty v0.0.19 // indirect
	github.com/modern-go/concurrent v0.0.0-20180306012644-bacd9c7ef1dd // indirect
	github.com/modern-go/reflect2 v1.0.2 // indirect
	github.com/pelletier/go-toml/v2 v2.0.8 // indirect
	github.com/twitchyliquid64/golang-asm v0.15.1 // indirect
	github.com/ugorji/go/codec v1.2.11 // indirect
	golang.org/x/arch v0.3.0 // indirect
	golang.org/x/net v0.10.0 // indirect
	golang.org/x/sys v0.14.0 // indirect
	golang.org/x/text v0.14.0 // indirect
	google.golang.org/protobuf v1.30.0 // indirect
	gopkg.in/yaml.v3 v3.0.1 // indirect
)
`;
  }

  private generateMainGo(features: string[]): string {
    return `package main

import (
	"log"
	"os"

	"github.com/gin-gonic/gin"
	"github.com/joho/godotenv"

	"./config"
	"./routes"
)

func main() {
	// Load environment variables
	if err := godotenv.Load(); err != nil {
		log.Println("No .env file found")
	}

	// Initialize database
	if err := config.InitDB(); err != nil {
		log.Fatal("Failed to connect to database:", err)
	}

	// Run database migrations
	if err := config.Migrate(); err != nil {
		log.Fatal("Failed to run migrations:", err)
	}

	// Initialize Gin router
	r := gin.Default()

	// Setup routes
	routes.SetupRoutes(r)

	// Get port from environment or use default
	port := os.Getenv("PORT")
	if port == "" {
		port = "8080"
	}

	log.Printf("Server starting on port %s", port)
	if err := r.Run(":" + port); err != nil {
		log.Fatal("Failed to start server:", err)
	}
}
`;
  }

  private generateConfig(): string {
    return `package config

import (
	"os"
	"strconv"
	"time"
)

type Config struct {
	Port        string
	Environment string
	JWTSecret   string
	JWTExpiry   time.Duration
	DatabaseURL string
	DBType      string
}

var AppConfig *Config

func init() {
	AppConfig = &Config{
		Port:        getEnv("PORT", "8080"),
		Environment: getEnv("ENVIRONMENT", "development"),
		JWTSecret:   getEnv("JWT_SECRET", "your-secret-key-change-in-production"),
		JWTExpiry:   getDurationEnv("JWT_EXPIRY_HOURS", 24) * time.Hour,
		DatabaseURL: getEnv("DATABASE_URL", "sqlite://app.db"),
		DBType:      getEnv("DB_TYPE", "sqlite"),
	}
}

func getEnv(key, fallback string) string {
	if value := os.Getenv(key); value != "" {
		return value
	}
	return fallback
}

func getDurationEnv(key string, fallback int) time.Duration {
	if value := os.Getenv(key); value != "" {
		if hours, err := strconv.Atoi(value); err == nil {
			return time.Duration(hours)
		}
	}
	return time.Duration(fallback)
}
`;
  }

  private generateDatabaseConfig(features: string[]): string {
    return `package config

import (
	"fmt"
	"log"

	"gorm.io/driver/postgres"
	"gorm.io/driver/sqlite"
	"gorm.io/gorm"
	"gorm.io/gorm/logger"

	"../models"
)

var DB *gorm.DB

func InitDB() error {
	var err error
	var dialector gorm.Dialector

	switch AppConfig.DBType {
	case "postgres":
		dialector = postgres.Open(AppConfig.DatabaseURL)
	case "sqlite":
		dbPath := "app.db"
		if AppConfig.DatabaseURL != "sqlite://app.db" {
			dbPath = AppConfig.DatabaseURL[9:] // Remove "sqlite://" prefix
		}
		dialector = sqlite.Open(dbPath)
	default:
		return fmt.Errorf("unsupported database type: %s", AppConfig.DBType)
	}

	config := &gorm.Config{}
	if AppConfig.Environment == "development" {
		config.Logger = logger.Default.LogMode(logger.Info)
	}

	DB, err = gorm.Open(dialector, config)
	if err != nil {
		return fmt.Errorf("failed to connect to database: %w", err)
	}

	log.Println("Database connected successfully")
	return nil
}

func Migrate() error {
	${features.includes('user-management') || features.includes('authentication') ? `
	if err := DB.AutoMigrate(&models.User{}); err != nil {
		return fmt.Errorf("failed to migrate User model: %w", err)
	}
	` : ''}

	log.Println("Database migration completed successfully")
	return nil
}
`;
  }

  private generateUserModel(): string {
    return `package models

import (
	"time"

	"gorm.io/gorm"
)

type User struct {
	ID        uint           \`json:"id" gorm:"primaryKey"\`
	Email     string         \`json:"email" gorm:"uniqueIndex;not null"\`
	Username  string         \`json:"username" gorm:"uniqueIndex;not null"\`
	Password  string         \`json:"-" gorm:"not null"\`
	FirstName string         \`json:"first_name"\`
	LastName  string         \`json:"last_name"\`
	IsActive  bool           \`json:"is_active" gorm:"default:true"\`
	Role      string         \`json:"role" gorm:"default:'user'"\`
	CreatedAt time.Time      \`json:"created_at"\`
	UpdatedAt time.Time      \`json:"updated_at"\`
	DeletedAt gorm.DeletedAt \`json:"-" gorm:"index"\`
}

type UserCreateRequest struct {
	Email     string \`json:"email" binding:"required,email"\`
	Username  string \`json:"username" binding:"required,min=3,max=50"\`
	Password  string \`json:"password" binding:"required,min=8"\`
	FirstName string \`json:"first_name" binding:"required"\`
	LastName  string \`json:"last_name" binding:"required"\`
}

type UserUpdateRequest struct {
	FirstName *string \`json:"first_name,omitempty"\`
	LastName  *string \`json:"last_name,omitempty"\`
	Email     *string \`json:"email,omitempty" binding:"omitempty,email"\`
}

type UserResponse struct {
	ID        uint      \`json:"id"\`
	Email     string    \`json:"email"\`
	Username  string    \`json:"username"\`
	FirstName string    \`json:"first_name"\`
	LastName  string    \`json:"last_name"\`
	IsActive  bool      \`json:"is_active"\`
	Role      string    \`json:"role"\`
	CreatedAt time.Time \`json:"created_at"\`
	UpdatedAt time.Time \`json:"updated_at"\`
}

func (u *User) ToResponse() UserResponse {
	return UserResponse{
		ID:        u.ID,
		Email:     u.Email,
		Username:  u.Username,
		FirstName: u.FirstName,
		LastName:  u.LastName,
		IsActive:  u.IsActive,
		Role:      u.Role,
		CreatedAt: u.CreatedAt,
		UpdatedAt: u.UpdatedAt,
	}
}
`;
  }

  private generateBaseModel(): string {
    return `package models

import (
	"time"

	"gorm.io/gorm"
)

type BaseModel struct {
	ID        uint           \`json:"id" gorm:"primaryKey"\`
	CreatedAt time.Time      \`json:"created_at"\`
	UpdatedAt time.Time      \`json:"updated_at"\`
	DeletedAt gorm.DeletedAt \`json:"-" gorm:"index"\`
}

type LoginRequest struct {
	Email    string \`json:"email" binding:"required,email"\`
	Password string \`json:"password" binding:"required"\`
}

type LoginResponse struct {
	Token     string       \`json:"token"\`
	ExpiresAt time.Time    \`json:"expires_at"\`
	User      UserResponse \`json:"user"\`
}

type ErrorResponse struct {
	Error   string \`json:"error"\`
	Message string \`json:"message,omitempty"\`
}

type SuccessResponse struct {
	Success bool        \`json:"success"\`
	Data    interface{} \`json:"data,omitempty"\`
	Message string      \`json:"message,omitempty"\`
}
`;
  }

  private generateHealthHandler(): string {
    return `package handlers

import (
	"net/http"
	"time"

	"github.com/gin-gonic/gin"

	"../config"
	"../utils"
)

func HealthCheck(c *gin.Context) {
	// Check database connection
	sqlDB, err := config.DB.DB()
	dbStatus := "ok"
	if err != nil || sqlDB.Ping() != nil {
		dbStatus = "error"
	}

	response := gin.H{
		"status":    "ok",
		"timestamp": time.Now().Unix(),
		"service":   "go-api",
		"database":  dbStatus,
		"version":   "1.0.0",
	}

	utils.SendSuccessResponse(c, http.StatusOK, response, "Service is healthy")
}

func ReadinessCheck(c *gin.Context) {
	// Perform more comprehensive checks for readiness
	checks := map[string]string{
		"database": "ok",
		"config":   "ok",
	}

	// Database check
	sqlDB, err := config.DB.DB()
	if err != nil || sqlDB.Ping() != nil {
		checks["database"] = "error"
	}

	// Config check
	if config.AppConfig.JWTSecret == "" {
		checks["config"] = "error"
	}

	allHealthy := true
	for _, status := range checks {
		if status == "error" {
			allHealthy = false
			break
		}
	}

	response := gin.H{
		"ready":     allHealthy,
		"checks":    checks,
		"timestamp": time.Now().Unix(),
	}

	statusCode := http.StatusOK
	if !allHealthy {
		statusCode = http.StatusServiceUnavailable
	}

	c.JSON(statusCode, response)
}
`;
  }

  private generateAuthHandler(): string {
    return `package handlers

import (
	"net/http"
	"strings"

	"github.com/gin-gonic/gin"

	"../models"
	"../services"
	"../utils"
)

type AuthHandler struct {
	authService *services.AuthService
}

func NewAuthHandler(authService *services.AuthService) *AuthHandler {
	return &AuthHandler{
		authService: authService,
	}
}

func (h *AuthHandler) Register(c *gin.Context) {
	var req models.UserCreateRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		utils.SendErrorResponse(c, http.StatusBadRequest, "Invalid request", err.Error())
		return
	}

	user, err := h.authService.Register(req)
	if err != nil {
		if strings.Contains(err.Error(), "already exists") {
			utils.SendErrorResponse(c, http.StatusConflict, "User already exists", err.Error())
			return
		}
		utils.SendErrorResponse(c, http.StatusInternalServerError, "Registration failed", err.Error())
		return
	}

	// Generate JWT token
	token, expiresAt, err := utils.GenerateJWT(user.ID, user.Email, user.Role)
	if err != nil {
		utils.SendErrorResponse(c, http.StatusInternalServerError, "Token generation failed", err.Error())
		return
	}

	response := models.LoginResponse{
		Token:     token,
		ExpiresAt: expiresAt,
		User:      user.ToResponse(),
	}

	utils.SendSuccessResponse(c, http.StatusCreated, response, "User registered successfully")
}

func (h *AuthHandler) Login(c *gin.Context) {
	var req models.LoginRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		utils.SendErrorResponse(c, http.StatusBadRequest, "Invalid request", err.Error())
		return
	}

	user, err := h.authService.Login(req.Email, req.Password)
	if err != nil {
		utils.SendErrorResponse(c, http.StatusUnauthorized, "Authentication failed", "Invalid credentials")
		return
	}

	// Generate JWT token
	token, expiresAt, err := utils.GenerateJWT(user.ID, user.Email, user.Role)
	if err != nil {
		utils.SendErrorResponse(c, http.StatusInternalServerError, "Token generation failed", err.Error())
		return
	}

	response := models.LoginResponse{
		Token:     token,
		ExpiresAt: expiresAt,
		User:      user.ToResponse(),
	}

	utils.SendSuccessResponse(c, http.StatusOK, response, "Login successful")
}

func (h *AuthHandler) RefreshToken(c *gin.Context) {
	userID, exists := c.Get("user_id")
	if !exists {
		utils.SendErrorResponse(c, http.StatusUnauthorized, "Unauthorized", "User ID not found")
		return
	}

	user, err := h.authService.GetUserByID(userID.(uint))
	if err != nil {
		utils.SendErrorResponse(c, http.StatusNotFound, "User not found", err.Error())
		return
	}

	// Generate new JWT token
	token, expiresAt, err := utils.GenerateJWT(user.ID, user.Email, user.Role)
	if err != nil {
		utils.SendErrorResponse(c, http.StatusInternalServerError, "Token generation failed", err.Error())
		return
	}

	response := models.LoginResponse{
		Token:     token,
		ExpiresAt: expiresAt,
		User:      user.ToResponse(),
	}

	utils.SendSuccessResponse(c, http.StatusOK, response, "Token refreshed successfully")
}

func (h *AuthHandler) GetProfile(c *gin.Context) {
	userID, exists := c.Get("user_id")
	if !exists {
		utils.SendErrorResponse(c, http.StatusUnauthorized, "Unauthorized", "User ID not found")
		return
	}

	user, err := h.authService.GetUserByID(userID.(uint))
	if err != nil {
		utils.SendErrorResponse(c, http.StatusNotFound, "User not found", err.Error())
		return
	}

	utils.SendSuccessResponse(c, http.StatusOK, user.ToResponse(), "Profile retrieved successfully")
}
`;
  }

  private generateUserHandler(): string {
    return `package handlers

import (
	"net/http"
	"strconv"

	"github.com/gin-gonic/gin"

	"../models"
	"../services"
	"../utils"
)

type UserHandler struct {
	userService *services.UserService
}

func NewUserHandler(userService *services.UserService) *UserHandler {
	return &UserHandler{
		userService: userService,
	}
}

func (h *UserHandler) GetUsers(c *gin.Context) {
	page, _ := strconv.Atoi(c.DefaultQuery("page", "1"))
	limit, _ := strconv.Atoi(c.DefaultQuery("limit", "10"))

	users, total, err := h.userService.GetUsers(page, limit)
	if err != nil {
		utils.SendErrorResponse(c, http.StatusInternalServerError, "Failed to fetch users", err.Error())
		return
	}

	response := gin.H{
		"users": users,
		"pagination": gin.H{
			"page":  page,
			"limit": limit,
			"total": total,
		},
	}

	utils.SendSuccessResponse(c, http.StatusOK, response, "Users retrieved successfully")
}

func (h *UserHandler) GetUser(c *gin.Context) {
	userID, err := strconv.ParseUint(c.Param("id"), 10, 32)
	if err != nil {
		utils.SendErrorResponse(c, http.StatusBadRequest, "Invalid user ID", err.Error())
		return
	}

	user, err := h.userService.GetUserByID(uint(userID))
	if err != nil {
		utils.SendErrorResponse(c, http.StatusNotFound, "User not found", err.Error())
		return
	}

	utils.SendSuccessResponse(c, http.StatusOK, user.ToResponse(), "User retrieved successfully")
}

func (h *UserHandler) UpdateUser(c *gin.Context) {
	userID, err := strconv.ParseUint(c.Param("id"), 10, 32)
	if err != nil {
		utils.SendErrorResponse(c, http.StatusBadRequest, "Invalid user ID", err.Error())
		return
	}

	var req models.UserUpdateRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		utils.SendErrorResponse(c, http.StatusBadRequest, "Invalid request", err.Error())
		return
	}

	user, err := h.userService.UpdateUser(uint(userID), req)
	if err != nil {
		utils.SendErrorResponse(c, http.StatusInternalServerError, "Failed to update user", err.Error())
		return
	}

	utils.SendSuccessResponse(c, http.StatusOK, user.ToResponse(), "User updated successfully")
}

func (h *UserHandler) DeleteUser(c *gin.Context) {
	userID, err := strconv.ParseUint(c.Param("id"), 10, 32)
	if err != nil {
		utils.SendErrorResponse(c, http.StatusBadRequest, "Invalid user ID", err.Error())
		return
	}

	if err := h.userService.DeleteUser(uint(userID)); err != nil {
		utils.SendErrorResponse(c, http.StatusInternalServerError, "Failed to delete user", err.Error())
		return
	}

	utils.SendSuccessResponse(c, http.StatusOK, nil, "User deleted successfully")
}
`;
  }

  private generateAuthService(): string {
    return `package services

import (
	"errors"

	"../models"
	"../repository"
	"../utils"
)

type AuthService struct {
	userRepo *repository.UserRepository
}

func NewAuthService(userRepo *repository.UserRepository) *AuthService {
	return &AuthService{
		userRepo: userRepo,
	}
}

func (s *AuthService) Register(req models.UserCreateRequest) (*models.User, error) {
	// Check if user already exists
	if _, err := s.userRepo.GetByEmail(req.Email); err == nil {
		return nil, errors.New("user with this email already exists")
	}

	if _, err := s.userRepo.GetByUsername(req.Username); err == nil {
		return nil, errors.New("user with this username already exists")
	}

	// Hash password
	hashedPassword, err := utils.HashPassword(req.Password)
	if err != nil {
		return nil, err
	}

	user := &models.User{
		Email:     req.Email,
		Username:  req.Username,
		Password:  hashedPassword,
		FirstName: req.FirstName,
		LastName:  req.LastName,
		IsActive:  true,
		Role:      "user",
	}

	return s.userRepo.Create(user)
}

func (s *AuthService) Login(email, password string) (*models.User, error) {
	user, err := s.userRepo.GetByEmail(email)
	if err != nil {
		return nil, errors.New("invalid credentials")
	}

	if !user.IsActive {
		return nil, errors.New("account is deactivated")
	}

	if !utils.CheckPassword(password, user.Password) {
		return nil, errors.New("invalid credentials")
	}

	return user, nil
}

func (s *AuthService) GetUserByID(id uint) (*models.User, error) {
	return s.userRepo.GetByID(id)
}
`;
  }

  private generateUserService(): string {
    return `package services

import (
	"../models"
	"../repository"
)

type UserService struct {
	userRepo *repository.UserRepository
}

func NewUserService(userRepo *repository.UserRepository) *UserService {
	return &UserService{
		userRepo: userRepo,
	}
}

func (s *UserService) GetUsers(page, limit int) ([]models.User, int64, error) {
	return s.userRepo.GetAll(page, limit)
}

func (s *UserService) GetUserByID(id uint) (*models.User, error) {
	return s.userRepo.GetByID(id)
}

func (s *UserService) UpdateUser(id uint, req models.UserUpdateRequest) (*models.User, error) {
	user, err := s.userRepo.GetByID(id)
	if err != nil {
		return nil, err
	}

	if req.FirstName != nil {
		user.FirstName = *req.FirstName
	}
	if req.LastName != nil {
		user.LastName = *req.LastName
	}
	if req.Email != nil {
		user.Email = *req.Email
	}

	return s.userRepo.Update(user)
}

func (s *UserService) DeleteUser(id uint) error {
	return s.userRepo.Delete(id)
}

func (s *UserService) GetByEmail(email string) (*models.User, error) {
	return s.userRepo.GetByEmail(email)
}

func (s *UserService) GetByUsername(username string) (*models.User, error) {
	return s.userRepo.GetByUsername(username)
}
`;
  }

  private generateCorsMiddleware(): string {
    return `package middleware

import (
	"github.com/gin-gonic/gin"
)

func CORS() gin.HandlerFunc {
	return gin.HandlerFunc(func(c *gin.Context) {
		c.Header("Access-Control-Allow-Origin", "*")
		c.Header("Access-Control-Allow-Credentials", "true")
		c.Header("Access-Control-Allow-Headers", "Content-Type, Content-Length, Accept-Encoding, X-CSRF-Token, Authorization, accept, origin, Cache-Control, X-Requested-With")
		c.Header("Access-Control-Allow-Methods", "POST, OPTIONS, GET, PUT, DELETE, PATCH")

		if c.Request.Method == "OPTIONS" {
			c.AbortWithStatus(204)
			return
		}

		c.Next()
	})
}
`;
  }

  private generateLoggerMiddleware(): string {
    return `package middleware

import (
	"time"

	"github.com/gin-gonic/gin"
)

func Logger() gin.HandlerFunc {
	return gin.LoggerWithFormatter(func(param gin.LogFormatterParams) string {
		return fmt.Sprintf("%s - [%s] \"%s %s %s %d %s \"%s\" %s\"\n",
			param.ClientIP,
			param.TimeStamp.Format(time.RFC1123),
			param.Method,
			param.Path,
			param.Request.Proto,
			param.StatusCode,
			param.Latency,
			param.Request.UserAgent(),
			param.ErrorMessage,
		)
	})
}
`;
  }

  private generateAuthMiddleware(): string {
    return `package middleware

import (
	"net/http"
	"strings"

	"github.com/gin-gonic/gin"

	"../utils"
)

func AuthRequired() gin.HandlerFunc {
	return func(c *gin.Context) {
		authHeader := c.GetHeader("Authorization")
		if authHeader == "" {
			utils.SendErrorResponse(c, http.StatusUnauthorized, "Authorization header required", "")
			c.Abort()
			return
		}

		tokenString := strings.TrimPrefix(authHeader, "Bearer ")
		if tokenString == authHeader {
			utils.SendErrorResponse(c, http.StatusUnauthorized, "Bearer token required", "")
			c.Abort()
			return
		}

		claims, err := utils.ValidateJWT(tokenString)
		if err != nil {
			utils.SendErrorResponse(c, http.StatusUnauthorized, "Invalid token", err.Error())
			c.Abort()
			return
		}

		c.Set("user_id", claims.UserID)
		c.Set("user_email", claims.Email)
		c.Set("user_role", claims.Role)
		c.Next()
	}
}

func AdminRequired() gin.HandlerFunc {
	return func(c *gin.Context) {
		role, exists := c.Get("user_role")
		if !exists || role != "admin" {
			utils.SendErrorResponse(c, http.StatusForbidden, "Admin access required", "")
			c.Abort()
			return
		}
		c.Next()
	}
}
`;
  }

  private generateUserRepository(): string {
    return `package repository

import (
	"../config"
	"../models"
)

type UserRepository struct{}

func NewUserRepository() *UserRepository {
	return &UserRepository{}
}

func (r *UserRepository) Create(user *models.User) (*models.User, error) {
	if err := config.DB.Create(user).Error; err != nil {
		return nil, err
	}
	return user, nil
}

func (r *UserRepository) GetByID(id uint) (*models.User, error) {
	var user models.User
	if err := config.DB.First(&user, id).Error; err != nil {
		return nil, err
	}
	return &user, nil
}

func (r *UserRepository) GetByEmail(email string) (*models.User, error) {
	var user models.User
	if err := config.DB.Where("email = ?", email).First(&user).Error; err != nil {
		return nil, err
	}
	return &user, nil
}

func (r *UserRepository) GetByUsername(username string) (*models.User, error) {
	var user models.User
	if err := config.DB.Where("username = ?", username).First(&user).Error; err != nil {
		return nil, err
	}
	return &user, nil
}

func (r *UserRepository) GetAll(page, limit int) ([]models.User, int64, error) {
	var users []models.User
	var total int64

	offset := (page - 1) * limit

	// Count total users
	if err := config.DB.Model(&models.User{}).Count(&total).Error; err != nil {
		return nil, 0, err
	}

	// Get paginated users
	if err := config.DB.Offset(offset).Limit(limit).Find(&users).Error; err != nil {
		return nil, 0, err
	}

	return users, total, nil
}

func (r *UserRepository) Update(user *models.User) (*models.User, error) {
	if err := config.DB.Save(user).Error; err != nil {
		return nil, err
	}
	return user, nil
}

func (r *UserRepository) Delete(id uint) error {
	return config.DB.Delete(&models.User{}, id).Error
}
`;
  }

  private generateJwtUtils(): string {
    return `package utils

import (
	"errors"
	"time"

	"github.com/golang-jwt/jwt/v5"

	"../config"
)

type Claims struct {
	UserID uint   \`json:"user_id"\`
	Email  string \`json:"email"\`
	Role   string \`json:"role"\`
	jwt.RegisteredClaims
}

func GenerateJWT(userID uint, email, role string) (string, time.Time, error) {
	expirationTime := time.Now().Add(config.AppConfig.JWTExpiry)
	
	claims := &Claims{
		UserID: userID,
		Email:  email,
		Role:   role,
		RegisteredClaims: jwt.RegisteredClaims{
			ExpiresAt: jwt.NewNumericDate(expirationTime),
			IssuedAt:  jwt.NewNumericDate(time.Now()),
		},
	}

	token := jwt.NewWithClaims(jwt.SigningMethodHS256, claims)
	tokenString, err := token.SignedString([]byte(config.AppConfig.JWTSecret))
	if err != nil {
		return "", time.Time{}, err
	}

	return tokenString, expirationTime, nil
}

func ValidateJWT(tokenString string) (*Claims, error) {
	claims := &Claims{}

	token, err := jwt.ParseWithClaims(tokenString, claims, func(token *jwt.Token) (interface{}, error) {
		return []byte(config.AppConfig.JWTSecret), nil
	})

	if err != nil {
		return nil, err
	}

	if !token.Valid {
		return nil, errors.New("invalid token")
	}

	return claims, nil
}
`;
  }

  private generateHashUtils(): string {
    return `package utils

import (
	"golang.org/x/crypto/bcrypt"
)

func HashPassword(password string) (string, error) {
	bytes, err := bcrypt.GenerateFromPassword([]byte(password), bcrypt.DefaultCost)
	return string(bytes), err
}

func CheckPassword(password, hash string) bool {
	err := bcrypt.CompareHashAndPassword([]byte(hash), []byte(password))
	return err == nil
}
`;
  }

  private generateResponseUtils(): string {
    return `package utils

import (
	"net/http"

	"github.com/gin-gonic/gin"

	"../models"
)

func SendSuccessResponse(c *gin.Context, statusCode int, data interface{}, message string) {
	response := models.SuccessResponse{
		Success: true,
		Data:    data,
		Message: message,
	}
	c.JSON(statusCode, response)
}

func SendErrorResponse(c *gin.Context, statusCode int, error string, message string) {
	response := models.ErrorResponse{
		Error:   error,
		Message: message,
	}
	c.JSON(statusCode, response)
}
`;
  }

  private generateRoutes(features: string[]): string {
    return `package routes

import (
	"github.com/gin-gonic/gin"

	"../handlers"
	"../middleware"
	"../repository"
	"../services"
)

func SetupRoutes(r *gin.Engine) {
	// Middleware
	r.Use(middleware.CORS())
	r.Use(middleware.Logger())

	// Initialize repositories
	userRepo := repository.NewUserRepository()

	// Initialize services
	${features.includes('user-management') || features.includes('authentication') ? `
	authService := services.NewAuthService(userRepo)
	userService := services.NewUserService(userRepo)
	` : ''}

	// Initialize handlers
	${features.includes('user-management') || features.includes('authentication') ? `
	authHandler := handlers.NewAuthHandler(authService)
	userHandler := handlers.NewUserHandler(userService)
	` : ''}

	// Health endpoints
	r.GET("/health", handlers.HealthCheck)
	r.GET("/ready", handlers.ReadinessCheck)

	// API v1 routes
	v1 := r.Group("/api/v1")
	{
		${features.includes('authentication') ? `
		// Auth routes
		auth := v1.Group("/auth")
		{
			auth.POST("/register", authHandler.Register)
			auth.POST("/login", authHandler.Login)
			auth.POST("/refresh", middleware.AuthRequired(), authHandler.RefreshToken)
			auth.GET("/profile", middleware.AuthRequired(), authHandler.GetProfile)
		}
		` : ''}

		${features.includes('user-management') ? `
		// User routes (protected)
		users := v1.Group("/users")
		users.Use(middleware.AuthRequired())
		{
			users.GET("", userHandler.GetUsers)
			users.GET("/:id", userHandler.GetUser)
			users.PUT("/:id", userHandler.UpdateUser)
			users.DELETE("/:id", middleware.AdminRequired(), userHandler.DeleteUser)
		}
		` : ''}
	}
}
`;
  }

  private generateHealthTest(): string {
    return `package handlers

import (
	"net/http"
	"net/http/httptest"
	"testing"

	"github.com/gin-gonic/gin"
	"github.com/stretchr/testify/assert"
)

func TestHealthCheck(t *testing.T) {
	gin.SetMode(gin.TestMode)
	
	router := gin.New()
	router.GET("/health", HealthCheck)

	req, _ := http.NewRequest("GET", "/health", nil)
	w := httptest.NewRecorder()
	router.ServeHTTP(w, req)

	assert.Equal(t, http.StatusOK, w.Code)
	assert.Contains(t, w.Body.String(), "ok")
}

func TestReadinessCheck(t *testing.T) {
	gin.SetMode(gin.TestMode)
	
	router := gin.New()
	router.GET("/ready", ReadinessCheck)

	req, _ := http.NewRequest("GET", "/ready", nil)
	w := httptest.NewRecorder()
	router.ServeHTTP(w, req)

	// Since we don't have a real DB connection in tests, expect service unavailable
	assert.Equal(t, http.StatusServiceUnavailable, w.Code)
	assert.Contains(t, w.Body.String(), "ready")
}
`;
  }

  private generateAuthTest(): string {
    return `package handlers

import (
	"bytes"
	"encoding/json"
	"net/http"
	"net/http/httptest"
	"testing"

	"github.com/gin-gonic/gin"
	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/mock"

	"../models"
	"../services"
)

type MockAuthService struct {
	mock.Mock
}

func (m *MockAuthService) Register(req models.UserCreateRequest) (*models.User, error) {
	args := m.Called(req)
	return args.Get(0).(*models.User), args.Error(1)
}

func (m *MockAuthService) Login(email, password string) (*models.User, error) {
	args := m.Called(email, password)
	return args.Get(0).(*models.User), args.Error(1)
}

func (m *MockAuthService) GetUserByID(id uint) (*models.User, error) {
	args := m.Called(id)
	return args.Get(0).(*models.User), args.Error(1)
}

func TestAuthHandler_Register(t *testing.T) {
	gin.SetMode(gin.TestMode)
	
	mockService := new(MockAuthService)
	handler := NewAuthHandler(mockService)
	
	router := gin.New()
	router.POST("/register", handler.Register)

	user := &models.User{
		ID:       1,
		Email:    "test@example.com",
		Username: "testuser",
	}

	mockService.On("Register", mock.AnythingOfType("models.UserCreateRequest")).Return(user, nil)

	reqBody := models.UserCreateRequest{
		Email:     "test@example.com",
		Username:  "testuser",
		Password:  "password123",
		FirstName: "Test",
		LastName:  "User",
	}

	jsonBody, _ := json.Marshal(reqBody)
	req, _ := http.NewRequest("POST", "/register", bytes.NewBuffer(jsonBody))
	req.Header.Set("Content-Type", "application/json")
	
	w := httptest.NewRecorder()
	router.ServeHTTP(w, req)

	assert.Equal(t, http.StatusCreated, w.Code)
	mockService.AssertExpectations(t)
}
`;
  }

  private generateMainTest(): string {
    return `package main

import (
	"testing"
	"os"
)

func TestMain(m *testing.M) {
	// Set test environment
	os.Setenv("ENVIRONMENT", "test")
	os.Setenv("JWT_SECRET", "test-secret")
	os.Setenv("DB_TYPE", "sqlite")
	os.Setenv("DATABASE_URL", "sqlite://:memory:")

	// Run tests
	code := m.Run()

	// Cleanup
	os.Exit(code)
}
`;
  }

  private generateDockerfile(): string {
    return `# Build stage
FROM golang:1.21-alpine AS builder

WORKDIR /app

# Install dependencies
RUN apk add --no-cache git

# Copy go mod and sum files
COPY go.mod go.sum ./

# Download dependencies
RUN go mod download

# Copy source code
COPY . .

# Build the application
RUN CGO_ENABLED=0 GOOS=linux go build -a -installsuffix cgo -o main .

# Final stage
FROM alpine:latest

RUN apk --no-cache add ca-certificates

WORKDIR /root/

# Copy the binary from builder stage
COPY --from=builder /app/main .

# Expose port
EXPOSE 8080

# Command to run
CMD ["./main"]
`;
  }

  private generateDockerCompose(appName: string, features: string[]): string {
    const hasDatabase = features.includes('user-management') || features.includes('authentication');
    
    return `version: '3.8'

services:
  app:
    build: .
    ports:
      - "8080:8080"
    environment:
      - ENVIRONMENT=development
      - PORT=8080
      - JWT_SECRET=your-secret-key-change-in-production
      - JWT_EXPIRY_HOURS=24
      ${hasDatabase ? `- DB_TYPE=postgres
      - DATABASE_URL=postgres://user:password@db:5432/${appName}?sslmode=disable` : `- DB_TYPE=sqlite
      - DATABASE_URL=sqlite://app.db`}
    ${hasDatabase ? `depends_on:
      - db
    volumes:
      - ./data:/app/data` : `volumes:
      - ./data:/app/data`}
    restart: unless-stopped

  ${hasDatabase ? `db:
    image: postgres:15-alpine
    environment:
      - POSTGRES_USER=user
      - POSTGRES_PASSWORD=password
      - POSTGRES_DB=${appName}
    volumes:
      - postgres_data:/var/lib/postgresql/data
    ports:
      - "5432:5432"
    restart: unless-stopped

volumes:
  postgres_data:` : ''}
`;
  }

  private generateEnvExample(features: string[]): string {
    const hasDatabase = features.includes('user-management') || features.includes('authentication');
    
    return `# Application Configuration
ENVIRONMENT=development
PORT=8080

# JWT Configuration
JWT_SECRET=your-secret-key-change-in-production-make-it-long-and-random
JWT_EXPIRY_HOURS=24

# Database Configuration
${hasDatabase ? `DB_TYPE=postgres
DATABASE_URL=postgres://user:password@localhost:5432/app_db?sslmode=disable` : `DB_TYPE=sqlite
DATABASE_URL=sqlite://app.db`}

# For PostgreSQL (uncomment if using PostgreSQL)
# DB_TYPE=postgres
# DATABASE_URL=postgres://user:password@localhost:5432/your_db?sslmode=disable

# For SQLite (uncomment if using SQLite)
# DB_TYPE=sqlite
# DATABASE_URL=sqlite://app.db
`;
  }

  private generateReadme(appName: string, features: string[]): string {
    const hasAuth = features.includes('authentication');
    const hasUserMgmt = features.includes('user-management');
    
    return `# ${appName.toUpperCase()} - Go API

A modern REST API built with Go, Gin, and GORM.

## Features

- ✅ RESTful API with Gin framework
- ✅ GORM for database operations
- ✅ PostgreSQL and SQLite support
${hasAuth ? '- ✅ JWT Authentication\n' : ''}${hasUserMgmt ? '- ✅ User Management\n' : ''}- ✅ Middleware support (CORS, Logging, Auth)
- ✅ Docker support
- ✅ Environment-based configuration
- ✅ Comprehensive error handling
- ✅ Health check endpoints
- ✅ Test suite

## Quick Start

### Prerequisites

- Go 1.21 or higher
- PostgreSQL (optional, SQLite is default)

### Installation

1. Clone the repository:
\`\`\`bash
git clone <repository-url>
cd ${appName}
\`\`\`

2. Install dependencies:
\`\`\`bash
go mod tidy
\`\`\`

3. Copy environment file:
\`\`\`bash
cp .env.example .env
\`\`\`

4. Update environment variables in \`.env\`

5. Run the application:
\`\`\`bash
go run main.go
\`\`\`

The API will be available at \`http://localhost:8080\`

### Using Make

Build and run with Make:

\`\`\`bash
# Build the application
make build

# Run the application
make run

# Run tests
make test

# Clean build files
make clean
\`\`\`

## API Endpoints

### Health Checks

- \`GET /health\` - Health check
- \`GET /ready\` - Readiness check

${hasAuth ? `### Authentication

- \`POST /api/v1/auth/register\` - Register new user
- \`POST /api/v1/auth/login\` - User login
- \`POST /api/v1/auth/refresh\` - Refresh JWT token (requires auth)
- \`GET /api/v1/auth/profile\` - Get user profile (requires auth)

` : ''}${hasUserMgmt ? `### Users

- \`GET /api/v1/users\` - Get all users (requires auth)
- \`GET /api/v1/users/:id\` - Get user by ID (requires auth)
- \`PUT /api/v1/users/:id\` - Update user (requires auth)
- \`DELETE /api/v1/users/:id\` - Delete user (requires admin)

` : ''}## Database

### PostgreSQL Setup

1. Install PostgreSQL
2. Create database:
\`\`\`sql
CREATE DATABASE ${appName};
\`\`\`

3. Update \`.env\`:
\`\`\`env
DB_TYPE=postgres
DATABASE_URL=postgres://user:password@localhost:5432/${appName}?sslmode=disable
\`\`\`

### SQLite (Default)

SQLite is used by default. The database file will be created automatically.

## Docker

### Build and run with Docker:

\`\`\`bash
docker build -t ${appName} .
docker run -p 8080:8080 ${appName}
\`\`\`

### Using Docker Compose:

\`\`\`bash
docker-compose up -d
\`\`\`

This will start the API and PostgreSQL database.

## Testing

Run the test suite:

\`\`\`bash
go test ./...
\`\`\`

Run tests with coverage:

\`\`\`bash
go test -cover ./...
\`\`\`

## Project Structure

\`\`\`
.
├── main.go                 # Application entry point
├── go.mod                  # Go module file
├── config/                 # Configuration files
│   ├── config.go          # App configuration
│   └── database.go        # Database configuration
├── models/                 # Data models
├── handlers/               # HTTP handlers
├── services/               # Business logic
├── repository/             # Data access layer
├── middleware/             # HTTP middleware
├── utils/                  # Utility functions
├── routes/                 # Route definitions
└── tests/                  # Test files
\`\`\`

## Environment Variables

| Variable | Description | Default |
|----------|-------------|---------|
| \`PORT\` | Server port | \`8080\` |
| \`ENVIRONMENT\` | Environment mode | \`development\` |
| \`JWT_SECRET\` | JWT signing key | \`your-secret-key\` |
| \`JWT_EXPIRY_HOURS\` | JWT expiry time in hours | \`24\` |
| \`DB_TYPE\` | Database type (postgres/sqlite) | \`sqlite\` |
| \`DATABASE_URL\` | Database connection string | \`sqlite://app.db\` |

## Contributing

1. Fork the repository
2. Create your feature branch (\`git checkout -b feature/amazing-feature\`)
3. Commit your changes (\`git commit -m 'Add some amazing feature'\`)
4. Push to the branch (\`git push origin feature/amazing-feature\`)
5. Open a Pull Request

## License

This project is licensed under the MIT License.
`;
  }

  private generateMakefile(): string {
    return `# Go parameters
GOCMD=go
GOBUILD=$(GOCMD) build
GOCLEAN=$(GOCMD) clean
GOTEST=$(GOCMD) test
GOGET=$(GOCMD) get
GOMOD=$(GOCMD) mod
BINARY_NAME=main
BINARY_UNIX=$(BINARY_NAME)_unix

# Default target
all: test build

# Build the application
build:
	$(GOBUILD) -o $(BINARY_NAME) -v ./...

# Test the application
test:
	$(GOTEST) -v ./...

# Test with coverage
test-coverage:
	$(GOTEST) -v -cover ./...

# Clean build files
clean:
	$(GOCLEAN)
	rm -f $(BINARY_NAME)
	rm -f $(BINARY_UNIX)

# Run the application
run:
	$(GOBUILD) -o $(BINARY_NAME) -v ./...
	./$(BINARY_NAME)

# Download dependencies
deps:
	$(GOMOD) download

# Tidy up dependencies
tidy:
	$(GOMOD) tidy

# Cross compilation for Linux
build-linux:
	CGO_ENABLED=0 GOOS=linux GOARCH=amd64 $(GOBUILD) -o $(BINARY_UNIX) -v

# Docker build
docker-build:
	docker build -t go-api .

# Docker run
docker-run:
	docker run -p 8080:8080 go-api

# Format code
fmt:
	go fmt ./...

# Vet code
vet:
	go vet ./...

# Install development tools
install-tools:
	go install github.com/golangci/golangci-lint/cmd/golangci-lint@latest

# Lint code
lint:
	golangci-lint run

.PHONY: all build test test-coverage clean run deps tidy build-linux docker-build docker-run fmt vet install-tools lint
`;
  }

  private getImplementedFeatures(requestedFeatures: string[]): string[] {
    const supportedFeatures = [
      'rest-api',
      'authentication',
      'user-management',
      'middleware',
      'cors',
      'logging',
      'health-checks',
      'jwt',
      'password-hashing',
      'database-integration',
      'postgresql',
      'sqlite',
      'docker',
      'testing',
      'makefile'
    ];

    return requestedFeatures.filter(feature => 
      supportedFeatures.includes(feature) || 
      supportedFeatures.some(supported => 
        feature.toLowerCase().includes(supported) || 
        supported.includes(feature.toLowerCase())
      )
    );
  }
}