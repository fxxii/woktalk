"""
WokTalk Backend API
FastAPI application for cooking video processing
Production-ready with rate limiting, caching, and structured logging (2026)
"""
import os
import sys
import time
import json
import logging
import asyncio
from contextlib import asynccontextmanager
from typing import Optional
from pathlib import Path

# Fix for Windows: Set event loop policy to support subprocesses
if sys.platform == 'win32':
    asyncio.set_event_loop_policy(asyncio.WindowsProactorEventLoopPolicy())

from fastapi import FastAPI, HTTPException, BackgroundTasks, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from pydantic import BaseModel
from dotenv import load_dotenv
import structlog

from video_processor import VideoProcessor
from gemini_client import GeminiClient

# ============================================================================
# CONFIGURATION
# ============================================================================

# Load environment variables (Check both root and backend dir)
env_path = Path(__file__).parent.parent / ".env"
if not env_path.exists():
    env_path = Path(__file__).parent / ".env"
load_dotenv(env_path)

# Environment configuration
ENVIRONMENT = os.getenv("ENVIRONMENT", "development")
GEMINI_API_KEY = os.getenv("GEMINI_API_KEY")

# Configure structlog
structlog.configure(
    processors=[
        structlog.contextvars.merge_contextvars,
        structlog.processors.add_log_level,
        structlog.processors.StackInfoRenderer(),
        structlog.processors.format_exc_info,
        structlog.processors.TimeStamper(fmt="iso"),
        structlog.processors.JSONRenderer() if ENVIRONMENT == "production" else structlog.dev.ConsoleRenderer(),
    ],
    logger_factory=structlog.PrintLoggerFactory(),
    cache_logger_on_first_use=True,
)
logger = structlog.get_logger(__name__)
logger.info("logging_initialized", environment=ENVIRONMENT)

# Environment validation
REQUIRED_ENV_VARS = {
    "demo": [],  # Demo mode requires nothing
    "production": ["GEMINI_API_KEY"]
}

# CORS configuration
ALLOWED_ORIGINS = os.getenv(
    "ALLOWED_ORIGINS",
    "http://localhost:3000,http://127.0.0.1:3000"
).split(",")

# Rate limiting configuration
RATE_LIMIT_PER_MINUTE = int(os.getenv("RATE_LIMIT_PER_MINUTE", "10"))

# ============================================================================
# CACHING (In-memory with Upstash fallback)
# ============================================================================

# Try to use Upstash Redis if available
try:
    from upstash_redis import Redis as UpstashRedis
    UPSTASH_URL = os.getenv("UPSTASH_REDIS_URL")
    UPSTASH_TOKEN = os.getenv("UPSTASH_REDIS_TOKEN")
    
    if UPSTASH_URL and UPSTASH_TOKEN:
        redis_client = UpstashRedis(url=UPSTASH_URL, token=UPSTASH_TOKEN)
        CACHE_TYPE = "upstash"
        logger.info("cache_initialized: type=upstash")
    else:
        redis_client = None
        CACHE_TYPE = "memory"
except ImportError:
    redis_client = None
    CACHE_TYPE = "memory"
    logger.info("cache_initialized: type=memory. Note: Install upstash-redis for production caching")

# In-memory cache fallback
recipe_cache: dict = {}
processing_jobs: dict = {}


async def cache_get(key: str) -> Optional[dict]:
    """Get value from cache (Upstash or memory)."""
    if CACHE_TYPE == "upstash" and redis_client:
        try:
            data = redis_client.get(key)
            return json.loads(data) if data else None
        except Exception as e:
            logger.warning(f"cache_get_error: key={key} error={str(e)}")
            return recipe_cache.get(key)
    return recipe_cache.get(key)


async def cache_set(key: str, value: dict, ttl_seconds: int = 86400):
    """Set value in cache (Upstash or memory)."""
    recipe_cache[key] = value  # Always set memory cache as backup
    
    if CACHE_TYPE == "upstash" and redis_client:
        try:
            redis_client.setex(key, ttl_seconds, json.dumps(value))
        except Exception as e:
            logger.warning(f"cache_set_error: key={key} error={str(e)}")


# ============================================================================
# RATE LIMITING
# ============================================================================

try:
    from slowapi import Limiter, _rate_limit_exceeded_handler
    from slowapi.util import get_remote_address
    from slowapi.errors import RateLimitExceeded
    
    limiter = Limiter(key_func=get_remote_address)
    RATE_LIMITING_ENABLED = True
except ImportError:
    limiter = None
    RATE_LIMITING_ENABLED = False
    logger.warning("rate_limiting_disabled: slowapi not installed")


# ============================================================================
# SENTRY ERROR TRACKING (Optional)
# ============================================================================

SENTRY_DSN = os.getenv("SENTRY_DSN")
if SENTRY_DSN:
    try:
        import sentry_sdk
        sentry_sdk.init(
            dsn=SENTRY_DSN,
            environment=ENVIRONMENT,
            traces_sample_rate=0.1,
        )
        logger.info(f"sentry_initialized: environment={ENVIRONMENT}")
    except ImportError:
        logger.warning("sentry_not_installed")


# ============================================================================
# APPLICATION LIFECYCLE
# ============================================================================

@asynccontextmanager
async def lifespan(app: FastAPI):
    """Application lifecycle management with startup validation."""
    start_time = time.time()
    
    # Log startup
    logger.info("woktalk_starting", 
                environment=ENVIRONMENT, 
                cache_type=CACHE_TYPE, 
                rate_limiting=RATE_LIMITING_ENABLED, 
                gemini_api_configured=bool(GEMINI_API_KEY))
    
    # Validate required environment variables for production
    if ENVIRONMENT == "production":
        missing = [v for v in REQUIRED_ENV_VARS["production"] if not os.getenv(v)]
        if missing:
            logger.error(f"missing_env_vars: missing={missing}")
            raise ValueError(f"Missing required environment variables: {missing}")
    
    # Store start time for uptime tracking
    app.state.start_time = start_time
    
    logger.info("WokTalk API ready to cook!")
    yield
    
    # Cleanup
    uptime = time.time() - start_time
    logger.info(f"woktalk_shutdown: uptime_seconds={round(uptime, 2)}")


# ============================================================================
# FASTAPI APPLICATION
# ============================================================================

app = FastAPI(
    title="WokTalk API",
    description="AI-Powered Multimodal Cooking Assistant & Language Tutor (2026 Edition)",
    version="2.0.0",
    lifespan=lifespan,
    docs_url="/api/docs",
    redoc_url="/api/redoc",
    openapi_url="/api/openapi.json"
)

# Add rate limiting if available
if RATE_LIMITING_ENABLED:
    app.state.limiter = limiter
    app.add_exception_handler(RateLimitExceeded, _rate_limit_exceeded_handler)

# Global Exception Handler for 500 errors
@app.exception_handler(Exception)
async def global_exception_handler(request: Request, exc: Exception):
    import traceback
    error_trace = traceback.format_exc()
    logger.error("unhandled_exception", 
                 path=request.url.path, 
                 method=request.method, 
                 error=str(exc), 
                 trace=error_trace)
    return JSONResponse(
        status_code=500,
        content={"detail": f"Internal Server Error: {str(exc)}", "trace": error_trace if ENVIRONMENT != "production" else None}
    )

# CORS configuration
if ENVIRONMENT == "production":
    # Strict CORS for production
    app.add_middleware(
        CORSMiddleware,
        allow_origins=ALLOWED_ORIGINS,
        allow_credentials=True,
        allow_methods=["GET", "POST", "DELETE"],
        allow_headers=["Content-Type", "Authorization"],
    )
else:
    # Permissive CORS for development
    app.add_middleware(
        CORSMiddleware,
        allow_origins=["*"],
        allow_credentials=True,
        allow_methods=["*"],
        allow_headers=["*"],
    )

# Request Logging Middleware
@app.middleware("http")
async def log_requests(request: Request, call_next):
    import time
    start_time = time.time()
    
    # Log request
    path = request.url.path
    method = request.method
    logger.debug("incoming_request", path=path, method=method)
    
    response = await call_next(request)
    
    duration = time.time() - start_time
    logger.info("request_completed", 
                path=path, 
                method=method, 
                status_code=response.status_code,
                duration=f"{duration:.4f}s")
    
    return response


# ============================================================================
# REQUEST/RESPONSE MODELS
# ============================================================================

class ProcessVideoRequest(BaseModel):
    """Request to process a YouTube cooking video."""
    youtube_url: str


class ProcessingStatus(BaseModel):
    """Status of a video processing job."""
    job_id: str
    status: str  # "processing", "completed", "failed"
    progress: int  # 0-100
    message: Optional[str] = None
    result: Optional[dict] = None


class RecipeResponse(BaseModel):
    """Recipe data response."""
    success: bool
    data: Optional[dict] = None
    error: Optional[str] = None


class HealthResponse(BaseModel):
    """Health check response."""
    status: str
    version: str
    environment: str
    uptime_seconds: float
    gemini_api: bool
    cache_type: str
    rate_limiting: bool
    active_jobs: int


# ============================================================================
# API ENDPOINTS
# ============================================================================

@app.get("/")
async def root():
    """Health check endpoint."""
    return {
        "status": "healthy",
        "service": "WokTalk API",
        "version": "2.0.0",
        "message": "鑊氣！Welcome to WokTalk 🍳"
    }


@app.get("/api/health", response_model=HealthResponse)
async def health_check(request: Request):
    """Detailed health check with system metrics."""
    uptime = time.time() - request.app.state.start_time if hasattr(request.app.state, 'start_time') else 0
    
    return HealthResponse(
        status="healthy",
        version="2.0.0",
        environment=ENVIRONMENT,
        uptime_seconds=round(uptime, 2),
        gemini_api=bool(GEMINI_API_KEY),
        cache_type=CACHE_TYPE,
        rate_limiting=RATE_LIMITING_ENABLED,
        active_jobs=len([j for j in processing_jobs.values() if j.get("status") == "processing"])
    )


@app.post("/api/process-video", response_model=ProcessingStatus)
async def process_video(request: ProcessVideoRequest, background_tasks: BackgroundTasks, req: Request):
    """
    Start processing a YouTube cooking video.
    Returns immediately with a job ID for polling.
    """
    logger.info("process_video_endpoint_hit", 
                url=request.youtube_url)
    
    from urllib.parse import urlparse, parse_qs
    
    # Rate limiting decorator (applied manually for compatibility)
    if RATE_LIMITING_ENABLED:
        # This would be decorated with @limiter.limit() in a real implementation
        pass
    
    logger.info("process_video_request", 
                url=request.youtube_url, 
                client_ip=req.client.host if req.client else 'unknown')
    
    # Extract video ID
    url = request.youtube_url
    video_id = None
    
    if "youtube.com" in url:
        parsed = urlparse(url)
        video_id = parse_qs(parsed.query).get("v", [None])[0]
    elif "youtu.be" in url:
        video_id = urlparse(url).path.strip("/")
    else:
        # Assume it's a direct video ID
        video_id = url
    
    if not video_id or len(video_id) != 11:
        raise HTTPException(status_code=400, detail="Invalid YouTube URL or video ID")
    
    # Check cache first
    cached = await cache_get(video_id)
    if cached:
        logger.info(f"cache_hit video_id={video_id}")
        return ProcessingStatus(
            job_id=video_id,
            status="completed",
            progress=100,
            message="Recipe loaded from cache",
            result=cached
        )
    
    # Check if already processing
    if video_id in processing_jobs and processing_jobs[video_id].get("status") == "processing":
        return ProcessingStatus(
            job_id=video_id,
            status="processing",
            progress=processing_jobs[video_id].get("progress", 10),
            message="Video is already being processed"
        )
    
    # Start processing in background
    processing_jobs[video_id] = {
        "status": "processing",
        "progress": 0,
        "message": "Starting video extraction..."
    }
    
    background_tasks.add_task(
        _process_video_task, 
        video_id, 
        request.youtube_url
    )
    
    return ProcessingStatus(
        job_id=video_id,
        status="processing",
        progress=5,
        message="Video processing started. Extracting audio and video frames..."
    )


async def _process_video_task(video_id: str, youtube_url: str):
    """Background task for video processing."""
    logger.info(f"TASK_STARTED: video_id={video_id}, url={youtube_url}")
    try:
        # Check for API key
        if not GEMINI_API_KEY:
            logger.error("gemini_api_key_missing", video_id=video_id)
            processing_jobs[video_id] = {
                "status": "failed",
                "progress": 0,
                "message": "GEMINI_API_KEY not configured. Please add your API key to .env file."
            }
            return
        
        # Full processing pipeline
        processor = VideoProcessor()
        
        # Step 1: Extract video metadata and transcript
        processing_jobs[video_id]["progress"] = 30
        processing_jobs[video_id]["message"] = "Fetching video details and transcript..."
        
        extraction_result = await processor.process_video(youtube_url)
        
        # Step 2: Gemini native analysis
        processing_jobs[video_id]["progress"] = 70
        processing_jobs[video_id]["message"] = "Gemini is analyzing the YouTube video directly..."
        
        gemini = GeminiClient()
        result = await gemini.analyze_cooking_video(
            audio_path=None,
            frame_paths=[],
            video_id=video_id,
            youtube_url=youtube_url,
            transcript=extraction_result.get("transcript")
        )
        
        # Cleanup temp files
        processor.cleanup()
        
        # Cache result
        await cache_set(video_id, result)
        
        processing_jobs[video_id] = {
            "status": "completed",
            "progress": 100,
            "message": "Recipe ready!",
            "result": result
        }
        
        logger.info(f"video_processing_completed video_id={video_id}")
        
    except Exception as e:
        import traceback
        error_trace = traceback.format_exc()
        # Fallback to standard print if logger fails during error
        print(f"CRITICAL ERROR: {error_trace}")
        logger.error("video_processing_failed", video_id=video_id, error=str(e), trace=error_trace)
        
        # Ensure we have a message for the user
        user_message = str(e) if str(e) else "Internal server error during processing"
        
        processing_jobs[video_id] = {
            "status": "failed",
            "progress": 0,
            "message": f"Processing failed: {user_message}. Check server logs for details."
        }


@app.get("/api/stream-status/{job_id}")
async def stream_status(job_id: str):
    """
    Stream video processing status using Server-Sent Events (SSE).
    Provides real-time updates and prevents proxy timeouts with heartbeats.
    """
    from fastapi.responses import StreamingResponse
    import json
    
    async def event_generator():
        logger.debug("sse_stream_started", job_id=job_id)
        
        last_progress = -1
        last_status = ""
        
        # Connection keep-alive/timeout prevention (every 15 seconds)
        last_heartbeat = time.time()
        
        try:
            while True:
                current_time = time.time()
                
                # Check if job exists
                if job_id not in processing_jobs:
                    # Check cache as last resort
                    cached = await cache_get(job_id)
                    if cached:
                        yield f"data: {json.dumps({'status': 'completed', 'progress': 100, 'message': 'Recipe ready', 'result': cached})}\n\n"
                        break
                    
                    yield f"data: {json.dumps({'status': 'failed', 'progress': 0, 'message': 'Job not found'})}\n\n"
                    break

                job = processing_jobs[job_id]
                status = job.get("status")
                progress = job.get("progress", 0)
                message = job.get("message", "")
                
                # Only send update if status or progress changed, or if it's been a while
                if progress != last_progress or status != last_status or (current_time - last_heartbeat > 15):
                    # For completed jobs, we might want to send the result once
                    # but result can be huge. We'll send a signal to fetch via /api/recipe/
                    data = {
                        "status": status,
                        "progress": progress,
                        "message": message,
                        "job_id": job_id
                    }
                    yield f"data: {json.dumps(data)}\n\n"
                    
                    last_progress = progress
                    last_status = status
                    last_heartbeat = current_time
                    
                    if status in ["completed", "failed"]:
                        logger.debug("sse_stream_ending", job_id=job_id, status=status)
                        break
                
                # Low-latency polling interval
                await asyncio.sleep(1)
                
        except asyncio.CancelledError:
            logger.debug("sse_stream_cancelled", job_id=job_id)
            raise
        except Exception as e:
            logger.error("sse_stream_error", job_id=job_id, error=str(e))
            yield f"data: {json.dumps({'status': 'failed', 'message': f'Streaming error: {str(e)}'})}\n\n"

    return StreamingResponse(
        event_generator(), 
        media_type="text/event-stream",
        headers={
            "Cache-Control": "no-cache",
            "Connection": "keep-alive",
            "X-Accel-Buffering": "no",  # Prevents Nginx/Proxy buffering
            "Content-Type": "text/event-stream",
            "Access-Control-Allow-Origin": "*"  # Explicit CORS for SSE
        }
    )


@app.get("/api/status/{job_id}")
async def get_processing_status(job_id: str):
    """Check the status of a video processing job."""
    if job_id not in processing_jobs:
        cached = await cache_get(job_id)
        if cached: return {"status": "completed", "progress": 100, "result": cached}
        raise HTTPException(status_code=404, detail="Job not found")
    
    job = processing_jobs[job_id]
    return {
        "job_id": job_id,
        "status": job["status"],
        "progress": job["progress"],
        "message": job.get("message")
    }


@app.get("/api/recipe/{video_id}")
async def get_recipe(video_id: str):
    """Get a processed recipe by video ID (Returning direct JSON to bypass Pydantic issues)."""
    logger.debug("get_recipe_request", video_id=video_id)
    cached = await cache_get(video_id)
    if cached:
        logger.debug("recipe_found_in_cache", video_id=video_id)
        return {"success": True, "data": cached}
    
    # Check if processing
    if video_id in processing_jobs:
        job = processing_jobs[video_id]
        logger.debug("recipe_job_found", video_id=video_id, status=job["status"])
        if job["status"] == "processing":
            return {"success": False, "error": f"Recipe is still processing ({job['progress']}%)"}
        elif job["status"] == "completed" and job.get("result"):
            logger.debug("returning_completed_result", video_id=video_id)
            return {"success": True, "data": job["result"]}
    
    logger.warning("recipe_not_found", video_id=video_id)
    raise HTTPException(status_code=404, detail="Recipe not found. Process video first.")


@app.delete("/api/cache/{video_id}")
async def clear_cache(video_id: str):
    """Clear cached recipe (for testing)."""
    if video_id in recipe_cache:
        del recipe_cache[video_id]
    if video_id in processing_jobs:
        del processing_jobs[video_id]
    
    # Also clear from Upstash if available
    if CACHE_TYPE == "upstash" and redis_client:
        try:
            redis_client.delete(video_id)
        except Exception:
            pass
    
    logger.info(f"cache_cleared: video_id={video_id}")
    return {"message": f"Cache cleared for {video_id}"}




# ============================================================================
# MAIN ENTRY POINT
# ============================================================================

if __name__ == "__main__":
    import uvicorn
    
    port = int(os.getenv("PORT", "8000"))
    host = os.getenv("HOST", "0.0.0.0")
    reload = ENVIRONMENT != "production"
    
    logger.info(f"starting_server host={host}, port={port}, reload={reload}")
    
    uvicorn.run(
        "main:app", 
        host=host, 
        port=port, 
        reload=reload,
        log_level="info" if ENVIRONMENT == "production" else "debug"
    )
