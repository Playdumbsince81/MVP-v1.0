from fastapi import FastAPI, APIRouter, HTTPException, Depends, Header, Body, Request
from fastapi.middleware.cors import CORSMiddleware
from motor.motor_asyncio import AsyncIOMotorClient
from pydantic import BaseModel, Field, EmailStr
from typing import Dict, List, Optional, Any, Union
from datetime import datetime
import os
import uuid
import json
import logging
from pathlib import Path
from dotenv import load_dotenv

# Load environment variables
ROOT_DIR = Path(__file__).parent
load_dotenv(ROOT_DIR / '.env')

# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s'
)
logger = logging.getLogger(__name__)

# MongoDB connection
mongo_url = os.environ['MONGO_URL']
db_name = os.environ.get('DB_NAME', 'workflow_builder')
client = AsyncIOMotorClient(mongo_url)
db = client[db_name]

# Create the main app without a prefix
app = FastAPI(title="AI Workflow Builder API")

# Create a router with the /api prefix
api_router = APIRouter(prefix="/api")

# Models
class User(BaseModel):
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    email: EmailStr
    created_at: datetime = Field(default_factory=datetime.utcnow)
    api_keys: Dict[str, str] = Field(default_factory=dict)

class ModuleConfig(BaseModel):
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    type: str
    name: str
    config: Dict[str, Any] = Field(default_factory=dict)
    position: Dict[str, int] = Field(default_factory=dict)

class Connection(BaseModel):
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    source: str
    source_handle: Optional[str] = None
    target: str
    target_handle: Optional[str] = None

class Workflow(BaseModel):
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    name: str
    description: Optional[str] = None
    modules: List[ModuleConfig] = Field(default_factory=list)
    connections: List[Connection] = Field(default_factory=list)
    created_at: datetime = Field(default_factory=datetime.utcnow)
    updated_at: datetime = Field(default_factory=datetime.utcnow)
    created_by: Optional[str] = None
    is_template: bool = False
    parent_workflow: Optional[str] = None

class WorkflowCreate(BaseModel):
    name: str
    description: Optional[str] = None
    modules: List[ModuleConfig] = Field(default_factory=list)
    connections: List[Connection] = Field(default_factory=list)
    is_template: bool = False
    parent_workflow: Optional[str] = None

class WorkflowUpdate(BaseModel):
    name: Optional[str] = None
    description: Optional[str] = None
    modules: Optional[List[ModuleConfig]] = None
    connections: Optional[List[Connection]] = None
    is_template: Optional[bool] = None

class ModuleType(BaseModel):
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    name: str
    category: str
    description: str
    config_schema: Dict[str, Any]
    input_schema: Dict[str, Any]
    output_schema: Dict[str, Any]

class AIProviderConfig(BaseModel):
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    name: str
    api_key: str
    user_id: str

class ExecutionResult(BaseModel):
    status: str
    data: Dict[str, Any] = Field(default_factory=dict)
    error: Optional[str] = None

# Routes
@api_router.get("/")
async def root():
    return {"message": "Welcome to the AI Workflow Builder API"}

# Module Types
@api_router.get("/module-types", response_model=List[ModuleType])
async def get_module_types():
    # Return predefined module types
    module_types = [
        ModuleType(
            id="text-input",
            name="Text Input",
            category="Input",
            description="Text input component",
            config_schema={"label": {"type": "string", "default": "Text Input"}},
            input_schema={},
            output_schema={"text": {"type": "string"}}
        ),
        ModuleType(
            id="file-input",
            name="File Input",
            category="Input",
            description="File upload component",
            config_schema={"label": {"type": "string", "default": "File Input"}, "accept": {"type": "string", "default": "*/*"}},
            input_schema={},
            output_schema={"file": {"type": "object"}}
        ),
        ModuleType(
            id="openai-text",
            name="OpenAI Text Model",
            category="AI Model",
            description="OpenAI text generation model (GPT-4, etc.)",
            config_schema={
                "model": {"type": "string", "default": "gpt-4-turbo"},
                "temperature": {"type": "number", "default": 0.7, "min": 0, "max": 2},
                "max_tokens": {"type": "number", "default": 1000}
            },
            input_schema={"prompt": {"type": "string"}},
            output_schema={"text": {"type": "string"}}
        ),
        ModuleType(
            id="anthropic-claude",
            name="Anthropic Claude",
            category="AI Model",
            description="Anthropic Claude model",
            config_schema={
                "model": {"type": "string", "default": "claude-3-opus-20240229"},
                "temperature": {"type": "number", "default": 0.7, "min": 0, "max": 1},
                "max_tokens": {"type": "number", "default": 1000}
            },
            input_schema={"prompt": {"type": "string"}},
            output_schema={"text": {"type": "string"}}
        ),
        ModuleType(
            id="openai-image",
            name="OpenAI DALL-E",
            category="AI Model",
            description="OpenAI DALL-E image generation",
            config_schema={
                "model": {"type": "string", "default": "dall-e-3"},
                "size": {"type": "string", "default": "1024x1024", "enum": ["1024x1024", "1792x1024", "1024x1792"]}
            },
            input_schema={"prompt": {"type": "string"}},
            output_schema={"image_url": {"type": "string"}}
        ),
        ModuleType(
            id="text-output",
            name="Text Output",
            category="Output",
            description="Display text output",
            config_schema={"label": {"type": "string", "default": "Output"}},
            input_schema={"text": {"type": "string"}},
            output_schema={}
        ),
        ModuleType(
            id="image-output",
            name="Image Output",
            category="Output",
            description="Display image output",
            config_schema={"label": {"type": "string", "default": "Image"}},
            input_schema={"image_url": {"type": "string"}},
            output_schema={}
        ),
        ModuleType(
            id="conditional",
            name="Conditional Logic",
            category="Logic",
            description="Branch based on conditions",
            config_schema={"condition": {"type": "string", "default": "value.includes('yes')"}},
            input_schema={"value": {"type": "string"}},
            output_schema={"true": {"type": "any"}, "false": {"type": "any"}}
        ),
        ModuleType(
            id="transform",
            name="Transform",
            category="Logic",
            description="Transform data with JavaScript",
            config_schema={"function": {"type": "string", "default": "return input.text.toUpperCase()"}},
            input_schema={"input": {"type": "any"}},
            output_schema={"output": {"type": "any"}}
        )
    ]
    return module_types

# Workflows
@api_router.post("/workflows", response_model=Workflow)
async def create_workflow(workflow: WorkflowCreate):
    workflow_data = workflow.dict()
    workflow_id = str(uuid.uuid4())
    workflow_data["id"] = workflow_id
    workflow_data["created_at"] = datetime.utcnow()
    workflow_data["updated_at"] = datetime.utcnow()
    
    await db.workflows.insert_one(workflow_data)
    
    return Workflow(**workflow_data)

@api_router.get("/workflows", response_model=List[Workflow])
async def get_workflows():
    workflows = await db.workflows.find().to_list(1000)
    return [Workflow(**workflow) for workflow in workflows]

@api_router.get("/workflows/{workflow_id}", response_model=Workflow)
async def get_workflow(workflow_id: str):
    workflow = await db.workflows.find_one({"id": workflow_id})
    if not workflow:
        raise HTTPException(status_code=404, detail="Workflow not found")
    return Workflow(**workflow)

@api_router.put("/workflows/{workflow_id}", response_model=Workflow)
async def update_workflow(workflow_id: str, workflow_update: WorkflowUpdate):
    workflow = await db.workflows.find_one({"id": workflow_id})
    if not workflow:
        raise HTTPException(status_code=404, detail="Workflow not found")
    
    update_data = {k: v for k, v in workflow_update.dict().items() if v is not None}
    update_data["updated_at"] = datetime.utcnow()
    
    await db.workflows.update_one({"id": workflow_id}, {"$set": update_data})
    
    updated_workflow = await db.workflows.find_one({"id": workflow_id})
    return Workflow(**updated_workflow)

@api_router.delete("/workflows/{workflow_id}")
async def delete_workflow(workflow_id: str):
    workflow = await db.workflows.find_one({"id": workflow_id})
    if not workflow:
        raise HTTPException(status_code=404, detail="Workflow not found")
    
    await db.workflows.delete_one({"id": workflow_id})
    return {"message": "Workflow deleted successfully"}

@api_router.post("/workflows/{workflow_id}/clone", response_model=Workflow, status_code=201)
async def clone_workflow(workflow_id: str, name: str = Body(..., embed=True)):
    original_workflow = await db.workflows.find_one({"id": workflow_id})
    if not original_workflow:
        raise HTTPException(status_code=404, detail="Workflow not found")
    
    # Create a new workflow based on the original
    new_workflow = Workflow(
        name=name,
        description=original_workflow.get("description", ""),
        modules=original_workflow.get("modules", []),
        connections=original_workflow.get("connections", []),
        parent_workflow=workflow_id
    )
    
    new_workflow_data = new_workflow.dict()
    await db.workflows.insert_one(new_workflow_data)
    
    return new_workflow

# AI Provider Configuration
@api_router.post("/ai-providers", response_model=AIProviderConfig)
async def create_ai_provider(provider: AIProviderConfig):
    # In a real application, encrypt the API key before storing
    result = await db.ai_providers.insert_one(provider.dict())
    provider_data = provider.dict()
    provider_data["id"] = str(result.inserted_id)
    return AIProviderConfig(**provider_data)

@api_router.get("/ai-providers", response_model=List[AIProviderConfig])
async def get_ai_providers(user_id: Optional[str] = None):
    query = {}
    if user_id:
        query["user_id"] = user_id
    
    providers = await db.ai_providers.find(query).to_list(100)
    return [AIProviderConfig(**provider) for provider in providers]

# Workflow Execution
@api_router.post("/workflows/{workflow_id}/execute", response_model=ExecutionResult)
async def execute_workflow(workflow_id: str, inputs: Dict[str, Any] = Body({})):
    workflow = await db.workflows.find_one({"id": workflow_id})
    if not workflow:
        raise HTTPException(status_code=404, detail="Workflow not found")
    
    # Mock implementation - in a real app, this would run the workflow
    # For now, just return a success message with the inputs
    return ExecutionResult(
        status="success",
        data={
            "message": "Workflow execution simulated",
            "workflow_id": workflow_id,
            "inputs": inputs,
            "result": "This is a simulated result to demonstrate the API. In a real implementation, this would return actual execution results."
        }
    )

# Include the router in the main app
app.include_router(api_router)

# CORS configuration
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

@app.on_event("shutdown")
async def shutdown_db_client():
    client.close()
