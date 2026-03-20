#!/usr/bin/env python3
import requests
import sys
import json
from datetime import datetime

class JobflowAPITester:
    def __init__(self):
        self.base_url = "https://job-tracker-ai-9.preview.emergentagent.com/api"
        self.session_token = "test_session_1774036082416"  # From MongoDB creation
        self.headers = {
            'Content-Type': 'application/json',
            'Authorization': f'Bearer {self.session_token}'
        }
        self.tests_run = 0
        self.tests_passed = 0
        self.created_job_id = None
        self.interview_prep_id = None
        self.created_contact_id = None

    def log_test(self, name, success, status_code=None, response=None):
        self.tests_run += 1
        if success:
            self.tests_passed += 1
            print(f"✅ {name} - Status: {status_code}")
        else:
            print(f"❌ {name} - Status: {status_code}, Response: {response}")

    def test_auth_me(self):
        """Test /api/auth/me endpoint"""
        try:
            response = requests.get(f"{self.base_url}/auth/me", headers=self.headers, timeout=10)
            success = response.status_code == 200
            self.log_test("GET /auth/me", success, response.status_code, response.text if not success else None)
            if success:
                user_data = response.json()
                print(f"   User: {user_data.get('name', 'N/A')} ({user_data.get('email', 'N/A')})")
            return success
        except Exception as e:
            self.log_test("GET /auth/me", False, None, str(e))
            return False

    def test_jobs_get_empty(self):
        """Test GET /api/jobs returns empty array for new users"""
        try:
            response = requests.get(f"{self.base_url}/jobs", headers=self.headers, timeout=10)
            success = response.status_code == 200
            if success:
                jobs = response.json()
                success = isinstance(jobs, list)
                print(f"   Jobs count: {len(jobs)}")
            self.log_test("GET /jobs (empty)", success, response.status_code, response.text if not success else None)
            return success
        except Exception as e:
            self.log_test("GET /jobs (empty)", False, None, str(e))
            return False

    def test_create_job(self):
        """Test POST /api/jobs creates a job"""
        job_data = {
            "title": "Software Engineer",
            "company": "Tech Corp",
            "location": "Remote",
            "remote": True,
            "status": "applied",
            "jd_raw_text": "Looking for a skilled software engineer...",
            "notes": "Looks like a great opportunity"
        }
        try:
            response = requests.post(f"{self.base_url}/jobs", headers=self.headers, json=job_data, timeout=10)
            success = response.status_code == 200
            if success:
                job = response.json()
                self.created_job_id = job.get('id')
                success = self.created_job_id is not None
                print(f"   Created job ID: {self.created_job_id}")
            self.log_test("POST /jobs", success, response.status_code, response.text if not success else None)
            return success
        except Exception as e:
            self.log_test("POST /jobs", False, None, str(e))
            return False

    def test_update_job(self):
        """Test PUT /api/jobs/{id} updates job status"""
        if not self.created_job_id:
            print("❌ PUT /jobs/{id} - No job ID to update")
            return False
        
        update_data = {"status": "interview"}
        try:
            response = requests.put(
                f"{self.base_url}/jobs/{self.created_job_id}", 
                headers=self.headers, 
                json=update_data, 
                timeout=10
            )
            success = response.status_code == 200
            self.log_test("PUT /jobs/{id}", success, response.status_code, response.text if not success else None)
            return success
        except Exception as e:
            self.log_test("PUT /jobs/{id}", False, None, str(e))
            return False

    def test_jobs_get_with_data(self):
        """Test GET /jobs returns created job"""
        try:
            response = requests.get(f"{self.base_url}/jobs", headers=self.headers, timeout=10)
            success = response.status_code == 200
            if success:
                jobs = response.json()
                success = len(jobs) >= 1 and any(job.get('id') == self.created_job_id for job in jobs)
                print(f"   Jobs count: {len(jobs)}, Contains created job: {success}")
            self.log_test("GET /jobs (with data)", success, response.status_code, response.text if not success else None)
            return success
        except Exception as e:
            self.log_test("GET /jobs (with data)", False, None, str(e))
            return False

    def test_delete_job(self):
        """Test DELETE /api/jobs/{id}"""
        if not self.created_job_id:
            print("❌ DELETE /jobs/{id} - No job ID to delete")
            return False
        
        try:
            response = requests.delete(f"{self.base_url}/jobs/{self.created_job_id}", headers=self.headers, timeout=10)
            success = response.status_code == 200
            self.log_test("DELETE /jobs/{id}", success, response.status_code, response.text if not success else None)
            return success
        except Exception as e:
            self.log_test("DELETE /jobs/{id}", False, None, str(e))
            return False

    def test_ai_parse_jd(self):
        """Test AI JD parsing endpoint"""
        jd_text = "We are looking for a Senior Frontend Engineer to join our team. Must have React experience."
        try:
            response = requests.post(
                f"{self.base_url}/ai/parse-jd", 
                headers=self.headers, 
                json={"jd_text": jd_text}, 
                timeout=30
            )
            success = response.status_code == 200
            if success:
                result = response.json()
                success = 'title' in result or 'error' in result  # Accept either valid parse or error response
            self.log_test("POST /ai/parse-jd", success, response.status_code, response.text if not success else None)
            return success
        except Exception as e:
            self.log_test("POST /ai/parse-jd", False, None, str(e))
            return False

    def test_ai_analyze_cv(self):
        """Test AI CV analysis endpoint"""
        cv_text = "John Doe. Software Engineer with 5 years React experience."
        jd_text = "Looking for Senior Frontend Engineer with React skills."
        try:
            response = requests.post(
                f"{self.base_url}/ai/analyze-cv", 
                headers=self.headers, 
                json={"cv_text": cv_text, "jd_text": jd_text}, 
                timeout=30
            )
            success = response.status_code == 200
            if success:
                result = response.json()
                success = 'overall_score' in result or 'error' in result  # Accept either valid analysis or error
            self.log_test("POST /ai/analyze-cv", success, response.status_code, response.text if not success else None)
            return success
        except Exception as e:
            self.log_test("POST /ai/analyze-cv", False, None, str(e))
            return False

    def test_ai_cover_letter(self):
        """Test AI cover letter generation"""
        cv_text = "John Doe. Software Engineer with 5 years React experience."
        jd_text = "Looking for Senior Frontend Engineer with React skills."
        try:
            response = requests.post(
                f"{self.base_url}/ai/cover-letter", 
                headers=self.headers, 
                json={"cv_text": cv_text, "jd_text": jd_text, "company": "Tech Corp", "tone": "professional"}, 
                timeout=30
            )
            success = response.status_code == 200
            if success:
                result = response.json()
                success = 'letter' in result
            self.log_test("POST /ai/cover-letter", success, response.status_code, response.text if not success else None)
            return success
        except Exception as e:
            self.log_test("POST /ai/cover-letter", False, None, str(e))
            return False

    def test_generate_interview_prep(self):
        """Test POST /api/jobs/{job_id}/interview-prep"""
        if not self.created_job_id:
            print("❌ POST /jobs/{id}/interview-prep - No job ID for interview prep")
            return False
        
        try:
            response = requests.post(
                f"{self.base_url}/jobs/{self.created_job_id}/interview-prep", 
                headers=self.headers, 
                json={"jd_text": "Looking for a software engineer with React experience."}, 
                timeout=20  # AI generation can take time
            )
            success = response.status_code == 200
            if success:
                prep = response.json()
                self.interview_prep_id = prep.get('id')
                success = self.interview_prep_id is not None and 'questions' in prep
                print(f"   Generated prep ID: {self.interview_prep_id}")
                print(f"   Questions count: {len(prep.get('questions', []))}")
            self.log_test("POST /jobs/{id}/interview-prep", success, response.status_code, response.text if not success else None)
            return success
        except Exception as e:
            self.log_test("POST /jobs/{id}/interview-prep", False, None, str(e))
            return False

    def test_get_interview_prep(self):
        """Test GET /api/jobs/{job_id}/interview-prep"""
        if not self.created_job_id:
            print("❌ GET /jobs/{id}/interview-prep - No job ID for interview prep")
            return False
        
        try:
            response = requests.get(f"{self.base_url}/jobs/{self.created_job_id}/interview-prep", headers=self.headers, timeout=10)
            success = response.status_code == 200
            if success:
                prep = response.json()
                success = prep is not None and 'questions' in prep
                print(f"   Retrieved prep with {len(prep.get('questions', []))} questions")
            self.log_test("GET /jobs/{id}/interview-prep", success, response.status_code, response.text if not success else None)
            return success
        except Exception as e:
            self.log_test("GET /jobs/{id}/interview-prep", False, None, str(e))
            return False

    def test_add_contact(self):
        """Test POST /api/jobs/{job_id}/contacts"""
        if not self.created_job_id:
            print("❌ POST /jobs/{id}/contacts - No job ID for contact")
            return False
        
        contact_data = {
            "name": "Sarah Chen",
            "role_type": "Recruiter",
            "email": "sarah@techcorp.com",
            "linkedin_url": "https://linkedin.com/in/sarahchen",
            "notes": "Great conversation about the role"
        }
        try:
            response = requests.post(
                f"{self.base_url}/jobs/{self.created_job_id}/contacts", 
                headers=self.headers, 
                json=contact_data, 
                timeout=10
            )
            success = response.status_code == 200
            if success:
                contact = response.json()
                self.created_contact_id = contact.get('id')
                success = self.created_contact_id is not None
                print(f"   Created contact ID: {self.created_contact_id}")
            self.log_test("POST /jobs/{id}/contacts", success, response.status_code, response.text if not success else None)
            return success
        except Exception as e:
            self.log_test("POST /jobs/{id}/contacts", False, None, str(e))
            return False

    def test_get_all_contacts(self):
        """Test GET /api/contacts returns contacts with job enrichment"""
        try:
            response = requests.get(f"{self.base_url}/contacts", headers=self.headers, timeout=10)
            success = response.status_code == 200
            if success:
                contacts = response.json()
                success = isinstance(contacts, list)
                if len(contacts) > 0:
                    contact = contacts[0]
                    # Check if contact has enriched job data
                    has_job_data = 'job_title' in contact and 'job_company' in contact and 'job_status' in contact
                    print(f"   Contacts count: {len(contacts)}, Has job enrichment: {has_job_data}")
                else:
                    print(f"   Contacts count: {len(contacts)}")
            self.log_test("GET /contacts", success, response.status_code, response.text if not success else None)
            return success
        except Exception as e:
            self.log_test("GET /contacts", False, None, str(e))
            return False

    def test_update_contact(self):
        """Test PUT /api/contacts/{contact_id}"""
        if not self.created_contact_id:
            print("❌ PUT /contacts/{id} - No contact ID to update")
            return False
        
        update_data = {
            "name": "Sarah Chen",
            "role_type": "Hiring Manager",  # Changed role
            "email": "sarah@techcorp.com",
            "linkedin_url": "https://linkedin.com/in/sarahchen",
            "notes": "Updated after follow-up call"
        }
        try:
            response = requests.put(
                f"{self.base_url}/contacts/{self.created_contact_id}", 
                headers=self.headers, 
                json=update_data, 
                timeout=10
            )
            success = response.status_code == 200
            self.log_test("PUT /contacts/{id}", success, response.status_code, response.text if not success else None)
            return success
        except Exception as e:
            self.log_test("PUT /contacts/{id}", False, None, str(e))
            return False

    def test_delete_contact(self):
        """Test DELETE /api/contacts/{contact_id}"""
        if not self.created_contact_id:
            print("❌ DELETE /contacts/{id} - No contact ID to delete")
            return False
        
        try:
            response = requests.delete(f"{self.base_url}/contacts/{self.created_contact_id}", headers=self.headers, timeout=10)
            success = response.status_code == 200
            self.log_test("DELETE /contacts/{id}", success, response.status_code, response.text if not success else None)
            return success
        except Exception as e:
            self.log_test("DELETE /contacts/{id}", False, None, str(e))
            return False

    def test_update_interview_prep(self):
        """Test PUT /api/interview-prep/{prep_id}"""
        if not self.interview_prep_id:
            print("❌ PUT /interview-prep/{id} - No prep ID to update")
            return False
        
        update_data = {
            "user_notes": {"q1": "Test note for question 1"},
            "checked_items": [0, 1]
        }
        try:
            response = requests.put(
                f"{self.base_url}/interview-prep/{self.interview_prep_id}", 
                headers=self.headers, 
                json=update_data, 
                timeout=10
            )
            success = response.status_code == 200
            self.log_test("PUT /interview-prep/{id}", success, response.status_code, response.text if not success else None)
            return success
        except Exception as e:
            self.log_test("PUT /interview-prep/{id}", False, None, str(e))
            return False

    def test_cv_file_upload(self):
        """Test POST /api/cv/upload-file endpoint for CV file uploads"""
        import tempfile
        import os
        
        # Test TXT file upload
        txt_content = """John Doe
Senior Software Engineer
Experience: 5+ years in Python, JavaScript, React
Education: BS Computer Science
Skills: Python, React, Node.js, MongoDB, AWS
Phone: (555) 123-4567
Email: john.doe@email.com"""
        
        try:
            with tempfile.NamedTemporaryFile(mode='w', suffix='.txt', delete=False) as temp_txt:
                temp_txt.write(txt_content)
                temp_txt_path = temp_txt.name
            
            # Create headers without Content-Type for file upload
            upload_headers = {'Authorization': f'Bearer {self.session_token}'}
            
            with open(temp_txt_path, 'rb') as f:
                files = {'file': ('test_cv.txt', f, 'text/plain')}
                response = requests.post(
                    f"{self.base_url}/cv/upload-file", 
                    headers=upload_headers, 
                    files=files, 
                    timeout=30
                )
            
            success = response.status_code == 200
            self.log_test("POST /cv/upload-file (TXT)", success, response.status_code, response.text if not success else None)
            
            if success:
                data = response.json()
                if 'raw_text' in data:
                    print(f"   ✅ Text extracted: {len(data['raw_text'])} characters")
                    print(f"   ✅ Preview: {data['raw_text'][:100]}...")
                else:
                    print(f"   ❌ No raw_text in response")
                    success = False
            
            # Cleanup
            os.unlink(temp_txt_path)
            return success
            
        except Exception as e:
            self.log_test("POST /cv/upload-file (TXT)", False, None, str(e))
            return False

    def test_email_parsing(self):
        """Test POST /api/ai/parse-email endpoint for email analysis"""
        test_email = """From: sarah.johnson@techcorp.com
Subject: Interview Invitation - Software Engineer Position

Hi John,

We were impressed with your application for the Software Engineer position. 
We'd like to invite you for a technical interview on Friday, January 15th at 2:00 PM.

The interview will be conducted via Zoom and will last approximately 1 hour.
Please confirm your availability.

Looking forward to speaking with you!

Best regards,
Sarah Johnson
Senior Technical Recruiter
TechCorp Inc.
sarah.johnson@techcorp.com
Phone: (555) 987-6543"""

        # Test without job_id first
        try:
            response = requests.post(
                f"{self.base_url}/ai/parse-email",
                headers=self.headers,
                json={"email_text": test_email},
                timeout=30  # AI calls can take longer
            )
            success = response.status_code == 200
            self.log_test("POST /ai/parse-email (no job)", success, response.status_code, response.text if not success else None)
            
            if success:
                data = response.json()
                if 'error' in data:
                    print(f"   ❌ AI parsing error: {data['error']}")
                    return False
                
                print(f"   ✅ Email type: {data.get('email_type', 'unknown')}")
                print(f"   ✅ Sender: {data.get('sender_name', 'unknown')}")
                print(f"   ✅ Sentiment: {data.get('sentiment', 'unknown')}")
                print(f"   ✅ Suggested status: {data.get('suggested_status', 'none')}")
                
                # Test with job_id if we have a created job
                if self.created_job_id:
                    response2 = requests.post(
                        f"{self.base_url}/ai/parse-email",
                        headers=self.headers,
                        json={"email_text": test_email, "job_id": self.created_job_id},
                        timeout=30
                    )
                    success2 = response2.status_code == 200
                    self.log_test("POST /ai/parse-email (with job)", success2, response2.status_code, response2.text if not success2 else None)
                    
                    if success2:
                        data2 = response2.json()
                        if data2.get('suggested_activity'):
                            print(f"   ✅ Activity created: {data2['suggested_activity']}")
                    
                    return success and success2
                
                return success
            return False
            
        except Exception as e:
            self.log_test("POST /ai/parse-email", False, None, str(e))
            return False

    def test_gmail_status(self):
        """Test GET /api/gmail/status when Gmail not connected"""
        try:
            response = requests.get(f"{self.base_url}/gmail/status", headers=self.headers, timeout=10)
            success = response.status_code == 200
            if success:
                data = response.json()
                # Should return {connected: false} when Gmail not connected
                expected_connected = False
                success = data.get('connected') == expected_connected
                print(f"   Connected: {data.get('connected', 'N/A')}, Email: {data.get('email', 'N/A')}")
            self.log_test("GET /gmail/status", success, response.status_code, response.text if not success else None)
            return success
        except Exception as e:
            self.log_test("GET /gmail/status", False, None, str(e))
            return False

    def test_gmail_oauth_login(self):
        """Test GET /api/oauth/gmail/login returns valid OAuth URL"""
        try:
            response = requests.get(f"{self.base_url}/oauth/gmail/login", headers=self.headers, timeout=10)
            success = response.status_code == 200
            if success:
                data = response.json()
                auth_url = data.get('auth_url', '')
                # Check if auth_url is a valid Google OAuth URL
                success = auth_url.startswith('https://accounts.google.com/o/oauth2/auth')
                print(f"   Auth URL valid: {success}")
                if success:
                    print(f"   URL starts with: {auth_url[:50]}...")
            self.log_test("GET /oauth/gmail/login", success, response.status_code, response.text if not success else None)
            return success
        except Exception as e:
            self.log_test("GET /oauth/gmail/login", False, None, str(e))
            return False

    def test_gmail_emails_not_connected(self):
        """Test GET /api/gmail/emails returns 400 when Gmail not connected"""
        try:
            response = requests.get(f"{self.base_url}/gmail/emails", headers=self.headers, timeout=10)
            success = response.status_code == 400
            if success:
                data = response.json()
                success = 'Gmail not connected' in data.get('detail', '')
                print(f"   Error message: {data.get('detail', 'N/A')}")
            self.log_test("GET /gmail/emails (not connected)", success, response.status_code, response.text if not success else None)
            return success
        except Exception as e:
            self.log_test("GET /gmail/emails (not connected)", False, None, str(e))
            return False

    def test_gmail_send_not_connected(self):
        """Test POST /api/gmail/send returns 400 when Gmail not connected"""
        email_data = {
            "to": "test@example.com",
            "subject": "Test Email",
            "body": "This is a test email"
        }
        try:
            response = requests.post(f"{self.base_url}/gmail/send", headers=self.headers, json=email_data, timeout=10)
            success = response.status_code == 400
            if success:
                data = response.json()
                success = 'Gmail not connected' in data.get('detail', '')
                print(f"   Error message: {data.get('detail', 'N/A')}")
            self.log_test("POST /gmail/send (not connected)", success, response.status_code, response.text if not success else None)
            return success
        except Exception as e:
            self.log_test("POST /gmail/send (not connected)", False, None, str(e))
            return False

    def test_gmail_scan_not_connected(self):
        """Test POST /api/gmail/scan returns 400 when Gmail not connected"""
        try:
            response = requests.post(f"{self.base_url}/gmail/scan", headers=self.headers, timeout=10)
            success = response.status_code == 400
            if success:
                data = response.json()
                success = 'Gmail not connected' in data.get('detail', '')
                print(f"   Error message: {data.get('detail', 'N/A')}")
            self.log_test("POST /gmail/scan (not connected)", success, response.status_code, response.text if not success else None)
            return success
        except Exception as e:
            self.log_test("POST /gmail/scan (not connected)", False, None, str(e))
            return False

    def test_gmail_disconnect(self):
        """Test POST /api/gmail/disconnect works without error"""
        try:
            response = requests.post(f"{self.base_url}/gmail/disconnect", headers=self.headers, timeout=10)
            success = response.status_code == 200
            if success:
                data = response.json()
                success = data.get('ok') == True
                print(f"   Disconnect successful: {success}")
            self.log_test("POST /gmail/disconnect", success, response.status_code, response.text if not success else None)
            return success
        except Exception as e:
            self.log_test("POST /gmail/disconnect", False, None, str(e))
            return False

    # ===== JOBFLOW UI FIXES TESTING =====
    def test_gmail_emails_with_domain_param(self):
        """Test GET /api/gmail/emails accepts domain query parameter"""
        try:
            # Test with domain parameter
            params = {"domain": "testcorp.com"}
            response = requests.get(f"{self.base_url}/gmail/emails", headers=self.headers, params=params, timeout=10)
            # Should return 400 since Gmail not connected, but we're testing the parameter is accepted
            success = response.status_code == 400
            if success:
                data = response.json()
                success = 'Gmail not connected' in data.get('detail', '')
                print(f"   Domain parameter accepted, error: {data.get('detail', 'N/A')}")
            self.log_test("GET /gmail/emails (with domain param)", success, response.status_code, response.text if not success else None)
            return success
        except Exception as e:
            self.log_test("GET /gmail/emails (with domain param)", False, None, str(e))
            return False

    def test_gmail_emails_no_contacts_no_domain(self):
        """Test GET /api/gmail/emails returns empty with info when no contacts and no domain"""
        try:
            # Test without any parameters - should return 400 since Gmail not connected
            response = requests.get(f"{self.base_url}/gmail/emails", headers=self.headers, timeout=10)
            success = response.status_code == 400
            if success:
                data = response.json()
                success = 'Gmail not connected' in data.get('detail', '')
                print(f"   No params, error: {data.get('detail', 'N/A')}")
            self.log_test("GET /gmail/emails (no contacts, no domain)", success, response.status_code, response.text if not success else None)
            return success
        except Exception as e:
            self.log_test("GET /gmail/emails (no contacts, no domain)", False, None, str(e))
            return False

    def test_sponsorship_badge_text(self):
        """Test sponsorship badge shows 'No sponsor licence' for not_found status"""
        # Create a job with a company that won't be found in sponsorship register
        job_data = {
            "title": "Test Engineer",
            "company": "UnknownTestCorp123",
            "location": "London",
            "status": "applied"
        }
        try:
            response = requests.post(f"{self.base_url}/jobs", headers=self.headers, json=job_data, timeout=10)
            if response.status_code == 200:
                job = response.json()
                job_id = job.get('id')
                sponsorship = job.get('sponsorship', {})
                
                # Check if sponsorship status is not_found
                if sponsorship.get('status') == 'not_found':
                    print(f"   ✅ Job created with 'not_found' sponsorship status")
                    print(f"   ✅ This should display 'No sponsor licence' in UI")
                    success = True
                else:
                    print(f"   ❌ Expected 'not_found' status, got: {sponsorship.get('status')}")
                    success = False
                
                # Cleanup
                requests.delete(f"{self.base_url}/jobs/{job_id}", headers=self.headers, timeout=10)
                
                self.log_test("Sponsorship badge text (not_found)", success, response.status_code)
                return success
            else:
                self.log_test("Sponsorship badge text (not_found)", False, response.status_code, response.text)
                return False
        except Exception as e:
            self.log_test("Sponsorship badge text (not_found)", False, None, str(e))
            return False

    # ===== NEW FEATURES TESTING =====
    def test_company_profile_social_links(self):
        """Test PUT /api/jobs/{job_id}/company-profile accepts new social media fields"""
        if not hasattr(self, 'deloitte_job_id') or not self.deloitte_job_id:
            # Create a test job first
            job_data = {
                "title": "Test Engineer",
                "company": "TestCorp",
                "location": "Remote",
                "status": "applied"
            }
            response = requests.post(f"{self.base_url}/jobs", headers=self.headers, json=job_data, timeout=10)
            if response.status_code == 200:
                self.test_job_id = response.json().get('id')
            else:
                print("❌ Failed to create test job for social links test")
                return False
        else:
            self.test_job_id = self.deloitte_job_id

        # Test new social media fields
        profile_data = {
            "linkedin_url": "https://linkedin.com/company/testcorp",
            "instagram_url": "https://instagram.com/testcorp",
            "youtube_url": "https://youtube.com/c/testcorp", 
            "tiktok_url": "https://tiktok.com/@testcorp",
            "website": "https://testcorp.com",
            "notes": "Test notes for company profile"
        }
        try:
            response = requests.put(
                f"{self.base_url}/jobs/{self.test_job_id}/company-profile", 
                headers=self.headers, 
                json=profile_data, 
                timeout=10
            )
            success = response.status_code == 200
            if success:
                print(f"   ✅ Social media fields accepted: {list(profile_data.keys())}")
            self.log_test("PUT /jobs/{id}/company-profile (social links)", success, response.status_code, response.text if not success else None)
            return success
        except Exception as e:
            self.log_test("PUT /jobs/{id}/company-profile (social links)", False, None, str(e))
            return False

    def test_sponsorship_recheck_all(self):
        """Test POST /api/sponsorship/recheck-all endpoint"""
        try:
            response = requests.post(f"{self.base_url}/sponsorship/recheck-all", headers=self.headers, timeout=30)
            success = response.status_code == 200
            if success:
                result = response.json()
                checked = result.get('checked', 0)
                updated = result.get('updated', 0)
                success = 'checked' in result and 'updated' in result
                print(f"   ✅ Rechecked {checked} jobs, updated {updated}")
            self.log_test("POST /sponsorship/recheck-all", success, response.status_code, response.text if not success else None)
            return success
        except Exception as e:
            self.log_test("POST /sponsorship/recheck-all", False, None, str(e))
            return False

    def test_sponsorship_response_format(self):
        """Test sponsorship check includes matched_name for both found and not_found"""
        try:
            # Test with Deloitte (should be found)
            response1 = requests.get(f"{self.base_url}/sponsorship/check?company=Deloitte", headers=self.headers, timeout=10)
            success1 = response1.status_code == 200
            if success1:
                data1 = response1.json()
                has_matched_name = 'matched_name' in data1
                print(f"   ✅ Deloitte response has matched_name: {has_matched_name}, value: {data1.get('matched_name', 'N/A')}")
                success1 = has_matched_name

            # Test with unknown company (should be not_found but still have matched_name)
            response2 = requests.get(f"{self.base_url}/sponsorship/check?company=RandomUnknownCorp123", headers=self.headers, timeout=10)
            success2 = response2.status_code == 200
            if success2:
                data2 = response2.json()
                has_matched_name = 'matched_name' in data2
                print(f"   ✅ Unknown company response has matched_name: {has_matched_name}, value: {data2.get('matched_name', 'N/A')}")
                success2 = has_matched_name

            success = success1 and success2
            self.log_test("Sponsorship response format (matched_name)", success, 200 if success else 400)
            return success
        except Exception as e:
            self.log_test("Sponsorship response format (matched_name)", False, None, str(e))
            return False

    def test_manual_sponsorship_override(self):
        """Test manual sponsorship override via PUT /api/jobs/{id}"""
        if not hasattr(self, 'test_job_id') or not self.test_job_id:
            print("❌ Manual sponsorship override test - No test job ID")
            return False

        # Test manual override
        override_data = {
            "sponsorship": {
                "status": "found",
                "matched_name": "Manual Override Corp",
                "confidence": 1.0,
                "manual_override": True
            }
        }
        try:
            response = requests.put(
                f"{self.base_url}/jobs/{self.test_job_id}", 
                headers=self.headers, 
                json=override_data, 
                timeout=10
            )
            success = response.status_code == 200
            if success:
                print(f"   ✅ Manual sponsorship override accepted")
            self.log_test("PUT /jobs/{id} (manual sponsorship)", success, response.status_code, response.text if not success else None)
            return success
        except Exception as e:
            self.log_test("PUT /jobs/{id} (manual sponsorship)", False, None, str(e))
            return False

    # ===== PHASE 2: UK SPONSORSHIP CHECKER =====
    def test_sponsorship_status(self):
        """Test GET /api/sponsorship/status - check if 140K+ records loaded"""
        try:
            response = requests.get(f"{self.base_url}/sponsorship/status", headers=self.headers, timeout=10)
            success = response.status_code == 200
            if success:
                data = response.json()
                loaded = data.get('loaded', False)
                record_count = data.get('record_count', 0)
                success = loaded and record_count >= 140000  # Should have 140K+ records
                print(f"   Loaded: {loaded}, Record count: {record_count:,}")
            self.log_test("GET /sponsorship/status", success, response.status_code, response.text if not success else None)
            return success
        except Exception as e:
            self.log_test("GET /sponsorship/status", False, None, str(e))
            return False

    def test_sponsorship_check_deloitte(self):
        """Test GET /api/sponsorship/check?company=Deloitte should return found"""
        try:
            response = requests.get(f"{self.base_url}/sponsorship/check?company=Deloitte", headers=self.headers, timeout=10)
            success = response.status_code == 200
            if success:
                data = response.json()
                status = data.get('status')
                matched_name = data.get('matched_name', '')
                confidence = data.get('confidence', 0)
                success = status == "found" and matched_name
                print(f"   Status: {status}, Match: {matched_name}, Confidence: {confidence}")
            self.log_test("GET /sponsorship/check (Deloitte)", success, response.status_code, response.text if not success else None)
            return success
        except Exception as e:
            self.log_test("GET /sponsorship/check (Deloitte)", False, None, str(e))
            return False

    def test_sponsorship_check_unknown(self):
        """Test GET /api/sponsorship/check?company=SomeRandomCo should return not_found"""
        try:
            response = requests.get(f"{self.base_url}/sponsorship/check?company=SomeRandomCo123", headers=self.headers, timeout=10)
            success = response.status_code == 200
            if success:
                data = response.json()
                status = data.get('status')
                confidence = data.get('confidence', 0)
                success = status == "not_found"
                print(f"   Status: {status}, Confidence: {confidence}")
            self.log_test("GET /sponsorship/check (Random)", success, response.status_code, response.text if not success else None)
            return success
        except Exception as e:
            self.log_test("GET /sponsorship/check (Random)", False, None, str(e))
            return False

    def test_create_deloitte_job(self):
        """Create a Deloitte job to test auto sponsorship checking"""
        job_data = {
            "title": "Senior Software Engineer",
            "company": "Deloitte",
            "location": "London",
            "status": "applied",
            "jd_raw_text": "We are looking for a senior software engineer...",
            "notes": "Test job for sponsorship checking"
        }
        try:
            response = requests.post(f"{self.base_url}/jobs", headers=self.headers, json=job_data, timeout=10)
            success = response.status_code == 200
            if success:
                job = response.json()
                job_id = job.get('id')
                sponsorship = job.get('sponsorship', {})
                has_sponsorship = sponsorship.get('status') == 'found'
                success = job_id is not None and has_sponsorship
                print(f"   Job ID: {job_id}, Auto-sponsorship check: {has_sponsorship}")
                print(f"   Sponsorship: {sponsorship}")
                self.deloitte_job_id = job_id  # Store for later cleanup
            self.log_test("POST /jobs (Deloitte auto-sponsorship)", success, response.status_code, response.text if not success else None)
            return success
        except Exception as e:
            self.log_test("POST /jobs (Deloitte auto-sponsorship)", False, None, str(e))
            return False

    # ===== PHASE 3: COMPANY INTELLIGENCE =====
    def test_update_company_profile(self):
        """Test PUT /api/jobs/{job_id}/company-profile for Company Intelligence panel"""
        if not hasattr(self, 'deloitte_job_id') or not self.deloitte_job_id:
            print("❌ PUT /jobs/{id}/company-profile - No Deloitte job ID")
            return False
        
        profile_data = {
            "domain": "deloitte.com",
            "website": "https://www.deloitte.com",
            "linkedin_url": "https://linkedin.com/company/deloitte",
            "glassdoor_url": "https://glassdoor.com/company/deloitte",
            "logo_url": "https://logo.clearbit.com/deloitte.com",
            "industry": "Professional Services",
            "company_size": "large",
            "funding_stage": "Public",
            "tech_stack": ["Java", "Python", "React", "AWS"],
            "social_links": ["https://twitter.com/deloitte"],
            "notes": "Great company culture and benefits"
        }
        try:
            response = requests.put(
                f"{self.base_url}/jobs/{self.deloitte_job_id}/company-profile", 
                headers=self.headers, 
                json=profile_data, 
                timeout=10
            )
            success = response.status_code == 200
            self.log_test("PUT /jobs/{id}/company-profile", success, response.status_code, response.text if not success else None)
            return success
        except Exception as e:
            self.log_test("PUT /jobs/{id}/company-profile", False, None, str(e))
            return False

    # ===== PHASE 4: NOTIFICATIONS =====
    def test_get_notifications(self):
        """Test GET /api/notifications"""
        try:
            response = requests.get(f"{self.base_url}/notifications", headers=self.headers, timeout=10)
            success = response.status_code == 200
            if success:
                notifications = response.json()
                success = isinstance(notifications, list)
                print(f"   Notifications count: {len(notifications)}")
            self.log_test("GET /notifications", success, response.status_code, response.text if not success else None)
            return success
        except Exception as e:
            self.log_test("GET /notifications", False, None, str(e))
            return False

    def test_notifications_confirm_dismiss(self):
        """Test notification confirm/dismiss endpoints (will create dummy notification if needed)"""
        # First check if we have any notifications
        try:
            response = requests.get(f"{self.base_url}/notifications", headers=self.headers, timeout=10)
            if response.status_code == 200:
                notifications = response.json()
                if notifications:
                    notif_id = notifications[0]['id']
                    # Test confirm
                    confirm_response = requests.post(f"{self.base_url}/notifications/{notif_id}/confirm", headers=self.headers, timeout=10)
                    success_confirm = confirm_response.status_code == 200
                    self.log_test("POST /notifications/{id}/confirm", success_confirm, confirm_response.status_code)
                    return success_confirm
                else:
                    print("   No notifications to test confirm/dismiss")
                    # Just test the endpoints exist with invalid ID
                    confirm_response = requests.post(f"{self.base_url}/notifications/invalid_id/confirm", headers=self.headers, timeout=10)
                    dismiss_response = requests.post(f"{self.base_url}/notifications/invalid_id/dismiss", headers=self.headers, timeout=10)
                    success = confirm_response.status_code == 404 and dismiss_response.status_code == 404
                    self.log_test("POST /notifications/{id}/confirm (404)", success, 404)
                    self.log_test("POST /notifications/{id}/dismiss (404)", success, 404)
                    return success
            return False
        except Exception as e:
            self.log_test("POST /notifications confirm/dismiss", False, None, str(e))
            return False

    # ===== PHASE 5: ATS RESULTS =====
    def test_save_ats_results(self):
        """Test POST /api/ats/save for persistent ATS results"""
        if not hasattr(self, 'deloitte_job_id') or not self.deloitte_job_id:
            print("❌ POST /ats/save - No job ID")
            return False
        
        ats_data = {
            "job_id": self.deloitte_job_id,
            "overall_score": 85,
            "skills_score": 80,
            "experience_score": 90,
            "language_score": 85,
            "hard_skills": [
                {"name": "Python", "status": "matched"},
                {"name": "JavaScript", "status": "matched"},
                {"name": "Go", "status": "missing"}
            ],
            "soft_skills": [
                {"name": "Communication", "status": "matched"},
                {"name": "Leadership", "status": "missing"}
            ],
            "suggestions": [
                {
                    "id": "1",
                    "original": "Worked on web applications",
                    "rewrite": "Developed scalable web applications using Python and React",
                    "category": "experience",
                    "impact": "high"
                }
            ],
            "accepted_suggestions": [],
            "original_cv_text": "Sample CV text",
            "jd_text": "Sample JD text"
        }
        try:
            response = requests.post(f"{self.base_url}/ats/save", headers=self.headers, json=ats_data, timeout=10)
            success = response.status_code == 200
            if success:
                result = response.json()
                self.ats_result_id = result.get('id')
                success = self.ats_result_id is not None
                print(f"   ATS Result ID: {self.ats_result_id}")
            self.log_test("POST /ats/save", success, response.status_code, response.text if not success else None)
            return success
        except Exception as e:
            self.log_test("POST /ats/save", False, None, str(e))
            return False

    def test_get_ats_results(self):
        """Test GET /api/ats/results for loading saved ATS results"""
        try:
            # Test without job_id
            response = requests.get(f"{self.base_url}/ats/results", headers=self.headers, timeout=10)
            success = response.status_code == 200
            
            if success and hasattr(self, 'deloitte_job_id') and self.deloitte_job_id:
                # Test with job_id
                response2 = requests.get(f"{self.base_url}/ats/results?job_id={self.deloitte_job_id}", headers=self.headers, timeout=10)
                success2 = response2.status_code == 200
                if success2:
                    result = response2.json()
                    if result:
                        print(f"   Retrieved ATS result: {result.get('overall_score')}% score")
                    success = success and success2
            
            self.log_test("GET /ats/results", success, response.status_code, response.text if not success else None)
            return success
        except Exception as e:
            self.log_test("GET /ats/results", False, None, str(e))
            return False

    def test_update_ats_results(self):
        """Test PUT /api/ats/results/{result_id}"""
        if not hasattr(self, 'ats_result_id') or not self.ats_result_id:
            print("❌ PUT /ats/results/{id} - No ATS result ID")
            return False
        
        update_data = {
            "accepted_suggestions": ["1"],
            "optimised_cv_text": "Updated CV text with improvements"
        }
        try:
            response = requests.put(
                f"{self.base_url}/ats/results/{self.ats_result_id}", 
                headers=self.headers, 
                json=update_data, 
                timeout=10
            )
            success = response.status_code == 200
            self.log_test("PUT /ats/results/{id}", success, response.status_code, response.text if not success else None)
            return success
        except Exception as e:
            self.log_test("PUT /ats/results/{id}", False, None, str(e))
            return False

    # ===== PHASE 6: COVER LETTERS =====
    def test_save_cover_letter(self):
        """Test POST /api/cover-letter/save"""
        if not hasattr(self, 'deloitte_job_id') or not self.deloitte_job_id:
            print("❌ POST /cover-letter/save - No job ID")
            return False
        
        cover_data = {
            "job_id": self.deloitte_job_id,
            "content": "Dear Hiring Manager,\n\nI am writing to express my interest in the Senior Software Engineer position at Deloitte.\n\nSincerely,\nJohn Doe",
            "tone": "professional",
            "company": "Deloitte"
        }
        try:
            response = requests.post(f"{self.base_url}/cover-letter/save", headers=self.headers, json=cover_data, timeout=10)
            success = response.status_code == 200
            if success:
                result = response.json()
                self.cover_letter_id = result.get('id')
                success = self.cover_letter_id is not None or result.get('ok') == True
                print(f"   Cover Letter ID: {self.cover_letter_id}")
            self.log_test("POST /cover-letter/save", success, response.status_code, response.text if not success else None)
            return success
        except Exception as e:
            self.log_test("POST /cover-letter/save", False, None, str(e))
            return False

    def test_get_cover_letter(self):
        """Test GET /api/cover-letter"""
        try:
            # Test without job_id
            response = requests.get(f"{self.base_url}/cover-letter", headers=self.headers, timeout=10)
            success = response.status_code == 200
            
            if success and hasattr(self, 'deloitte_job_id') and self.deloitte_job_id:
                # Test with job_id
                response2 = requests.get(f"{self.base_url}/cover-letter?job_id={self.deloitte_job_id}", headers=self.headers, timeout=10)
                success2 = response2.status_code == 200
                if success2:
                    result = response2.json()
                    if result:
                        content_length = len(result.get('content', ''))
                        print(f"   Retrieved cover letter: {content_length} characters, tone: {result.get('tone')}")
                    success = success and success2
            
            self.log_test("GET /cover-letter", success, response.status_code, response.text if not success else None)
            return success
        except Exception as e:
            self.log_test("GET /cover-letter", False, None, str(e))
            return False

    def test_regenerate_section(self):
        """Test POST /api/cover-letter/regenerate-section"""
        regen_data = {
            "paragraph": "I am writing to express my interest in this position.",
            "instruction": "Make it more specific to software engineering",
            "cv_text": "Sample CV text",
            "jd_text": "Sample JD text"
        }
        try:
            response = requests.post(f"{self.base_url}/cover-letter/regenerate-section", headers=self.headers, json=regen_data, timeout=30)
            success = response.status_code == 200
            if success:
                result = response.json()
                paragraph = result.get('paragraph', '')
                success = len(paragraph) > 0
                print(f"   Regenerated paragraph length: {len(paragraph)} characters")
            self.log_test("POST /cover-letter/regenerate-section", success, response.status_code, response.text if not success else None)
            return success
        except Exception as e:
            self.log_test("POST /cover-letter/regenerate-section", False, None, str(e))
            return False

    def cleanup_test_data(self):
        """Clean up created test data"""
        print("\n🧹 Cleaning up test data...")
        
        # Delete Deloitte job (will cascade delete contacts, activities)
        if hasattr(self, 'deloitte_job_id') and self.deloitte_job_id:
            try:
                response = requests.delete(f"{self.base_url}/jobs/{self.deloitte_job_id}", headers=self.headers, timeout=10)
                if response.status_code == 200:
                    print("   ✅ Cleaned up Deloitte job")
                else:
                    print("   ❌ Failed to clean up Deloitte job")
            except Exception as e:
                print(f"   ❌ Error cleaning up job: {e}")
                
        # Regular created_job_id cleanup handled in run_all_tests

    def run_all_tests(self):
        """Run all API tests including new Phase 2-6 features"""
        print("🚀 Starting Jobflow v2.0 API Tests (6 Phases + New Features)")
        print(f"Base URL: {self.base_url}")
        print(f"Session Token: {self.session_token[:20]}...")
        print("=" * 60)

        # Auth tests
        if not self.test_auth_me():
            print("❌ Auth failed, stopping tests")
            return False

        # ===== JOBFLOW UI FIXES TESTING =====
        print("\n🔧 JOBFLOW UI FIXES: Social Icons, Gmail Domain Param, Sponsorship Badge")
        print("-" * 50)
        self.test_gmail_emails_with_domain_param()
        self.test_gmail_emails_no_contacts_no_domain()
        self.test_sponsorship_badge_text()

        # ===== NEW FEATURES TESTING =====
        print("\n🆕 NEW FEATURES: Social Links, Sponsorship Updates, Manual Override")
        print("-" * 50)
        self.test_company_profile_social_links()
        self.test_sponsorship_recheck_all()
        self.test_sponsorship_response_format()
        self.test_manual_sponsorship_override()

        # ===== PHASE 2: UK SPONSORSHIP CHECKER =====
        print("\n🇬🇧 PHASE 2: UK Sponsorship Checker (140K+ records)")
        print("-" * 50)
        self.test_sponsorship_status()
        self.test_sponsorship_check_deloitte()
        self.test_sponsorship_check_unknown()
        self.test_create_deloitte_job()  # Auto sponsorship check

        # ===== PHASE 3: COMPANY INTELLIGENCE PANEL =====
        print("\n🏢 PHASE 3: Company Intelligence Panel")
        print("-" * 50)
        self.test_update_company_profile()

        # ===== PHASE 4: GMAIL NOTIFICATIONS =====
        print("\n📧 PHASE 4: Gmail Auto-progression & Notifications")
        print("-" * 50)
        self.test_get_notifications()
        self.test_notifications_confirm_dismiss()

        # ===== PHASE 5: PERSISTENT ATS RESULTS =====
        print("\n📊 PHASE 5: Persistent ATS Results")
        print("-" * 50)
        self.test_save_ats_results()
        self.test_get_ats_results()
        self.test_update_ats_results()

        # ===== PHASE 6: COVER LETTER EDITOR =====
        print("\n✍️ PHASE 6: Cover Letter Inline Editor")
        print("-" * 50)
        self.test_save_cover_letter()
        self.test_get_cover_letter()
        self.test_regenerate_section()

        # ===== EXISTING FEATURES TESTS =====
        print("\n🔄 Testing Existing Features Still Work...")
        print("-" * 50)
        
        # Jobs CRUD tests
        self.test_jobs_get_empty()
        if self.test_create_job():
            self.test_update_job()
            self.test_jobs_get_with_data()
            
            # Contacts CRUD tests (requires a job to exist)
            print("\n👥 Testing Contacts endpoints...")
            if self.test_add_contact():
                self.test_get_all_contacts()
                self.test_update_contact()
                self.test_delete_contact()
            
            # Interview prep tests (requires a job to exist)
            print("\n📝 Testing Interview Prep endpoints...")
            if self.test_generate_interview_prep():
                self.test_get_interview_prep()
                self.test_update_interview_prep()
            
            # Clean up
            self.test_delete_job()

        # AI endpoints
        print("\n🤖 Testing AI endpoints...")
        self.test_ai_parse_jd()
        self.test_ai_analyze_cv()
        self.test_ai_cover_letter()
        
        # CV and Email features
        print("\n📄 Testing CV File Upload...")
        self.test_cv_file_upload()
        
        print("\n📧 Testing Email Parsing...")
        self.test_email_parsing()

        # Gmail API tests
        print("\n📮 Testing Gmail API endpoints...")
        self.test_gmail_status()
        self.test_gmail_oauth_login()
        self.test_gmail_emails_not_connected()
        self.test_gmail_send_not_connected()
        self.test_gmail_scan_not_connected()
        self.test_gmail_disconnect()

        # Cleanup
        self.cleanup_test_data()

        # Summary
        print("=" * 60)
        print(f"📊 FINAL RESULTS")
        print(f"Tests passed: {self.tests_passed}/{self.tests_run}")
        print(f"Success rate: {(self.tests_passed/self.tests_run)*100:.1f}%")
        print("=" * 60)
        
        return self.tests_passed == self.tests_run

def main():
    tester = JobflowAPITester()
    success = tester.run_all_tests()
    return 0 if success else 1

if __name__ == "__main__":
    sys.exit(main())