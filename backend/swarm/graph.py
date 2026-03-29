"""
LangGraph workflow for the Autonomous Agent Swarm.

This module builds and compiles the stateful multi-agent workflow that
orchestrates Python_Developer, Security_Reviewer, and Sandbox_Tester nodes
with conditional routing logic for security gates, retry loops, and termination.
"""

from langgraph.graph import StateGraph, END

from schemas import Swarm_State
from swarm.nodes import (
    python_developer_node,
    security_reviewer_node,
    sandbox_tester_node,
    spec_enforcer_node,
)
from swarm.routing import (
    route_after_generation,
    route_after_security,
    route_after_testing,
    route_after_spec_enforcer,
)


def create_swarm_graph():
    """
    Build and compile the LangGraph workflow with conditional routing.
    
    The workflow implements a three-agent system:
    1. Python_Developer: Generates code from user prompt
    2. Security_Reviewer: Validates code safety using ai_analyzer
    3. Sandbox_Tester: Executes code in isolated Docker container
    
    Conditional routing logic:
    - After generation: route to security review if code exists
    - After security: route to testing if approved, else terminate
    - After testing: retry up to 3 times on failure, else terminate
    
    Returns:
        Compiled LangGraph workflow ready for execution via .astream()
        
    Requirements: 9.1, 9.2, 9.3, 9.4, 9.5
    """
    # Instantiate StateGraph with Swarm_State schema
    graph = StateGraph(Swarm_State)
    
    # Add nodes for each specialized agent
    graph.add_node("python_developer", python_developer_node)
    graph.add_node("security_reviewer", security_reviewer_node)
    graph.add_node("sandbox_tester", sandbox_tester_node)
    graph.add_node("spec_enforcer", spec_enforcer_node)
    
    # Set entry point to python_developer
    graph.set_entry_point("python_developer")
    
    # Conditional edge: Python_Developer -> Security_Reviewer or END
    graph.add_conditional_edges(
        "python_developer",
        route_after_generation,
        {
            "security_reviewer": "security_reviewer",
            END: END
        }
    )
    
    # Conditional edge: Security_Reviewer -> Sandbox_Tester or END
    graph.add_conditional_edges(
        "security_reviewer",
        route_after_security,
        {
            "sandbox_tester": "sandbox_tester",
            END: END
        }
    )
    
    # Conditional edge: Sandbox_Tester -> Python_Developer (retry), Spec_Enforcer, or END
    graph.add_conditional_edges(
        "sandbox_tester",
        route_after_testing,
        {
            "python_developer": "python_developer",
            "spec_enforcer": "spec_enforcer",
            END: END
        }
    )
    
    # Conditional edge: Spec_Enforcer -> END
    graph.add_conditional_edges(
        "spec_enforcer",
        route_after_spec_enforcer,
        {END: END}
    )
    
    # Compile and return the graph
    return graph.compile()
