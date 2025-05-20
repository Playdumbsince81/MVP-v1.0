
import requests
import sys
import json
import uuid
from datetime import datetime

class AIWorkflowBuilderTester:
    def __init__(self, base_url):
        self.base_url = base_url
        self.tests_run = 0
        self.tests_passed = 0
        self.created_workflow_id = None

    def run_test(self, name, method, endpoint, expected_status, data=None):
        """Run a single API test"""
        url = f"{self.base_url}/{endpoint}"
        headers = {'Content-Type': 'application/json'}
        
        self.tests_run += 1
        print(f"\n🔍 Testing {name}...")
        
        try:
            if method == 'GET':
                response = requests.get(url, headers=headers)
            elif method == 'POST':
                response = requests.post(url, json=data, headers=headers)
            elif method == 'PUT':
                response = requests.put(url, json=data, headers=headers)
            elif method == 'DELETE':
                response = requests.delete(url, headers=headers)

            success = response.status_code == expected_status
            if success:
                self.tests_passed += 1
                print(f"✅ Passed - Status: {response.status_code}")
                try:
                    return success, response.json()
                except:
                    return success, {}
            else:
                print(f"❌ Failed - Expected {expected_status}, got {response.status_code}")
                try:
                    print(f"Response: {response.json()}")
                except:
                    print(f"Response: {response.text}")
                return False, {}

        except Exception as e:
            print(f"❌ Failed - Error: {str(e)}")
            return False, {}

    def test_root_endpoint(self):
        """Test the root API endpoint"""
        return self.run_test(
            "Root API Endpoint",
            "GET",
            "",
            200
        )

    def test_get_module_types(self):
        """Test getting module types"""
        return self.run_test(
            "Get Module Types",
            "GET",
            "module-types",
            200
        )

    def test_get_workflows(self):
        """Test getting all workflows"""
        return self.run_test(
            "Get All Workflows",
            "GET",
            "workflows",
            200
        )

    def test_create_workflow(self):
        """Test creating a new workflow"""
        workflow_id = str(uuid.uuid4())
        workflow_data = {
            "id": workflow_id,  # Explicitly set the ID
            "name": f"Test Workflow {uuid.uuid4()}",
            "description": "A test workflow created by automated tests",
            "modules": [
                {
                    "id": str(uuid.uuid4()),
                    "type": "text-input",
                    "name": "Input Text",
                    "config": {"label": "My Text Input"},
                    "position": {"x": 100, "y": 100}
                },
                {
                    "id": str(uuid.uuid4()),
                    "type": "openai-text",
                    "name": "GPT Model",
                    "config": {"model": "gpt-4-turbo", "temperature": 0.7},
                    "position": {"x": 400, "y": 100}
                }
            ],
            "connections": []
        }
        
        success, response = self.run_test(
            "Create Workflow",
            "POST",
            "workflows",
            200,
            data=workflow_data
        )
        
        if success:
            print(f"Response data: {json.dumps(response, indent=2)}")
            if "id" in response:
                self.created_workflow_id = response["id"]
                print(f"Created workflow with ID: {self.created_workflow_id}")
            else:
                self.created_workflow_id = workflow_id
                print(f"Using provided workflow ID: {self.created_workflow_id}")
        
        return success, response

    def test_get_workflow_by_id(self):
        """Test getting a workflow by ID"""
        if not self.created_workflow_id:
            print("❌ Cannot test get workflow by ID - no workflow was created")
            return False, {}
        
        return self.run_test(
            "Get Workflow by ID",
            "GET",
            f"workflows/{self.created_workflow_id}",
            200
        )

    def test_update_workflow(self):
        """Test updating a workflow"""
        if not self.created_workflow_id:
            print("❌ Cannot test update workflow - no workflow was created")
            return False, {}
        
        update_data = {
            "name": "Updated Test Workflow",
            "description": "This workflow has been updated by automated tests"
        }
        
        return self.run_test(
            "Update Workflow",
            "PUT",
            f"workflows/{self.created_workflow_id}",
            200,
            data=update_data
        )

    def test_clone_workflow(self):
        """Test cloning a workflow"""
        if not self.created_workflow_id:
            print("❌ Cannot test clone workflow - no workflow was created")
            return False, {}
        
        clone_data = {
            "name": f"Cloned Workflow {uuid.uuid4()}"
        }
        
        return self.run_test(
            "Clone Workflow",
            "POST",
            f"workflows/{self.created_workflow_id}/clone",
            201,
            data=clone_data
        )

    def test_execute_workflow(self):
        """Test executing a workflow"""
        if not self.created_workflow_id:
            print("❌ Cannot test execute workflow - no workflow was created")
            return False, {}
        
        inputs = {
            "text": "This is a test input"
        }
        
        return self.run_test(
            "Execute Workflow",
            "POST",
            f"workflows/{self.created_workflow_id}/execute",
            200,
            data=inputs
        )

    def test_delete_workflow(self):
        """Test deleting a workflow"""
        if not self.created_workflow_id:
            print("❌ Cannot test delete workflow - no workflow was created")
            return False, {}
        
        return self.run_test(
            "Delete Workflow",
            "DELETE",
            f"workflows/{self.created_workflow_id}",
            200
        )

def main():
    # Get the backend URL from environment
    backend_url = "https://dbcd1187-dee9-4eda-b125-2035c0c5b6b8.preview.emergentagent.com/api"
    
    print(f"Testing API at: {backend_url}")
    
    # Setup tester
    tester = AIWorkflowBuilderTester(backend_url)
    
    # Run tests
    tester.test_root_endpoint()
    tester.test_get_module_types()
    tester.test_get_workflows()
    tester.test_create_workflow()
    tester.test_get_workflow_by_id()
    tester.test_update_workflow()
    tester.test_clone_workflow()
    tester.test_execute_workflow()
    tester.test_delete_workflow()
    
    # Print results
    print(f"\n📊 Tests passed: {tester.tests_passed}/{tester.tests_run}")
    return 0 if tester.tests_passed == tester.tests_run else 1

if __name__ == "__main__":
    sys.exit(main())
