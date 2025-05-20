import React, { useState, useEffect } from 'react';
import { BrowserRouter, Routes, Route } from 'react-router-dom';
import axios from 'axios';
import './App.css';
import ReactFlow, {
  Controls,
  Background,
  useNodesState,
  useEdgesState,
  addEdge,
} from 'react-flow-renderer';
import { PlusIcon, Cog6ToothIcon, TrashIcon, ArrowPathIcon, DocumentDuplicateIcon, PlayIcon } from '@heroicons/react/24/outline';

// API Configuration
const BACKEND_URL = process.env.REACT_APP_BACKEND_URL;
const API = `${BACKEND_URL}/api`;

// Custom Panel Component
const Panel = ({ position, className, children }) => {
  const positionClass = {
    'top-left': 'top-4 left-4',
    'top-center': 'top-4 left-1/2 transform -translate-x-1/2',
    'top-right': 'top-4 right-4',
    'bottom-left': 'bottom-4 left-4',
    'bottom-center': 'bottom-4 left-1/2 transform -translate-x-1/2',
    'bottom-right': 'bottom-4 right-4',
  }[position] || 'top-4 left-4';

  return (
    <div className={`absolute z-10 ${positionClass} ${className}`}>
      {children}
    </div>
  );
};

// Custom Node Types
const moduleTypeColors = {
  'Input': 'bg-blue-500',
  'AI Model': 'bg-purple-500',
  'Output': 'bg-green-500',
  'Logic': 'bg-yellow-500',
};

// Custom Node Component
const CustomNode = ({ data, id }) => {
  const nodeTypeColor = moduleTypeColors[data.category] || 'bg-gray-500';
  
  return (
    <div className="px-4 py-2 shadow-md rounded-md border-2 border-stone-400 bg-white">
      <div className={`flex justify-between items-center ${nodeTypeColor} text-white p-2 rounded-t-sm -mx-4 -my-2 mb-2`}>
        <div className="font-bold">{data.label}</div>
        <div className="text-xs">{data.type}</div>
      </div>
      <div className="text-sm mt-2">
        {data.description && (
          <div className="mt-2 text-gray-700 text-xs">{data.description}</div>
        )}
      </div>
    </div>
  );
};

// Main App
function App() {
  // State
  const [nodes, setNodes, onNodesChange] = useNodesState([]);
  const [edges, setEdges, onEdgesChange] = useEdgesState([]);
  const [moduleTypes, setModuleTypes] = useState([]);
  const [workflows, setWorkflows] = useState([]);
  const [selectedWorkflow, setSelectedWorkflow] = useState(null);
  const [workflowName, setWorkflowName] = useState('');
  const [workflowDescription, setWorkflowDescription] = useState('');
  const [showModulePanel, setShowModulePanel] = useState(false);
  const [selectedNode, setSelectedNode] = useState(null);
  const [nodeConfig, setNodeConfig] = useState({});
  const [showConfigPanel, setShowConfigPanel] = useState(false);
  const [showAdminPanel, setShowAdminPanel] = useState(false);
  const [apiKeys, setApiKeys] = useState({
    openai: '',
    anthropic: ''
  });
  
  // Save API keys
  const saveApiKeys = async () => {
    try {
      // Save OpenAI key
      if (apiKeys.openai) {
        await axios.post(`${API}/ai-providers`, {
          id: 'openai-key',
          name: 'OpenAI',
          api_key: apiKeys.openai,
          user_id: 'admin'
        });
      }
      
      // Save Anthropic key
      if (apiKeys.anthropic) {
        await axios.post(`${API}/ai-providers`, {
          id: 'anthropic-key',
          name: 'Anthropic',
          api_key: apiKeys.anthropic,
          user_id: 'admin'
        });
      }
      
      alert('API keys saved successfully!');
      setShowAdminPanel(false);
    } catch (error) {
      console.error('Error saving API keys:', error);
      alert('Error saving API keys. Please try again.');
    }
  };
  
  // Load API keys
  const loadApiKeys = async () => {
    try {
      const response = await axios.get(`${API}/ai-providers?user_id=admin`);
      const providers = response.data;
      
      const newApiKeys = { ...apiKeys };
      
      providers.forEach(provider => {
        if (provider.name === 'OpenAI') {
          newApiKeys.openai = provider.api_key;
        } else if (provider.name === 'Anthropic') {
          newApiKeys.anthropic = provider.api_key;
        }
      });
      
      setApiKeys(newApiKeys);
    } catch (error) {
      console.error('Error loading API keys:', error);
    }
  };
  
  // Load module types and workflows
  useEffect(() => {
    const fetchModuleTypes = async () => {
      try {
        const response = await axios.get(`${API}/module-types`);
        setModuleTypes(response.data);
      } catch (error) {
        console.error('Error fetching module types:', error);
      }
    };
    
    const fetchWorkflows = async () => {
      try {
        const response = await axios.get(`${API}/workflows`);
        setWorkflows(response.data);
      } catch (error) {
        console.error('Error fetching workflows:', error);
      }
    };
    
    fetchModuleTypes();
    fetchWorkflows();
    loadApiKeys(); // Load API keys
  }, []);
  
  // Handle workflow selection
  const loadWorkflow = async (id) => {
    try {
      const response = await axios.get(`${API}/workflows/${id}`);
      const workflow = response.data;
      
      setSelectedWorkflow(workflow);
      setWorkflowName(workflow.name);
      setWorkflowDescription(workflow.description || '');
      
      // Convert workflow modules to nodes
      const workflowNodes = workflow.modules.map(module => ({
        id: module.id,
        position: module.position,
        type: 'custom',
        data: {
          label: module.name,
          type: module.type,
          category: moduleTypes.find(type => type.id === module.type)?.category || 'Unknown',
          config: module.config,
        },
      }));
      
      // Convert workflow connections to edges
      const workflowEdges = workflow.connections.map(connection => ({
        id: connection.id,
        source: connection.source,
        target: connection.target,
        sourceHandle: connection.source_handle,
        targetHandle: connection.target_handle,
      }));
      
      setNodes(workflowNodes);
      setEdges(workflowEdges);
    } catch (error) {
      console.error('Error loading workflow:', error);
    }
  };
  
  // Save workflow
  const saveWorkflow = async () => {
    try {
      // Convert nodes to workflow modules
      const modules = nodes.map(node => ({
        id: node.id,
        type: node.data.type,
        name: node.data.label,
        config: node.data.config || {},
        position: node.position,
      }));
      
      // Convert edges to workflow connections
      const connections = edges.map(edge => ({
        id: edge.id,
        source: edge.source,
        target: edge.target,
        source_handle: edge.sourceHandle,
        target_handle: edge.targetHandle,
      }));
      
      const workflowData = {
        name: workflowName,
        description: workflowDescription,
        modules,
        connections,
      };
      
      let response;
      
      if (selectedWorkflow) {
        // Update existing workflow
        response = await axios.put(`${API}/workflows/${selectedWorkflow.id}`, workflowData);
      } else {
        // Create new workflow
        response = await axios.post(`${API}/workflows`, workflowData);
        setSelectedWorkflow(response.data);
      }
      
      // Refresh workflow list
      const updatedWorkflows = await axios.get(`${API}/workflows`);
      setWorkflows(updatedWorkflows.data);
      
      alert('Workflow saved successfully!');
    } catch (error) {
      console.error('Error saving workflow:', error);
      alert('Error saving workflow. Please try again.');
    }
  };
  
  // Clone workflow
  const cloneWorkflow = async () => {
    if (!selectedWorkflow) return;
    
    const newName = prompt('Enter a name for the cloned workflow:', `${workflowName} (Clone)`);
    if (!newName) return;
    
    try {
      const response = await axios.post(`${API}/workflows/${selectedWorkflow.id}/clone`, { name: newName });
      
      // Refresh workflow list
      const updatedWorkflows = await axios.get(`${API}/workflows`);
      setWorkflows(updatedWorkflows.data);
      
      // Load the cloned workflow
      loadWorkflow(response.data.id);
      
      alert('Workflow cloned successfully!');
    } catch (error) {
      console.error('Error cloning workflow:', error);
      alert('Error cloning workflow. Please try again.');
    }
  };
  
  // Delete workflow
  const deleteWorkflow = async () => {
    if (!selectedWorkflow) return;
    
    if (!window.confirm(`Are you sure you want to delete "${workflowName}"?`)) return;
    
    try {
      await axios.delete(`${API}/workflows/${selectedWorkflow.id}`);
      
      // Reset current workflow
      setSelectedWorkflow(null);
      setWorkflowName('');
      setWorkflowDescription('');
      setNodes([]);
      setEdges([]);
      
      // Refresh workflow list
      const updatedWorkflows = await axios.get(`${API}/workflows`);
      setWorkflows(updatedWorkflows.data);
      
      alert('Workflow deleted successfully!');
    } catch (error) {
      console.error('Error deleting workflow:', error);
      alert('Error deleting workflow. Please try again.');
    }
  };
  
  // Execute workflow
  const executeWorkflow = async () => {
    if (!selectedWorkflow) return;
    
    try {
      const inputs = {}; // Collect inputs from input nodes
      
      const response = await axios.post(`${API}/workflows/${selectedWorkflow.id}/execute`, inputs);
      
      alert(`Workflow execution result: ${JSON.stringify(response.data.data)}`);
    } catch (error) {
      console.error('Error executing workflow:', error);
      alert('Error executing workflow. Please try again.');
    }
  };
  
  // Handle node selection
  const onNodeClick = (event, node) => {
    setSelectedNode(node);
    setNodeConfig(node.data.config || {});
    setShowConfigPanel(true);
  };
  
  // Add module to canvas
  const addModule = (moduleType) => {
    const newNode = {
      id: `node-${Math.random().toString(36).substr(2, 9)}`,
      type: 'custom',
      position: { x: 100, y: 100 },
      data: {
        label: moduleType.name,
        type: moduleType.id,
        category: moduleType.category,
        description: moduleType.description,
        config: {},
      },
    };
    
    setNodes(nodes => [...nodes, newNode]);
    setShowModulePanel(false);
  };
  
  // Handle config changes
  const updateNodeConfig = () => {
    if (!selectedNode) return;
    
    setNodes(nodes.map(node => {
      if (node.id === selectedNode.id) {
        return {
          ...node,
          data: {
            ...node.data,
            config: nodeConfig,
          },
        };
      }
      return node;
    }));
    
    setShowConfigPanel(false);
  };
  
  // Handle new connections
  const onConnect = (params) => {
    setEdges(edges => addEdge({ ...params, id: `edge-${Math.random().toString(36).substr(2, 9)}` }, edges));
  };
  
  // Create a new workflow
  const createNewWorkflow = () => {
    setSelectedWorkflow(null);
    setWorkflowName('New Workflow');
    setWorkflowDescription('');
    setNodes([]);
    setEdges([]);
  };
  
  // Node Types
  const nodeTypes = {
    custom: CustomNode,
  };
  
  // UI for workflow builder
  return (
    <div className="App bg-gray-100 min-h-screen">
      <div className="flex h-screen">
        {/* Sidebar */}
        <div className="w-64 bg-gray-800 text-white p-4 flex flex-col">
          <h1 className="text-xl font-bold mb-6">AI Workflow Builder</h1>
          
          <div className="mb-4">
            <button
              className="w-full bg-indigo-600 px-4 py-2 rounded hover:bg-indigo-700 flex items-center justify-center"
              onClick={createNewWorkflow}
            >
              <PlusIcon className="h-5 w-5 mr-2" />
              New Workflow
            </button>
          </div>
          
          <h2 className="font-semibold mb-2 text-gray-400">My Workflows</h2>
          <div className="overflow-y-auto flex-grow mb-4">
            <ul>
              {workflows.map(workflow => (
                <li
                  key={workflow.id}
                  className={`p-2 hover:bg-gray-700 cursor-pointer rounded ${
                    selectedWorkflow?.id === workflow.id ? 'bg-gray-700' : ''
                  }`}
                  onClick={() => loadWorkflow(workflow.id)}
                >
                  {workflow.name}
                </li>
              ))}
            </ul>
          </div>
          
          <div className="mt-auto">
            <button
              onClick={() => setShowAdminPanel(true)}
              className="text-gray-400 hover:text-white text-sm flex items-center mb-2"
            >
              <Cog6ToothIcon className="h-5 w-5 mr-2" />
              Settings
            </button>
            <a
              href="https://github.com"
              target="_blank"
              rel="noopener noreferrer"
              className="text-gray-400 hover:text-white text-sm flex items-center"
            >
              Documentation
            </a>
          </div>
        </div>
        
        {/* Main Content */}
        <div className="flex-grow flex flex-col">
          {/* Toolbar */}
          <div className="bg-white shadow-sm p-4 flex justify-between items-center">
            <div className="flex items-center">
              <input
                type="text"
                value={workflowName}
                onChange={(e) => setWorkflowName(e.target.value)}
                placeholder="Workflow Name"
                className="border-gray-300 rounded-md shadow-sm focus:border-indigo-500 focus:ring focus:ring-indigo-200 focus:ring-opacity-50 mr-4"
              />
              <input
                type="text"
                value={workflowDescription}
                onChange={(e) => setWorkflowDescription(e.target.value)}
                placeholder="Description (optional)"
                className="border-gray-300 rounded-md shadow-sm focus:border-indigo-500 focus:ring focus:ring-indigo-200 focus:ring-opacity-50 w-64"
              />
            </div>
            
            <div className="flex items-center space-x-2">
              <button
                className="bg-blue-500 text-white p-2 rounded hover:bg-blue-600"
                onClick={() => setShowModulePanel(true)}
                title="Add Module"
              >
                <PlusIcon className="h-5 w-5" />
              </button>
              <button
                className="bg-green-500 text-white p-2 rounded hover:bg-green-600"
                onClick={saveWorkflow}
                title="Save Workflow"
              >
                <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                </svg>
              </button>
              <button
                className="bg-purple-500 text-white p-2 rounded hover:bg-purple-600"
                onClick={cloneWorkflow}
                disabled={!selectedWorkflow}
                title="Clone Workflow"
              >
                <DocumentDuplicateIcon className="h-5 w-5" />
              </button>
              <button
                className="bg-red-500 text-white p-2 rounded hover:bg-red-600"
                onClick={deleteWorkflow}
                disabled={!selectedWorkflow}
                title="Delete Workflow"
              >
                <TrashIcon className="h-5 w-5" />
              </button>
              <button
                className="bg-amber-500 text-white p-2 rounded hover:bg-amber-600"
                onClick={executeWorkflow}
                disabled={!selectedWorkflow}
                title="Execute Workflow"
              >
                <PlayIcon className="h-5 w-5" />
              </button>
            </div>
          </div>
          
          {/* Flow Editor */}
          <div className="flex-grow">
            <ReactFlow
              nodes={nodes}
              edges={edges}
              onNodesChange={onNodesChange}
              onEdgesChange={onEdgesChange}
              onConnect={onConnect}
              onNodeClick={onNodeClick}
              nodeTypes={nodeTypes}
              fitView
            >
              <Controls />
              <Background color="#aaa" gap={16} />
              
              {/* Module Selection Panel */}
              {showModulePanel && (
                <Panel position="top-center" className="bg-white rounded-md shadow-md p-4 max-h-[70vh] overflow-y-auto">
                  <div className="flex justify-between items-center mb-4">
                    <h3 className="font-bold text-lg">Add Module</h3>
                    <button
                      className="text-gray-500 hover:text-gray-700"
                      onClick={() => setShowModulePanel(false)}
                    >
                      ✕
                    </button>
                  </div>
                  
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {Object.entries(
                      moduleTypes.reduce((acc, type) => {
                        if (!acc[type.category]) acc[type.category] = [];
                        acc[type.category].push(type);
                        return acc;
                      }, {})
                    ).map(([category, types]) => (
                      <div key={category} className="mb-4">
                        <h4 className="font-semibold mb-2">{category}</h4>
                        <div className="space-y-2">
                          {types.map(type => (
                            <div
                              key={type.id}
                              className="p-2 border rounded cursor-pointer hover:bg-gray-100"
                              onClick={() => addModule(type)}
                            >
                              <div className="font-medium">{type.name}</div>
                              <div className="text-xs text-gray-500">{type.description}</div>
                            </div>
                          ))}
                        </div>
                      </div>
                    ))}
                  </div>
                </Panel>
              )}
              
              {/* Node Configuration Panel */}
              {showConfigPanel && selectedNode && (
                <Panel position="top-right" className="bg-white rounded-md shadow-md p-4 w-80">
                  <div className="flex justify-between items-center mb-4">
                    <h3 className="font-bold text-lg">Configure {selectedNode.data.label}</h3>
                    <button
                      className="text-gray-500 hover:text-gray-700"
                      onClick={() => setShowConfigPanel(false)}
                    >
                      ✕
                    </button>
                  </div>
                  
                  <div className="space-y-4">
                    {/* Display config options based on node type */}
                    {moduleTypes.find(type => type.id === selectedNode.data.type)?.config_schema &&
                      Object.entries(moduleTypes.find(type => type.id === selectedNode.data.type).config_schema).map(([key, schema]) => (
                        <div key={key} className="mb-2">
                          <label className="block text-gray-700 text-sm font-bold mb-1">
                            {key.charAt(0).toUpperCase() + key.slice(1)}
                          </label>
                          {schema.type === 'string' && !schema.enum && (
                            <input
                              type="text"
                              value={nodeConfig[key] || schema.default || ''}
                              onChange={(e) => setNodeConfig({ ...nodeConfig, [key]: e.target.value })}
                              className="border-gray-300 rounded-md shadow-sm focus:border-indigo-500 focus:ring focus:ring-indigo-200 focus:ring-opacity-50 w-full"
                            />
                          )}
                          {schema.type === 'string' && schema.enum && (
                            <select
                              value={nodeConfig[key] || schema.default || ''}
                              onChange={(e) => setNodeConfig({ ...nodeConfig, [key]: e.target.value })}
                              className="border-gray-300 rounded-md shadow-sm focus:border-indigo-500 focus:ring focus:ring-indigo-200 focus:ring-opacity-50 w-full"
                            >
                              {schema.enum.map(option => (
                                <option key={option} value={option}>{option}</option>
                              ))}
                            </select>
                          )}
                          {schema.type === 'number' && (
                            <input
                              type="number"
                              value={nodeConfig[key] || schema.default || 0}
                              min={schema.min}
                              max={schema.max}
                              step={0.1}
                              onChange={(e) => setNodeConfig({ ...nodeConfig, [key]: parseFloat(e.target.value) })}
                              className="border-gray-300 rounded-md shadow-sm focus:border-indigo-500 focus:ring focus:ring-indigo-200 focus:ring-opacity-50 w-full"
                            />
                          )}
                          {schema.type === 'boolean' && (
                            <input
                              type="checkbox"
                              checked={nodeConfig[key] || schema.default || false}
                              onChange={(e) => setNodeConfig({ ...nodeConfig, [key]: e.target.checked })}
                              className="rounded text-indigo-600 shadow-sm focus:border-indigo-500 focus:ring focus:ring-indigo-200 focus:ring-opacity-50"
                            />
                          )}
                        </div>
                      ))}
                    
                    <div className="flex justify-end pt-2">
                      <button
                        className="bg-indigo-500 text-white px-4 py-2 rounded hover:bg-indigo-600"
                        onClick={updateNodeConfig}
                      >
                        Apply
                      </button>
                    </div>
                  </div>
                </Panel>
              )}
            </ReactFlow>
          </div>
        </div>
      </div>
    </div>
  );
}

export default App;
