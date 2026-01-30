"""
WokTalk Gemini Client
Multimodal AI processing using Google Gemini 2.0 (New SDK - 2026)
"""
import os
import json
import base64
from pathlib import Path
from typing import Optional
import structlog
logger = structlog.get_logger(__name__)

# Try new SDK first, fallback to old for compatibility
try:
    from google import genai
    from google.genai import types
    NEW_SDK = True
except ImportError:
    import google.generativeai as genai
    NEW_SDK = False

class GeminiClient:
    """Handles multimodal AI processing with Gemini 2.0 (New SDK)."""
    
    def __init__(self, api_key: Optional[str] = None):
        raw_key = api_key or os.getenv("GEMINI_API_KEY")
        if not raw_key:
            raise ValueError("GEMINI_API_KEY not found in environment")
        
        # Sanitize key: User might have accidentally prefixed it with sk-proj-
        self.api_key = raw_key.replace("sk-proj-", "")
        
        if NEW_SDK:
            # New SDK (2026)
            self.client = genai.Client(api_key=self.api_key)
            # Using Gemini 2.5 Flash (Latest, better quota)
            # Confirmed available by test_models.py
            self.model_name = "gemini-2.5-flash"
        else:
            # Legacy SDK (deprecated)
            genai.configure(api_key=self.api_key)
            self.model = genai.GenerativeModel('gemini-1.5-pro')
        
        self.system_prompt = self._load_system_prompt()
    
    def _load_system_prompt(self) -> str:
        """Load the v3 grounded prompt from file."""
        prompt_path = Path(__file__).parent / "prompts" / "v3_grounded.md"
        if prompt_path.exists():
            return prompt_path.read_text(encoding="utf-8")
        else:
            # Fallback inline prompt
            return """You are an expert Hong Kong chef and Cantonese translator.
Analyze this cooking video and output JSON with recipe steps in both English and Cantonese.
Use a casual "Cha Chaan Teng Uncle" speaking style with particles like 啦, 喎, 囉.
Output valid JSON only."""
    
    async def analyze_cooking_video(
        self, 
        audio_path: Optional[str], 
        frame_paths: list[str],
        video_id: str,
        youtube_url: Optional[str] = None,
        transcript: Optional[str] = None
    ) -> dict:
        """
        Analyze cooking video using multimodal Gemini.
        
        Args:
            audio_path: Path to extracted audio file
            frame_paths: List of paths to sampled video frames
            video_id: YouTube video ID for metadata
            
        Returns:
            Structured recipe data as dictionary
        """
        logger.info("video_analysis_started", video_id=video_id, frame_count=len(frame_paths), new_sdk=NEW_SDK)
        
        try:
            if NEW_SDK:
                result = await self._analyze_with_new_sdk(audio_path, frame_paths, video_id, youtube_url, transcript)
            else:
                result = await self._analyze_with_legacy_sdk(audio_path, frame_paths, video_id, youtube_url, transcript)
            
            # Add metadata
            result["youtube_id"] = video_id
            result["frames_analyzed"] = min(len(frame_paths), 50)
            result["cost_estimate"] = self._estimate_cost(len(frame_paths))
            
            logger.info("video_analysis_completed", video_id=video_id, status=result.get('processing_status', 'unknown'))
            return result
            
        except Exception as e:
            logger.error("video_analysis_failed", video_id=video_id, error=str(e))
            return {
                "processing_status": "failed",
                "error_message": str(e),
                "youtube_id": video_id
            }
    
    async def _analyze_with_new_sdk(
        self, 
        audio_path: Optional[str], 
        frame_paths: list[str],
        video_id: str,
        youtube_url: Optional[str] = None,
        transcript: Optional[str] = None
    ) -> dict:
        """Analyze using new google-genai SDK (2026)."""
        # Build content parts
        contents = []
        
        # Add system prompt
        contents.append(types.Part.from_text(text=self.system_prompt))
        
        # Add YouTube Video via Native Support (The magic happens here!)
        if youtube_url:
            contents.append(
                types.Part(
                    file_data=types.FileData(
                        file_uri=youtube_url,
                        mime_type="video/mp4"
                    )
                )
            )
            logger.info("native_youtube_url_added", url=youtube_url)
        
        # Add user instruction
        contents.append(types.Part.from_text(text=f"""
Please analyze this cooking video (ID: {video_id}).
"""))
        
        # Add transcript if available
        if transcript:
            contents.append(types.Part.from_text(text=f"TRANSCRIPT:\n{transcript[:5000]}"))
            logger.debug("transcript_added", length=len(transcript))

        # Add manual parts ONLY if available (legacy fallback)
        if audio_path and os.path.exists(audio_path):
            with open(audio_path, "rb") as f:
                audio_data = f.read()
            contents.append(types.Part.from_bytes(data=audio_data, mime_type="audio/mp3"))

        max_frames = 0
        if frame_paths:
            max_frames = min(len(frame_paths), 50)
            for frame_path in frame_paths[:max_frames]:
                if os.path.exists(frame_path):
                    with open(frame_path, "rb") as f:
                        frame_data = f.read()
                    contents.append(types.Part.from_bytes(data=frame_data, mime_type="image/jpeg"))
        
        logger.debug(f"frames_added count={max_frames}")
        
        # Generate response with retry
        response = await self._generate_with_retry_new(contents)
        return self._parse_json_response(response.text)
    
    async def _analyze_with_legacy_sdk(
        self, 
        audio_path: Optional[str], 
        frame_paths: list[str],
        video_id: str,
        youtube_url: Optional[str] = None,
        transcript: Optional[str] = None
    ) -> dict:
        """Analyze using legacy google-generativeai SDK (deprecated)."""
        # Build multimodal content
        content_parts = []
        
        # Add system prompt
        content_parts.append(self.system_prompt)
        
        # Add YouTube URL instruction for legacy
        if youtube_url:
            content_parts.append(f"YouTube Video URL: {youtube_url}")
        
        # Add user instruction
        content_parts.append(f"""
Please analyze this cooking video (ID: {video_id}).
{f"TRANSCRIPT:\n{transcript[:5000]}" if transcript else "No transcript available."}

IMPORTANT:
- Use the transcript and YouTube video context to understand instructions.
- Output ONLY valid JSON.
""")
        
        # Add audio file
        if audio_path and os.path.exists(audio_path):
            with open(audio_path, "rb") as f:
                audio_data = f.read()
            content_parts.append({
                "mime_type": "audio/mp3",
                "data": base64.b64encode(audio_data).decode()
            })
            logger.info(f"Added audio: {len(audio_data)} bytes")
        
        # Add frames (limit to prevent context overflow)
        max_frames = min(len(frame_paths), 50)
        for frame_path in frame_paths[:max_frames]:
            if os.path.exists(frame_path):
                with open(frame_path, "rb") as f:
                    frame_data = f.read()
                content_parts.append({
                    "mime_type": "image/jpeg",
                    "data": base64.b64encode(frame_data).decode()
                })
        
        logger.info(f"Added {max_frames} frames to content")
        
        # Generate response
        response = await self._generate_with_retry_legacy(content_parts)
        return self._parse_json_response(response.text)
    
    async def _generate_with_retry_new(self, contents: list, max_retries: int = 2):
        """Generate response with retry logic (new SDK)."""
        import asyncio
        
        for attempt in range(max_retries + 1):
            try:
                response = self.client.models.generate_content(
                    model=self.model_name,
                    contents=contents
                )
                return response
            except Exception as e:
                if attempt < max_retries:
                    wait_time = 2 ** attempt
                    logger.warning("gemini_retry", 
                        attempt=attempt + 1, 
                        max_retries=max_retries,
                        wait_seconds=wait_time,
                        error=str(e)
                    )
                    await asyncio.sleep(wait_time)
                else:
                    raise
        
    def _parse_json_response(self, text: str) -> dict:
        """Extract and parse JSON from Gemini response."""
        # Try to find JSON in the response
        text = text.strip()
        
        # Remove markdown code blocks if present
        if text.startswith("```json"):
            text = text[7:]
        if text.startswith("```"):
            text = text[3:]
        if text.endswith("```"):
            text = text[:-3]
        
        text = text.strip()
        
        try:
            return json.loads(text)
        except json.JSONDecodeError as e:
            logger.warning("json_parse_failed", error=str(e))
            
            # Try to find JSON object boundaries
            start = text.find("{")
            end = text.rfind("}") + 1
            if start >= 0 and end > start:
                try:
                    return json.loads(text[start:end])
                except:
                    pass
            
            # Return error structure
            return {
                "processing_status": "failed",
                "error_message": f"Failed to parse Gemini response: {str(e)}",
                "raw_response": text[:500]
            }
    
    def _estimate_cost(self, num_frames: int) -> dict:
        """Estimate API cost for transparency."""
        # Approximate token counts
        audio_tokens = 5000  # ~5 min of audio
        frame_tokens = num_frames * 250  # ~250 tokens per frame
        text_tokens = 2000  # Prompt + response
        
        total_tokens = audio_tokens + frame_tokens + text_tokens
        
        # Gemini 2.0 pricing (2026 rates)
        cost_per_1k_input = 0.00075  # $0.75 per million
        cost_per_1k_output = 0.003   # $3.00 per million
        
        input_cost = (total_tokens / 1000) * cost_per_1k_input
        output_cost = (2000 / 1000) * cost_per_1k_output
        
        return {
            "total_tokens": total_tokens,
            "estimated_cost_usd": round(input_cost + output_cost, 4),
            "raw_video_cost_usd": round((total_tokens * 10 / 1000) * cost_per_1k_input, 4),
            "savings_percent": 90
        }
