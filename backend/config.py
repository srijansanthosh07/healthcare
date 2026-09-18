import os
from pydantic_settings import BaseSettings

class Settings(BaseSettings):
    POSTGRES_USER: str = os.getenv("POSTGRES_USER", "medtimeline")
    POSTGRES_PASSWORD: str = os.getenv("POSTGRES_PASSWORD", "medtimeline_secret_pass")
    POSTGRES_DB: str = os.getenv("POSTGRES_DB", "medtimeline_db")
    POSTGRES_HOST: str = os.getenv("POSTGRES_HOST", "localhost")
    POSTGRES_PORT: int = int(os.getenv("POSTGRES_PORT", "5432"))
    DB_SSL_MODE: str = os.getenv("DB_SSL_MODE", "prefer")
    DATABASE_URL: str = os.getenv(
        "DATABASE_URL",
        f"postgresql://{POSTGRES_USER}:{POSTGRES_PASSWORD}@{POSTGRES_HOST}:{POSTGRES_PORT}/{POSTGRES_DB}"
    )

    REDIS_HOST: str = os.getenv("REDIS_HOST", "localhost")
    REDIS_PORT: int = int(os.getenv("REDIS_PORT", "6379"))
    REDIS_URL: str = os.getenv("REDIS_URL", f"redis://{REDIS_HOST}:{REDIS_PORT}/0")

    MINIO_ENDPOINT: str = os.getenv("MINIO_ENDPOINT", "localhost:9000")
    MINIO_ROOT_USER: str = os.getenv("MINIO_ROOT_USER", "minioadmin")
    MINIO_ROOT_PASSWORD: str = os.getenv("MINIO_ROOT_PASSWORD", "minioadmin_secret")
    MINIO_BUCKET_NAME: str = os.getenv("MINIO_BUCKET_NAME", "medtimeline-docs")
    MINIO_SECURE: bool = os.getenv("MINIO_SECURE", "false").lower() == "true"
    ENABLE_S3_SERVER_SIDE_ENCRYPTION: bool = os.getenv("ENABLE_S3_SERVER_SIDE_ENCRYPTION", "true").lower() == "true"

    GEMINI_API_KEY: str = os.getenv("GEMINI_API_KEY", "")
    OPENAI_API_KEY: str = os.getenv("OPENAI_API_KEY", "")

    CONFIDENCE_THRESHOLD_CRITICAL: float = float(os.getenv("CONFIDENCE_THRESHOLD_CRITICAL", "0.85"))
    CONFIDENCE_THRESHOLD_HIGH: float = float(os.getenv("CONFIDENCE_THRESHOLD_HIGH", "0.80"))
    CONFIDENCE_THRESHOLD_MEDIUM: float = float(os.getenv("CONFIDENCE_THRESHOLD_MEDIUM", "0.70"))

    # Jurisdiction Neutrality & Policy Settings (FR-27)
    JURISDICTION_CODE: str = os.getenv("JURISDICTION_CODE", "GENERAL_NEUTRAL") # Neutral default, configurable per deployment
    DEFAULT_GRANT_EXPIRY_DAYS: int = int(os.getenv("DEFAULT_GRANT_EXPIRY_DAYS", "30"))
    EMERGENCY_EXPIRY_HOURS: int = int(os.getenv("EMERGENCY_EXPIRY_HOURS", "24"))
    DATA_RETENTION_POLICY: str = os.getenv("DATA_RETENTION_POLICY", "ADDITIVE_PERPETUAL")

    JWT_SECRET: str = os.getenv("JWT_SECRET", "super_secret_jwt_key_medtimeline_2026_xyz")
    JWT_ALGORITHM: str = os.getenv("JWT_ALGORITHM", "HS256")
    ACCESS_TOKEN_EXPIRE_MINUTES: int = int(os.getenv("ACCESS_TOKEN_EXPIRE_MINUTES", "1440"))

    MAX_UPLOAD_SIZE_MB: int = int(os.getenv("MAX_UPLOAD_SIZE_MB", "25"))

    class Config:
        env_file = ".env"
        extra = "ignore"

settings = Settings()
