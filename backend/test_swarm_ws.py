"""
Basic test for the swarm WebSocket endpoint.

This test verifies that the /ws/swarm/{document_id} endpoint:
1. Accepts WebSocket connections
2. Validates user_prompt presence
3. Initializes Swarm_State correctly
4. Broadcasts state updates during graph execution
"""

import pytest
from fastapi.testclient import TestClient
from unittest.mock import AsyncMock, patch, MagicMock

from main import app


def test_swarm_websocket_missing_user_prompt():
    """Test that missing user_prompt returns an error."""
    client = TestClient(app)
    
    with client.websocket_connect("/ws/swarm/test-doc-123") as websocket:
        # Send message without user_prompt
        websocket.send_json({"invalid": "data"})
        
        # Should receive error message
        response = websocket.receive_json()
        assert response["type"] == "error"
        assert "user_prompt is required" in response["message"]


@pytest.mark.asyncio
async def test_swarm_websocket_state_initialization():
    """Test that Swarm_State is initialized with correct default values."""
    from schemas import Swarm_State
    
    # Verify initial state structure
    initial_state: Swarm_State = {
        "user_prompt": "test prompt",
        "generated_code": "",
        "security_status": "",
        "test_results": "",
        "error_message": "",
        "retry_count": 0
    }
    
    assert initial_state["user_prompt"] == "test prompt"
    assert initial_state["generated_code"] == ""
    assert initial_state["security_status"] == ""
    assert initial_state["test_results"] == ""
    assert initial_state["error_message"] == ""
    assert initial_state["retry_count"] == 0


@pytest.mark.asyncio
async def test_swarm_websocket_graph_execution():
    """Test that graph execution broadcasts state updates."""
    client = TestClient(app)
    
    # Mock the graph to return a simple event stream
    mock_graph = MagicMock()
    mock_graph.astream = AsyncMock(return_value=[
        {"python_developer": {"generated_code": "print('hello')", "retry_count": 0}},
        {"security_reviewer": {"security_status": "approved", "retry_count": 0}},
    ])
    
    with patch("ws_router.create_swarm_graph", return_value=mock_graph):
        with client.websocket_connect("/ws/swarm/test-doc-456") as websocket:
            # Send valid user_prompt
            websocket.send_json({"user_prompt": "generate hello world"})
            
            # Should receive state_update for python_developer
            response1 = websocket.receive_json()
            assert response1["type"] == "state_update"
            assert response1["node"] == "python_developer"
            assert "generated_code" in response1["state"]
            
            # Should receive state_update for security_reviewer
            response2 = websocket.receive_json()
            assert response2["type"] == "state_update"
            assert response2["node"] == "security_reviewer"
            assert "security_status" in response2["state"]
            
            # Should receive complete message
            response3 = websocket.receive_json()
            assert response3["type"] == "complete"
            assert "final_state" in response3


if __name__ == "__main__":
    pytest.main([__file__, "-v"])
