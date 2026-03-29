"""
Conditional routing functions for the LangGraph autonomous agent swarm workflow.

These functions determine the next node to execute based on the current state,
implementing the business logic for security gates, retry limits, and success/failure paths.
"""

from langgraph.graph import END
from schemas import Swarm_State


def route_after_generation(state: Swarm_State) -> str:
    """
    Route after Python_Developer node completes.
    
    Routes to Security_Reviewer if code was generated successfully,
    otherwise terminates the workflow.
    
    Args:
        state: Current workflow state containing generated_code
        
    Returns:
        "security_reviewer" if generated_code is non-empty, else END
        
    Requirements: 3.1, 3.2, 3.3
    """
    if state["generated_code"]:
        return "security_reviewer"
    return END


def route_after_security(state: Swarm_State) -> str:
    """
    Route after Security_Reviewer node completes.
    
    Routes to Sandbox_Tester if code passed security review,
    otherwise terminates the workflow.
    
    Args:
        state: Current workflow state containing security_status
        
    Returns:
        "sandbox_tester" if security_status is "approved", else END
        
    Requirements: 5.1, 5.2, 5.3
    """
    if state["security_status"] == "approved":
        return "sandbox_tester"
    return END


def route_after_testing(state: Swarm_State) -> str:
    """
    Route after Sandbox_Tester node completes.
    
    Implements the retry loop logic with a maximum of 3 attempts:
    - If execution succeeded (exit_code 0): terminate with success
    - If execution failed AND retry_count < 3: loop back to Python_Developer
    - If execution failed AND retry_count >= 3: terminate with failure
    
    Args:
        state: Current workflow state containing test_results and retry_count
        
    Returns:
        END if successful or max retries reached,
        "python_developer" if retry is needed
        
    Requirements: 7.1, 7.2, 7.3, 7.4
    """
    # Success case: exit_code is 0
    if "Exit code: 0" in state["test_results"]:
        if state.get("spec_markdown", ""):
            return "spec_enforcer"
        return END
    
    # Retry case: failure with retries remaining
    if state["retry_count"] < 3:
        return "python_developer"
    
    # Max retries reached: terminate with failure
    return END


def route_after_spec_enforcer(state: Swarm_State) -> str:
    """Always terminate after spec enforcement."""
    return END
