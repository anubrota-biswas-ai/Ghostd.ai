from fastapi import FastAPI, APIRouter, HTTPException, Request, Response
from dotenv import load_dotenv
from starlette.middleware.cors import CORSMiddleware
from motor.motor_asyncio import AsyncIOMotorClient
import os, logging, uuid, json
from pathlib import Path
from pydantic import BaseModel, Field
from typing import List, Optional
from datetime import datetime, timezone, timedelta
import httpx
from emergentintegrations.llm.chat import LlmChat, UserMessage

ROOT_DIR = Path(__file__).parent
load_dotenv(ROOT_DIR / '.env')

# MongoDB
mongo_url = os.environ['MONGO_URL']
client = AsyncIOMotorClient(mongo_url)
db = client[os.environ['DB_NAME']]

app = FastAPI()
api_router = APIRouter(prefix="/api")

logging.basicConfig(level=logging.INFO, format='%(asctime)s - %(name)s - %(levelname)s - %(message)s')
logger = logging.getLogger(__name__)

# ─── Pydantic Models ───

class SessionRequest(BaseModel):
    session_id: str

class JobCreate(BaseModel):
    title: str
    company: str
    location: str = ""
    remote: bool = False
    url: str = ""
    salary_min: Optional[int] = None
    salary_max: Optional[int] = None
    currency: str = "USD"
    status: str = "wishlist"
    date_applied: Optional[str] = None
    jd_raw_text: str = ""
    notes: str = ""

class JobUpdate(BaseModel):
    title: Optional[str] = None
    company: Optional[str] = None
    location: Optional[str] = None
    remote: Optional[bool] = None
    url: Optional[str] = None
    salary_min: Optional[int] = None
    salary_max: Optional[int] = None
    currency: Optional[str] = None
    status: Optional[str] = None
    date_applied: Optional[str] = None
    jd_raw_text: Optional[str] = None
    match_score: Optional[int] = None
    skills_score: Optional[int] = None
    experience_score: Optional[int] = None
    language_score: Optional[int] = None
    notes: Optional[str] = None

class ContactCreate(BaseModel):
    name: str
    role_type: str = ""
    email: str = ""
    linkedin_url: str = ""
    last_contacted: Optional[str] = None
    notes: str = ""

class ActivityCreate(BaseModel):
    message: str

class ParseJDRequest(BaseModel):
    jd_text: str

class AnalyzeCVRequest(BaseModel):
    cv_text: str
    jd_text: str
    job_id: Optional[str] = None

class CoverLetterRequest(BaseModel):
    cv_text: str
    jd_text: str
    company: str
    tone: str = "professional"

class CVUpload(BaseModel):
    raw_text: str
    filename: str = "resume.txt"

# ─── Auth Helper ───

async def get_current_user(request: Request) -> dict:
    session_token = request.cookies.get("session_token")
    if not session_token:
        auth_header = request.headers.get("authorization", "")
        if auth_header.startswith("Bearer "):
            session_token = auth_header[7:]
    if not session_token:
        raise HTTPException(status_code=401, detail="Not authenticated")

    session = await db.user_sessions.find_one({"session_token": session_token}, {"_id": 0})
    if not session:
        raise HTTPException(status_code=401, detail="Invalid session")

    expires_at = session["expires_at"]
    if isinstance(expires_at, str):
        expires_at = datetime.fromisoformat(expires_at)
    if expires_at.tzinfo is None:
        expires_at = expires_at.replace(tzinfo=timezone.utc)
    if expires_at < datetime.now(timezone.utc):
        raise HTTPException(status_code=401, detail="Session expired")

    user = await db.users.find_one({"user_id": session["user_id"]}, {"_id": 0})
    if not user:
        raise HTTPException(status_code=401, detail="User not found")
    return user

# ─── Auth Endpoints ───

@api_router.post("/auth/session")
async def create_session(req: SessionRequest, response: Response):
    try:
        async with httpx.AsyncClient() as hc:
            resp = await hc.get(
                "https://demobackend.emergentagent.com/auth/v1/env/oauth/session-data",
                headers={"X-Session-ID": req.session_id},
                timeout=10
            )
        if resp.status_code != 200:
            raise HTTPException(status_code=401, detail="Invalid session ID")
        data = resp.json()
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Auth error: {e}")
        raise HTTPException(status_code=401, detail="Auth service error")

    email = data.get("email", "")
    name = data.get("name", "")
    picture = data.get("picture", "")
    session_token = data.get("session_token", "")

    existing = await db.users.find_one({"email": email}, {"_id": 0})
    if existing:
        user_id = existing["user_id"]
        await db.users.update_one({"user_id": user_id}, {"$set": {"name": name, "picture": picture}})
    else:
        user_id = f"user_{uuid.uuid4().hex[:12]}"
        await db.users.insert_one({
            "user_id": user_id, "email": email, "name": name,
            "picture": picture, "created_at": datetime.now(timezone.utc).isoformat()
        })

    expires_at = datetime.now(timezone.utc) + timedelta(days=7)
    await db.user_sessions.insert_one({
        "user_id": user_id, "session_token": session_token,
        "expires_at": expires_at.isoformat(), "created_at": datetime.now(timezone.utc).isoformat()
    })

    response.set_cookie(
        key="session_token", value=session_token,
        httponly=True, secure=True, samesite="none",
        max_age=7 * 24 * 60 * 60, path="/"
    )
    return {"user_id": user_id, "email": email, "name": name, "picture": picture}

@api_router.get("/auth/me")
async def get_me(request: Request):
    user = await get_current_user(request)
    return {"user_id": user["user_id"], "email": user["email"], "name": user["name"], "picture": user.get("picture", "")}

@api_router.post("/auth/logout")
async def logout(request: Request, response: Response):
    session_token = request.cookies.get("session_token")
    if session_token:
        await db.user_sessions.delete_one({"session_token": session_token})
    response.delete_cookie("session_token", path="/")
    return {"ok": True}

# ─── Jobs CRUD ───

@api_router.get("/jobs")
async def list_jobs(request: Request):
    user = await get_current_user(request)
    jobs = await db.job_applications.find({"user_id": user["user_id"]}, {"_id": 0}).to_list(1000)

    for job in jobs:
        job["contacts"] = await db.contacts.find({"application_id": job["id"]}, {"_id": 0}).to_list(100)
        job["activity"] = await db.activity_items.find(
            {"application_id": job["id"]}, {"_id": 0}
        ).sort("timestamp", 1).to_list(100)
        if job.get("match_score") and job.get("skills_score"):
            job["progress"] = {
                "skills": job.get("skills_score", 0),
                "experience": job.get("experience_score", 0),
                "language": job.get("language_score", 0),
            }
        else:
            job["progress"] = None
    return jobs

@api_router.post("/jobs")
async def create_job(job_data: JobCreate, request: Request):
    user = await get_current_user(request)
    job_id = f"job_{uuid.uuid4().hex[:12]}"
    now = datetime.now(timezone.utc).isoformat()

    doc = {
        "id": job_id, "user_id": user["user_id"],
        **job_data.model_dump(),
        "match_score": None, "skills_score": None,
        "experience_score": None, "language_score": None,
        "jd_parsed": None, "created_at": now, "updated_at": now,
    }
    await db.job_applications.insert_one(doc)

    await db.activity_items.insert_one({
        "id": f"act_{uuid.uuid4().hex[:12]}", "application_id": job_id,
        "user_id": user["user_id"], "message": "Application added to board",
        "timestamp": now,
    })

    result = {k: v for k, v in doc.items() if k != "_id"}
    result["contacts"] = []
    result["activity"] = await db.activity_items.find({"application_id": job_id}, {"_id": 0}).to_list(100)
    result["progress"] = None
    return result

@api_router.put("/jobs/{job_id}")
async def update_job(job_id: str, updates: JobUpdate, request: Request):
    user = await get_current_user(request)
    update_data = {k: v for k, v in updates.model_dump().items() if v is not None}
    update_data["updated_at"] = datetime.now(timezone.utc).isoformat()

    result = await db.job_applications.update_one(
        {"id": job_id, "user_id": user["user_id"]}, {"$set": update_data}
    )
    if result.matched_count == 0:
        raise HTTPException(status_code=404, detail="Job not found")

    if "status" in update_data:
        labels = {"wishlist": "Wishlist", "applied": "Applied", "interview": "Interview",
                  "in_progress": "In Progress", "offer": "Offer", "rejected": "Rejected"}
        await db.activity_items.insert_one({
            "id": f"act_{uuid.uuid4().hex[:12]}", "application_id": job_id,
            "user_id": user["user_id"],
            "message": f"Status changed to {labels.get(update_data['status'], update_data['status'])}",
            "timestamp": datetime.now(timezone.utc).isoformat(),
        })
    return {"ok": True}

@api_router.delete("/jobs/{job_id}")
async def delete_job(job_id: str, request: Request):
    user = await get_current_user(request)
    await db.job_applications.delete_one({"id": job_id, "user_id": user["user_id"]})
    await db.contacts.delete_many({"application_id": job_id})
    await db.activity_items.delete_many({"application_id": job_id})
    return {"ok": True}

# ─── Contacts ───

@api_router.post("/jobs/{job_id}/contacts")
async def add_contact(job_id: str, contact: ContactCreate, request: Request):
    user = await get_current_user(request)
    contact_id = f"contact_{uuid.uuid4().hex[:12]}"
    doc = {"id": contact_id, "application_id": job_id, "user_id": user["user_id"], **contact.model_dump()}
    await db.contacts.insert_one(doc)
    return {k: v for k, v in doc.items() if k != "_id"}

@api_router.delete("/contacts/{contact_id}")
async def delete_contact(contact_id: str, request: Request):
    user = await get_current_user(request)
    await db.contacts.delete_one({"id": contact_id, "user_id": user["user_id"]})
    return {"ok": True}

# ─── Activity ───

@api_router.post("/jobs/{job_id}/activity")
async def add_activity(job_id: str, activity: ActivityCreate, request: Request):
    user = await get_current_user(request)
    doc = {
        "id": f"act_{uuid.uuid4().hex[:12]}", "application_id": job_id,
        "user_id": user["user_id"], "message": activity.message,
        "timestamp": datetime.now(timezone.utc).isoformat(),
    }
    await db.activity_items.insert_one(doc)
    return {k: v for k, v in doc.items() if k != "_id"}

# ─── CV ───

@api_router.post("/cv/upload")
async def upload_cv(cv: CVUpload, request: Request):
    user = await get_current_user(request)
    cv_id = f"cv_{uuid.uuid4().hex[:12]}"
    await db.cvs.update_many({"user_id": user["user_id"]}, {"$set": {"is_primary": False}})
    doc = {
        "id": cv_id, "user_id": user["user_id"], "filename": cv.filename,
        "raw_text": cv.raw_text, "is_primary": True,
        "created_at": datetime.now(timezone.utc).isoformat(),
    }
    await db.cvs.insert_one(doc)
    return {k: v for k, v in doc.items() if k != "_id"}

@api_router.get("/cv")
async def get_cvs(request: Request):
    user = await get_current_user(request)
    return await db.cvs.find({"user_id": user["user_id"]}, {"_id": 0}).to_list(100)

# ─── AI Endpoints ───

def get_llm():
    api_key = os.environ.get('EMERGENT_LLM_KEY', '')
    chat = LlmChat(
        api_key=api_key,
        session_id=f"jobflow_{uuid.uuid4().hex[:8]}",
        system_message="You are an expert HR and career AI assistant. Always return valid JSON when asked."
    )
    chat.with_model("anthropic", "claude-4-sonnet-20250514")
    return chat

def parse_llm_json(text):
    text = text.strip()
    if text.startswith("```"):
        text = text.split("\n", 1)[1].rsplit("```", 1)[0].strip()
    return json.loads(text)

@api_router.post("/ai/parse-jd")
async def parse_jd(req: ParseJDRequest, request: Request):
    await get_current_user(request)
    chat = get_llm()
    prompt = f"""Parse this job description into structured JSON. Return ONLY valid JSON:
{{
  "title": "job title",
  "company": "company name",
  "location": "location or Remote",
  "remote": true or false,
  "salary_min": number or null,
  "salary_max": number or null,
  "currency": "USD",
  "skills": ["skill1", "skill2"],
  "responsibilities": ["resp1", "resp2"],
  "seniority": "Junior/Mid/Senior/Lead/Staff/Principal"
}}

Job Description:
{req.jd_text}

Return ONLY the JSON object."""
    msg = UserMessage(text=prompt)
    response = await chat.send_message(msg)
    try:
        return parse_llm_json(response)
    except Exception:
        return {"raw_response": response, "error": "Could not parse"}

@api_router.post("/ai/analyze-cv")
async def analyze_cv(req: AnalyzeCVRequest, request: Request):
    user = await get_current_user(request)
    chat = get_llm()
    prompt = f"""Analyze this CV against the job description. Return ONLY valid JSON:
{{
  "overall_score": 0-100,
  "skills_score": 0-100,
  "experience_score": 0-100,
  "language_score": 0-100,
  "hard_skills": [
    {{"name": "skill name", "status": "matched" or "missing"}}
  ],
  "soft_skills": [
    {{"name": "skill name", "status": "matched" or "missing"}}
  ],
  "suggestions": [
    {{
      "id": "1",
      "original": "original text from CV",
      "rewrite": "improved version targeting this JD",
      "category": "skills" or "experience" or "language",
      "impact": "high" or "medium" or "low"
    }}
  ],
  "gaps": ["gap description 1", "gap description 2"],
  "summary": "2-3 sentence analysis summary"
}}

Provide 4-8 hard skills, 3-5 soft skills, and 2-4 suggestions.

CV:
{req.cv_text}

Job Description:
{req.jd_text}

Return ONLY the JSON object."""
    msg = UserMessage(text=prompt)
    response = await chat.send_message(msg)
    try:
        parsed = parse_llm_json(response)
        if req.job_id:
            await db.job_applications.update_one(
                {"id": req.job_id, "user_id": user["user_id"]},
                {"$set": {
                    "match_score": parsed.get("overall_score", 0),
                    "skills_score": parsed.get("skills_score", 0),
                    "experience_score": parsed.get("experience_score", 0),
                    "language_score": parsed.get("language_score", 0),
                    "updated_at": datetime.now(timezone.utc).isoformat(),
                }}
            )
        return parsed
    except Exception:
        return {"raw_response": response, "error": "Could not parse analysis"}

@api_router.post("/ai/cover-letter")
async def generate_cover_letter(req: CoverLetterRequest, request: Request):
    await get_current_user(request)
    chat = get_llm()
    tones = {
        "professional": "formal and professional",
        "conversational": "warm, conversational, and personable",
        "confident": "bold, confident, and assertive",
        "enthusiastic": "enthusiastic and passionate",
    }
    prompt = f"""Write a cover letter for this job application.
Tone: {tones.get(req.tone, "professional")}
Company: {req.company}

CV:
{req.cv_text}

Job Description:
{req.jd_text}

Write a compelling cover letter (300-400 words) that:
1. Opens with a strong hook mentioning {req.company} by name
2. Highlights 2-3 most relevant experiences from the CV
3. Shows understanding of the role requirements
4. Ends with a confident call to action

Return ONLY the cover letter text."""
    msg = UserMessage(text=prompt)
    response = await chat.send_message(msg)
    return {"letter": response.strip(), "company": req.company, "tone": req.tone}

# ─── Root ───

@api_router.get("/")
async def root():
    return {"message": "Jobflow API"}

app.include_router(api_router)

app.add_middleware(
    CORSMiddleware,
    allow_credentials=True,
    allow_origins=os.environ.get('CORS_ORIGINS', '*').split(','),
    allow_methods=["*"],
    allow_headers=["*"],
)

@app.on_event("shutdown")
async def shutdown_db_client():
    client.close()
