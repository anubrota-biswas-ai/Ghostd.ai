#!/usr/bin/env python3
"""
Backend API Testing for Jobflow Phase 7A: ATS Optimizer
Tests the new enhanced AI analysis with dual scoring, skill frequency, searchability, and typed suggestions.
"""

import requests
import json
import sys
from datetime import datetime

class JobflowAPITester:
    def __init__(self, base_url="https://job-tracker-ai-9.preview.emergentagent.com"):
        self.base_url = base_url
        self.session_token = "test_session_1775220370709"  # From auth setup
        self.tests_run = 0
        self.tests_passed = 0
        self.failed_tests = []

    def run_test(self, name, method, endpoint, expected_status, data=None, timeout=60):
        """Run a single API test"""
        url = f"{self.base_url}/api/{endpoint}"
        headers = {
            'Content-Type': 'application/json',
            'Authorization': f'Bearer {self.session_token}'
        }

        self.tests_run += 1
        print(f"\n🔍 Testing {name}...")
        
        try:
            if method == 'GET':
                response = requests.get(url, headers=headers, timeout=timeout)
            elif method == 'POST':
                response = requests.post(url, json=data, headers=headers, timeout=timeout)
            elif method == 'PUT':
                response = requests.put(url, json=data, headers=headers, timeout=timeout)

            success = response.status_code == expected_status
            if success:
                self.tests_passed += 1
                print(f"✅ Passed - Status: {response.status_code}")
                try:
                    return True, response.json()
                except:
                    return True, {}
            else:
                print(f"❌ Failed - Expected {expected_status}, got {response.status_code}")
                try:
                    error_detail = response.json()
                    print(f"   Error: {error_detail}")
                except:
                    print(f"   Response: {response.text[:200]}")
                self.failed_tests.append(f"{name}: Expected {expected_status}, got {response.status_code}")
                return False, {}

        except Exception as e:
            print(f"❌ Failed - Error: {str(e)}")
            self.failed_tests.append(f"{name}: {str(e)}")
            return False, {}

    def test_auth(self):
        """Test authentication with session token"""
        return self.run_test("Authentication", "GET", "auth/me", 200)

    def test_analyze_cv_phase7a(self):
        """Test Phase 7A: Enhanced AI analysis with new fields"""
        print("\n🧠 Testing Phase 7A: Enhanced AI Analysis...")
        
        # Sample CV and JD for testing
        cv_text = """
John Smith
Software Engineer
Email: john.smith@email.com
Phone: +44 7123 456789
LinkedIn: linkedin.com/in/johnsmith

EXPERIENCE
Senior Software Engineer | TechCorp | 2020-2023
- Developed React applications with TypeScript
- Built REST APIs using Python and FastAPI
- Worked with PostgreSQL databases
- Led team of 3 developers
- Implemented CI/CD pipelines

Software Developer | StartupCo | 2018-2020
- Created web applications using JavaScript
- Worked with Node.js and Express
- Used MongoDB for data storage

SKILLS
- Python, JavaScript, TypeScript
- React, Node.js, FastAPI
- PostgreSQL, MongoDB
- Git, Docker, AWS
- Agile methodologies

EDUCATION
BSc Computer Science | University College London | 2014-2018
"""

        jd_text = """
Senior Full Stack Developer
Company: InnovateAI
Location: London, UK

We are seeking a Senior Full Stack Developer to join our growing team.

Requirements:
- 5+ years experience in software development
- Strong proficiency in Python and JavaScript
- Experience with React and modern frontend frameworks
- Knowledge of REST API development
- Database experience (PostgreSQL preferred)
- Experience with cloud platforms (AWS, Azure)
- Strong problem-solving skills
- Excellent communication skills
- Team leadership experience
- Agile/Scrum methodology experience

Nice to have:
- TypeScript experience
- Docker containerization
- CI/CD pipeline setup
- Machine learning knowledge
- Startup experience

Responsibilities:
- Design and develop full-stack applications
- Lead technical decisions and architecture
- Mentor junior developers
- Collaborate with product team
- Ensure code quality and best practices
"""

        # Test the enhanced analyze-cv endpoint
        success, response = self.run_test(
            "AI Analyze CV (Phase 7A)",
            "POST",
            "ai/analyze-cv",
            200,
            data={
                "cv_text": cv_text,
                "jd_text": jd_text,
                "job_id": None
            },
            timeout=45  # AI calls take time
        )

        if not success:
            return False

        # Validate Phase 7A new fields
        required_fields = [
            'ats_score', 'recruiter_score', 'overall_score',
            'hard_skills', 'soft_skills', 'searchability', 
            'recruiter_tips', 'suggestions'
        ]
        
        missing_fields = []
        for field in required_fields:
            if field not in response:
                missing_fields.append(field)

        if missing_fields:
            print(f"❌ Missing required Phase 7A fields: {missing_fields}")
            self.failed_tests.append(f"AI Analysis: Missing fields {missing_fields}")
            return False

        # Validate score ranges (0-100)
        scores_to_check = ['ats_score', 'recruiter_score', 'overall_score']
        for score_field in scores_to_check:
            score = response.get(score_field, -1)
            if not (0 <= score <= 100):
                print(f"❌ Invalid {score_field}: {score} (should be 0-100)")
                self.failed_tests.append(f"AI Analysis: Invalid {score_field}")
                return False

        # Validate hard_skills structure
        hard_skills = response.get('hard_skills', [])
        if not isinstance(hard_skills, list) or len(hard_skills) < 5:
            print(f"❌ Invalid hard_skills: Expected list with 5+ items, got {len(hard_skills)}")
            self.failed_tests.append("AI Analysis: Invalid hard_skills structure")
            return False

        # Check hard_skills have required fields
        for skill in hard_skills[:3]:  # Check first 3
            required_skill_fields = ['name', 'status', 'cv_count', 'jd_count']
            for field in required_skill_fields:
                if field not in skill:
                    print(f"❌ Hard skill missing field: {field}")
                    self.failed_tests.append(f"AI Analysis: Hard skill missing {field}")
                    return False

        # Validate suggestions structure
        suggestions = response.get('suggestions', [])
        if not isinstance(suggestions, list) or len(suggestions) < 8:
            print(f"❌ Invalid suggestions: Expected list with 8+ items, got {len(suggestions)}")
            self.failed_tests.append("AI Analysis: Invalid suggestions structure")
            return False

        # Check suggestions have required fields
        for suggestion in suggestions[:3]:  # Check first 3
            required_sug_fields = ['id', 'type', 'keyword', 'original', 'rewrite', 'score_impact']
            for field in required_sug_fields:
                if field not in suggestion:
                    print(f"❌ Suggestion missing field: {field}")
                    self.failed_tests.append(f"AI Analysis: Suggestion missing {field}")
                    return False

            # Validate suggestion types
            valid_types = ['REPHRASE', 'ADD_SKILL', 'ADD_KEYWORD', 'REMOVE']
            if suggestion['type'] not in valid_types:
                print(f"❌ Invalid suggestion type: {suggestion['type']}")
                self.failed_tests.append(f"AI Analysis: Invalid suggestion type")
                return False

        # Validate searchability structure
        searchability = response.get('searchability', [])
        if not isinstance(searchability, list) or len(searchability) < 5:
            print(f"❌ Invalid searchability: Expected list with 5+ items, got {len(searchability)}")
            self.failed_tests.append("AI Analysis: Invalid searchability structure")
            return False

        # Validate recruiter_tips structure
        recruiter_tips = response.get('recruiter_tips', [])
        if not isinstance(recruiter_tips, list) or len(recruiter_tips) < 3:
            print(f"❌ Invalid recruiter_tips: Expected list with 3+ items, got {len(recruiter_tips)}")
            self.failed_tests.append("AI Analysis: Invalid recruiter_tips structure")
            return False

        print(f"✅ Phase 7A Analysis validated:")
        print(f"   - ATS Score: {response['ats_score']}")
        print(f"   - Recruiter Score: {response['recruiter_score']}")
        print(f"   - Overall Score: {response['overall_score']}")
        print(f"   - Hard Skills: {len(hard_skills)} items")
        print(f"   - Suggestions: {len(suggestions)} items")
        print(f"   - Searchability: {len(searchability)} items")
        print(f"   - Recruiter Tips: {len(recruiter_tips)} items")

        return True, response

    def test_ats_save_phase7a(self, analysis_data):
        """Test Phase 7A: Save ATS results with new fields"""
        print("\n💾 Testing Phase 7A: Save ATS Results...")
        
        save_data = {
            "job_id": None,
            "overall_score": analysis_data.get('overall_score'),
            "ats_score": analysis_data.get('ats_score'),
            "recruiter_score": analysis_data.get('recruiter_score'),
            "skills_score": analysis_data.get('skills_score'),
            "experience_score": analysis_data.get('experience_score'),
            "language_score": analysis_data.get('language_score'),
            "hard_skills": analysis_data.get('hard_skills', []),
            "soft_skills": analysis_data.get('soft_skills', []),
            "searchability": analysis_data.get('searchability', []),
            "recruiter_tips": analysis_data.get('recruiter_tips', []),
            "suggestions": analysis_data.get('suggestions', []),
            "accepted_suggestions": [],
            "original_cv_text": "Sample CV text",
            "jd_text": "Sample JD text",
            "summary": analysis_data.get('summary', '')
        }

        success, response = self.run_test(
            "Save ATS Results (Phase 7A)",
            "POST",
            "ats/save",
            200,
            data=save_data
        )

        if success:
            print(f"✅ ATS Results saved with ID: {response.get('id')}")
            return True, response
        return False, {}

    def test_ats_get_results_phase7a(self):
        """Test Phase 7A: Get saved ATS results with new fields"""
        print("\n📥 Testing Phase 7A: Get ATS Results...")
        
        success, response = self.run_test(
            "Get ATS Results (Phase 7A)",
            "GET",
            "ats/results",
            200
        )

        if not success:
            return False

        if not response:
            print("ℹ️  No saved ATS results found (expected for fresh test)")
            return True

        # Validate that saved results contain Phase 7A fields
        phase7a_fields = ['ats_score', 'recruiter_score', 'searchability', 'recruiter_tips']
        for field in phase7a_fields:
            if field not in response:
                print(f"❌ Saved results missing Phase 7A field: {field}")
                self.failed_tests.append(f"Get ATS Results: Missing {field}")
                return False

        print(f"✅ Retrieved ATS results with Phase 7A fields")
        return True

    def test_existing_endpoints(self):
        """Test that existing endpoints still work"""
        print("\n🔄 Testing existing endpoints compatibility...")
        
        # Test parse JD
        success, _ = self.run_test(
            "Parse JD (existing)",
            "POST",
            "ai/parse-jd",
            200,
            data={"jd_text": "Software Engineer at TechCorp. Requirements: Python, React."}
        )
        
        if not success:
            return False

        # Test cover letter generation
        success, _ = self.run_test(
            "Generate Cover Letter (existing)",
            "POST",
            "ai/cover-letter",
            200,
            data={
                "cv_text": "John Smith, Software Engineer with Python experience",
                "jd_text": "Looking for Python developer",
                "company": "TechCorp",
                "tone": "professional"
            },
            timeout=30
        )

        return success

def main():
    print("🚀 Starting Jobflow Phase 7A Backend Testing...")
    print("=" * 60)
    
    tester = JobflowAPITester()
    
    # Test authentication first
    auth_success, _ = tester.test_auth()
    if not auth_success:
        print("❌ Authentication failed - stopping tests")
        return 1

    # Test Phase 7A features
    analysis_success, analysis_data = tester.test_analyze_cv_phase7a()
    if not analysis_success:
        print("❌ Phase 7A AI Analysis failed")
        return 1

    # Test saving results with Phase 7A fields
    save_success, _ = tester.test_ats_save_phase7a(analysis_data)
    if not save_success:
        print("❌ Phase 7A Save ATS Results failed")

    # Test retrieving results
    get_success = tester.test_ats_get_results_phase7a()
    if not get_success:
        print("❌ Phase 7A Get ATS Results failed")

    # Test existing endpoints still work
    existing_success = tester.test_existing_endpoints()
    if not existing_success:
        print("❌ Existing endpoints compatibility failed")

    # Print final results
    print("\n" + "=" * 60)
    print(f"📊 Test Results: {tester.tests_passed}/{tester.tests_run} passed")
    
    if tester.failed_tests:
        print("\n❌ Failed Tests:")
        for failure in tester.failed_tests:
            print(f"   - {failure}")
    
    if tester.tests_passed == tester.tests_run:
        print("🎉 All Phase 7A backend tests passed!")
        return 0
    else:
        print("⚠️  Some tests failed - see details above")
        return 1

if __name__ == "__main__":
    sys.exit(main())