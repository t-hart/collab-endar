
# Travel Planner API

## 1. Negotiate
**Route**: `/negotiate`

**Methods**: `GET`, `POST`, `OPTIONS`

**Description**: Establishes SignalR connection.

**Outputs**: `200 OK` with connection info.

## 2. Create Plan
**Route**: `/createPlan`

**Methods**: `POST`

**Description**: Creates a new travel plan.

**Input**:
  ```json
  { "planName": "string", "createdBy": "string" }
  ```

**Outputs**:
- `200 OK`: Returns plan details.
- `400 Bad Request`: Missing fields.
- `500 Internal Server Error`: Server issue.

## 3. Get Plan
**Route**: `/getPlan/{plan_id}`

**Methods**: `GET`

**Description**: Retrieves all data associated with a specific plan, including its dates and activities.

**Outputs**:
- `200 OK`: Retrieved plan information.
  ```json
  {
    "status": "success",
    "data": {
      "plan": {...},
      "dates": [
        {...}
      ],
      "activities": [
        {...}
      ]
    }
  }
- `404 Not Found`: Plan not found.
- `500 Internal Server Error`: Server issue.

## 4. Delete Plan
**Route**: `/deletePlan/{plan_id}`

**Methods**: `DELETE`

**Description**: Deletes a plan by `plan_id`.

**Outputs**:
- `200 OK`: Plan deleted.
- `404 Not Found`: Plan not found.
- `500 Internal Server Error`: Server issue.

## 5. Add Date
**Route**: `/addDate/{plan_id}`

**Methods**: `POST`

**Description**: Adds a date to a plan.

**Input**:
  ```json
  { "id": "string", "createdBy": "string" }
  ```

**Outputs**:  
- `200 OK`: Returns date details.
- `400 Bad Request`: Missing fields.
- `500 Internal Server Error`: Server issue.

## 6. Delete Date
**Route**: `/deleteDate/{plan_id}/{date_id}`

**Methods**: `DELETE`

**Description**: Deletes a date by `plan_id` and `date_id`.

**Outputs**:
- `200 OK`: Date deleted.
- `404 Not Found`: Date not found.
- `500 Internal Server Error`: Server issue.

## 7. Add Activity
**Route**: `/addActivity/{plan_id}/{date_id}`

**Methods**: `POST`

**Description**: Adds an activity to a date in a plan.

**Input**:
  ```json
  { "id": "integer", "createdBy": "string" }
  ```

**Outputs**:  
- `200 OK`: Returns activity details.
- `400 Bad Request`: Missing fields.
- `500 Internal Server Error`: Server issue.

## 8. Delete Activity
**Route**: `/deleteActivity/{plan_id}/{date_id}/{activity_id}`

**Methods**: `DELETE`

**Description**: Deletes an activity by `activity_id`.

**Outputs**:
- `200 OK`: Activity deleted.
- `404 Not Found`: Activity not found.
- `500 Internal Server Error`: Server issue.

## 9. Lock Activity
**Route**: `/lockActivity/{plan_id}/{date_id}/{activity_id}`

**Methods**: `POST`

**Description**: Locks an activity for editing.

**Outputs**:
- `200 OK`: Activity locked.
- `404 Not Found`: Activity not found.
- `500 Internal Server Error`: Server issue.

## 10. Update Activity
**Route**: `/updateActivity/{plan_id}/{date_id}/{activity_id}`

**Methods**: `PATCH`

**Description**: Updates an activity's information.

**Input**:
  ```json
  { "activityText": "string", "activityIdx": "integer", "updatedBy": "string" }
  ```

**Outputs**:
- `200 OK`: Returns updated activity details.
- `400 Bad Request`: Missing fields.
- `404 Not Found`: Activity not found.
- `500 Internal Server Error`: Server issue.

---

# Common Data Structures

### Plan Document
```json
{
  "plan": "string",
  "id": "string",
  "type": "plan",
  "planName": "string",
  "createdBy": "string",
  "createdAt": "timestamp",
  "lastUpdatedBy": "string",
  "lastUpdatedAt": "timestamp"
}
```

### Date Document
```json
{
  "plan": "string",
  "id": "string",
  "type": "date",
  "createdBy": "string",
  "createdAt": "timestamp",
  "lastUpdatedBy": "string",
  "lastUpdatedAt": "timestamp"
}
```

### Activity Document
```json
{
  "plan": "string",
  "id": "string",
  "type": "activity",
  "activityText": "string",
  "createdBy": "string",
  "createdAt": "timestamp",
  "lastUpdatedBy": "string",
  "lastUpdatedAt": "timestamp"
}
```
