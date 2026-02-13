"""
Production-Grade Celery Configuration for KwikPay
Designed for 100K+ transactions per minute throughput
"""
import os
from celery import Celery
from kombu import Queue, Exchange
from dotenv import load_dotenv

load_dotenv()

# Redis Configuration
REDIS_URL = os.environ.get('REDIS_URL', 'redis://localhost:6379/0')
CELERY_BROKER_URL = os.environ.get('CELERY_BROKER_URL', REDIS_URL)
CELERY_RESULT_BACKEND = os.environ.get('CELERY_RESULT_BACKEND', REDIS_URL)

# Create Celery app with production-grade settings
celery_app = Celery(
    'kwikpay',
    broker=CELERY_BROKER_URL,
    backend=CELERY_RESULT_BACKEND,
    include=['backend.tasks', 'tasks']
)

# Production Celery Configuration
celery_app.conf.update(
    # Serialization
    task_serializer='json',
    accept_content=['json'],
    result_serializer='json',
    timezone='UTC',
    enable_utc=True,
    
    # Result Backend Settings
    result_expires=3600,  # 1 hour
    result_extended=True,
    result_compression='gzip',
    
    # Task Execution Settings (Critical for High Throughput)
    task_acks_late=True,  # Acknowledge after completion (safer)
    task_reject_on_worker_lost=True,
    task_track_started=True,
    
    # Worker Settings (Optimized for 100K+ TPM)
    worker_prefetch_multiplier=8,  # Pre-fetch 8 tasks per worker
    worker_concurrency=8,  # 8 concurrent workers per process
    worker_max_tasks_per_child=1000,  # Restart worker after 1000 tasks (memory management)
    worker_max_memory_per_child=256000,  # 256MB max per worker
    
    # Connection Pool Settings
    broker_pool_limit=100,
    broker_connection_retry_on_startup=True,
    broker_connection_retry=True,
    broker_connection_max_retries=10,
    
    # Rate Limiting (Prevents overwhelming downstream systems)
    task_annotations={
        'backend.tasks.process_payment': {'rate_limit': '1000/s'},
        'backend.tasks.send_webhook': {'rate_limit': '500/s'},
        'backend.tasks.process_refund': {'rate_limit': '200/s'},
        'backend.tasks.send_notification': {'rate_limit': '100/s'},
    },
    
    # Retry Settings
    task_default_retry_delay=30,  # 30 seconds
    task_max_retries=3,
    
    # Queue Configuration (Priority-based)
    task_queues=(
        # Critical payments queue - highest priority
        Queue('critical', Exchange('critical', type='direct'), routing_key='critical',
              queue_arguments={'x-max-priority': 10}),
        
        # Payment processing queue
        Queue('payments', Exchange('payments', type='direct'), routing_key='payments',
              queue_arguments={'x-max-priority': 8}),
        
        # Webhook delivery queue
        Queue('webhooks', Exchange('webhooks', type='direct'), routing_key='webhooks',
              queue_arguments={'x-max-priority': 6}),
        
        # Default queue
        Queue('default', Exchange('default', type='direct'), routing_key='default',
              queue_arguments={'x-max-priority': 5}),
        
        # Batch processing queue
        Queue('batch', Exchange('batch', type='direct'), routing_key='batch',
              queue_arguments={'x-max-priority': 3}),
        
        # Low priority tasks (reports, analytics)
        Queue('low', Exchange('low', type='direct'), routing_key='low',
              queue_arguments={'x-max-priority': 1}),
    ),
    
    task_default_queue='default',
    task_default_exchange='default',
    task_default_routing_key='default',
    
    # Task Routing
    task_routes={
        # Critical payment tasks
        'backend.tasks.process_payment': {'queue': 'critical'},
        'backend.tasks.process_mobile_money': {'queue': 'critical'},
        'backend.tasks.process_card_payment': {'queue': 'critical'},
        
        # Regular payment tasks
        'backend.tasks.verify_payment': {'queue': 'payments'},
        'backend.tasks.update_payment_status': {'queue': 'payments'},
        
        # Webhook tasks
        'backend.tasks.send_webhook': {'queue': 'webhooks'},
        'backend.tasks.retry_failed_webhook': {'queue': 'webhooks'},
        
        # Batch processing
        'backend.tasks.process_batch_payments': {'queue': 'batch'},
        'backend.tasks.generate_settlement_report': {'queue': 'batch'},
        
        # Low priority
        'backend.tasks.cleanup_old_logs': {'queue': 'low'},
        'backend.tasks.generate_analytics': {'queue': 'low'},
    },
    
    # Celery Beat Schedule (Periodic Tasks)
    beat_schedule={
        # Payment status checks every 30 seconds
        'check-pending-payments': {
            'task': 'backend.tasks.check_pending_payments',
            'schedule': 30.0,
        },
        # Webhook retry every minute
        'retry-failed-webhooks': {
            'task': 'backend.tasks.retry_failed_webhooks',
            'schedule': 60.0,
        },
        # Settlement processing daily at midnight
        'daily-settlement': {
            'task': 'backend.tasks.process_daily_settlement',
            'schedule': {'hour': 0, 'minute': 0},
        },
        # Cleanup old logs hourly
        'cleanup-logs': {
            'task': 'backend.tasks.cleanup_old_logs',
            'schedule': 3600.0,
        },
        # System health check every 5 minutes
        'system-health-check': {
            'task': 'backend.tasks.system_health_check',
            'schedule': 300.0,
        },
    },
    
    # Memory Optimization
    worker_cancel_long_running_tasks_on_connection_loss=True,
    
    # Event Settings (for monitoring)
    worker_send_task_events=True,
    task_send_sent_event=True,
)

# Task Priority Levels
PRIORITY_CRITICAL = 10
PRIORITY_HIGH = 8
PRIORITY_NORMAL = 5
PRIORITY_LOW = 3
PRIORITY_BACKGROUND = 1


def get_celery_app():
    """Get the configured Celery application"""
    return celery_app


def is_celery_available():
    """Check if Celery/Redis is available"""
    try:
        celery_app.control.ping(timeout=1)
        return True
    except Exception:
        return False
