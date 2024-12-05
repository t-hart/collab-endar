import json
import logging
import uuid
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
@app.generic_output_binding(arg_name="outputDocument", type="cosmosDB", connection_string_setting=COSMOS_CONN_STRING, database_name=COSMOS_DB_NAME, container_name=COSMOS_CONTAINER_NAME)
@app.generic_output_binding( arg_name="signalR", type="signalR", hub_name=SIGNALR_HUB_NAME, connection_string_setting=SIGNALR_CONN_STRING)
def create_plan(req: func.HttpRequest, outputDocument: func.Out[str], signalR: func.Out[str]) -> func.HttpResponse:
    """
    Create new plan.
    """
    try:
        logging.info("Starting create_plan function")
        plan_data = req.get_json()

        plan_id = f"plan_{str(uuid.uuid4())[:8]}"
        current_time = int(datetime.now(timezone.utc).timestamp() * 1000)

        document = {
            "plan": plan_id,
            "id": plan_id,
            "type": "plan",
            "planName": plan_data.get("planName"),
            "createdBy": plan_data.get("createdBy", "anonymous"),
            "createdAt": current_time,
            "lastUpdatedAt": current_time,
        }

        logging.info(f"Attempting to save document to CosmosDB: {document}")
        outputDocument.set(json.dumps(document))

        # Send SignalR message to clients
        signalR.set(json.dumps({"target": "planCreated", "arguments": [document]}))

        return func.HttpResponse(
            json.dumps({"status": "success", "plan": document}),
            mimetype="application/json",
        )
    except Exception as e:
        logging.error(f"Error in create_plan: {str(e)}")
        return func.HttpResponse(json.dumps({"error": str(e)}), status_code=500, mimetype="application/json")

@app.route(route="deletePlan/{plan_id}", methods=["DELETE"], auth_level=func.AuthLevel.ANONYMOUS)
@app.generic_input_binding(arg_name="inputDocument", type="cosmosDB", connection_string_setting=COSMOS_CONN_STRING, database_name=COSMOS_DB_NAME, container_name=COSMOS_CONTAINER_NAME, id="{plan_id}", partitionKey="{plan_id}")
@app.generic_output_binding(arg_name="outputDocument", type="cosmosDB", connection_string_setting=COSMOS_CONN_STRING, database_name=COSMOS_DB_NAME, container_name=COSMOS_CONTAINER_NAME)
@app.generic_output_binding(arg_name="signalR", type="signalR", hub_name=SIGNALR_HUB_NAME, connection_string_setting=SIGNALR_CONN_STRING)
def delete_plan(req: func.HttpRequest, inputDocument: func.DocumentList, signalR: func.Out[str], outputDocument: func.Out[func.Document]) -> func.HttpResponse:
    """
    Delete existing plan.
    """
    try:
        logging.info("Starting delete_plan function")
        plan_id = req.route_params.get("plan_id")

        if not plan_id:
            return func.HttpResponse(
                json.dumps({"error": "plan_id is required"}),
                status_code=400,
                mimetype="application/json",
            )

        if not inputDocument:
            return func.HttpResponse(
                json.dumps({"error": f"Plan {plan_id} not found"}),
                status_code=404,
                mimetype="application/json",
            )

        doc = list(inputDocument)[0]
        doc["ttl"] = 1
        outputDocument.set(doc)

        logging.info(f"Document marked for deletion: {plan_id}")

        # Send SignalR message to clients
        signalR.set(json.dumps({"target": "planDeleted", "arguments": [{"plan": plan_id}]}))

        return func.HttpResponse(
            json.dumps({"status": "success", "planId": plan_id}),
            mimetype="application/json",
        )
    except Exception as e:
        logging.error(f"Error in delete_plan: {str(e)}")
        return func.HttpResponse(json.dumps({"error": str(e)}), status_code=500, mimetype="application/json")
