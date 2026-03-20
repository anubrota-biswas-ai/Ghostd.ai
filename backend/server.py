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
from rapidfuzz import fuzz, process as rfprocess
import csv as _csv

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
        "jd_parsed": None, "company_profile": {}, "sponsorship": None,
        "created_at": now, "updated_at": now,
    }
    await db.job_applications.insert_one(doc)

    # Auto-check sponsorship
    if job_data.company:
        try:
            count = await db.sponsors_register.count_documents({})
            if count == 0:
                await _load_sponsors_to_db()
            sponsors = await db.sponsors_register.find({}, {"_id": 0, "company_name": 1, "city": 1, "type": 1, "route": 1}).to_list(200000)
            names = [s["company_name"] for s in sponsors if s["company_name"]]
            if names:
                results = rfprocess.extract(job_data.company.strip(), names, scorer=fuzz.WRatio, limit=1)
                if results and results[0][1] >= 85:
                    sp = {"status": "found", "matched_name": results[0][0], "confidence": round(results[0][1] / 100, 2), "manual_override": False}
                else:
                    sp = {"status": "not_found", "matched_name": results[0][0] if results else None, "confidence": round(results[0][1] / 100, 2) if results else 0, "manual_override": False}
                await db.job_applications.update_one({"id": job_id}, {"$set": {"sponsorship": sp}})
                doc["sponsorship"] = sp
        except Exception as e:
            logger.error(f"Sponsorship check failed: {e}")

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
async def update_job(job_id: str, request: Request):
    user = await get_current_user(request)
    body = await request.json()
    job_fields = ["title", "company", "location", "remote", "url", "salary_min", "salary_max",
                  "currency", "status", "date_applied", "jd_raw_text", "match_score",
                  "skills_score", "experience_score", "language_score", "notes", "sponsorship"]
    update_data = {k: v for k, v in body.items() if k in job_fields and v is not None}
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

# ─── UK Sponsorship Licence Checker ───

SPONSORS_CSV_URL = "https://assets.publishing.service.gov.uk/media/69bd225d13101e9908704984/2026-03-20_-_Worker_and_Temporary_Worker.csv"
SPONSORS_CSV_PATH = Path(__file__).parent / "sponsors_register.csv"

async def _load_sponsors_to_db():
    """Parse CSV and load into MongoDB."""
    if not SPONSORS_CSV_PATH.exists():
        import httpx as _hx
        async with _hx.AsyncClient() as hc:
            resp = await hc.get(SPONSORS_CSV_URL, timeout=60, follow_redirects=True)
            SPONSORS_CSV_PATH.write_bytes(resp.content)

    records = []
    with open(SPONSORS_CSV_PATH, 'r', encoding='utf-8-sig') as f:
        reader = _csv.DictReader(f)
        for row in reader:
            records.append({
                "company_name": (row.get("Organisation Name") or "").strip(),
                "city": (row.get("Town/City") or "").strip(),
                "county": (row.get("County") or "").strip(),
                "type": (row.get("Type & Rating") or "").strip(),
                "route": (row.get("Route") or "").strip(),
            })
    await db.sponsors_register.delete_many({})
    if records:
        await db.sponsors_register.insert_many(records)
    await db.sponsor_meta.update_one(
        {"key": "status"},
        {"$set": {"last_updated": datetime.now(timezone.utc).isoformat(), "record_count": len(records)}},
        upsert=True,
    )
    logger.info(f"Loaded {len(records)} sponsor records")
    return len(records)

@api_router.get("/sponsorship/check")
async def check_sponsorship(company: str, request: Request):
    await get_current_user(request)
    count = await db.sponsors_register.count_documents({})
    if count == 0:
        try:
            await _load_sponsors_to_db()
        except Exception as e:
            logger.error(f"Failed to load sponsors: {e}")
            return {"status": "unknown", "message": "Register not loaded", "confidence": 0}

    # Get all company names for fuzzy matching
    sponsors = await db.sponsors_register.find({}, {"_id": 0, "company_name": 1, "city": 1, "type": 1, "route": 1}).to_list(200000)
    names = [s["company_name"] for s in sponsors if s["company_name"]]

    if not names:
        return {"status": "unknown", "message": "Register empty", "confidence": 0}

    results = rfprocess.extract(company.strip(), names, scorer=fuzz.WRatio, limit=3)
    if results and results[0][1] >= 85:
        match_name = results[0][0]
        match_score = results[0][1]
        matched = next((s for s in sponsors if s["company_name"] == match_name), {})
        return {
            "status": "found",
            "matched_name": match_name,
            "city": matched.get("city", ""),
            "type": matched.get("type", ""),
            "route": matched.get("route", ""),
            "confidence": round(match_score / 100, 2),
        }
    best = results[0] if results else ("", 0)
    return {"status": "not_found", "matched_name": best[0] if best[0] else None, "confidence": round(best[1] / 100, 2) if best[1] else 0}

@api_router.post("/sponsorship/refresh")
async def refresh_sponsors(request: Request):
    await get_current_user(request)
    if SPONSORS_CSV_PATH.exists():
        SPONSORS_CSV_PATH.unlink()
    count = await _load_sponsors_to_db()
    return {"ok": True, "records": count}

@api_router.get("/sponsorship/status")
async def sponsorship_status(request: Request):
    await get_current_user(request)
    meta = await db.sponsor_meta.find_one({"key": "status"}, {"_id": 0})
    if meta:
        return {"loaded": True, "last_updated": meta.get("last_updated"), "record_count": meta.get("record_count", 0)}
    return {"loaded": False, "last_updated": None, "record_count": 0}

@api_router.post("/sponsorship/recheck-all")
async def recheck_all_sponsorship(request: Request):
    user = await get_current_user(request)
    count = await db.sponsors_register.count_documents({})
    if count == 0:
        try:
            await _load_sponsors_to_db()
        except Exception:
            return {"checked": 0, "updated": 0}

    sponsors = await db.sponsors_register.find({}, {"_id": 0, "company_name": 1}).to_list(200000)
    names = [s["company_name"] for s in sponsors if s["company_name"]]
    if not names:
        return {"checked": 0, "updated": 0}

    jobs = await db.job_applications.find(
        {"user_id": user["user_id"], "$or": [
            {"sponsorship": None}, {"sponsorship": {"$exists": False}},
            {"sponsorship.manual_override": {"$ne": True}}
        ]}, {"_id": 0, "id": 1, "company": 1, "sponsorship": 1}
    ).to_list(1000)

    updated = 0
    for job in jobs:
        if job.get("sponsorship", {}).get("manual_override"):
            continue
        company = job.get("company", "").strip()
        if not company:
            continue
        results = rfprocess.extract(company, names, scorer=fuzz.WRatio, limit=1)
        if results and results[0][1] >= 85:
            sp = {"status": "found", "matched_name": results[0][0], "confidence": round(results[0][1] / 100, 2), "manual_override": False}
        else:
            sp = {"status": "not_found", "matched_name": results[0][0] if results else None, "confidence": round(results[0][1] / 100, 2) if results else 0, "manual_override": False}
        await db.job_applications.update_one({"id": job["id"]}, {"$set": {"sponsorship": sp}})
        updated += 1

    return {"checked": len(jobs), "updated": updated}

# ─── Company Profile ───

@api_router.put("/jobs/{job_id}/company-profile")
async def update_company_profile(job_id: str, request: Request):
    user = await get_current_user(request)
    body = await request.json()
    allowed = ["domain", "website", "linkedin_url", "logo_url",
               "instagram_url", "youtube_url", "tiktok_url",
               "industry", "company_size", "social_links", "notes"]
    profile_update = {f"company_profile.{k}": v for k, v in body.items() if k in allowed}
    if not profile_update:
        return {"ok": True}
    result = await db.job_applications.update_one(
        {"id": job_id, "user_id": user["user_id"]},
        {"$set": profile_update}
    )
    if result.matched_count == 0:
        raise HTTPException(status_code=404, detail="Job not found")
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
  "currency": "GBP",
  "skills": ["skill1", "skill2"],
  "responsibilities": ["resp1", "resp2"],
  "seniority": "Junior/Mid/Senior/Lead/Staff/Principal",
  "domain": "company website domain e.g. stripe.com or null",
  "website": "full company website URL or null",
  "linkedin_url": "company LinkedIn page URL or null",
  "industry": "industry sector or null",
  "company_size": "startup/small/medium/large/enterprise or null"
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
    # Store code_verifier for PKCE — required by newer google-auth-oauthlib
    await db.oauth_states.insert_one({
        "state": state, "user_id": user["user_id"],
        "code_verifier": flow.code_verifier,
        "redirect_uri": redir,
        "created_at": datetime.now(timezone.utc).isoformat(),
    })
    logger.info(f"Gmail OAuth started for user {user['user_id']}, redirect_uri={redir}")
    return {"auth_url": url}

@api_router.get("/oauth/gmail/callback")
async def gmail_callback(code: str, state: str, request: Request):
    from starlette.responses import RedirectResponse
    state_doc = await db.oauth_states.find_one({"state": state})
    if not state_doc:
        logger.error("Gmail callback: invalid state parameter")
        return RedirectResponse("/?gmail=error&reason=invalid_state")
    user_id = state_doc["user_id"]
    code_verifier = state_doc.get("code_verifier")
    stored_redirect = state_doc.get("redirect_uri")
    await db.oauth_states.delete_one({"state": state})

    # Use the same redirect_uri that was used in the login step
    redir = stored_redirect or _gmail_redirect(request)
    logger.info(f"Gmail callback for user {user_id}, redirect_uri={redir}")

    try:
        flow = _GmailFlow.from_client_config(_gmail_config(), scopes=GMAIL_SCOPES, redirect_uri=redir)
        # Restore PKCE code_verifier from the login step
        flow.code_verifier = code_verifier
        with _warnings.catch_warnings():
            _warnings.simplefilter("ignore")
            flow.fetch_token(code=code)
    except Exception as e:
        logger.error(f"Gmail token exchange failed: {type(e).__name__}: {e}")
        return RedirectResponse(f"/?gmail=error&reason=token_exchange")

    try:
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
        logger.info(f"Gmail connected for user {user_id}: {profile.get('emailAddress')}")
        return RedirectResponse("/?gmail=connected")
    except Exception as e:
        logger.error(f"Gmail profile/token storage failed: {type(e).__name__}: {e}")
        return RedirectResponse("/?gmail=error&reason=profile_fetch")

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
async def gmail_emails(request: Request, job_id: str = None, domain: str = None, q: str = None, max_results: int = 20):
    user = await get_current_user(request)
    svc = await _get_gmail_svc(user["user_id"])
    if not svc:
        raise HTTPException(status_code=400, detail="Gmail not connected")
    search = q or ""
    has_filter = False
    if job_id:
        contacts = await db.contacts.find({"application_id": job_id, "user_id": user["user_id"]}, {"_id": 0}).to_list(100)
        emails = [c["email"] for c in contacts if c.get("email")]
        if emails:
            eq = " OR ".join([f"from:{e} OR to:{e}" for e in emails])
            search = f"({eq})" + (f" {search}" if search else "")
            has_filter = True
    if not has_filter and domain:
        # Filter by company domain when no contacts exist
        clean_domain = domain.strip().lower()
        if clean_domain:
            search = f"(from:@{clean_domain} OR to:@{clean_domain})" + (f" {search}" if search else "")
            has_filter = True
    if not has_filter:
        # No contacts and no domain — return empty with info message
        return {"messages": [], "total": 0, "info": "Add a contact or website to see related emails"}
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
        new_notifs = 0
        for mm in res.get('messages', []):
            msg = svc.users().messages().get(userId='me', id=mm['id'], format='metadata', metadataHeaders=['From', 'Subject', 'Date']).execute()
            hdrs = {h['name']: h['value'] for h in msg.get('payload', {}).get('headers', [])}
            from_h = hdrs.get('From', '')
            subj = hdrs.get('Subject', '')
            snippet = msg.get('snippet', '')
            for c in contacts:
                if c.get("email") and c["email"] in from_h:
                    existing = await db.activity_items.find_one({"application_id": c["application_id"], "message": {"$regex": subj[:30].replace("(", "\\(").replace(")", "\\)")}})
                    if not existing:
                        await db.activity_items.insert_one({"id": f"act_{uuid.uuid4().hex[:12]}", "application_id": c["application_id"], "user_id": user["user_id"], "message": f"Gmail: {c['name']} — \"{subj}\"", "timestamp": datetime.now(timezone.utc).isoformat()})
                        await db.contacts.update_one({"id": c["id"]}, {"$set": {"last_contacted": datetime.now(timezone.utc).isoformat()}})
                        new_act += 1

                        # Phase 4: Classify email with Claude for auto-progression
                        try:
                            job = await db.job_applications.find_one({"id": c["application_id"]}, {"_id": 0})
                            if job:
                                chat = get_llm()
                                classify_prompt = f"""Classify this email related to a job application. Return ONLY valid JSON.
Job: {job.get('title','')} at {job.get('company','')} (current status: {job.get('status','')})
Email from: {from_h}
Subject: {subj}
Preview: {snippet}
Return: {{"email_type": "rejection|interview|assessment|offer|follow_up|generic", "suggested_status": "rejected|interview|in_progress|offer" or null, "confidence": 0.0-1.0, "extracted_info": {{"interview_date": null, "interviewer_name": null, "notes": ""}}}}"""
                                cls_msg = UserMessage(text=classify_prompt)
                                cls_resp = await chat.send_message(cls_msg)
                                cls = parse_llm_json(cls_resp)
                                if cls.get("confidence", 0) >= 0.70 and cls.get("email_type") != "generic" and cls.get("suggested_status"):
                                    await db.notifications.insert_one({
                                        "id": f"notif_{uuid.uuid4().hex[:12]}", "user_id": user["user_id"],
                                        "job_id": c["application_id"], "type": "email_classification",
                                        "email_type": cls["email_type"], "suggested_status": cls["suggested_status"],
                                        "confidence": cls["confidence"],
                                        "email_subject": subj, "email_from": from_h, "email_snippet": snippet,
                                        "status": "pending", "created_at": datetime.now(timezone.utc).isoformat(),
                                    })
                                    new_notifs += 1
                        except Exception as ce:
                            logger.error(f"Email classification error: {ce}")
                    break
        return {"scanned": len(res.get('messages', [])), "new_activities": new_act, "new_notifications": new_notifs}
    except Exception as e:
        logger.error(f"Gmail scan error: {e}")
        raise HTTPException(status_code=500, detail=str(e))

# ─── Notifications (Phase 4) ───

@api_router.get("/notifications")
async def list_notifications(request: Request):
    user = await get_current_user(request)
    return await db.notifications.find({"user_id": user["user_id"], "status": "pending"}, {"_id": 0}).sort("created_at", -1).to_list(50)

@api_router.post("/notifications/{notif_id}/confirm")
async def confirm_notification(notif_id: str, request: Request):
    user = await get_current_user(request)
    notif = await db.notifications.find_one({"id": notif_id, "user_id": user["user_id"]}, {"_id": 0})
    if not notif:
        raise HTTPException(status_code=404, detail="Notification not found")
    if notif.get("suggested_status") and notif.get("job_id"):
        labels = {"wishlist": "Wishlist", "applied": "Applied", "interview": "Interview", "in_progress": "In Progress", "offer": "Offer", "rejected": "Rejected"}
        await db.job_applications.update_one({"id": notif["job_id"], "user_id": user["user_id"]}, {"$set": {"status": notif["suggested_status"], "updated_at": datetime.now(timezone.utc).isoformat()}})
        await db.activity_items.insert_one({"id": f"act_{uuid.uuid4().hex[:12]}", "application_id": notif["job_id"], "user_id": user["user_id"], "message": f"Auto: moved to {labels.get(notif['suggested_status'], notif['suggested_status'])} (from email: {notif.get('email_subject', '')})", "timestamp": datetime.now(timezone.utc).isoformat()})
    await db.notifications.update_one({"id": notif_id}, {"$set": {"status": "confirmed"}})
    return {"ok": True}

@api_router.post("/notifications/{notif_id}/dismiss")
async def dismiss_notification(notif_id: str, request: Request):
    user = await get_current_user(request)
    await db.notifications.update_one({"id": notif_id, "user_id": user["user_id"]}, {"$set": {"status": "dismissed"}})
    return {"ok": True}

# ─── ATS Results (Phase 5) ───

@api_router.post("/ats/save")
async def save_ats_results(request: Request):
    user = await get_current_user(request)
    body = await request.json()
    job_id = body.get("job_id")
    result_id = f"ats_{uuid.uuid4().hex[:12]}"
    doc = {
        "id": result_id, "user_id": user["user_id"], "job_id": job_id,
        "overall_score": body.get("overall_score"), "skills_score": body.get("skills_score"),
        "experience_score": body.get("experience_score"), "language_score": body.get("language_score"),
        "hard_skills": body.get("hard_skills", []), "soft_skills": body.get("soft_skills", []),
        "suggestions": body.get("suggestions", []), "accepted_suggestions": body.get("accepted_suggestions", []),
        "optimised_cv_text": body.get("optimised_cv_text", ""),
        "original_cv_text": body.get("original_cv_text", ""), "jd_text": body.get("jd_text", ""),
        "created_at": datetime.now(timezone.utc).isoformat(),
    }
    if job_id:
        await db.ats_results.delete_many({"job_id": job_id, "user_id": user["user_id"]})
    await db.ats_results.insert_one(doc)
    return {k: v for k, v in doc.items() if k != "_id"}

@api_router.get("/ats/results")
async def get_ats_results(request: Request, job_id: str = None):
    user = await get_current_user(request)
    query = {"user_id": user["user_id"]}
    if job_id:
        query["job_id"] = job_id
    result = await db.ats_results.find_one(query, {"_id": 0}, sort=[("created_at", -1)])
    return result

@api_router.put("/ats/results/{result_id}")
async def update_ats_results(result_id: str, request: Request):
    user = await get_current_user(request)
    body = await request.json()
    allowed = ["accepted_suggestions", "optimised_cv_text"]
    update = {k: v for k, v in body.items() if k in allowed}
    await db.ats_results.update_one({"id": result_id, "user_id": user["user_id"]}, {"$set": update})
    return {"ok": True}

# ─── Cover Letters (Phase 6) ───

@api_router.post("/cover-letter/save")
async def save_cover_letter(request: Request):
    user = await get_current_user(request)
    body = await request.json()
    job_id = body.get("job_id")
    doc = {
        "id": f"cl_{uuid.uuid4().hex[:12]}", "user_id": user["user_id"],
        "job_id": job_id, "content": body.get("content", ""),
        "tone": body.get("tone", "professional"), "company": body.get("company", ""),
        "generated_at": datetime.now(timezone.utc).isoformat(),
        "updated_at": datetime.now(timezone.utc).isoformat(),
    }
    if job_id:
        existing = await db.cover_letters.find_one({"job_id": job_id, "user_id": user["user_id"]})
        if existing:
            await db.cover_letters.update_one({"job_id": job_id, "user_id": user["user_id"]}, {"$set": {"content": doc["content"], "tone": doc["tone"], "updated_at": doc["updated_at"]}})
            return {"ok": True, "id": existing.get("id")}
    await db.cover_letters.insert_one(doc)
    return {k: v for k, v in doc.items() if k != "_id"}

@api_router.get("/cover-letter")
async def get_cover_letter(request: Request, job_id: str = None):
    user = await get_current_user(request)
    query = {"user_id": user["user_id"]}
    if job_id:
        query["job_id"] = job_id
    return await db.cover_letters.find_one(query, {"_id": 0}, sort=[("updated_at", -1)])

@api_router.post("/cover-letter/regenerate-section")
async def regenerate_section(request: Request):
    user = await get_current_user(request)
    body = await request.json()
    paragraph = body.get("paragraph", "")
    instruction = body.get("instruction", "")
    cv_text = body.get("cv_text", "")
    jd_text = body.get("jd_text", "")
    chat = get_llm()
    prompt = f"""Rewrite this paragraph from a cover letter. {instruction if instruction else 'Improve it while maintaining the same tone and intent.'}

Original paragraph:
{paragraph}

Context - CV: {cv_text[:500]}
Context - JD: {jd_text[:500]}

Return ONLY the rewritten paragraph text, no JSON, no markdown."""
    msg = UserMessage(text=prompt)
    response = await chat.send_message(msg)
    return {"paragraph": response.strip()}

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
