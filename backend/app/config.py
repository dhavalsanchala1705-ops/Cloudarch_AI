from pydantic_settings import BaseSettings
from functools import lru_cache
from typing import List, Union
from pydantic import field_validator


class Settings(BaseSettings):
    database_url: str = "postgresql+asyncpg://postgres:postgres@localhost:5432/archgen"
    gemini_api_key: str = ""
    aws_cognito_region: str = "us-east-1"
    aws_cognito_user_pool_id: str = ""
    aws_cognito_app_client_id: str = ""
    aws_s3_bucket_name: str = ""
    aws_region: str = "us-east-1"
    allowed_origins: Union[List[str], str] = ["http://localhost:5173"]
    environment: str = "development"

    @field_validator("allowed_origins", mode="before")
    @classmethod
    def parse_origins(cls, v):
        if isinstance(v, str):
            v = v.strip()
            return [origin.strip() for origin in v.split(",") if origin.strip()]
        return v

    @field_validator("database_url", "gemini_api_key", "aws_cognito_region", "aws_cognito_user_pool_id", "aws_cognito_app_client_id", "aws_s3_bucket_name", "aws_region", mode="before")
    @classmethod
    def strip_whitespace(cls, v):
        if isinstance(v, str):
            return v.strip()
        return v

    class Config:
        env_file = ".env"
        case_sensitive = False


@lru_cache()
def get_settings() -> Settings:
    return Settings()
