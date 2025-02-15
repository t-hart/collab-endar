import json
import logging
from datetime import datetime, timezone
import azure.functions as func

# Initialize function app
app = func.FunctionApp(http_auth_level=func.AuthLevel.ANONYMOUS)

SIGNALR_HUB_NAME = "chatHub"
SIGNALR_CONN_STRING = "AzureSignalRConnectionString"
COSMOS_DB_NAME = "TravelPlanner"
COSMOS_CONTAINER_NAME = "Plans"
COSMOS_CONN_STRING = "CosmosDB"


@app.route(
    route="negotiate",
    auth_level=func.AuthLevel.ANONYMOUS,
    methods=["GET", "POST", "OPTIONS"],
)
@app.generic_input_binding(
    arg_name="connectionInfo",
    type="signalRConnectionInfo",
    hubName=SIGNALR_HUB_NAME,
    connectionStringSetting=SIGNALR_CONN_STRING,
)
def negotiate(req: func.HttpRequest, connectionInfo: str) -> func.HttpResponse:
    """
    Handle SignalR negotiate requests.
    """
    try:
        logging.info("Within negotiate; returning connection info")
        return func.HttpResponse(connectionInfo)

    except Exception as e:
        logging.exception("Error in negotiate")
        return func.HttpResponse(
            json.dumps({"error": str(e)}), status_code=500, mimetype="application/json"
        )


@app.route(
    route="registerUser",
    auth_level=func.AuthLevel.ANONYMOUS,
    methods=["GET", "POST", "OPTIONS"],
)
@app.generic_input_binding(
    arg_name="connectionInfo",
    type="signalRConnectionInfo",
    hubName=SIGNALR_HUB_NAME,
    connectionStringSetting=SIGNALR_CONN_STRING,
)
@app.generic_output_binding(
    arg_name="signalR",
    type="signalR",
    hub_name=SIGNALR_HUB_NAME,
    connection_string_setting=SIGNALR_CONN_STRING,
)
def register_user(
    req: func.HttpRequest, connectionInfo: str, signalR: func.Out[str]
) -> func.HttpResponse:
    """
    Handle SignalR user group registration.
    """
    try:
        logging.info("Starting register_user function")

        plan_id = req.params.get("planId")
        connectionId = req.params.get("connectionId")
        required_fields = {"plan_id": plan_id, "connectionId": connectionId}
        missing_fields = [x for x, y in required_fields.items() if not y]
        if missing_fields:
            return func.HttpResponse(
                json.dumps(
                    {
                        "error": "Missing required fields in URL request",
                        "missing": missing_fields,
                    }
                ),
                status_code=400,
                mimetype="application/json",
            )

        action = {"connectionId": connectionId, "groupName": plan_id, "action": "add"}
        signalR.set(json.dumps(action))
        logging.info(f"Added connection '{connectionId}' to group '{plan_id}'")
        return func.HttpResponse(status_code=200)

    except Exception as e:
        logging.exception("Error in register_user")
        return func.HttpResponse(
            json.dumps({"error": str(e)}), status_code=500, mimetype="application/json"
        )


@app.route(route="createPlan", auth_level=func.AuthLevel.ANONYMOUS, methods=["POST"])
@app.generic_output_binding(
    arg_name="outputDocPlan",
    type="cosmosDB",
    connection_string_setting=COSMOS_CONN_STRING,
    database_name=COSMOS_DB_NAME,
    container_name=COSMOS_CONTAINER_NAME,
)
@app.generic_output_binding(
    arg_name="outputDoc",
    type="cosmosDB",
    connection_string_setting=COSMOS_CONN_STRING,
    database_name=COSMOS_DB_NAME,
    container_name=COSMOS_CONTAINER_NAME,
)
@app.generic_output_binding(
    arg_name="signalR",
    type="signalR",
    hub_name=SIGNALR_HUB_NAME,
    connection_string_setting=SIGNALR_CONN_STRING,
)
def create_plan(
    req: func.HttpRequest,
    outputDocPlan: func.Out[str],
    outputDoc: func.Out[str],
    signalR: func.Out[str],
) -> func.HttpResponse:
    """
    Create new plan.
    """
    try:
        logging.info("Starting create_plan function")

        # Get JSON data
        plan_data = req.get_json()

        required_fields = {
            "uuid": plan_data.get("uuid"),
            "planName": plan_data.get("planName"),
            "createdBy": plan_data.get("createdBy"),
            "dates": plan_data.get("dates"),
        }
        missing_fields = [x for x, y in required_fields.items() if not y]
        if missing_fields:
            return func.HttpResponse(
                json.dumps(
                    {
                        "error": "Missing required fields from JSON",
                        "missing": missing_fields,
                    }
                ),
                status_code=400,
                mimetype="application/json",
            )

        # Initialize plan document
        uuid = required_fields["uuid"]
        plan_id = f"{uuid}"
        plan_name = plan_data["planName"]
        created_by = plan_data["createdBy"]
        current_time = int(datetime.now(timezone.utc).timestamp() * 1000)
        document = {
            "plan": plan_id,
            "id": plan_id,
            "type": "plan",
            "planName": plan_name,
            "createdBy": created_by,
            "createdAt": current_time,
            "lastUpdatedBy": created_by,
            "lastUpdatedAt": current_time,
        }

        docs = {"plan": document}
        docs.update(
            initialize_dates(
                outputDoc=outputDoc,
                plan_id=plan_id,
                dates=plan_data["dates"],
                created_by=created_by,
            )
        )

        logging.info(f"Attempting to save document to CosmosDB: {document}")
        outputDocPlan.set(json.dumps(document))

        # Format for frontend
        infoDoc = {
            "planMetadata": {
                "planId": plan_id,
                "planName": plan_name,
                "createdBy": created_by,
            },
            "dates": [
                {"id": date["id"].split("|")[1] + "T00:00:00.000Z", "createdBy": created_by, "activities": []}
                for date in docs["dates"]
            ],
        }

        # Send SignalR message to clients
        signalR.set(
            json.dumps(
                {"target": "planCreated", "arguments": [infoDoc], "groupName": plan_id}
            )
        )

        return func.HttpResponse(
            json.dumps({"status": "success", "data": infoDoc}),
            mimetype="application/json",
        )
    except Exception as e:
        logging.exception("Error in create_plan")
        return func.HttpResponse(
            json.dumps({"error": str(e)}), status_code=500, mimetype="application/json"
        )


@app.route(
    route="getPlan/{plan_id}", auth_level=func.AuthLevel.ANONYMOUS, methods=["GET"]
)
@app.generic_input_binding(
    arg_name="planDoc",
    type="cosmosDB",
    connection_string_setting=COSMOS_CONN_STRING,
    database_name=COSMOS_DB_NAME,
    container_name=COSMOS_CONTAINER_NAME,
    id="{plan_id}",
    partitionKey="{plan_id}",
)
@app.generic_input_binding(
    arg_name="datesDocs",
    type="cosmosDB",
    connection_string_setting=COSMOS_CONN_STRING,
    database_name=COSMOS_DB_NAME,
    container_name=COSMOS_CONTAINER_NAME,
    sql_query="SELECT * FROM c WHERE c.type='date'",
    partitionKey="{plan_id}",
)
@app.generic_input_binding(
    arg_name="activitiesDocs",
    type="cosmosDB",
    connection_string_setting=COSMOS_CONN_STRING,
    database_name=COSMOS_DB_NAME,
    container_name=COSMOS_CONTAINER_NAME,
    sql_query="SELECT * FROM c WHERE c.type='activity'",
    partitionKey="{plan_id}",
)
def get_plan(
    req: func.HttpRequest,
    planDoc: func.DocumentList,
    datesDocs: func.DocumentList,
    activitiesDocs: func.DocumentList,
) -> func.HttpResponse:
    """
    Get all plan data (includes all dates and activities).
    """
    try:
        logging.info("Starting get_plan function")

        # Validate plan existence
        if not planDoc:
            return func.HttpResponse(
                json.dumps({"error": "Plan not found"}),
                status_code=404,
                mimetype="application/json",
            )
        planDoc = planDoc[0]

        # Assemble response
        response = {
            "plan": dict(planDoc),
            "dates": sorted([dict(date) for date in datesDocs], key=lambda x: x["id"]),
            "activities": sorted(
                [dict(activity) for activity in activitiesDocs],
                key=lambda x: (x["id"].split("|")[1], int(x["id"].split("|")[3])),
            ),
        }

        return func.HttpResponse(
            json.dumps({"status": "success", "data": response}),
            mimetype="application/json",
        )
    except Exception as e:
        logging.exception("Error in get_plan")
        return func.HttpResponse(
            json.dumps({"error": str(e)}), status_code=500, mimetype="application/json"
        )


@app.route(
    route="deletePlan/{plan_id}",
    methods=["DELETE"],
    auth_level=func.AuthLevel.ANONYMOUS,
)
@app.generic_input_binding(
    arg_name="inputDoc",
    type="cosmosDB",
    connection_string_setting=COSMOS_CONN_STRING,
    database_name=COSMOS_DB_NAME,
    container_name=COSMOS_CONTAINER_NAME,
    id="{plan_id}",
    partitionKey="{plan_id}",
)
@app.generic_output_binding(
    arg_name="deleteDoc",
    type="cosmosDB",
    connection_string_setting=COSMOS_CONN_STRING,
    database_name=COSMOS_DB_NAME,
    container_name=COSMOS_CONTAINER_NAME,
)
@app.generic_output_binding(
    arg_name="signalR",
    type="signalR",
    hub_name=SIGNALR_HUB_NAME,
    connection_string_setting=SIGNALR_CONN_STRING,
)
def delete_plan(
    req: func.HttpRequest,
    inputDoc: func.DocumentList,
    signalR: func.Out[str],
    deleteDoc: func.Out[func.Document],
) -> func.HttpResponse:
    """
    Delete existing plan.
    """
    try:
        logging.info("Starting delete_plan function")

        # Get route parameter
        plan_id = req.route_params.get("plan_id")

        if not inputDoc:
            return func.HttpResponse(
                json.dumps({"error": f"Plan '{plan_id}' not found"}),
                status_code=404,
                mimetype="application/json",
            )

        inputDoc = list(inputDoc)[0]
        inputDoc["ttl"] = 1
        deleteDoc.set(inputDoc)

        logging.info(f"Document marked for deletion: {plan_id}")

        # Send SignalR message to clients
        signalR.set(
            json.dumps(
                {
                    "target": "planDeleted",
                    "arguments": [{"id": plan_id}],
                    "groupName": plan_id,
                }
            )
        )

        return func.HttpResponse(
            json.dumps({"status": "success", "id": plan_id}),
            mimetype="application/json",
        )
    except Exception as e:
        logging.exception("Error in delete_plan")
        return func.HttpResponse(
            json.dumps({"error": str(e)}), status_code=500, mimetype="application/json"
        )


def initialize_dates(
    outputDoc: func.Out[str], plan_id: str, dates, created_by: str
) -> dict:
    current_time = int(datetime.now(timezone.utc).timestamp() * 1000)
    docs = []
    dates_return_data = []
    activities_return_data = []
    for date in dates:
        date_id = f"date|{date['id']}"

        # Build date document
        doc = {
            "plan": plan_id,
            "id": date_id,
            "type": "date",
            "createdBy": created_by,
            "createdAt": current_time,
            "lastUpdatedBy": created_by,
            "lastUpdatedAt": current_time,
        }
        docs.append(doc)
        dates_return_data.append(doc)

        activity_id = f"{date_id}|activity|0"

        # Build empty activity document
        doc = {
            "plan": plan_id,
            "id": activity_id,
            "type": "activity",
            "activityText": "",
            "createdBy": created_by,
            "createdAt": current_time,
            "lastUpdatedBy": created_by,
            "lastUpdatedAt": current_time,
        }
        docs.append(doc)
        activities_return_data.append(doc)

    logging.info(f"Attempting to save documents to CosmosDB: {docs}")
    outputDoc.set(json.dumps(docs))
    return {"dates": dates_return_data, "activities": activities_return_data}


@app.route(
    route="addDate/{plan_id}", auth_level=func.AuthLevel.ANONYMOUS, methods=["POST"]
)
@app.generic_output_binding(
    arg_name="outputDocDate",
    type="cosmosDB",
    connection_string_setting=COSMOS_CONN_STRING,
    database_name=COSMOS_DB_NAME,
    container_name=COSMOS_CONTAINER_NAME,
)
@app.generic_output_binding(
    arg_name="signalR",
    type="signalR",
    hub_name=SIGNALR_HUB_NAME,
    connection_string_setting=SIGNALR_CONN_STRING,
)
def add_date(
    req: func.HttpRequest, outputDocDate: func.Out[str], signalR: func.Out[str]
) -> func.HttpResponse:
    """
    Add new date item.
    """
    try:
        logging.info("Starting add_date function")

        # Get route parameters and JSON data
        plan_id = req.route_params.get("plan_id")
        date_data = req.get_json()

        required_fields = {
            "id": date_data.get("id"),
            "createdBy": date_data.get("createdBy"),
        }

        created_by = required_fields["createdBy"]

        # request payload validation
        missing_fields = [x for x, y in required_fields.items() if not y]
        if missing_fields:
            return func.HttpResponse(
                json.dumps(
                    {
                        "error": "Missing required fields from JSON",
                        "missing": missing_fields,
                    }
                ),
                status_code=400,
                mimetype="application/json",
            )

        # Add date and the empty activity to DB
        docs = initialize_dates(
            outputDoc=outputDocDate,
            plan_id=plan_id,
            dates=[date_data],
            created_by=created_by,
        )

        # Send SignalR message to clients
        sync_args = [{"id": date_data.get("id"), "byUser": created_by}]
        signalR.set(
            json.dumps(
                {"target": "dateAdded", "groupName": plan_id, "arguments": sync_args}
            )
        )

        return func.HttpResponse(
            json.dumps({"status": "success", "data": docs}),
            mimetype="application/json",
        )
    except Exception as e:
        logging.exception("Error in add_date")
        return func.HttpResponse(
            json.dumps({"error": str(e)}), status_code=500, mimetype="application/json"
        )


@app.route(
    route="deleteDate/{plan_id}/{date_id}/{user_name}",
    methods=["DELETE"],
    auth_level=func.AuthLevel.ANONYMOUS,
)
@app.generic_input_binding(
    arg_name="inputDoc",
    type="cosmosDB",
    connection_string_setting=COSMOS_CONN_STRING,
    database_name=COSMOS_DB_NAME,
    container_name=COSMOS_CONTAINER_NAME,
    id="date|{date_id}",
    partitionKey="{plan_id}",
)
@app.generic_input_binding(
    arg_name="activityDocs",
    type="cosmosDB",
    connection_string_setting=COSMOS_CONN_STRING,
    database_name=COSMOS_DB_NAME,
    container_name=COSMOS_CONTAINER_NAME,
    sql_query="SELECT * FROM c WHERE c.type='activity'",
    partitionKey="{plan_id}",
)
@app.generic_output_binding(
    arg_name="deleteDoc",
    type="cosmosDB",
    connection_string_setting=COSMOS_CONN_STRING,
    database_name=COSMOS_DB_NAME,
    container_name=COSMOS_CONTAINER_NAME,
)
@app.generic_output_binding(
    arg_name="signalR",
    type="signalR",
    hub_name=SIGNALR_HUB_NAME,
    connection_string_setting=SIGNALR_CONN_STRING,
)
def delete_date(
    req: func.HttpRequest,
    inputDoc: func.DocumentList,
    signalR: func.Out[str],
    deleteDoc: func.Out[func.Document],
    activityDocs: func.DocumentList,
) -> func.HttpResponse:
    """
    Delete date item.
    """
    print(activityDocs)
    try:
        logging.info("Starting delete_date function")

        # Get route parameters
        plan_id = req.route_params.get("plan_id")
        date_id = req.route_params.get("date_id")
        user_name = req.route_params.get("user_name")

        if not inputDoc:
            return func.HttpResponse(
                json.dumps(
                    {"error": f"Date '{date_id}' not found in plan '{plan_id}'"}
                ),
                status_code=404,
                mimetype="application/json",
            )

        # Mark doc for deletion
        docs_to_delete = []
        inputDoc = list(inputDoc)[0]
        inputDoc["ttl"] = 1
        docs_to_delete.append(func.Document.from_dict(inputDoc))

        logging.info(f"Date document marked for deletion: {date_id}")

        for activityDoc in activityDocs:
            # This is probably bad, but seem to be limited by CosmosDB, our at least our schema
            if activityDoc["id"].startswith(f"date|{date_id}|activity|"):
                activityDoc["ttl"] = 1
                logging.info(
                    f"Activity document marked for deletion: {activityDoc['id']}"
                )
                docs_to_delete.append(func.Document.from_dict(activityDoc))

        deleteDoc.set(docs_to_delete)

        # Send SignalR message to clients
        sync_args = [{"id": date_id, "byUser": user_name}]
        signalR.set(
            json.dumps(
                {
                    "target": "dateDeleted",
                    "arguments": sync_args,
                    "groupName": plan_id,
                }
            )
        )

        return func.HttpResponse(
            json.dumps({"status": "success", "id": date_id}),
            mimetype="application/json",
        )
    except Exception as e:
        logging.exception("Error in delete_date")
        return func.HttpResponse(
            json.dumps({"error": str(e)}), status_code=500, mimetype="application/json"
        )


@app.route(
    route="addActivity/{plan_id}/{date_id}",
    auth_level=func.AuthLevel.ANONYMOUS,
    methods=["POST"],
)
@app.generic_output_binding(
    arg_name="outputDoc",
    type="cosmosDB",
    connection_string_setting=COSMOS_CONN_STRING,
    database_name=COSMOS_DB_NAME,
    container_name=COSMOS_CONTAINER_NAME,
)
@app.generic_output_binding(
    arg_name="signalR",
    type="signalR",
    hub_name=SIGNALR_HUB_NAME,
    connection_string_setting=SIGNALR_CONN_STRING,
)
def add_activity(
    req: func.HttpRequest, outputDoc: func.Out[str], signalR: func.Out[str]
) -> func.HttpResponse:
    """
    Add new activity.
    """
    try:
        logging.info("Starting add_activity function")

        # Get route parameters and JSON data
        plan_id = req.route_params.get("plan_id")
        date_id = req.route_params.get("date_id")
        activity_data = req.get_json()

        # Validate required JSON fields
        required_fields = {
            "id": activity_data.get("id"),
            "createdBy": activity_data.get("createdBy"),
        }
        missing_fields = [x for x, y in required_fields.items() if not y]
        if missing_fields:
            return func.HttpResponse(
                json.dumps(
                    {
                        "error": "Missing required fields from JSON",
                        "missing": missing_fields,
                    }
                ),
                status_code=400,
                mimetype="application/json",
            )

        # Add empty activity to DB
        created_by = required_fields["createdBy"]
        activity_id = required_fields["id"]

        current_time = int(datetime.now(timezone.utc).timestamp() * 1000)
        activity_id_db = f"date|{date_id}|activity|{activity_id}"
        # Build empty activity document
        doc = {
            "plan": plan_id,
            "id": activity_id_db,
            "type": "activity",
            "activityText": "",
            "createdBy": created_by,
            "createdAt": current_time,
            "lastUpdatedBy": created_by,
            "lastUpdatedAt": current_time,
        }
        logging.info(f"Attempting to save document to CosmosDB: {doc}")
        outputDoc.set(json.dumps(doc))

        # Send SignalR message to clients
        sync_args = [{"id": activity_id, "dateId": date_id, "byUser": created_by}]
        signalR.set(
            json.dumps(
                {
                    "target": "activityAdded",
                    "groupName": plan_id,
                    "arguments": sync_args,
                }
            )
        )

        return func.HttpResponse(
            json.dumps({"status": "success", "activity": dict(doc)}),
            mimetype="application/json",
        )
    except Exception as e:
        logging.exception("Error in add_activity")
        return func.HttpResponse(
            json.dumps({"error": str(e)}), status_code=500, mimetype="application/json"
        )


@app.route(
    route="deleteActivity/{plan_id}/{date_id}/{activity_id}/{user_name}",
    methods=["DELETE"],
    auth_level=func.AuthLevel.ANONYMOUS,
)
@app.generic_input_binding(
    arg_name="inputDoc",
    type="cosmosDB",
    connection_string_setting=COSMOS_CONN_STRING,
    database_name=COSMOS_DB_NAME,
    container_name=COSMOS_CONTAINER_NAME,
    id="date|{date_id}|activity|{activity_id}",
    partitionKey="{plan_id}",
)
@app.generic_output_binding(
    arg_name="deleteDoc",
    type="cosmosDB",
    connection_string_setting=COSMOS_CONN_STRING,
    database_name=COSMOS_DB_NAME,
    container_name=COSMOS_CONTAINER_NAME,
)
@app.generic_output_binding(
    arg_name="signalR",
    type="signalR",
    hub_name=SIGNALR_HUB_NAME,
    connection_string_setting=SIGNALR_CONN_STRING,
)
def delete_activity(
    req: func.HttpRequest,
    inputDoc: func.DocumentList,
    signalR: func.Out[str],
    deleteDoc: func.Out[func.Document],
) -> func.HttpResponse:
    """
    Delete activity.
    """
    try:
        logging.info("Starting delete_activity function")

        # Get route parameters
        plan_id = req.route_params.get("plan_id")
        date_id = req.route_params.get("date_id")
        activity_id = req.route_params.get("activity_id")
        user_name = req.route_params.get("user_name")

        if not inputDoc:
            return func.HttpResponse(
                json.dumps(
                    {
                        "error": f"Activity {activity_id} not found in plan {plan_id} on date {date_id}"
                    }
                ),
                status_code=404,
                mimetype="application/json",
            )

        # Mark doc for deletion
        inputDoc = list(inputDoc)[0]
        inputDoc["ttl"] = 1
        deleteDoc.set(inputDoc)

        logging.info(f"Document marked for deletion: {activity_id}")

        # Send SignalR message to clients
        sync_args = [{"id": activity_id, "dateId": date_id, "byUser": user_name}]
        signalR.set(
            json.dumps(
                {
                    "target": "activityDeleted",
                    "arguments": sync_args,
                    "groupName": plan_id,
                }
            )
        )

        return func.HttpResponse(
            json.dumps({"status": "success", "id": activity_id}),
            mimetype="application/json",
        )
    except Exception as e:
        logging.exception("Error in delete_activity")
        return func.HttpResponse(
            json.dumps({"error": str(e)}), status_code=500, mimetype="application/json"
        )


@app.route(
    route="lockActivity/{plan_id}/{date_id}/{activity_id}",
    methods=["POST"],
    auth_level=func.AuthLevel.ANONYMOUS,
)
@app.generic_input_binding(
    arg_name="inputDoc",
    type="cosmosDB",
    connection_string_setting=COSMOS_CONN_STRING,
    database_name=COSMOS_DB_NAME,
    container_name=COSMOS_CONTAINER_NAME,
    id="date|{date_id}|activity|{activity_id}",
    partitionKey="{plan_id}",
)
@app.generic_output_binding(
    arg_name="signalR",
    type="signalR",
    hub_name=SIGNALR_HUB_NAME,
    connection_string_setting=SIGNALR_CONN_STRING,
)
def lock_activity(
    req: func.HttpRequest, inputDoc: func.DocumentList, signalR: func.Out[str]
) -> func.HttpResponse:
    """
    Lock activity.
    """
    try:
        logging.info("Starting lock_activity function")

        # Get route parameters
        plan_id = req.route_params.get("plan_id")
        date_id = req.route_params.get("date_id")
        activity_id = req.route_params.get("activity_id")

        activity_data = req.get_json()
        logging.info(f"activity_data: {activity_data}")

        # Validate required JSON fields
        required_fields = {
            "lockedBy": activity_data.get("lockedBy"),
        }
        missing_fields = [x for x, y in required_fields.items() if y is None]
        if missing_fields:
            return func.HttpResponse(
                json.dumps(
                    {
                        "error": "Missing required fields from JSON",
                        "missing": missing_fields,
                    }
                ),
                status_code=400,
                mimetype="application/json",
            )

        if not inputDoc:
            return func.HttpResponse(
                json.dumps(
                    {
                        "error": f"Activity '{activity_id}' not found in plan '{plan_id}' on date '{date_id}'"
                    }
                ),
                status_code=404,
                mimetype="application/json",
            )

        logging.info(f"Document marked for deletion: {activity_id}")

        # Send SignalR message to clients
        sync_args = [
            {
                "id": activity_id,
                "dateId": date_id,
                "byUser": required_fields["lockedBy"],
            }
        ]
        signalR.set(
            json.dumps(
                {
                    "target": "lockActivity",
                    "arguments": sync_args,
                    "groupName": plan_id,
                }
            )
        )

        return func.HttpResponse(
            json.dumps({"status": "success", "id": activity_id}),
            mimetype="application/json",
        )
    except Exception as e:
        logging.exception("Error in lock_activity")
        return func.HttpResponse(
            json.dumps({"error": str(e)}), status_code=500, mimetype="application/json"
        )


@app.route(
    route="updateActivity/{plan_id}/{date_id}/{activity_id}",
    methods=["PATCH"],
    auth_level=func.AuthLevel.ANONYMOUS,
)
@app.generic_input_binding(
    arg_name="inputDoc",
    type="cosmosDB",
    connection_string_setting=COSMOS_CONN_STRING,
    database_name=COSMOS_DB_NAME,
    container_name=COSMOS_CONTAINER_NAME,
    id="date|{date_id}|activity|{activity_id}",
    partitionKey="{plan_id}",
)
@app.generic_output_binding(
    arg_name="updateDoc",
    type="cosmosDB",
    connection_string_setting=COSMOS_CONN_STRING,
    database_name=COSMOS_DB_NAME,
    container_name=COSMOS_CONTAINER_NAME,
)
@app.generic_output_binding(
    arg_name="deleteDoc",
    type="cosmosDB",
    connection_string_setting=COSMOS_CONN_STRING,
    database_name=COSMOS_DB_NAME,
    container_name=COSMOS_CONTAINER_NAME,
)
@app.generic_output_binding(
    arg_name="signalR",
    type="signalR",
    hub_name=SIGNALR_HUB_NAME,
    connection_string_setting=SIGNALR_CONN_STRING,
)
def update_activity(
    req: func.HttpRequest,
    inputDoc: func.DocumentList,
    signalR: func.Out[str],
    updateDoc: func.Out[func.Document],
    deleteDoc: func.Out[func.Document],
) -> func.HttpResponse:
    """
    Update activity.
    """
    try:
        logging.info("Starting update_activity function")

        # Get route parameters and JSON data
        plan_id = req.route_params.get("plan_id")
        date_id = req.route_params.get("date_id")
        activity_id = req.route_params.get("activity_id")
        activity_data = req.get_json()
        logging.info(f"activity_data: {activity_data}")

        # Validate required JSON fields
        required_fields = {
            "activityText": activity_data.get("activityText"),
            "updatedBy": activity_data.get("updatedBy"),
            "isFinal": activity_data.get("isFinal"),
        }
        missing_fields = [x for x, y in required_fields.items() if y is None]
        if missing_fields:
            return func.HttpResponse(
                json.dumps(
                    {
                        "error": "Missing required fields from JSON",
                        "missing": missing_fields,
                    }
                ),
                status_code=400,
                mimetype="application/json",
            )

        if not inputDoc:
            return func.HttpResponse(
                json.dumps(
                    {
                        "error": f"Activity '{activity_id}' not found in plan '{plan_id}' on date '{date_id}'"
                    }
                ),
                status_code=404,
                mimetype="application/json",
            )

        if required_fields["isFinal"]:
            # Determine if activity needs to be moved
            inputDoc = list(inputDoc)[0]
            prev_activity_id = inputDoc.get("id")
            activity_id_db = f"date|{date_id}|activity|{activity_id}"

            if activity_id_db != prev_activity_id:
                # Move activity
                newDoc = dict(inputDoc)
                newDoc["id"] = activity_id_db
                newDoc["activityText"] = required_fields["activityText"]
                newDoc["lastUpdatedBy"] = required_fields["updatedBy"]
                newDoc["lastUpdatedAt"] = int(
                    datetime.now(timezone.utc).timestamp() * 1000
                )
                updateDoc.set(func.Document.from_dict(newDoc))

                # Mark old doc for deletion
                oldDoc = dict(inputDoc)
                oldDoc["ttl"] = 1
                deleteDoc.set(func.Document.from_dict(oldDoc))

                logging.info(f"Activity moved: {prev_activity_id} -> {activity_id_db}")
                responseDoc = newDoc
            else:
                # Update existing doc
                inputDoc["activityText"] = required_fields["activityText"]
                inputDoc["lastUpdatedBy"] = required_fields["updatedBy"]
                inputDoc["lastUpdatedAt"] = int(
                    datetime.now(timezone.utc).timestamp() * 1000
                )
                updateDoc.set(inputDoc)

                logging.info(f"Activity updated: {activity_id_db}")
                responseDoc = dict(inputDoc)

        # Send SignalR message to clients
        sync_args = [
            {
                "activityText": required_fields["activityText"],
                "id": activity_id,
                "dateId": date_id,
                "isFinal": required_fields["isFinal"],
                "byUser": required_fields["updatedBy"],
            }
        ]
        signalR.set(
            json.dumps(
                {
                    "target": "activityUpdated",
                    "arguments": sync_args,
                    "groupName": plan_id,
                }
            )
        )

        return func.HttpResponse(
            json.dumps({"status": "success", "activity": sync_args}),
            mimetype="application/json",
        )
    except Exception as e:
        logging.exception("Error in update_activity")
        return func.HttpResponse(
            json.dumps({"error": str(e)}), status_code=500, mimetype="application/json"
        )


@app.route(
    route="voteActivity/{plan_id}/{date_id}/{activity_id}",
    methods=["PATCH"],
    auth_level=func.AuthLevel.ANONYMOUS,
)
@app.generic_input_binding(
    arg_name="inputDoc",
    type="cosmosDB",
    connection_string_setting=COSMOS_CONN_STRING,
    database_name=COSMOS_DB_NAME,
    container_name=COSMOS_CONTAINER_NAME,
    id="date|{date_id}|activity|{activity_id}",
    partitionKey="{plan_id}",
)
@app.generic_output_binding(
    arg_name="updateDoc",
    type="cosmosDB",
    connection_string_setting=COSMOS_CONN_STRING,
    database_name=COSMOS_DB_NAME,
    container_name=COSMOS_CONTAINER_NAME,
)
@app.generic_output_binding(
    arg_name="signalR",
    type="signalR",
    hub_name=SIGNALR_HUB_NAME,
    connection_string_setting=SIGNALR_CONN_STRING,
)
def vote_activity(
    req: func.HttpRequest,
    inputDoc: func.DocumentList,
    signalR: func.Out[str],
    updateDoc: func.Out[func.Document],
) -> func.HttpResponse:
    """
    Vote activity.
    """
    try:
        logging.info("Starting vote_activity function")

        # Get route parameters and JSON data
        plan_id = req.route_params.get("plan_id")
        date_id = req.route_params.get("date_id")
        activity_id = req.route_params.get("activity_id")
        activity_data = req.get_json()
        logging.info(f"activity_data: {activity_data}")

        # Validate required JSON fields
        required_fields = {
            "upVoters": activity_data.get("upVoters"),
            "downVoters": activity_data.get("downVoters"),
            "voter": activity_data.get("voter"),
        }
        missing_fields = [x for x, y in required_fields.items() if y is None]
        if missing_fields:
            return func.HttpResponse(
                json.dumps(
                    {
                        "error": "Missing required fields from JSON",
                        "missing": missing_fields,
                    }
                ),
                status_code=400,
                mimetype="application/json",
            )

        if not inputDoc:
            return func.HttpResponse(
                json.dumps(
                    {
                        "error": f"Activity '{activity_id}' not found in plan '{plan_id}' on date '{date_id}'"
                    }
                ),
                status_code=404,
                mimetype="application/json",
            )

        # Determine if activity needs to be moved
        inputDoc = list(inputDoc)[0]
        activity_id_db = f"date|{date_id}|activity|{activity_id}"

        
        # Update existing doc
        inputDoc["upVoters"] = required_fields["upVoters"]
        inputDoc["downVoters"] = required_fields["downVoters"]
        inputDoc["lastUpdatedBy"] = required_fields["voter"]
        inputDoc["lastUpdatedAt"] = int(
            datetime.now(timezone.utc).timestamp() * 1000
        )
        updateDoc.set(inputDoc)

        logging.info(f"Activity votes updated: {activity_id_db}")

        # Send SignalR message to clients
        sync_args = [
            {
                "upVoters": required_fields["upVoters"],
                "downVoters": required_fields["downVoters"],
                "byUser": required_fields["voter"],
                "id": activity_id,
                "dateId": date_id,
            }
        ]
        signalR.set(
            json.dumps(
                {
                    "target": "voteActivity",
                    "arguments": sync_args,
                    "groupName": plan_id,
                }
            )
        )

        return func.HttpResponse(
            json.dumps({"status": "success", "activity": sync_args}),
            mimetype="application/json",
        )
    except Exception as e:
        logging.exception("Error in vote_activity")
        return func.HttpResponse(
            json.dumps({"error": str(e)}), status_code=500, mimetype="application/json"
        )
