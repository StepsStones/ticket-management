import pytest
import asyncio
from httpx import AsyncClient, ASGITransport
from app.main import app

@pytest.mark.asyncio
async def test_health_check():
    async with AsyncClient(transport=ASGITransport(app=app), base_url="http://test") as client:
        response = await client.get("/health")
        assert response.status_code == 200
        data = response.json()
        assert data["company"] == "StepsStone Promoters Pvt. Ltd."

@pytest.mark.asyncio
async def test_login_success():
    async with AsyncClient(transport=ASGITransport(app=app), base_url="http://test") as client:
        response = await client.post("/api/v1/auth/login", json={
            "username_or_email": "admin@stepsstone.com",
            "password": "admin123"
        })
        assert response.status_code == 200
        data = response.json()
        assert "access_token" in data
        assert "refresh_token" in data
        assert data["user"]["email"] == "admin@stepsstone.com"
        assert data["user"]["role"] == "SUPER_ADMIN"

@pytest.mark.asyncio
async def test_login_invalid_password():
    async with AsyncClient(transport=ASGITransport(app=app), base_url="http://test") as client:
        response = await client.post("/api/v1/auth/login", json={
            "username_or_email": "admin@stepsstone.com",
            "password": "wrongpassword"
        })
        assert response.status_code == 401

@pytest.mark.asyncio
async def test_list_projects_and_dashboard():
    async with AsyncClient(transport=ASGITransport(app=app), base_url="http://test") as client:
        # 1. Login
        login_res = await client.post("/api/v1/auth/login", json={
            "username_or_email": "admin@stepsstone.com",
            "password": "admin123"
        })
        token = login_res.json()["access_token"]
        headers = {"Authorization": f"Bearer {token}"}
        
        # 2. Get projects
        proj_res = await client.get("/api/v1/projects/", headers=headers)
        assert proj_res.status_code == 200
        projects = proj_res.json()
        assert len(projects) >= 5
        
        # 3. Get dashboard stats
        dash_res = await client.get("/api/v1/reports/dashboard", headers=headers)
        assert dash_res.status_code == 200
        dash_data = dash_res.json()
        assert "stats" in dash_data
        assert dash_data["stats"]["total_tickets"] >= 5
        assert len(dash_data["charts"]["by_project"]) > 0

@pytest.mark.asyncio
async def test_ticket_timeline_and_assign():
    async with AsyncClient(transport=ASGITransport(app=app), base_url="http://test") as client:
        login_res = await client.post("/api/v1/auth/login", json={
            "username_or_email": "admin@stepsstone.com",
            "password": "admin123"
        })
        token = login_res.json()["access_token"]
        headers = {"Authorization": f"Bearer {token}"}
        
        # List tickets
        tickets_res = await client.get("/api/v1/tickets/?view=all", headers=headers)
        assert tickets_res.status_code == 200
        tickets = tickets_res.json()
        assert len(tickets) > 0
        first_ticket = tickets[0]
        
        # Get details
        detail_res = await client.get(f"/api/v1/tickets/{first_ticket['id']}", headers=headers)
        assert detail_res.status_code == 200
        detail = detail_res.json()
        assert "timeline" in detail
        assert len(detail["timeline"]) > 0

@pytest.mark.asyncio
async def test_ticket_edit_and_audit_log():
    async with AsyncClient(transport=ASGITransport(app=app), base_url="http://test") as client:
        login_res = await client.post("/api/v1/auth/login", json={
            "username_or_email": "admin@stepsstone.com",
            "password": "admin123"
        })
        token = login_res.json()["access_token"]
        headers = {"Authorization": f"Bearer {token}"}
        
        # 1. Fetch first ticket
        tickets_res = await client.get("/api/v1/tickets/?view=all", headers=headers)
        first_ticket = tickets_res.json()[0]
        ticket_id = first_ticket["id"]
        
        # 2. Patch ticket
        edit_payload = {
            "customer_name": "Karthik Raja (Updated)",
            "subject": "Patta Name Correction Needed (Urgent Edit)",
            "priority": "HIGH"
        }
        patch_res = await client.patch(f"/api/v1/tickets/{ticket_id}", json=edit_payload, headers=headers)
        assert patch_res.status_code == 200
        updated_data = patch_res.json()
        assert updated_data["customer_name"] == "Karthik Raja (Updated)"
        assert updated_data["subject"] == "Patta Name Correction Needed (Urgent Edit)"
        assert updated_data["priority"] == "HIGH"
        
        # 3. Check timeline contains "Ticket Details Edited"
        timeline_titles = [t["title"] for t in updated_data["timeline"]]
        assert "Ticket Details Edited" in timeline_titles
        
        # 4. Check audit logs contain TICKET_EDITED
        audit_res = await client.get("/api/v1/audit-logs/?action=TICKET_EDITED", headers=headers)
        assert audit_res.status_code == 200
        logs = audit_res.json()
        assert len(logs) > 0
        latest_log = logs[0]
        assert latest_log["action"] == "TICKET_EDITED"
        assert latest_log["user_name"] == "StepsStone Super Administrator"
        assert latest_log["entity_id"] == first_ticket["ticket_number"]
        assert "Karthik Raja (Updated)" in latest_log["new_value"]

@pytest.mark.asyncio
async def test_export_csv_authenticated():
    async with AsyncClient(transport=ASGITransport(app=app), base_url="http://test") as client:
        # 1. Without token -> 401
        res_no_auth = await client.get("/api/v1/reports/export-csv")
        assert res_no_auth.status_code == 401
        
        # 2. Login
        login_res = await client.post("/api/v1/auth/login", json={
            "username_or_email": "admin@stepsstone.com",
            "password": "admin123"
        })
        token = login_res.json()["access_token"]
        
        # 3. With Authorization header -> 200 and CSV content
        res_header = await client.get("/api/v1/reports/export-csv", headers={"Authorization": f"Bearer {token}"})
        assert res_header.status_code == 200
        assert "Ticket ID,Customer Name" in res_header.text
        assert "text/csv" in res_header.headers["content-type"]
        
        # 4. With ?token= query parameter -> 200 and CSV content
        res_query = await client.get(f"/api/v1/reports/export-csv?token={token}")
        assert res_query.status_code == 200
        assert "Ticket ID,Customer Name" in res_query.text

@pytest.mark.asyncio
async def test_create_ticket_with_optional_assignee():
    async with AsyncClient(transport=ASGITransport(app=app), base_url="http://test") as client:
        login_res = await client.post("/api/v1/auth/login", json={
            "username_or_email": "admin@stepsstone.com",
            "password": "admin123"
        })
        token = login_res.json()["access_token"]
        headers = {"Authorization": f"Bearer {token}"}
        
        # 1. Get an active user to assign
        users_res = await client.get("/api/v1/users/?is_active=true", headers=headers)
        active_users = users_res.json()
        target_employee = active_users[0]
        
        # 2. Create ticket with assigned_to_id
        create_res = await client.post("/api/v1/tickets/", json={
            "customer_name": "Ramanathan Chettiar",
            "customer_mobile": "9841099887",
            "category": "Patta / Chitta / EC Issues",
            "subject": "Patta Name Transfer Verification",
            "description": "Customer requested verified patta copy with sub-registrar seal.",
            "priority": "HIGH",
            "assigned_to_id": target_employee["id"]
        }, headers=headers)
        
        assert create_res.status_code == 200
        data = create_res.json()
        assert data["assigned_to_id"] == target_employee["id"]
        assert data["status"] == "ASSIGNED"
        
        # Check timeline has assigned entry
        timeline_titles = [t["title"] for t in data["timeline"]]
        assert "Ticket Assigned" in timeline_titles


