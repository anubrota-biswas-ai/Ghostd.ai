from fastapi import FastAPI, APIRouter, HTTPException, Request, Response, File, UploadFile
from dotenv import load_dotenv
from starlette.middleware.cors import CORSMiddleware
from motor.motor_asyncio import AsyncIOMotorClient
import os, logging, uuid, json, io
from pathlib import Path
from pydantic import BaseModel, Field
from typing import List, Optional
from datetime import datetime, timezone, timedelta
import httpx
from emergentintegrations.llm.chat import LlmChat, UserMessage
from PyPDF2 import PdfReader

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

class InterviewPrepRequest(BaseModel):
    jd_text: str = ""

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

@api_router.get("/contacts")
async def list_all_contacts(request: Request):
    user = await get_current_user(request)
    contacts = await db.contacts.find({"user_id": user["user_id"]}, {"_id": 0}).to_list(1000)
    job_cache = {}
    for contact in contacts:
        app_id = contact.get("application_id")
        if app_id and app_id not in job_cache:
            job = await db.job_applications.find_one({"id": app_id}, {"_id": 0})
            job_cache[app_id] = job
        job = job_cache.get(app_id)
        if job:
            contact["job_title"] = job.get("title", "")
            contact["job_company"] = job.get("company", "")
            contact["job_status"] = job.get("status", "")
    return contacts

@api_router.put("/contacts/{contact_id}")
async def update_contact(contact_id: str, contact: ContactCreate, request: Request):
    user = await get_current_user(request)
    update_data = contact.model_dump()
    await db.contacts.update_one({"id": contact_id, "user_id": user["user_id"]}, {"$set": update_data})
    return {"ok": True}

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

@api_router.post("/cv/upload-file")
async def upload_cv_file(file: UploadFile = File(...), request: Request = None):
    user = await get_current_user(request)
    content = await file.read()

    if file.filename.lower().endswith('.pdf'):
        try:
            reader = PdfReader(io.BytesIO(content))
            text = "\n".join(page.extract_text() or "" for page in reader.pages)
        except Exception as e:
            raise HTTPException(status_code=400, detail=f"Could not read PDF: {str(e)}")
    elif file.filename.lower().endswith('.txt'):
        text = content.decode('utf-8', errors='ignore')
    else:
        raise HTTPException(status_code=400, detail="Unsupported file type. Upload PDF or TXT.")

    cv_id = f"cv_{uuid.uuid4().hex[:12]}"
    await db.cvs.update_many({"user_id": user["user_id"]}, {"$set": {"is_primary": False}})
    doc = {
        "id": cv_id, "user_id": user["user_id"],
        "filename": file.filename, "raw_text": text.strip(),
        "is_primary": True, "created_at": datetime.now(timezone.utc).isoformat(),
    }
    await db.cvs.insert_one(doc)
    return {k: v for k, v in doc.items() if k != "_id"}

# ─── Interview Prep ───

@api_router.post("/jobs/{job_id}/interview-prep")
async def generate_interview_prep(job_id: str, req: InterviewPrepRequest, request: Request):
    user = await get_current_user(request)
    job = await db.job_applications.find_one({"id": job_id, "user_id": user["user_id"]}, {"_id": 0})
    if not job:
        raise HTTPException(status_code=404, detail="Job not found")

    jd = req.jd_text or job.get("jd_raw_text", "")
    title = job.get("title", "the role")
    company = job.get("company", "the company")

    chat = get_llm()
    prompt = f"""Based on this job, generate interview preparation materials. Return ONLY valid JSON:
{{
  "questions": [
    {{"id": "q1", "type": "technical" or "behavioural", "question": "question text", "hints": "brief approach suggestion"}}
  ],
  "company_summary": "2-3 sentence company/role research summary",
  "talking_points": ["point1", "point2", "point3"],
  "prep_checklist": ["task1", "task2", "task3"]
}}

Generate exactly 8-10 questions (mix of technical and behavioural).
Generate 3-5 talking points for "Why this role?".
Generate 4-6 prep checklist items.

Role: {title} at {company}
Job Description:
{jd if jd else 'No detailed JD available — generate general questions for a ' + title + ' role at ' + company}

Return ONLY the JSON object."""

    msg = UserMessage(text=prompt)
    response = await chat.send_message(msg)
    try:
        parsed = parse_llm_json(response)
    except Exception:
        parsed = {"questions": [], "company_summary": "", "talking_points": [], "prep_checklist": []}

    prep_id = f"prep_{uuid.uuid4().hex[:12]}"
    now = datetime.now(timezone.utc).isoformat()
    doc = {
        "id": prep_id, "job_id": job_id, "user_id": user["user_id"],
        **parsed, "user_notes": {}, "checked_items": [],
        "created_at": now, "updated_at": now,
    }

    await db.interview_preps.delete_many({"job_id": job_id, "user_id": user["user_id"]})
    await db.interview_preps.insert_one(doc)
    return {k: v for k, v in doc.items() if k != "_id"}

@api_router.get("/jobs/{job_id}/interview-prep")
async def get_interview_prep(job_id: str, request: Request):
    user = await get_current_user(request)
    prep = await db.interview_preps.find_one({"job_id": job_id, "user_id": user["user_id"]}, {"_id": 0})
    return prep

@api_router.put("/interview-prep/{prep_id}")
async def update_interview_prep(prep_id: str, request: Request):
    user = await get_current_user(request)
    body = await request.json()
    update_data = {}
    if "user_notes" in body:
        update_data["user_notes"] = body["user_notes"]
    if "checked_items" in body:
        update_data["checked_items"] = body["checked_items"]
    update_data["updated_at"] = datetime.now(timezone.utc).isoformat()
    await db.interview_preps.update_one({"id": prep_id, "user_id": user["user_id"]}, {"$set": update_data})
    return {"ok": True}

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

class EmailParseRequest(BaseModel):
    email_text: str
    job_id: Optional[str] = None

@api_router.post("/ai/parse-email")
async def parse_email(req: EmailParseRequest, request: Request):
    user = await get_current_user(request)
    chat = get_llm()
    prompt = f"""Analyze this email from a job application context. Return ONLY valid JSON:
{{
  "sender_name": "name of sender",
  "sender_email": "email address or null",
  "sender_role": "Recruiter/Hiring Manager/Interviewer/Other",
  "email_type": "interview_invitation/rejection/offer/follow_up/thank_you/info_request/general",
  "summary": "1-2 sentence summary",
  "key_dates": ["any dates or deadlines mentioned"],
  "suggested_status": "wishlist/applied/interview/in_progress/offer/rejected" or null,
  "suggested_activity": "activity message to log",
  "sentiment": "positive/neutral/negative"
}}

Email:
{req.email_text}

Return ONLY the JSON object."""

    msg = UserMessage(text=prompt)
    response = await chat.send_message(msg)
    try:
        parsed = parse_llm_json(response)
        if req.job_id and parsed.get("suggested_activity"):
            await db.activity_items.insert_one({
                "id": f"act_{uuid.uuid4().hex[:12]}",
                "application_id": req.job_id, "user_id": user["user_id"],
                "message": f"Email: {parsed['suggested_activity']}",
                "timestamp": datetime.now(timezone.utc).isoformat(),
            })
        if req.job_id and parsed.get("sender_email"):
            await db.contacts.update_one(
                {"application_id": req.job_id, "user_id": user["user_id"], "email": parsed["sender_email"]},
                {"$set": {"last_contacted": datetime.now(timezone.utc).isoformat()}}
            )
        return parsed
    except Exception:
        return {"raw_response": response, "error": "Could not parse email"}

# ─── Gmail Integration ───

import warnings as _warnings
import base64
from email.mime.text import MIMEText as _MIMEText
from google_auth_oauthlib.flow import Flow as _GmailFlow
from googleapiclient.discovery import build as _gmail_build
from google.oauth2.credentials import Credentials as _GmailCreds
from google.auth.transport.requests import Request as _GoogleReq

GMAIL_SCOPES = [
    "https://www.googleapis.com/auth/gmail.readonly",
    "https://www.googleapis.com/auth/gmail.send",
    "https://www.googleapis.com/auth/gmail.modify",
    "openid",
    "https://www.googleapis.com/auth/userinfo.email",
    "https://www.googleapis.com/auth/userinfo.profile",
]

def _gmail_config():
    return {"web": {
        "client_id": os.environ.get('GOOGLE_CLIENT_ID', ''),
        "client_secret": os.environ.get('GOOGLE_CLIENT_SECRET', ''),
        "auth_uri": "https://accounts.google.com/o/oauth2/auth",
        "token_uri": "https://oauth2.googleapis.com/token",
    }}

def _gmail_redirect(request: Request):
    proto = request.headers.get('x-forwarded-proto', 'https')
    host = request.headers.get('x-forwarded-host') or request.headers.get('host', '')
    return f"{proto}://{host}/api/oauth/gmail/callback"

async def _get_gmail_svc(user_id: str):
    tok = await db.gmail_tokens.find_one({"user_id": user_id}, {"_id": 0})
    if not tok:
        return None
    creds = _GmailCreds(
        token=tok["access_token"], refresh_token=tok.get("refresh_token"),
        token_uri="https://oauth2.googleapis.com/token",
        client_id=os.environ.get('GOOGLE_CLIENT_ID'),
        client_secret=os.environ.get('GOOGLE_CLIENT_SECRET'),
    )
    exp = tok.get("expires_at")
    if exp:
        if isinstance(exp, str): exp = datetime.fromisoformat(exp)
        if exp.tzinfo is None: exp = exp.replace(tzinfo=timezone.utc)
        if datetime.now(timezone.utc) >= exp:
            creds.refresh(_GoogleReq())
            await db.gmail_tokens.update_one({"user_id": user_id}, {"$set": {
                "access_token": creds.token,
                "expires_at": creds.expiry.isoformat() if creds.expiry else None,
            }})
    return _gmail_build('gmail', 'v1', credentials=creds)

@api_router.get("/oauth/gmail/login")
async def gmail_login(request: Request):
    user = await get_current_user(request)
    redir = _gmail_redirect(request)
    flow = _GmailFlow.from_client_config(_gmail_config(), scopes=GMAIL_SCOPES, redirect_uri=redir)
    url, state = flow.authorization_url(access_type='offline', prompt='consent', include_granted_scopes='true')
    await db.oauth_states.insert_one({"state": state, "user_id": user["user_id"], "created_at": datetime.now(timezone.utc).isoformat()})
    return {"auth_url": url}

@api_router.get("/oauth/gmail/callback")
async def gmail_callback(code: str, state: str, request: Request):
    state_doc = await db.oauth_states.find_one({"state": state})
    if not state_doc:
        from starlette.responses import RedirectResponse
        return RedirectResponse("/?gmail=error")
    user_id = state_doc["user_id"]
    await db.oauth_states.delete_one({"state": state})
    redir = _gmail_redirect(request)
    flow = _GmailFlow.from_client_config(_gmail_config(), scopes=GMAIL_SCOPES, redirect_uri=redir)
    with _warnings.catch_warnings():
        _warnings.simplefilter("ignore")
        flow.fetch_token(code=code)
    creds = flow.credentials
    svc = _gmail_build('gmail', 'v1', credentials=creds)
    profile = svc.users().getProfile(userId='me').execute()
    await db.gmail_tokens.delete_many({"user_id": user_id})
    await db.gmail_tokens.insert_one({
        "user_id": user_id, "access_token": creds.token, "refresh_token": creds.refresh_token,
        "expires_at": creds.expiry.isoformat() if creds.expiry else None,
        "connected_email": profile.get("emailAddress", ""),
        "created_at": datetime.now(timezone.utc).isoformat(),
    })
    from starlette.responses import RedirectResponse
    return RedirectResponse("/?gmail=connected")

@api_router.get("/gmail/status")
async def gmail_status(request: Request):
    user = await get_current_user(request)
    tok = await db.gmail_tokens.find_one({"user_id": user["user_id"]}, {"_id": 0})
    return {"connected": bool(tok), "email": tok.get("connected_email", "") if tok else ""}

@api_router.post("/gmail/disconnect")
async def gmail_disconnect(request: Request):
    user = await get_current_user(request)
    await db.gmail_tokens.delete_many({"user_id": user["user_id"]})
    return {"ok": True}

@api_router.get("/gmail/emails")
async def gmail_emails(request: Request, job_id: str = None, q: str = None, max_results: int = 20):
    user = await get_current_user(request)
    svc = await _get_gmail_svc(user["user_id"])
    if not svc:
        raise HTTPException(status_code=400, detail="Gmail not connected")
    search = q or ""
    if job_id:
        contacts = await db.contacts.find({"application_id": job_id, "user_id": user["user_id"]}, {"_id": 0}).to_list(100)
        emails = [c["email"] for c in contacts if c.get("email")]
        if emails:
            eq = " OR ".join([f"from:{e} OR to:{e}" for e in emails])
            search = f"({eq})" + (f" {search}" if search else "")
    try:
        res = svc.users().messages().list(userId='me', q=search or None, maxResults=max_results).execute()
        messages = []
        for mm in res.get('messages', [])[:max_results]:
            msg = svc.users().messages().get(userId='me', id=mm['id'], format='metadata', metadataHeaders=['From', 'To', 'Subject', 'Date']).execute()
            hdrs = {h['name']: h['value'] for h in msg.get('payload', {}).get('headers', [])}
            messages.append({"id": msg['id'], "thread_id": msg.get('threadId', ''), "from": hdrs.get('From', ''), "to": hdrs.get('To', ''), "subject": hdrs.get('Subject', ''), "date": hdrs.get('Date', ''), "snippet": msg.get('snippet', ''), "label_ids": msg.get('labelIds', [])})
        return {"messages": messages, "total": res.get('resultSizeEstimate', 0)}
    except Exception as e:
        logger.error(f"Gmail list error: {e}")
        raise HTTPException(status_code=500, detail=str(e))

class SendEmailRequest(BaseModel):
    to: str
    subject: str
    body: str

@api_router.post("/gmail/send")
async def gmail_send(req: SendEmailRequest, request: Request):
    user = await get_current_user(request)
    svc = await _get_gmail_svc(user["user_id"])
    if not svc:
        raise HTTPException(status_code=400, detail="Gmail not connected")
    msg = _MIMEText(req.body)
    msg['to'] = req.to
    msg['subject'] = req.subject
    raw = base64.urlsafe_b64encode(msg.as_bytes()).decode()
    try:
        sent = svc.users().messages().send(userId='me', body={'raw': raw}).execute()
        return {"id": sent['id'], "status": "sent"}
    except Exception as e:
        logger.error(f"Gmail send error: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@api_router.post("/gmail/scan")
async def gmail_scan(request: Request):
    user = await get_current_user(request)
    svc = await _get_gmail_svc(user["user_id"])
    if not svc:
        raise HTTPException(status_code=400, detail="Gmail not connected")
    contacts = await db.contacts.find({"user_id": user["user_id"]}, {"_id": 0}).to_list(1000)
    c_emails = list(set([c["email"] for c in contacts if c.get("email")]))
    if not c_emails:
        return {"scanned": 0, "new_activities": 0}
    eq = " OR ".join([f"from:{e}" for e in c_emails])
    try:
        res = svc.users().messages().list(userId='me', q=f"({eq}) newer_than:7d", maxResults=50).execute()
        new_act = 0
        for mm in res.get('messages', []):
            msg = svc.users().messages().get(userId='me', id=mm['id'], format='metadata', metadataHeaders=['From', 'Subject', 'Date']).execute()
            hdrs = {h['name']: h['value'] for h in msg.get('payload', {}).get('headers', [])}
            from_h = hdrs.get('From', '')
            subj = hdrs.get('Subject', '')
            for c in contacts:
                if c.get("email") and c["email"] in from_h:
                    existing = await db.activity_items.find_one({"application_id": c["application_id"], "message": {"$regex": subj[:30].replace("(", "\\(").replace(")", "\\)")}})
                    if not existing:
                        await db.activity_items.insert_one({"id": f"act_{uuid.uuid4().hex[:12]}", "application_id": c["application_id"], "user_id": user["user_id"], "message": f"Gmail: {c['name']} — \"{subj}\"", "timestamp": datetime.now(timezone.utc).isoformat()})
                        await db.contacts.update_one({"id": c["id"]}, {"$set": {"last_contacted": datetime.now(timezone.utc).isoformat()}})
                        new_act += 1
                    break
        return {"scanned": len(res.get('messages', [])), "new_activities": new_act}
    except Exception as e:
        logger.error(f"Gmail scan error: {e}")
        raise HTTPException(status_code=500, detail=str(e))

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
