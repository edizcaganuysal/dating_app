import uuid

import pytest
import pytest_asyncio
from httpx import AsyncClient
from sqlalchemy.ext.asyncio import AsyncSession
from starlette.testclient import TestClient

from app.database import get_db
from app.main import app
from app.models.chat import ChatMessage, ChatParticipant, ChatRoom
from app.services.auth_service import create_access_token, decode_access_token
from tests.conftest import create_verified_user, test_async_session


# --- Helpers ---

async def _setup_room_and_users(client: AsyncClient, db: AsyncSession, room_type: str = "direct"):
    """Create two verified users and a chat room with both as participants."""
    token1, user1 = await create_verified_user(client, suffix="chatA")
    token2, user2 = await create_verified_user(client, suffix="chatB")

    uid1 = uuid.UUID(decode_access_token(token1)["sub"])
    uid2 = uuid.UUID(decode_access_token(token2)["sub"])

    room = ChatRoom(room_type=room_type)
    db.add(room)
    await db.flush()

    db.add(ChatParticipant(room_id=room.id, user_id=uid1))
    db.add(ChatParticipant(room_id=room.id, user_id=uid2))
    await db.commit()
    await db.refresh(room)

    return token1, token2, uid1, uid2, room


def _ws_test_client():
    """Create a sync TestClient with its own DB session factory for WebSocket tests."""
    async def ws_get_db():
        async with test_async_session() as session:
            yield session

    app.dependency_overrides[get_db] = ws_get_db
    return TestClient(app)


# --- WebSocket Tests ---

@pytest.mark.asyncio(loop_scope="session")
async def test_ws_connect_authenticated(client: AsyncClient, db_session: AsyncSession):
    token1, token2, uid1, uid2, room = await _setup_room_and_users(client, db_session)

    sync_client = _ws_test_client()
    try:
        with sync_client.websocket_connect(f"/api/ws/chat/{room.id}?token={token1}") as ws:
            # Connection successful — send a message to verify it works
            ws.send_json({"type": "message", "content": "hello"})
            data = ws.receive_json()
            assert data["type"] == "message"
    finally:
        # Restore the override for async tests
        async def override_get_db():
            yield db_session
        app.dependency_overrides[get_db] = override_get_db


@pytest.mark.asyncio(loop_scope="session")
async def test_ws_connect_no_token(client: AsyncClient, db_session: AsyncSession):
    token1, token2, uid1, uid2, room = await _setup_room_and_users(client, db_session)

    sync_client = _ws_test_client()
    try:
        with pytest.raises(Exception):
            with sync_client.websocket_connect(f"/api/ws/chat/{room.id}") as ws:
                ws.receive_json()
    finally:
        async def override_get_db():
            yield db_session
        app.dependency_overrides[get_db] = override_get_db


@pytest.mark.asyncio(loop_scope="session")
async def test_ws_connect_non_member(client: AsyncClient, db_session: AsyncSession):
    token1, token2, uid1, uid2, room = await _setup_room_and_users(client, db_session)
    token3, _ = await create_verified_user(client, suffix="chatC")

    sync_client = _ws_test_client()
    try:
        with pytest.raises(Exception):
            with sync_client.websocket_connect(f"/api/ws/chat/{room.id}?token={token3}") as ws:
                ws.receive_json()
    finally:
        async def override_get_db():
            yield db_session
        app.dependency_overrides[get_db] = override_get_db


@pytest.mark.asyncio(loop_scope="session")
async def test_ws_send_receive_message(client: AsyncClient, db_session: AsyncSession):
    token1, token2, uid1, uid2, room = await _setup_room_and_users(client, db_session)

    sync_client = _ws_test_client()
    try:
        with sync_client.websocket_connect(f"/api/ws/chat/{room.id}?token={token1}") as ws1:
            with sync_client.websocket_connect(f"/api/ws/chat/{room.id}?token={token2}") as ws2:
                ws1.send_json({"type": "message", "content": "Hello from user 1!"})

                # Both users receive the broadcast
                msg1 = ws1.receive_json()
                msg2 = ws2.receive_json()

                assert msg1["type"] == "message"
                assert msg1["content"] == "Hello from user 1!"
                assert msg1["sender_id"] == str(uid1)

                assert msg2["type"] == "message"
                assert msg2["content"] == "Hello from user 1!"
                assert msg2["sender_id"] == str(uid1)
    finally:
        async def override_get_db():
            yield db_session
        app.dependency_overrides[get_db] = override_get_db


@pytest.mark.asyncio(loop_scope="session")
async def test_message_persisted(client: AsyncClient, db_session: AsyncSession):
    token1, token2, uid1, uid2, room = await _setup_room_and_users(client, db_session)

    sync_client = _ws_test_client()
    try:
        with sync_client.websocket_connect(f"/api/ws/chat/{room.id}?token={token1}") as ws:
            ws.send_json({"type": "message", "content": "Persisted message"})
            received = ws.receive_json()
            assert received["content"] == "Persisted message"
    finally:
        async def override_get_db():
            yield db_session
        app.dependency_overrides[get_db] = override_get_db

    # Fetch via REST — the REST endpoint uses the async db_session override
    resp = await client.get(
        f"/api/chat/rooms/{room.id}/messages",
        headers={"Authorization": f"Bearer {token1}"},
    )
    assert resp.status_code == 200
    messages = resp.json()
    assert len(messages) >= 1
    assert any(m["content"] == "Persisted message" for m in messages)


# --- REST Tests ---

@pytest.mark.asyncio(loop_scope="session")
async def test_list_chat_rooms(client: AsyncClient, db_session: AsyncSession):
    token1, _ = await create_verified_user(client, suffix="roomListA")
    token2, _ = await create_verified_user(client, suffix="roomListB")
    token3, _ = await create_verified_user(client, suffix="roomListC")

    uid1 = uuid.UUID(decode_access_token(token1)["sub"])
    uid2 = uuid.UUID(decode_access_token(token2)["sub"])
    uid3 = uuid.UUID(decode_access_token(token3)["sub"])

    # Create a direct room (user1 + user2)
    room1 = ChatRoom(room_type="direct")
    db_session.add(room1)
    await db_session.flush()
    db_session.add(ChatParticipant(room_id=room1.id, user_id=uid1))
    db_session.add(ChatParticipant(room_id=room1.id, user_id=uid2))

    # Create a group room (user1 + user2 + user3)
    room2 = ChatRoom(room_type="group")
    db_session.add(room2)
    await db_session.flush()
    db_session.add(ChatParticipant(room_id=room2.id, user_id=uid1))
    db_session.add(ChatParticipant(room_id=room2.id, user_id=uid2))
    db_session.add(ChatParticipant(room_id=room2.id, user_id=uid3))

    await db_session.commit()

    resp = await client.get(
        "/api/chat/rooms",
        headers={"Authorization": f"Bearer {token1}"},
    )
    assert resp.status_code == 200
    rooms = resp.json()
    room_ids = {r["id"] for r in rooms}
    assert str(room1.id) in room_ids
    assert str(room2.id) in room_ids

    room_types = {r["id"]: r["room_type"] for r in rooms}
    assert room_types[str(room1.id)] == "direct"
    assert room_types[str(room2.id)] == "group"


@pytest.mark.asyncio(loop_scope="session")
async def test_message_pagination(client: AsyncClient, db_session: AsyncSession):
    token1, token2, uid1, uid2, room = await _setup_room_and_users(client, db_session, room_type="direct")

    # Insert 60 messages directly into DB
    for i in range(60):
        db_session.add(ChatMessage(
            room_id=room.id,
            sender_id=uid1,
            content=f"Message {i}",
        ))
    await db_session.commit()

    # Fetch first page (default limit=50)
    resp = await client.get(
        f"/api/chat/rooms/{room.id}/messages",
        headers={"Authorization": f"Bearer {token1}"},
    )
    assert resp.status_code == 200
    page1 = resp.json()
    assert len(page1) == 50

    # Messages are in reverse chronological order, so last item is the oldest on this page
    oldest_on_page = page1[-1]

    # Fetch second page using cursor
    resp2 = await client.get(
        f"/api/chat/rooms/{room.id}/messages?before={oldest_on_page['id']}",
        headers={"Authorization": f"Bearer {token1}"},
    )
    assert resp2.status_code == 200
    page2 = resp2.json()
    assert len(page2) == 10

    # Ensure no overlap
    page1_ids = {m["id"] for m in page1}
    page2_ids = {m["id"] for m in page2}
    assert page1_ids.isdisjoint(page2_ids)
