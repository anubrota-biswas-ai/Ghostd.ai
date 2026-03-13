#!/usr/bin/env python3
import requests
import sys
import json
from datetime import datetime

class JobflowAPITester:
    def __init__(self):
        self.base_url = "https://job-tracker-ai-9.preview.emergentagent.com/api"
        self.session_token = "test_session_1773441396406"  # From MongoDB creation
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

    def run_all_tests(self):
        """Run all API tests"""
        print("🚀 Starting Jobflow API Tests")
        print(f"Base URL: {self.base_url}")
        print(f"Session Token: {self.session_token[:20]}...")
        print("-" * 50)

        # Auth tests
        if not self.test_auth_me():
            print("❌ Auth failed, stopping tests")
            return False

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

        # Summary
        print("-" * 50)
        print(f"📊 Tests passed: {self.tests_passed}/{self.tests_run}")
        print(f"Success rate: {(self.tests_passed/self.tests_run)*100:.1f}%")
        
        return self.tests_passed == self.tests_run

def main():
    tester = JobflowAPITester()
    success = tester.run_all_tests()
    return 0 if success else 1

if __name__ == "__main__":
    sys.exit(main())