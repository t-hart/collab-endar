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

@app.route(route="negotiate", auth_level=func.AuthLevel.ANONYMOUS, methods=["GET", "POST", "OPTIONS"])
@app.generic_input_binding(arg_name="connectionInfo", type="signalRConnectionInfo", hubName=SIGNALR_HUB_NAME, connectionStringSetting=SIGNALR_CONN_STRING)
def negotiate(req: func.HttpRequest, connectionInfo: str) -> func.HttpResponse:
    """
    Handle SignalR negotiate requests.
    """
    logging.info(f"Negotiate function called. Method: {req.method}")
    logging.info(f"Request headers: {dict(req.headers)}")
    return func.HttpResponse(connectionInfo)

@app.route(route="createPlan", auth_level=func.AuthLevel.ANONYMOUS, methods=["POST"])
@app.generic_output_binding(arg_name="outputDoc", type="cosmosDB", connection_string_setting=COSMOS_CONN_STRING, database_name=COSMOS_DB_NAME, container_name=COSMOS_CONTAINER_NAME)
@app.generic_output_binding( arg_name="signalR", type="signalR", hub_name=SIGNALR_HUB_NAME, connection_string_setting=SIGNALR_CONN_STRING)
def create_plan(req: func.HttpRequest, outputDoc: func.Out[str], signalR: func.Out[str]) -> func.HttpResponse:
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
            "createdBy": plan_data.get("createdBy")
        }
        missing_fields = [x for x, y in required_fields.items() if not y]
        if missing_fields:
            return func.HttpResponse(
                json.dumps({"error": "Missing required fields from JSON", "missing": missing_fields}),
                status_code=400,
                mimetype="application/json"
            )

        # Initialize plan document
        uuid = required_fields["uuid"]
        plan_id = f"plan_{uuid}"
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

        logging.info(f"Attempting to save document to CosmosDB: {document}")
        outputDoc.set(json.dumps(document))

        # Send SignalR message to clients
        signalR.set(json.dumps({"target": "planCreated", "arguments": [document]}))

        return func.HttpResponse(
            json.dumps({"status": "success", "plan": document}),
            mimetype="application/json",
        )
    except Exception as e:
        logging.error(f"Error in create_plan: {str(e)}")
        return func.HttpResponse(json.dumps({"error": str(e)}), status_code=500, mimetype="application/json")

@app.route(route="getPlan/{plan_id}", auth_level=func.AuthLevel.ANONYMOUS, methods=["GET"])
@app.generic_input_binding(arg_name="planDoc", type="cosmosDB", connection_string_setting=COSMOS_CONN_STRING, database_name=COSMOS_DB_NAME, container_name=COSMOS_CONTAINER_NAME, id="{plan_id}", partitionKey="{plan_id}")
@app.generic_input_binding(arg_name="datesDocs", type="cosmosDB", connection_string_setting=COSMOS_CONN_STRING, database_name=COSMOS_DB_NAME, container_name=COSMOS_CONTAINER_NAME, sql_query="SELECT * FROM c WHERE c.type='date'", partitionKey="{plan_id}")
@app.generic_input_binding(arg_name="activitiesDocs", type="cosmosDB", connection_string_setting=COSMOS_CONN_STRING, database_name=COSMOS_DB_NAME, container_name=COSMOS_CONTAINER_NAME, sql_query="SELECT * FROM c WHERE c.type='activity'", partitionKey="{plan_id}")
def get_plan(_: func.HttpRequest, planDoc: func.DocumentList, datesDocs: func.DocumentList, activitiesDocs: func.DocumentList) -> func.HttpResponse:
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
                mimetype="application/json"
            )
        
        planDoc = planDoc[0]

        # Assemble response
        response = {
            "plan": dict(planDoc),
            "dates": [dict(date) for date in datesDocs],
            "activities": [dict(activity) for activity in activitiesDocs]
        }

        return func.HttpResponse(
            json.dumps({"status": "success", "data": response}),
            mimetype="application/json",
        )
    except Exception as e:
        logging.error(f"Error in get_plan: {str(e)}")
        return func.HttpResponse(json.dumps({"error": str(e)}), status_code=500, mimetype="application/json")

@app.route(route="deletePlan/{plan_id}", methods=["DELETE"], auth_level=func.AuthLevel.ANONYMOUS)
@app.generic_input_binding(arg_name="inputDoc", type="cosmosDB", connection_string_setting=COSMOS_CONN_STRING, database_name=COSMOS_DB_NAME, container_name=COSMOS_CONTAINER_NAME, id="{plan_id}", partitionKey="{plan_id}")
@app.generic_output_binding(arg_name="deleteDoc", type="cosmosDB", connection_string_setting=COSMOS_CONN_STRING, database_name=COSMOS_DB_NAME, container_name=COSMOS_CONTAINER_NAME)
@app.generic_output_binding(arg_name="signalR", type="signalR", hub_name=SIGNALR_HUB_NAME, connection_string_setting=SIGNALR_CONN_STRING)
def delete_plan(req: func.HttpRequest, inputDoc: func.DocumentList, signalR: func.Out[str], deleteDoc: func.Out[func.Document]) -> func.HttpResponse:
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
        signalR.set(json.dumps({"target": "planDeleted", "arguments": [{"id": plan_id}]}))

        return func.HttpResponse(
            json.dumps({"status": "success", "id": plan_id}),
            mimetype="application/json",
        )
    except Exception as e:
        logging.error(f"Error in delete_plan: {str(e)}")
        return func.HttpResponse(json.dumps({"error": str(e)}), status_code=500, mimetype="application/json")

@app.route(route="addDate/{plan_id}", auth_level=func.AuthLevel.ANONYMOUS, methods=["POST"])
@app.generic_output_binding(arg_name="outputDoc", type="cosmosDB", connection_string_setting=COSMOS_CONN_STRING, database_name=COSMOS_DB_NAME, container_name=COSMOS_CONTAINER_NAME)
@app.generic_output_binding( arg_name="signalR", type="signalR", hub_name=SIGNALR_HUB_NAME, connection_string_setting=SIGNALR_CONN_STRING)
def add_date(req: func.HttpRequest, outputDoc: func.Out[str], signalR: func.Out[str]) -> func.HttpResponse:
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
            "createdBy": date_data.get("createdBy")
        }
        missing_fields = [x for x, y in required_fields.items() if not y]
        if missing_fields:
            return func.HttpResponse(
                json.dumps({"error": "Missing required fields from JSON", "missing": missing_fields}),
                status_code=400,
                mimetype="application/json"
            )
        
        # Build date document
        id = required_fields["id"]
        created_by = required_fields["createdBy"]
        date_id = f"date|{id}"
        current_time = int(datetime.now(timezone.utc).timestamp() * 1000)
        doc = {
            "plan": plan_id,
            "id": date_id,
            "type": "date",
            "createdBy": created_by,
            "createdAt": current_time,
            "lastUpdatedBy": created_by,
            "lastUpdatedAt": current_time,
        }

        logging.info(f"Attempting to save document to CosmosDB: {doc}")
        outputDoc.set(json.dumps(doc))

        # Send SignalR message to clients
        signalR.set(json.dumps({"target": "dateAdded", "arguments": [doc]}))

        return func.HttpResponse(
            json.dumps({"status": "success", "date": dict(doc)}),
            mimetype="application/json",
        )
    except Exception as e:
        logging.error(f"Error in add_date: {str(e)}")
        return func.HttpResponse(json.dumps({"error": str(e)}), status_code=500, mimetype="application/json")
    
@app.route(route="deleteDate/{plan_id}/{date_id}", methods=["DELETE"], auth_level=func.AuthLevel.ANONYMOUS)
@app.generic_input_binding(arg_name="inputDoc", type="cosmosDB", connection_string_setting=COSMOS_CONN_STRING, database_name=COSMOS_DB_NAME, container_name=COSMOS_CONTAINER_NAME, id="{date_id}", partitionKey="{plan_id}")
@app.generic_output_binding(arg_name="deleteDoc", type="cosmosDB", connection_string_setting=COSMOS_CONN_STRING, database_name=COSMOS_DB_NAME, container_name=COSMOS_CONTAINER_NAME)
@app.generic_output_binding(arg_name="signalR", type="signalR", hub_name=SIGNALR_HUB_NAME, connection_string_setting=SIGNALR_CONN_STRING)
def delete_date(req: func.HttpRequest, inputDoc: func.DocumentList, signalR: func.Out[str], deleteDoc: func.Out[func.Document]) -> func.HttpResponse:
    """
    Delete date item.
    """
    try:
        logging.info("Starting delete_date function")
        
        # Get route parameters
        plan_id = req.route_params.get("plan_id")
        date_id = req.route_params.get("date_id")

        if not inputDoc:
            return func.HttpResponse(
                json.dumps({"error": f"Date '{date_id}' not found in plan '{plan_id}'"}),
                status_code=404,
                mimetype="application/json",
            )

        # Mark doc for deletion
        inputDoc = list(inputDoc)[0]
        inputDoc["ttl"] = 1
        deleteDoc.set(inputDoc)

        logging.info(f"Document marked for deletion: {date_id}")

        # Send SignalR message to clients
        signalR.set(json.dumps({"target": "dateDeleted", "arguments": [{"id": date_id}]}))

        return func.HttpResponse(
            json.dumps({"status": "success", "id": date_id}),
            mimetype="application/json",
        )
    except Exception as e:
        logging.error(f"Error in delete_date: {str(e)}")
        return func.HttpResponse(json.dumps({"error": str(e)}), status_code=500, mimetype="application/json")
    
@app.route(route="addActivity/{plan_id}/{date_id}", auth_level=func.AuthLevel.ANONYMOUS, methods=["POST"])
@app.generic_output_binding(arg_name="outputDoc", type="cosmosDB", connection_string_setting=COSMOS_CONN_STRING, database_name=COSMOS_DB_NAME, container_name=COSMOS_CONTAINER_NAME)
@app.generic_output_binding( arg_name="signalR", type="signalR", hub_name=SIGNALR_HUB_NAME, connection_string_setting=SIGNALR_CONN_STRING)
def add_activity(req: func.HttpRequest, outputDoc: func.Out[str], signalR: func.Out[str]) -> func.HttpResponse:
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
            "createdBy": activity_data.get("createdBy")
        }
        missing_fields = [x for x, y in required_fields.items() if not y]
        if missing_fields:
            return func.HttpResponse(
                json.dumps({"error": "Missing required fields from JSON", "missing": missing_fields}),
                status_code=400,
                mimetype="application/json"
            )
        
        # Build empty activity document
        current_time = int(datetime.now(timezone.utc).timestamp() * 1000)
        created_by = required_fields["createdBy"]
        id = required_fields["id"]
        activity_id = f"{date_id}|activity|{id}"
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

        logging.info(f"Attempting to save document to CosmosDB: {doc}")
        outputDoc.set(json.dumps(doc))

        # Send SignalR message to clients
        signalR.set(json.dumps({"target": "activityAdded", "arguments": [doc]}))

        return func.HttpResponse(
            json.dumps({"status": "success", "activity": dict(doc)}),
            mimetype="application/json",
        )
    except Exception as e:
        logging.error(f"Error in add_activity: {str(e)}")
        return func.HttpResponse(json.dumps({"error": str(e)}), status_code=500, mimetype="application/json")

@app.route(route="deleteActivity/{plan_id}/{date_id}/{activity_id}", methods=["DELETE"], auth_level=func.AuthLevel.ANONYMOUS)
@app.generic_input_binding(arg_name="inputDoc", type="cosmosDB", connection_string_setting=COSMOS_CONN_STRING, database_name=COSMOS_DB_NAME, container_name=COSMOS_CONTAINER_NAME, id="{activity_id}", partitionKey="{plan_id}")
@app.generic_output_binding(arg_name="deleteDoc", type="cosmosDB", connection_string_setting=COSMOS_CONN_STRING, database_name=COSMOS_DB_NAME, container_name=COSMOS_CONTAINER_NAME)
@app.generic_output_binding(arg_name="signalR", type="signalR", hub_name=SIGNALR_HUB_NAME, connection_string_setting=SIGNALR_CONN_STRING)
def delete_activity(req: func.HttpRequest, inputDoc: func.DocumentList, signalR: func.Out[str], deleteDoc: func.Out[func.Document]) -> func.HttpResponse:
    """
    Delete activity.
    """
    try:
        logging.info("Starting delete_activity function")
        
        # Get route parameters
        plan_id = req.route_params.get("plan_id")
        date_id = req.route_params.get("date_id")
        activity_id = req.route_params.get("activity_id")

        if not inputDoc:
            return func.HttpResponse(
                json.dumps({"error": f"Activity {activity_id} not found in plan {plan_id} on date {date_id}"}),
                status_code=404,
                mimetype="application/json",
            )

        # Mark doc for deletion
        inputDoc = list(inputDoc)[0]
        inputDoc["ttl"] = 1
        deleteDoc.set(inputDoc)

        logging.info(f"Document marked for deletion: {activity_id}")

        # Send SignalR message to clients
        signalR.set(json.dumps({"target": "activityDeleted", "arguments": [{"id": activity_id}]}))

        return func.HttpResponse(
            json.dumps({"status": "success", "id": activity_id}),
            mimetype="application/json",
        )
    except Exception as e:
        logging.error(f"Error in delete_activity: {str(e)}")
        return func.HttpResponse(json.dumps({"error": str(e)}), status_code=500, mimetype="application/json")

@app.route(route="lockActivity/{plan_id}/{date_id}/{activity_id}", methods=["POST"], auth_level=func.AuthLevel.ANONYMOUS)
@app.generic_input_binding(arg_name="inputDoc", type="cosmosDB", connection_string_setting=COSMOS_CONN_STRING, database_name=COSMOS_DB_NAME, container_name=COSMOS_CONTAINER_NAME, id="{activity_id}", partitionKey="{plan_id}")
@app.generic_output_binding(arg_name="signalR", type="signalR", hub_name=SIGNALR_HUB_NAME, connection_string_setting=SIGNALR_CONN_STRING)
def lock_activity(req: func.HttpRequest, inputDoc: func.DocumentList, signalR: func.Out[str]) -> func.HttpResponse:
    """
    Lock activity.
    """
    try:
        logging.info("Starting lock_activity function")
        
        # Get route parameters
        plan_id = req.route_params.get("plan_id")
        date_id = req.route_params.get("date_id")
        activity_id = req.route_params.get("activity_id")

        if not inputDoc:
            return func.HttpResponse(
                json.dumps({"error": f"Activity '{activity_id}' not found in plan '{plan_id}' on date '{date_id}'"}),
                status_code=404,
                mimetype="application/json",
            )

        logging.info(f"Document marked for deletion: {activity_id}")

        # Send SignalR message to clients
        signalR.set(json.dumps({"target": "lockActivity", "arguments": [{"id": activity_id}]}))

        return func.HttpResponse(
            json.dumps({"status": "success", "id": activity_id}),
            mimetype="application/json",
        )
    except Exception as e:
        logging.error(f"Error in lock_activity: {str(e)}")
        return func.HttpResponse(json.dumps({"error": str(e)}), status_code=500, mimetype="application/json")

@app.route(route="updateActivity/{plan_id}/{date_id}/{activity_id}", methods=["PATCH"], auth_level=func.AuthLevel.ANONYMOUS)
@app.generic_input_binding(arg_name="inputDoc", type="cosmosDB", connection_string_setting=COSMOS_CONN_STRING, database_name=COSMOS_DB_NAME, container_name=COSMOS_CONTAINER_NAME, id="{activity_id}", partitionKey="{plan_id}")
@app.generic_output_binding(arg_name="updateDoc", type="cosmosDB", connection_string_setting=COSMOS_CONN_STRING, database_name=COSMOS_DB_NAME, container_name=COSMOS_CONTAINER_NAME)
@app.generic_output_binding(arg_name="deleteDoc", type="cosmosDB", connection_string_setting=COSMOS_CONN_STRING, database_name=COSMOS_DB_NAME, container_name=COSMOS_CONTAINER_NAME)
@app.generic_output_binding(arg_name="signalR", type="signalR", hub_name=SIGNALR_HUB_NAME, connection_string_setting=SIGNALR_CONN_STRING)
def update_activity(req: func.HttpRequest, inputDoc: func.DocumentList, signalR: func.Out[str], updateDoc: func.Out[func.Document], deleteDoc: func.Out[func.Document]) -> func.HttpResponse:
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
        
        # Validate required JSON fields
        required_fields = {
            "activityText": activity_data.get("activityText"),
            "activityIdx": activity_data.get("activityIdx"),
            "updatedBy": activity_data.get("updatedBy")
        }
        missing_fields = [x for x, y in required_fields.items() if not y]
        if missing_fields:
            return func.HttpResponse(
                json.dumps({"error": "Missing required fields from JSON", "missing": missing_fields}),
                status_code=400,
                mimetype="application/json"
            )

        if not inputDoc:
            return func.HttpResponse(
                json.dumps({"error": f"Activity '{activity_id}' not found in plan '{plan_id}' on date '{date_id}'"}),
                status_code=404,
                mimetype="application/json",
            )   
        
        # Determine if activity needs to be moved
        inputDoc = list(inputDoc)[0]
        prev_activity_id = inputDoc.get("id")
        activity_idx = required_fields["activityIdx"]
        activity_id = f"{date_id}|activity|{activity_idx}"

        if activity_id != prev_activity_id:
            # Move activity
            newDoc = dict(inputDoc)
            newDoc["id"] = activity_id
            newDoc["activityText"] = required_fields["activityText"]
            newDoc["lastUpdatedBy"] = required_fields["updatedBy"]
            newDoc["lastUpdatedAt"] = int(datetime.now(timezone.utc).timestamp() * 1000)
            updateDoc.set(func.Document.from_dict(newDoc))
            
            # Mark old doc for deletion
            oldDoc = dict(inputDoc)
            oldDoc["ttl"] = 1
            deleteDoc.set(func.Document.from_dict(oldDoc))
            
            logging.info(f"Activity moved: {prev_activity_id} -> {activity_id}")
            responseDoc = newDoc
        else:
            # Update existing doc
            inputDoc["activityText"] = required_fields["activityText"]
            inputDoc["lastUpdatedBy"] = required_fields["updatedBy"]
            inputDoc["lastUpdatedAt"] = int(datetime.now(timezone.utc).timestamp() * 1000)
            updateDoc.set(inputDoc)
            
            logging.info(f"Activity updated: {activity_id}")
            responseDoc = dict(inputDoc)

        # Send SignalR message to clients
        signalR.set(json.dumps({"target": "activityUpdated", "arguments": [{"activity": responseDoc}]}))

        return func.HttpResponse(
            json.dumps({"status": "success", "activity": responseDoc}),
            mimetype="application/json",
        )
    except Exception as e:
        logging.error(f"Error in update_activity: {str(e)}")
        return func.HttpResponse(json.dumps({"error": str(e)}), status_code=500, mimetype="application/json")