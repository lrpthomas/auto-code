import { Agent, AgentTask, AgentResult } from '../src/types';

export class BackendPythonAgent implements Agent {
  id = 'backend-python-agent';
  name = 'Backend Python Agent';
  type = 'backend';
  capabilities = ['python', 'fastapi', 'sqlalchemy', 'pydantic', 'uvicorn', 'pytest'];

  async initialize(): Promise<void> {
    // Initialize Python-specific resources
  }

  async execute(task: AgentTask): Promise<AgentResult> {
    try {
      const { requirements } = task;
      
      const files = await this.generatePythonApp(requirements);
      
      return {
        success: true,
        data: {
          files,
          framework: 'fastapi',
          runtime: 'python',
          features: this.extractFeatures(requirements)
        },
        metadata: {
          generatedFiles: Object.keys(files).length,
          framework: 'fastapi',
          timestamp: new Date().toISOString()
        }
      };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error in Python agent'
      };
    }
  }

  async cleanup(): Promise<void> {
    // Cleanup resources if needed
  }

  private async generatePythonApp(requirements: any): Promise<Record<string, string>> {
    const files: Record<string, string> = {};
    const appName = requirements.appName || 'fastapi-app';
    const hasAuth = requirements.features?.some((f: string) => f.toLowerCase().includes('auth'));
    const hasDatabase = !!requirements.techStack?.database;
    
    // Project configuration files
    files['requirements.txt'] = this.generateRequirements(requirements);
    files['pyproject.toml'] = this.generatePyprojectToml(requirements);
    files['main.py'] = this.generateMain(requirements);
    files['app/main.py'] = this.generateApp(requirements);
    files['app/__init__.py'] = '';
    files['app/config.py'] = this.generateConfig(requirements);
    
    // Database files
    if (hasDatabase) {
      files['app/database.py'] = this.generateDatabase(requirements);
      files['app/models/__init__.py'] = '';
      files['app/models/user.py'] = this.generateUserModel(requirements);
    }
    
    // Schema files
    files['app/schemas/__init__.py'] = '';
    files['app/schemas/user.py'] = this.generateUserSchema(requirements);
    files['app/schemas/auth.py'] = this.generateAuthSchema(requirements);
    files['app/schemas/common.py'] = this.generateCommonSchema(requirements);
    
    // Router files
    files['app/routers/__init__.py'] = '';
    files['app/routers/health.py'] = this.generateHealthRouter(requirements);
    files['app/routers/users.py'] = this.generateUsersRouter(requirements);
    
    if (hasAuth) {
      files['app/routers/auth.py'] = this.generateAuthRouter(requirements);
    }
    
    // Service files
    files['app/services/__init__.py'] = '';
    files['app/services/user_service.py'] = this.generateUserService(requirements);
    
    if (hasAuth) {
      files['app/services/auth_service.py'] = this.generateAuthService(requirements);
    }
    
    // Middleware files
    files['app/middleware/__init__.py'] = '';
    files['app/middleware/timing.py'] = this.generateTimingMiddleware(requirements);
    files['app/middleware/logging.py'] = this.generateLoggingMiddleware(requirements);
    
    if (hasAuth) {
      files['app/middleware/auth.py'] = this.generateAuthMiddleware(requirements);
    }
    
    // Utility files
    files['app/utils/__init__.py'] = '';
    files['app/utils/logger.py'] = this.generateLogger(requirements);
    
    // Test files
    files['tests/__init__.py'] = '';
    files['tests/conftest.py'] = this.generateTestConfig(requirements);
    files['tests/test_health.py'] = this.generateHealthTests(requirements);
    files['tests/test_users.py'] = this.generateUserTests(requirements);
    
    if (hasAuth) {
      files['tests/test_auth.py'] = this.generateAuthTests(requirements);
    }
    
    // Docker and deployment
    files['Dockerfile'] = this.generateDockerfile(requirements);
    files['.dockerignore'] = this.generateDockerIgnore(requirements);
    files['.env.example'] = this.generateEnvExample(requirements);
    files['README.md'] = this.generateReadme(requirements);
    
    return files;
  }

  private extractFeatures(requirements: any): string[] {
    const features = [];
    if (requirements.features?.some((f: string) => f.toLowerCase().includes('auth'))) {
      features.push('authentication');
    }
    if (requirements.techStack?.database) {
      features.push('database');
    }
    features.push('fastapi', 'pydantic', 'uvicorn', 'testing');
    return features;
  }

  private generateRequirements(requirements: any): string {
    const hasAuth = requirements.features?.some((f: string) => f.toLowerCase().includes('auth'));
    const dbType = requirements.techStack?.database?.toLowerCase();
    
    let deps = [
      'fastapi>=0.104.1',
      'uvicorn[standard]>=0.24.0',
      'pydantic>=2.5.0',
      'pydantic-settings>=2.1.0'
    ];
    
    if (dbType === 'postgresql') {
      deps.push('sqlalchemy>=2.0.23');
      deps.push('asyncpg>=0.29.0');
    } else if (dbType === 'mongodb') {
      deps.push('motor>=3.3.2');
      deps.push('beanie>=1.23.6');
    }
    
    if (hasAuth) {
      deps.push('python-jose[cryptography]>=3.3.0');
      deps.push('passlib[bcrypt]>=1.7.4');
      deps.push('python-multipart>=0.0.6');
    }
    
    // Testing dependencies
    deps.push('pytest>=7.4.3');
    deps.push('pytest-asyncio>=0.21.1');
    deps.push('httpx>=0.25.2');
    
    return deps.join('\n') + '\n';
  }

  private generatePyprojectToml(requirements: any): string {
    const appName = requirements.appName || 'fastapi-app';
    return `[build-system]
requires = ["setuptools>=61.0", "wheel"]
build-backend = "setuptools.build_meta"

[project]
name = "${appName}"
version = "1.0.0"
description = "${requirements.description || 'FastAPI application'}"
readme = "README.md"
requires-python = ">=3.11"
license = {text = "MIT"}
authors = [
    {name = "ORCHESTRATOR-ALPHA", email = "dev@example.com"}
]
classifiers = [
    "Development Status :: 4 - Beta",
    "Environment :: Web Environment",
    "Framework :: FastAPI",
    "Intended Audience :: Developers",
    "License :: OSI Approved :: MIT License",
    "Operating System :: OS Independent",
    "Programming Language :: Python :: 3",
    "Programming Language :: Python :: 3.11",
    "Programming Language :: Python :: 3.12",
    "Topic :: Internet :: WWW/HTTP :: HTTP Servers",
    "Topic :: Software Development :: Libraries :: Application Frameworks",
]

[project.urls]
Homepage = "https://github.com/example/${appName}"
Documentation = "https://github.com/example/${appName}#readme"
Repository = "https://github.com/example/${appName}.git"
Changelog = "https://github.com/example/${appName}/blob/main/CHANGELOG.md"

[tool.pytest.ini_options]
minversion = "7.0"
addopts = [
    "-ra",
    "--strict-markers",
    "--strict-config",
    "--cov=app",
    "--cov-report=term-missing",
    "--cov-report=html",
]
testpaths = ["tests"]
asyncio_mode = "auto"
markers = [
    "slow: marks tests as slow (deselect with '-m \"not slow\"')",
    "integration: marks tests as integration tests",
    "unit: marks tests as unit tests",
]`;
  }

  private generateMain(requirements: any): string {
    return `"""Main entry point for the FastAPI application."""
import uvicorn
from app.main import app

if __name__ == "__main__":
    uvicorn.run(
        "main:app",
        host="0.0.0.0",
        port=8000,
        reload=True,
        access_log=True,
    )`;
  }

  private generateApp(requirements: any): string {
    const hasAuth = requirements.features?.some((f: string) => f.toLowerCase().includes('auth'));
    const hasDatabase = !!requirements.techStack?.database;
    const appTitle = requirements.description?.split(' ').slice(0, 3).join(' ') || 'FastAPI App';
    const appDescription = requirements.description || 'A FastAPI application';
    const welcomeMessage = requirements.description?.split(' ').slice(0, 3).join(' ') || 'FastAPI App';
    
    return `"""FastAPI application factory and configuration."""
from contextlib import asynccontextmanager
from typing import AsyncGenerator

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.middleware.trustedhost import TrustedHostMiddleware
from fastapi.responses import JSONResponse

from app.config import settings
${hasDatabase ? 'from app.database import init_db' : ''}
from app.middleware.logging import LoggingMiddleware
from app.middleware.timing import TimingMiddleware
${hasAuth ? 'from app.middleware.auth import AuthMiddleware' : ''}
from app.routers import health
${hasAuth ? 'from app.routers import auth' : ''}
from app.routers import users
from app.utils.logger import logger


@asynccontextmanager
async def lifespan(app: FastAPI) -> AsyncGenerator[None, None]:
    """Application lifespan events."""
    logger.info("Starting application...")
    
    # Initialize database
    ${hasDatabase ? 'await init_db()' : '# No database initialization needed'}
    
    logger.info("Application started successfully")
    yield
    
    logger.info("Shutting down application...")
    # Cleanup resources here
    logger.info("Application shutdown complete")


def create_app() -> FastAPI:
    """Create and configure FastAPI application."""
    app = FastAPI(
        title="${appTitle}",
        description="${appDescription}",
        version="1.0.0",
        docs_url="/docs" if settings.ENVIRONMENT == "development" else None,
        redoc_url="/redoc" if settings.ENVIRONMENT == "development" else None,
        openapi_url="/openapi.json" if settings.ENVIRONMENT == "development" else None,
        lifespan=lifespan,
    )

    # CORS configuration
    app.add_middleware(
        CORSMiddleware,
        allow_origins=settings.CORS_ORIGINS,
        allow_credentials=True,
        allow_methods=["*"],
        allow_headers=["*"],
    )

    # Custom middleware
    app.add_middleware(TimingMiddleware)
    app.add_middleware(LoggingMiddleware)
    ${hasAuth ? 'app.add_middleware(AuthMiddleware)' : ''}

    # Exception handlers
    @app.exception_handler(Exception)
    async def global_exception_handler(request, exc):
        logger.error(f"Global exception handler caught: {exc}", exc_info=True)
        return JSONResponse(
            status_code=500,
            content={"detail": "Internal server error"}
        )

    # Include routers
    app.include_router(health.router, prefix="/health", tags=["health"])
    ${hasAuth ? 'app.include_router(auth.router, prefix="/auth", tags=["authentication"])' : ''}
    app.include_router(users.router, prefix="/users", tags=["users"])

    return app


# Create application instance
app = create_app()


@app.get("/")
async def root():
    """Root endpoint."""
    return {
        "message": "Welcome to ${welcomeMessage}",
        "version": "1.0.0",
        "docs": "/docs",
        "status": "operational"
    }`;
  }

  private generateConfig(requirements: any): string {
    const appName = requirements.description?.split(' ').slice(0, 3).join(' ') || 'FastAPI App';
    
    return `"""Application configuration using Pydantic Settings."""
from typing import List, Optional
from functools import lru_cache

from pydantic import Field, validator
from pydantic_settings import BaseSettings


class Settings(BaseSettings):
    """Application settings."""
    
    # Application
    APP_NAME: str = "${appName}"
    VERSION: str = "1.0.0"
    ENVIRONMENT: str = Field(default="development", env="ENVIRONMENT")
    DEBUG: bool = Field(default=False, env="DEBUG")
    
    # Server
    HOST: str = Field(default="0.0.0.0", env="HOST")
    PORT: int = Field(default=8000, env="PORT")
    
    # Security
    SECRET_KEY: str = Field(default="your-secret-key-change-in-production", env="SECRET_KEY")
    JWT_ALGORITHM: str = Field(default="HS256", env="JWT_ALGORITHM")
    ACCESS_TOKEN_EXPIRE_MINUTES: int = Field(default=30, env="ACCESS_TOKEN_EXPIRE_MINUTES")
    
    # CORS
    CORS_ORIGINS: List[str] = Field(
        default=["http://localhost:3000", "http://localhost:8080"],
        env="CORS_ORIGINS"
    )
    
    # Database
    DATABASE_URL: Optional[str] = Field(default=None, env="DATABASE_URL")
    DATABASE_ECHO: bool = Field(default=False, env="DATABASE_ECHO")
    
    # Logging
    LOG_LEVEL: str = Field(default="INFO", env="LOG_LEVEL")
    LOG_FORMAT: str = Field(
        default="%(asctime)s - %(name)s - %(levelname)s - %(message)s",
        env="LOG_FORMAT"
    )
    
    # Allowed hosts for TrustedHostMiddleware
    ALLOWED_HOSTS: List[str] = Field(
        default=["localhost", "127.0.0.1"],
        env="ALLOWED_HOSTS"
    )

    @validator('CORS_ORIGINS', pre=True)
    def parse_cors_origins(cls, v):
        if isinstance(v, str):
            return [x.strip() for x in v.split(",")]
        return v

    @validator('ALLOWED_HOSTS', pre=True)
    def parse_allowed_hosts(cls, v):
        if isinstance(v, str):
            return [x.strip() for x in v.split(",")]
        return v

    @validator('ENVIRONMENT')
    def validate_environment(cls, v):
        if v not in ['development', 'staging', 'production']:
            raise ValueError('Environment must be development, staging, or production')
        return v

    class Config:
        env_file = ".env"
        case_sensitive = True


@lru_cache()
def get_settings() -> Settings:
    """Get cached settings instance."""
    return Settings()


# Global settings instance
settings = get_settings()`;
  }

  private generateDatabase(requirements: any): string {
    const dbType = requirements.techStack?.database?.toLowerCase();
    
    if (dbType === 'mongodb') {
      return `"""MongoDB database configuration using Motor and Beanie."""
from motor.motor_asyncio import AsyncIOMotorClient
from beanie import init_beanie

from app.config import settings
from app.models.user import User

# Global database client
mongodb_client: AsyncIOMotorClient = None


async def connect_to_mongo():
    """Create database connection."""
    global mongodb_client
    mongodb_client = AsyncIOMotorClient(settings.DATABASE_URL)


async def close_mongo_connection():
    """Close database connection."""
    global mongodb_client
    if mongodb_client:
        mongodb_client.close()


async def init_db():
    """Initialize database with Beanie ODM."""
    database = mongodb_client.get_default_database()
    await init_beanie(database=database, document_models=[User])`;
    }
    
    // Default to PostgreSQL/SQLAlchemy
    return `"""Database configuration using SQLAlchemy with async support."""
from typing import AsyncGenerator
from sqlalchemy.ext.asyncio import AsyncSession, create_async_engine, async_sessionmaker
from sqlalchemy.orm import DeclarativeBase

from app.config import settings


class Base(DeclarativeBase):
    """Base class for SQLAlchemy models."""
    pass


# Create async engine
engine = create_async_engine(
    settings.DATABASE_URL,
    echo=settings.DATABASE_ECHO,
    future=True,
)

# Create async session maker
AsyncSessionLocal = async_sessionmaker(
    engine,
    class_=AsyncSession,
    expire_on_commit=False,
)


async def get_db() -> AsyncGenerator[AsyncSession, None]:
    """Dependency for getting database session."""
    async with AsyncSessionLocal() as session:
        try:
            yield session
        except Exception:
            await session.rollback()
            raise
        finally:
            await session.close()


async def init_db() -> None:
    """Initialize database tables."""
    async with engine.begin() as conn:
        # Import all models here to ensure they are registered with SQLAlchemy
        from app.models import user  # noqa
        await conn.run_sync(Base.metadata.create_all)`;
  }

  private generateUserModel(requirements: any): string {
    const dbType = requirements.techStack?.database?.toLowerCase();
    
    if (dbType === 'mongodb') {
      return `"""User model using Beanie ODM for MongoDB."""
from datetime import datetime
from typing import Optional
from beanie import Document
from pydantic import Field, EmailStr


class User(Document):
    """User document for MongoDB."""
    email: EmailStr
    username: str = Field(..., min_length=3, max_length=50)
    password: str = Field(..., min_length=8)
    first_name: str
    last_name: str
    is_active: bool = Field(default=True)
    is_superuser: bool = Field(default=False)
    created_at: datetime = Field(default_factory=datetime.utcnow)
    updated_at: datetime = Field(default_factory=datetime.utcnow)

    class Settings:
        name = "users"
        indexes = [
            "email",
            "username",
        ]

    def __repr__(self) -> str:
        return f"<User {self.username}>"`;
    }
    
    // Default to SQLAlchemy
    return `"""User model using SQLAlchemy ORM."""
from datetime import datetime
from typing import Optional
from sqlalchemy import String, DateTime, Boolean, Text
from sqlalchemy.orm import Mapped, mapped_column

from app.database import Base


class User(Base):
    """User table for SQL databases."""
    __tablename__ = "users"

    id: Mapped[int] = mapped_column(primary_key=True, index=True)
    email: Mapped[str] = mapped_column(String(255), unique=True, index=True, nullable=False)
    username: Mapped[str] = mapped_column(String(50), unique=True, index=True, nullable=False)
    password: Mapped[str] = mapped_column(String(255), nullable=False)
    first_name: Mapped[str] = mapped_column(String(100), nullable=False)
    last_name: Mapped[str] = mapped_column(String(100), nullable=False)
    is_active: Mapped[bool] = mapped_column(Boolean, default=True, nullable=False)
    is_superuser: Mapped[bool] = mapped_column(Boolean, default=False, nullable=False)
    created_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow, nullable=False)
    updated_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow, nullable=False)

    def __repr__(self) -> str:
        return f"<User {self.username}>"`;
  }

  private generateUsersRouter(requirements: any): string {
    const hasAuth = requirements.features?.some((f: string) => f.toLowerCase().includes('auth'));
    
    return `"""Users router."""
from typing import List
from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy.ext.asyncio import AsyncSession

from app.database import get_db
from app.models.user import User
from app.schemas.user import UserCreate, UserResponse, UserUpdate
from app.schemas.common import Response, PaginatedResponse
from app.services.user_service import UserService
${hasAuth ? 'from app.middleware.auth import get_current_user' : ''}

router = APIRouter()


@router.get("/", response_model=PaginatedResponse[UserResponse])
async def get_users(
    page: int = Query(1, ge=1, description="Page number"),
    size: int = Query(10, ge=1, le=100, description="Page size"),
    db: AsyncSession = Depends(get_db),
    ${hasAuth ? 'current_user: User = Depends(get_current_user),' : ''}
):
    """Get paginated list of users."""
    user_service = UserService(db)
    users, total = await user_service.get_users(page=page, size=size)
    
    return PaginatedResponse(
        items=[UserResponse.from_orm(user) for user in users],
        total=total,
        page=page,
        size=size,
        pages=(total + size - 1) // size,
    )


@router.get("/{user_id}", response_model=UserResponse)
async def get_user(
    user_id: int,
    db: AsyncSession = Depends(get_db),
    ${hasAuth ? 'current_user: User = Depends(get_current_user),' : ''}
):
    """Get user by ID."""
    user_service = UserService(db)
    user = await user_service.get_user_by_id(user_id)
    
    if not user:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="User not found"
        )
    
    return UserResponse.from_orm(user)


@router.post("/", response_model=UserResponse, status_code=status.HTTP_201_CREATED)
async def create_user(
    user_data: UserCreate,
    db: AsyncSession = Depends(get_db),
):
    """Create a new user."""
    user_service = UserService(db)
    
    # Check if user already exists
    existing_user = await user_service.get_user_by_email(user_data.email)
    if existing_user:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="User with this email already exists"
        )
    
    existing_user = await user_service.get_user_by_username(user_data.username)
    if existing_user:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="User with this username already exists"
        )
    
    user = await user_service.create_user(user_data)
    return UserResponse.from_orm(user)`;
  }

  // Additional helper methods for generating other files...
  private generateHealthRouter(requirements: any): string {
    return `"""Health check router."""
import time
from datetime import datetime
from fastapi import APIRouter, Depends
from sqlalchemy.ext.asyncio import AsyncSession

from app.config import settings
from app.database import get_db
from app.schemas.common import HealthResponse

router = APIRouter()


@router.get("/", response_model=HealthResponse)
async def health_check():
    """Basic health check endpoint."""
    return HealthResponse(
        status="ok",
        timestamp=datetime.utcnow(),
        environment=settings.ENVIRONMENT,
        version=settings.VERSION,
    )`;
  }

  private generateUserSchema(requirements: any): string {
    return `"""User Pydantic schemas for request/response validation."""
from datetime import datetime
from typing import Optional
from pydantic import BaseModel, EmailStr, Field


class UserBase(BaseModel):
    """Base user schema."""
    email: EmailStr
    username: str = Field(..., min_length=3, max_length=50)
    first_name: str
    last_name: str


class UserCreate(UserBase):
    """Schema for user creation."""
    password: str = Field(..., min_length=8)


class UserUpdate(BaseModel):
    """Schema for user updates."""
    email: Optional[EmailStr] = None
    first_name: Optional[str] = None
    last_name: Optional[str] = None
    is_active: Optional[bool] = None


class UserInDB(UserBase):
    """Schema for user in database."""
    id: int
    is_active: bool
    is_superuser: bool
    created_at: datetime
    updated_at: datetime

    class Config:
        from_attributes = True


class UserResponse(UserBase):
    """Schema for user response."""
    id: int
    is_active: bool
    created_at: datetime
    updated_at: datetime

    class Config:
        from_attributes = True`;
  }

  private generateAuthSchema(requirements: any): string {
    return `"""Authentication Pydantic schemas."""
from typing import Optional
from pydantic import BaseModel, EmailStr, Field


class LoginRequest(BaseModel):
    """Login request schema."""
    email: EmailStr
    password: str = Field(..., min_length=8)


class RegisterRequest(BaseModel):
    """Registration request schema."""
    email: EmailStr
    username: str = Field(..., min_length=3, max_length=50)
    password: str = Field(..., min_length=8)
    first_name: str
    last_name: str


class TokenResponse(BaseModel):
    """Token response schema."""
    access_token: str
    token_type: str = "bearer"
    expires_in: int


class TokenPayload(BaseModel):
    """JWT token payload schema."""
    user_id: Optional[int] = None
    username: Optional[str] = None
    exp: Optional[int] = None`;
  }

  private generateCommonSchema(requirements: any): string {
    return `"""Common Pydantic schemas."""
from typing import Any, Generic, List, Optional, TypeVar
from pydantic import BaseModel

T = TypeVar('T')

class Response(BaseModel, Generic[T]):
    """Generic response schema."""
    success: bool = True
    message: str
    data: Optional[T] = None


class PaginatedResponse(BaseModel, Generic[T]):
    """Paginated response schema."""
    items: List[T]
    total: int
    page: int
    size: int
    pages: int


class HealthResponse(BaseModel):
    """Health check response schema."""
    status: str
    timestamp: Any
    environment: str
    version: str`;
  }

  private generateUserService(requirements: any): string {
    return `"""User service for business logic."""
from typing import List, Optional, Tuple
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, func
from passlib.context import CryptContext

from app.models.user import User
from app.schemas.user import UserCreate, UserUpdate

# Password hashing context
pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")


class UserService:
    """User service for user operations."""

    def __init__(self, db: AsyncSession):
        self.db = db

    def get_password_hash(self, password: str) -> str:
        """Hash a password."""
        return pwd_context.hash(password)

    def verify_password(self, plain_password: str, hashed_password: str) -> bool:
        """Verify a password against its hash."""
        return pwd_context.verify(plain_password, hashed_password)

    async def get_user_by_id(self, user_id: int) -> Optional[User]:
        """Get user by ID."""
        result = await self.db.execute(select(User).where(User.id == user_id))
        return result.scalar_one_or_none()

    async def get_user_by_email(self, email: str) -> Optional[User]:
        """Get user by email."""
        result = await self.db.execute(select(User).where(User.email == email))
        return result.scalar_one_or_none()

    async def get_user_by_username(self, username: str) -> Optional[User]:
        """Get user by username."""
        result = await self.db.execute(select(User).where(User.username == username))
        return result.scalar_one_or_none()

    async def get_users(self, page: int = 1, size: int = 10) -> Tuple[List[User], int]:
        """Get paginated list of users."""
        offset = (page - 1) * size
        
        # Get total count
        count_result = await self.db.execute(select(func.count(User.id)))
        total = count_result.scalar_one()
        
        # Get users
        result = await self.db.execute(
            select(User)
            .offset(offset)
            .limit(size)
            .order_by(User.created_at.desc())
        )
        users = result.scalars().all()
        
        return list(users), total

    async def create_user(self, user_data: UserCreate) -> User:
        """Create a new user."""
        hashed_password = self.get_password_hash(user_data.password)
        
        user = User(
            email=user_data.email,
            username=user_data.username,
            password=hashed_password,
            first_name=user_data.first_name,
            last_name=user_data.last_name,
        )
        
        self.db.add(user)
        await self.db.commit()
        await self.db.refresh(user)
        
        return user`;
  }

  private generateAuthService(requirements: any): string {
    return `"""Authentication service."""
from datetime import datetime, timedelta
from typing import Optional
from jose import JWTError, jwt
from sqlalchemy.ext.asyncio import AsyncSession

from app.config import settings
from app.models.user import User
from app.services.user_service import UserService


class AuthService:
    """Authentication service."""

    def __init__(self, db: AsyncSession):
        self.db = db
        self.user_service = UserService(db)

    def create_access_token(self, data: dict, expires_delta: Optional[timedelta] = None) -> str:
        """Create JWT access token."""
        to_encode = data.copy()
        if expires_delta:
            expire = datetime.utcnow() + expires_delta
        else:
            expire = datetime.utcnow() + timedelta(minutes=settings.ACCESS_TOKEN_EXPIRE_MINUTES)
        
        to_encode.update({"exp": expire})
        encoded_jwt = jwt.encode(to_encode, settings.SECRET_KEY, algorithm=settings.JWT_ALGORITHM)
        return encoded_jwt

    def verify_token(self, token: str) -> Optional[dict]:
        """Verify JWT token."""
        try:
            payload = jwt.decode(token, settings.SECRET_KEY, algorithms=[settings.JWT_ALGORITHM])
            return payload
        except JWTError:
            return None

    async def authenticate_user(self, email: str, password: str) -> Optional[User]:
        """Authenticate user with email and password."""
        user = await self.user_service.get_user_by_email(email)
        if not user or not self.user_service.verify_password(password, user.password):
            return None
        return user`;
  }

  private generateAuthRouter(requirements: any): string {
    return `"""Authentication router."""
from datetime import timedelta
from fastapi import APIRouter, Depends, HTTPException, status
from fastapi.security import OAuth2PasswordRequestForm
from sqlalchemy.ext.asyncio import AsyncSession

from app.config import settings
from app.database import get_db
from app.schemas.auth import LoginRequest, RegisterRequest, TokenResponse
from app.schemas.user import UserResponse
from app.services.auth_service import AuthService
from app.services.user_service import UserService
from app.middleware.auth import get_current_user
from app.models.user import User

router = APIRouter()


@router.post("/login", response_model=TokenResponse)
async def login(
    login_data: LoginRequest,
    db: AsyncSession = Depends(get_db),
):
    """Authenticate user and return access token."""
    auth_service = AuthService(db)
    
    # Authenticate user
    user = await auth_service.authenticate_user(login_data.email, login_data.password)
    if not user:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Incorrect email or password",
            headers={"WWW-Authenticate": "Bearer"},
        )
    
    if not user.is_active:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Inactive user"
        )
    
    # Create access token
    access_token_expires = timedelta(minutes=settings.ACCESS_TOKEN_EXPIRE_MINUTES)
    access_token = auth_service.create_access_token(
        data={"sub": str(user.id), "username": user.username},
        expires_delta=access_token_expires
    )
    
    return TokenResponse(
        access_token=access_token,
        token_type="bearer",
        expires_in=settings.ACCESS_TOKEN_EXPIRE_MINUTES * 60
    )


@router.post("/register", response_model=TokenResponse, status_code=status.HTTP_201_CREATED)
async def register(
    user_data: RegisterRequest,
    db: AsyncSession = Depends(get_db),
):
    """Register a new user."""
    user_service = UserService(db)
    auth_service = AuthService(db)
    
    # Check if user already exists
    if await user_service.get_user_by_email(user_data.email):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Email already registered"
        )
    
    if await user_service.get_user_by_username(user_data.username):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Username already taken"
        )
    
    # Create user
    from app.schemas.user import UserCreate
    user_create_data = UserCreate(
        email=user_data.email,
        username=user_data.username,
        password=user_data.password,
        first_name=user_data.first_name,
        last_name=user_data.last_name,
    )
    
    user = await user_service.create_user(user_create_data)
    
    # Create access token
    access_token_expires = timedelta(minutes=settings.ACCESS_TOKEN_EXPIRE_MINUTES)
    access_token = auth_service.create_access_token(
        data={"sub": str(user.id), "username": user.username},
        expires_delta=access_token_expires
    )
    
    return TokenResponse(
        access_token=access_token,
        token_type="bearer",
        expires_in=settings.ACCESS_TOKEN_EXPIRE_MINUTES * 60
    )


@router.get("/me", response_model=UserResponse)
async def get_current_user_info(
    current_user: User = Depends(get_current_user)
):
    """Get current user information."""
    return UserResponse.from_orm(current_user)`;
  }

  private generateTimingMiddleware(requirements: any): string {
    return `"""Timing middleware for performance monitoring."""
import time
from starlette.middleware.base import BaseHTTPMiddleware
from starlette.requests import Request
from starlette.responses import Response

from app.utils.logger import logger


class TimingMiddleware(BaseHTTPMiddleware):
    """Middleware to time request processing."""

    async def dispatch(self, request: Request, call_next) -> Response:
        start_time = time.time()
        
        # Process request
        response = await call_next(request)
        
        # Calculate processing time
        process_time = time.time() - start_time
        
        # Add timing header
        response.headers["X-Process-Time"] = str(process_time)
        
        # Log slow requests
        if process_time > 1.0:  # Log requests taking more than 1 second
            logger.warning(
                f"Slow request: {request.method} {request.url.path} took {process_time:.2f}s"
            )
        
        return response`;
  }

  private generateLoggingMiddleware(requirements: any): string {
    return `"""Logging middleware for request/response logging."""
from starlette.middleware.base import BaseHTTPMiddleware
from starlette.requests import Request
from starlette.responses import Response

from app.utils.logger import logger


class LoggingMiddleware(BaseHTTPMiddleware):
    """Middleware for request/response logging."""

    async def dispatch(self, request: Request, call_next) -> Response:
        # Log incoming request
        logger.info(
            f"Incoming request: {request.method} {request.url.path}",
            extra={
                "method": request.method,
                "url": str(request.url),
                "headers": dict(request.headers),
                "client_ip": request.client.host if request.client else None,
            }
        )
        
        # Process request
        try:
            response = await call_next(request)
            
            # Log response
            logger.info(
                f"Response: {response.status_code}",
                extra={
                    "status_code": response.status_code,
                    "response_headers": dict(response.headers),
                }
            )
            
            return response
            
        except Exception as exc:
            logger.error(
                f"Request failed: {str(exc)}",
                extra={
                    "method": request.method,
                    "url": str(request.url),
                    "error": str(exc),
                },
                exc_info=True
            )
            raise`;
  }

  private generateAuthMiddleware(requirements: any): string {
    return `"""Authentication middleware."""
from typing import Optional
from fastapi import Depends, HTTPException, status
from fastapi.security import OAuth2PasswordBearer
from sqlalchemy.ext.asyncio import AsyncSession

from app.database import get_db
from app.models.user import User
from app.services.auth_service import AuthService

oauth2_scheme = OAuth2PasswordBearer(tokenUrl="/auth/token")


async def get_current_user(
    token: str = Depends(oauth2_scheme),
    db: AsyncSession = Depends(get_db)
) -> User:
    """Get current user from JWT token."""
    credentials_exception = HTTPException(
        status_code=status.HTTP_401_UNAUTHORIZED,
        detail="Could not validate credentials",
        headers={"WWW-Authenticate": "Bearer"},
    )
    
    auth_service = AuthService(db)
    payload = auth_service.verify_token(token)
    
    if payload is None:
        raise credentials_exception
        
    user_id: str = payload.get("sub")
    if user_id is None:
        raise credentials_exception
        
    user = await auth_service.user_service.get_user_by_id(int(user_id))
    if user is None:
        raise credentials_exception
        
    return user


async def get_current_active_superuser(
    current_user: User = Depends(get_current_user),
) -> User:
    """Get current active superuser."""
    if not current_user.is_superuser:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Not enough permissions"
        )
    return current_user`;
  }

  private generateLogger(requirements: any): string {
    return `"""Logging configuration."""
import logging
import sys
from typing import Any

from app.config import settings


def create_logger() -> logging.Logger:
    """Create and configure logger."""
    logger = logging.getLogger("app")
    logger.setLevel(getattr(logging, settings.LOG_LEVEL.upper()))
    
    # Remove existing handlers
    for handler in logger.handlers:
        logger.removeHandler(handler)
    
    # Create console handler
    handler = logging.StreamHandler(sys.stdout)
    handler.setLevel(getattr(logging, settings.LOG_LEVEL.upper()))
    
    # Create formatter
    formatter = logging.Formatter(settings.LOG_FORMAT)
    handler.setFormatter(formatter)
    
    # Add handler to logger
    logger.addHandler(handler)
    
    return logger


# Global logger instance
logger = create_logger()`;
  }

  private generateTestConfig(requirements: any): string {
    return `"""Test configuration and fixtures."""
import pytest
import asyncio
from typing import AsyncGenerator
from httpx import AsyncClient
from sqlalchemy.ext.asyncio import AsyncSession, create_async_engine, async_sessionmaker

from app.main import app
from app.database import get_db, Base
from app.config import settings

# Test database URL
TEST_DATABASE_URL = "sqlite+aiosqlite:///:memory:"

# Create test engine
test_engine = create_async_engine(
    TEST_DATABASE_URL,
    echo=False,
)

TestSessionLocal = async_sessionmaker(
    test_engine,
    class_=AsyncSession,
    expire_on_commit=False,
)


@pytest.fixture(scope="session")
def event_loop():
    """Create event loop for testing."""
    loop = asyncio.get_event_loop_policy().new_event_loop()
    yield loop
    loop.close()


@pytest.fixture
async def db_session() -> AsyncGenerator[AsyncSession, None]:
    """Create test database session."""
    async with test_engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)
    
    async with TestSessionLocal() as session:
        yield session


@pytest.fixture
async def client(db_session: AsyncSession) -> AsyncGenerator[AsyncClient, None]:
    """Create test client with database override."""
    
    def override_get_db():
        yield db_session

    app.dependency_overrides[get_db] = override_get_db
    
    async with AsyncClient(app=app, base_url="http://test") as ac:
        yield ac
    
    app.dependency_overrides.clear()


@pytest.fixture
def test_user_data():
    """Test user data fixture."""
    return {
        "email": "test@example.com",
        "username": "testuser",
        "password": "testpassword123",
        "first_name": "Test",
        "last_name": "User"
    }`;
  }

  private generateHealthTests(requirements: any): string {
    return `"""Health endpoint tests."""
import pytest
from httpx import AsyncClient


@pytest.mark.asyncio
async def test_health_check(client: AsyncClient):
    """Test health check endpoint."""
    response = await client.get("/health/")
    
    assert response.status_code == 200
    data = response.json()
    assert data["status"] == "ok"
    assert "timestamp" in data
    assert "environment" in data
    assert "version" in data`;
  }

  private generateUserTests(requirements: any): string {
    return `"""User endpoint tests."""
import pytest
from httpx import AsyncClient
from sqlalchemy.ext.asyncio import AsyncSession

from app.services.user_service import UserService
from app.schemas.user import UserCreate


@pytest.mark.asyncio
async def test_create_user(client: AsyncClient, test_user_data):
    """Test user creation."""
    response = await client.post("/users/", json=test_user_data)
    
    assert response.status_code == 201
    data = response.json()
    assert data["email"] == test_user_data["email"]
    assert data["username"] == test_user_data["username"]
    assert "password" not in data  # Password should not be returned
    assert "id" in data`;
  }

  private generateAuthTests(requirements: any): string {
    return `"""Authentication tests."""
import pytest
from httpx import AsyncClient
from sqlalchemy.ext.asyncio import AsyncSession

from app.services.user_service import UserService
from app.schemas.user import UserCreate


@pytest.mark.asyncio
async def test_register(client: AsyncClient, test_user_data):
    """Test user registration."""
    response = await client.post("/auth/register", json=test_user_data)
    
    assert response.status_code == 201
    data = response.json()
    assert "access_token" in data
    assert data["token_type"] == "bearer"


@pytest.mark.asyncio
async def test_login(client: AsyncClient, db_session: AsyncSession, test_user_data):
    """Test user login."""
    # Create user first
    user_service = UserService(db_session)
    user_create = UserCreate(**test_user_data)
    await user_service.create_user(user_create)
    await db_session.commit()
    
    # Login
    login_data = {
        "email": test_user_data["email"],
        "password": test_user_data["password"]
    }
    response = await client.post("/auth/login", json=login_data)
    
    assert response.status_code == 200
    data = response.json()
    assert "access_token" in data
    assert data["token_type"] == "bearer"`;
  }

  private generateDockerfile(requirements: any): string {
    return `# Use Python 3.11 slim image
FROM python:3.11-slim

# Set working directory
WORKDIR /app

# Install system dependencies
RUN apt-get update && apt-get install -y \\
    build-essential \\
    curl \\
    && rm -rf /var/lib/apt/lists/*

# Copy requirements first for better caching
COPY requirements.txt .

# Install Python dependencies
RUN pip install --no-cache-dir --upgrade pip && \\
    pip install --no-cache-dir -r requirements.txt

# Copy application code
COPY . .

# Create non-root user
RUN adduser --disabled-password --gecos '' appuser && \\
    chown -R appuser:appuser /app
USER appuser

# Expose port
EXPOSE 8000

# Health check
HEALTHCHECK --interval=30s --timeout=30s --start-period=5s --retries=3 \\
    CMD curl -f http://localhost:8000/health/ || exit 1

# Run application
CMD ["uvicorn", "main:app", "--host", "0.0.0.0", "--port", "8000"]`;
  }

  private generateDockerIgnore(requirements: any): string {
    return `# Python
__pycache__/
*.py[cod]
*$py.class
*.so
.Python
build/
develop-eggs/
dist/
downloads/
eggs/
.eggs/
lib/
lib64/
parts/
sdist/
var/
wheels/
*.egg-info/
.installed.cfg
*.egg

# Virtual environments
venv/
env/
ENV/

# IDE
.vscode/
.idea/
*.swp
*.swo
*~

# OS
.DS_Store
Thumbs.db

# Logs
*.log

# Environment variables
.env
.env.local
.env.*.local

# Test coverage
htmlcov/
.coverage
.pytest_cache/

# Git
.git/
.gitignore

# Docker
Dockerfile*
docker-compose*.yml

# Documentation
README.md
docs/`;
  }

  private generateEnvExample(requirements: any): string {
    const dbType = requirements.techStack?.database?.toLowerCase();
    
    return `# Application Settings
ENVIRONMENT=development
DEBUG=true
SECRET_KEY=your-secret-key-change-in-production
JWT_ALGORITHM=HS256
ACCESS_TOKEN_EXPIRE_MINUTES=30

# Server Settings
HOST=0.0.0.0
PORT=8000

# Database Settings
${dbType === 'mongodb' 
  ? 'DATABASE_URL=mongodb://localhost:27017/app_db' 
  : 'DATABASE_URL=postgresql+asyncpg://user:password@localhost/app_db'
}
DATABASE_ECHO=false

# CORS Settings
CORS_ORIGINS=http://localhost:3000,http://localhost:8080

# Logging Settings
LOG_LEVEL=INFO
LOG_FORMAT=%(asctime)s - %(name)s - %(levelname)s - %(message)s

# Security Settings
ALLOWED_HOSTS=localhost,127.0.0.1`;
  }

  private generateReadme(requirements: any): string {
    const appName = requirements.appName || 'FastAPI App';
    const hasAuth = requirements.features?.some((f: string) => f.toLowerCase().includes('auth'));
    const dbType = requirements.techStack?.database?.toLowerCase() || 'postgresql';
    
    return `# ${appName}

A modern FastAPI application with async support.

## Features

- ✅ **FastAPI** with async/await support
- ✅ **Pydantic** for data validation
- ✅ **SQLAlchemy** with async support (or MongoDB with Beanie)
${hasAuth ? '- ✅ **JWT Authentication** with password hashing\n' : ''}- ✅ **CORS** middleware
- ✅ **Request/Response logging**
- ✅ **Health check endpoints**
- ✅ **Comprehensive test suite**
- ✅ **Docker support**
- ✅ **Environment-based configuration**

## Quick Start

### Prerequisites

- Python 3.11+
${dbType === 'postgresql' ? '- PostgreSQL' : dbType === 'mongodb' ? '- MongoDB' : '- SQLite (default)'}

### Installation

1. Clone the repository:
\`\`\`bash
git clone <repository-url>
cd ${appName.toLowerCase()}
\`\`\`

2. Create virtual environment:
\`\`\`bash
python -m venv venv
source venv/bin/activate  # On Windows: venv\\Scripts\\activate
\`\`\`

3. Install dependencies:
\`\`\`bash
pip install -r requirements.txt
\`\`\`

4. Set up environment variables:
\`\`\`bash
cp .env.example .env
# Edit .env with your configuration
\`\`\`

5. Run the application:
\`\`\`bash
uvicorn main:app --reload
\`\`\`

The API will be available at \`http://localhost:8000\`

## API Documentation

- **Swagger UI**: http://localhost:8000/docs
- **ReDoc**: http://localhost:8000/redoc

## API Endpoints

### Health Checks
- \`GET /health\` - Health check
- \`GET /\` - Root endpoint

### Users
- \`GET /users\` - List users (paginated)
- \`POST /users\` - Create user
- \`GET /users/{id}\` - Get user by ID
- \`PUT /users/{id}\` - Update user
- \`DELETE /users/{id}\` - Delete user

${hasAuth ? `### Authentication
- \`POST /auth/register\` - Register new user
- \`POST /auth/login\` - User login
- \`GET /auth/me\` - Get current user info

` : ''}## Testing

Run the test suite:
\`\`\`bash
pytest
\`\`\`

Run with coverage:
\`\`\`bash
pytest --cov=app --cov-report=html
\`\`\`

## Docker

Build and run with Docker:
\`\`\`bash
docker build -t ${appName.toLowerCase()} .
docker run -p 8000:8000 ${appName.toLowerCase()}
\`\`\`

Or use Docker Compose:
\`\`\`bash
docker-compose up -d
\`\`\`

## Environment Variables

| Variable | Description | Default |
|----------|-------------|---------|
| \`ENVIRONMENT\` | Environment mode | \`development\` |
| \`DEBUG\` | Enable debug mode | \`false\` |
| \`SECRET_KEY\` | JWT secret key | \`change-me\` |
| \`DATABASE_URL\` | Database connection URL | \`sqlite://./app.db\` |
| \`CORS_ORIGINS\` | Allowed CORS origins | \`http://localhost:3000\` |

## Project Structure

\`\`\`
.
├── main.py                 # Application entry point
├── app/
│   ├── __init__.py
│   ├── main.py            # FastAPI app factory
│   ├── config.py          # Configuration settings
│   ├── database.py        # Database configuration
│   ├── models/            # SQLAlchemy models
│   ├── schemas/           # Pydantic schemas
│   ├── routers/           # API route handlers
│   ├── services/          # Business logic
│   ├── middleware/        # Custom middleware
│   └── utils/             # Utility functions
├── tests/                 # Test suite
├── requirements.txt       # Python dependencies
├── pyproject.toml         # Project configuration
├── Dockerfile            # Docker configuration
└── README.md             # This file
\`\`\`

## Development

### Code Style

This project uses:
- **Black** for code formatting
- **isort** for import sorting
- **mypy** for type checking
- **pytest** for testing

### Contributing

1. Fork the repository
2. Create your feature branch (\`git checkout -b feature/amazing-feature\`)
3. Commit your changes (\`git commit -m 'Add some amazing feature'\`)
4. Push to the branch (\`git push origin feature/amazing-feature\`)
5. Open a Pull Request

## License

This project is licensed under the MIT License.`;
  }
}