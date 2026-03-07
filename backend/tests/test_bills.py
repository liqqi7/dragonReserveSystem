from datetime import datetime


def test_bills_require_auth(client) -> None:
    response = client.get("/api/v1/bills")

    assert response.status_code == 401


def test_create_list_update_delete_bill(
    client,
    sample_activity,
    normal_user,
    second_user,
    user_headers,
) -> None:
    create_response = client.post(
        "/api/v1/bills",
        headers=user_headers,
        json={
            "activity_id": sample_activity.id,
            "item": "场地费",
            "note": "首单",
            "total_amount": 120,
            "payer_user_id": normal_user.id,
            "participant_user_ids": [normal_user.id, second_user.id],
            "date": datetime.utcnow().date().isoformat(),
        },
    )
    assert create_response.status_code == 201
    bill = create_response.json()
    bill_id = bill["id"]
    assert bill["activity_name"] == sample_activity.name
    assert bill["per_share"] == 60.0

    list_response = client.get("/api/v1/bills", headers=user_headers)
    assert list_response.status_code == 200
    assert len(list_response.json()) == 1

    update_response = client.patch(
        f"/api/v1/bills/{bill_id}",
        headers=user_headers,
        json={
            "note": "改后的账单",
            "total_amount": 150,
            "participant_user_ids": [normal_user.id, second_user.id],
        },
    )
    assert update_response.status_code == 200
    assert update_response.json()["note"] == "改后的账单"
    assert update_response.json()["per_share"] == 75.0

    delete_response = client.delete(f"/api/v1/bills/{bill_id}", headers=user_headers)
    assert delete_response.status_code == 204

    final_list = client.get("/api/v1/bills", headers=user_headers)
    assert final_list.status_code == 200
    assert final_list.json() == []


def test_create_bill_with_missing_activity_returns_validation_error(
    client,
    normal_user,
    second_user,
    user_headers,
) -> None:
    response = client.post(
        "/api/v1/bills",
        headers=user_headers,
        json={
            "activity_id": 99999,
            "item": "无效账单",
            "total_amount": 50,
            "payer_user_id": normal_user.id,
            "participant_user_ids": [normal_user.id, second_user.id],
            "date": datetime.utcnow().date().isoformat(),
        },
    )

    assert response.status_code == 422
    assert response.json()["code"] == "VALIDATION_ERROR"
