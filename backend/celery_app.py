"""
Celery Application Configuration for UniTxt
Production-grade message queue for handling 100K+ messages
"""

import os
from celery import Celery
from kombu import Queue, Exchange
from dotenv import load_dotenv

load_dotenv()

# Redis configuration
REDIS_URL = os.environ.get('REDIS_URL', 'redis://localhost:6379/0')

# Create Celery app
celery_app = Celery(
    'unitxt',
    broker=REDIS_URL,
    backend=REDIS_URL,
    include=['tasks']
)

# Celery configuration
celery_app.conf.update(
    # Task settings
    task_serializer='json',
    accept_content=['json'],
    result_serializer='json',
    timezone='UTC',
    enable_utc=True,
    
    # Result backend settings
    result_expires=3600,  # Results expire after 1 hour
    result_extended=True,
    
    # Task execution settings
    task_acks_late=True,  # Acknowledge after task completes (safer)
    task_reject_on_worker_lost=True,
    
    # Worker settings
    worker_prefetch_multiplier=4,  # Number of tasks to prefetch
    worker_concurrency=4,  # Number of concurrent workers
    
    # Rate limiting
    task_annotations={
        'tasks.send_single_sms': {
            'rate_limit': '100/s',  # 100 SMS per second per worker
        },
        'tasks.send_single_whatsapp': {
            'rate_limit': '50/s',  # 50 WhatsApp per second per worker
        },
    },
    
    # Retry settings
    task_default_retry_delay=60,  # 1 minute
    task_max_retries=3,
    
    # Queue configuration
    task_queues=(
        Queue('high_priority', Exchange('high_priority'), routing_key='high'),
        Queue('default', Exchange('default'), routing_key='default'),
        Queue('bulk', Exchange('bulk'), routing_key='bulk'),
        Queue('low_priority', Exchange('low_priority'), routing_key='low'),
    ),
    task_default_queue='default',
    task_default_exchange='default',
    task_default_routing_key='default',
    
    # Task routing
    task_routes={
        'tasks.send_single_sms': {'queue': 'high_priority'},
        'tasks.send_single_whatsapp': {'queue': 'high_priority'},
        'tasks.process_campaign_batch': {'queue': 'default'},
        'tasks.process_campaign': {'queue': 'bulk'},
        'tasks.cleanup_old_results': {'queue': 'low_priority'},
    },
    
    # Beat schedule (for periodic tasks)
    beat_schedule={
        'cleanup-old-results': {
            'task': 'tasks.cleanup_old_results',
            'schedule': 3600.0,  # Every hour
        },
        'process-scheduled-campaigns': {
            'task': 'tasks.process_scheduled_campaigns',
            'schedule': 60.0,  # Every minute
        },
    },
)

# Task priority levels
PRIORITY_HIGH = 0
PRIORITY_DEFAULT = 5
PRIORITY_LOW = 9
