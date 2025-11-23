import os
from fastapi import FastAPI, UploadFile, File, HTTPException, Form
from fastapi.staticfiles import StaticFiles
from fastapi.responses import JSONResponse
from dotenv import load_dotenv
from typing import Optional
import openai
import shutil

# Load environment variables
load_dotenv()

# Check and setup FFmpeg
def setup_ffmpeg():
    import shutil
    if shutil.which("ffmpeg"):
        return
    
    print("FFmpeg not found in PATH. Searching in WinGet packages...")
    import glob
    import os
    
    local_appdata = os.environ.get("LOCALAPPDATA")
    if local_appdata:
        search_path = os.path.join(local_appdata, "Microsoft", "WinGet", "Packages", "**", "ffmpeg.exe")
        matches = glob.glob(search_path, recursive=True)
        
        if matches:
            ffmpeg_path = matches[0]
            ffmpeg_dir = os.path.dirname(ffmpeg_path)
            print(f"Found FFmpeg at: {ffmpeg_path}")
            
            # Add to PATH
            os.environ["PATH"] += os.pathsep + ffmpeg_dir
            
            # Set for pydub
            from pydub import AudioSegment
            AudioSegment.converter = ffmpeg_path
        else:
            print("FFmpeg not found in WinGet packages.")

setup_ffmpeg()

app = FastAPI()


from fastapi import FastAPI, UploadFile, File, HTTPException, Form
from typing import Optional

# ... (existing code) ...

@app.post("/transcribe")
async def transcribe_audio(file: UploadFile = File(...)):
    if not file:
        raise HTTPException(status_code=400, detail="No file uploaded")
    
    # Check API key
    api_key = os.getenv("OPENAI_API_KEY")
    if not api_key:
        return JSONResponse(
            status_code=500, 
            content={"error": "OpenAI API Key not found. Please set it in .env file."}
        )

    # Save temp file
    temp_filename = f"temp_{file.filename}"
    try:
        with open(temp_filename, "wb") as buffer:
            shutil.copyfileobj(file.file, buffer)
            
        # Call OpenAI Whisper API
        client = openai.OpenAI(api_key=api_key)
        
        # Check file size (25MB limit)
        file_size = os.path.getsize(temp_filename)
        MAX_SIZE = 25 * 1024 * 1024
        
        if file_size <= MAX_SIZE:
            # Process normally
            with open(temp_filename, "rb") as audio_file:
                transcript = client.audio.transcriptions.create(
                    model="whisper-1", 
                    file=audio_file
                )
            final_text = transcript.text
        else:
            # Split and process
            print(f"File size {file_size} exceeds limit. Splitting...")
            
            # Use ffmpeg to split directly without loading into memory
            import subprocess
            import math
            
            # Get duration first
            cmd = [
                "ffprobe", 
                "-v", "error", 
                "-show_entries", "format=duration", 
                "-of", "default=noprint_wrappers=1:nokey=1", 
                temp_filename
            ]
            result = subprocess.run(cmd, stdout=subprocess.PIPE, stderr=subprocess.PIPE)
            duration = float(result.stdout)
            
            # Get file extension
            file_ext = os.path.splitext(temp_filename)[1]
            
            chunk_length = 10 * 60 # 10 minutes in seconds
            num_chunks = math.ceil(duration / chunk_length)
            
            full_transcript = []
            
            for i in range(num_chunks):
                chunk_filename = f"temp_chunk_{i}{file_ext}"
                start_time = i * chunk_length
                print(f"Processing chunk {i+1}/{num_chunks}...")
                
                # Split using ffmpeg
                split_cmd = [
                    "ffmpeg",
                    "-y", # Overwrite output
                    "-i", temp_filename,
                    "-ss", str(start_time),
                    "-t", str(chunk_length),
                    "-acodec", "copy", # Copy stream (fast & low memory)
                    chunk_filename
                ]
                subprocess.run(split_cmd, check=True)
                
                try:
                    with open(chunk_filename, "rb") as audio_file:
                        transcript = client.audio.transcriptions.create(
                            model="whisper-1", 
                            file=audio_file
                        )
                    full_transcript.append(transcript.text)
                finally:
                    if os.path.exists(chunk_filename):
                        os.remove(chunk_filename)
            
            final_text = " ".join(full_transcript)
            
        return {"text": final_text}

    except Exception as e:
        import traceback
        traceback.print_exc()
        print(f"Error during transcription: {e}")
        return JSONResponse(status_code=500, content={"error": str(e)})
        
    finally:
        # Cleanup
        if os.path.exists(temp_filename):
            os.remove(temp_filename)

# Mount static files (Must be last to avoid shadowing API routes)
app.mount("/", StaticFiles(directory="static", html=True), name="static")

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)
