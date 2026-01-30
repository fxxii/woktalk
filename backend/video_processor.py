"""
WokTalk Video Processor
Simplified version: Handles YouTube video ID extraction and transcript fetching.
Manual media downloading (yt-dlp) is now deprecated in favor of Gemini's native YouTube support.
"""
import asyncio
import tempfile
from pathlib import Path
from typing import Optional
import structlog
import youtube_transcript_api

logger = structlog.get_logger(__name__)

class VideoProcessor:
    """Handles YouTube video metadata and transcript extraction."""
    
    def __init__(self, output_dir: Optional[str] = None):
        # Temp dir kept for legacy compatibility and future localized processing if needed
        self.output_dir = output_dir or tempfile.mkdtemp(prefix="woktalk_")
        Path(self.output_dir).mkdir(parents=True, exist_ok=True)
        
    async def process_video(self, youtube_url: str) -> dict:
        """
        Main entry point: Extract video ID and transcript.
        
        Returns:
            dict with 'video_id', 'transcript'
        """
        video_id = self._extract_video_id(youtube_url)
        if not video_id:
            raise ValueError(f"Invalid YouTube URL: {youtube_url}")
        
        logger.info("processing_video_native", video_id=video_id)
        
        # Fetch transcript
        transcript = await self.get_transcript(video_id)
        
        return {
            "video_id": video_id,
            "transcript": transcript,
            "audio_path": None,  # Deprecated
            "frames_dir": None,   # Deprecated
            "duration_seconds": 0.0 # Deprecated
        }
    
    async def get_transcript(self, video_id: str) -> Optional[str]:
        """Fetch transcript/captions using youtube-transcript-api."""
        try:
            import youtube_transcript_api
            
            # Explicitly get the class from the module to avoid naming confusion
            api_class = getattr(youtube_transcript_api, 'YouTubeTranscriptApi', None)
            
            if not api_class:
                logger.error("transcript_api_class_not_found", dir=dir(youtube_transcript_api))
                return None

            def fetch():
                return api_class.get_transcript(video_id, languages=['zh-HK', 'zh-TW', 'en', 'zh-CN'])
            
            transcript_data = await asyncio.to_thread(fetch)
            full_text = " ".join([t['text'] for t in transcript_data])
            logger.info("transcript_fetched", video_id=video_id, length=len(full_text))
            return full_text
        except Exception as e:
            logger.warning("transcript_not_found", video_id=video_id, error=str(e))
            return None
    
    def _extract_video_id(self, url: str) -> Optional[str]:
        """Extract YouTube video ID from various URL formats."""
        import re
        patterns = [
            r'(?:youtube\.com/watch\?v=|youtu\.be/|youtube\.com/embed/)([a-zA-Z0-9_-]{11})',
            r'([a-zA-Z0-9_-]{11})'  # Direct ID
        ]
        for pattern in patterns:
            match = re.search(pattern, url)
            if match:
                return match.group(1)
        return None
    
    def get_frame_paths(self, frames_dir: str, max_frames: int = 50) -> list[str]:
        """Legacy helper - now returns empty list."""
        return []
    
    def cleanup(self):
        """Remove temporary files."""
        import shutil
        try:
            shutil.rmtree(self.output_dir)
        except Exception as e:
            logger.warning(f"Cleanup failed: {e}")
