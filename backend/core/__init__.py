"""
Core module initialization
"""
from .config import (
    db, sync_db, client, sync_client,
    logger, MONGO_URL, DB_NAME, REDIS_URL,
    get_current_user, get_optional_user,
    verify_password, get_password_hash, create_access_token,
    serialize_doc
)
from .celery_config import celery_app, is_celery_available, get_celery_app

__all__ = [
    'db', 'sync_db', 'client', 'sync_client',
    'logger', 'MONGO_URL', 'DB_NAME', 'REDIS_URL',
    'get_current_user', 'get_optional_user',
    'verify_password', 'get_password_hash', 'create_access_token',
    'serialize_doc',
    'celery_app', 'is_celery_available', 'get_celery_app'
]
