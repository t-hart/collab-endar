import azure.functions as func
import logging
import json

app = func.FunctionApp(http_auth_level=func.AuthLevel.ANONYMOUS)


@app.route(route="getPlan")
def getPlan(req: func.HttpRequest) -> func.HttpResponse:
    logging.info("Python HTTP trigger function processed a request.")

    name = req.params.get("name")
    if not name:
        try:
            req_body = req.get_json()
        except ValueError:
            pass
        else:
            name = req_body.get("name")

    if name:
        logging.info("Responding with personalized msg")
        return func.HttpResponse(
            json.dumps(
                {
                    "result": f"Hello, {name} - 11/25/2024 . This HTTP triggered function executed successfully."
                }
            ),
            mimetype="application/json",
            status_code=200,
        )

    logging.info("Responding with no personalized msg")
    return func.HttpResponse(
        json.dumps(
            {
                "result": "Executed successfully. Pass a name in the query string or in the request body for a personalized response."
            }
        ),
        mimetype="application/json",
        status_code=200,
    )


@app.route(route="negotiate", auth_level=func.AuthLevel.ANONYMOUS, methods=["GET", "POST", "OPTIONS"])
# @app.route(route="negotiate", auth_level=func.AuthLevel.ANONYMOUS, methods=["POST"])
@app.generic_input_binding(
    arg_name="connectionInfo",
    type="signalRConnectionInfo",
    hubName="chatHub",
    connectionStringSetting="AzureSignalRConnectionString"
)
def negotiate(req: func.HttpRequest, connectionInfo) -> func.HttpResponse:
    logging.info(f'Negotiate function called. Method: {req.method}')
    logging.info(f'Request headers: {dict(req.headers)}')
    return func.HttpResponse(connectionInfo)
    # Handle OPTIONS request for CORS
    if req.method == "OPTIONS":
        return func.HttpResponse(
            status_code=200,
            headers={
                'Access-Control-Allow-Origin': '*',
                'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
                'Access-Control-Allow-Headers': 'Content-Type, Authorization',
                'Access-Control-Max-Age': '86400'
            }
        )

    try:
        # For actual negotiate requests
        logging.info('Returning response with connInfo')
        return func.HttpResponse(
            json.dumps({"data": connectionInfo}),
            # connectionInfo,
            status_code=200,
            headers={
                'Content-Type': 'application/json',
                'Access-Control-Allow-Origin': '*',
                'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
                'Access-Control-Allow-Headers': 'Content-Type, Authorization'
            }
        )
    except Exception as e:
        logging.error(f'Error in negotiate: {str(e)}')
        return func.HttpResponse(
            json.dumps({"error": str(e)}),
            status_code=500,
            mimetype="application/json"
        )

@app.route(route="broadcast", methods=["POST"], auth_level=func.AuthLevel.ANONYMOUS)
@app.generic_output_binding(
    arg_name="signalr",
    type="signalR",
    hubName="chatHub",
    connectionStringSetting="AzureSignalRConnectionString"
)
def broadcast(req: func.HttpRequest, signalr) -> func.HttpResponse:
    logging.info("broadcast triggered")
    try:
        body = req.get_json()
        signalr.set(json.dumps({
            'target': 'newMessage',
            'arguments': [body]
        }))
        return func.HttpResponse(
            json.dumps({"status": "Message broadcasted"}),
            mimetype="application/json"
        )
    except Exception as e:
        return func.HttpResponse(
            json.dumps({"error": str(e)}),
            status_code=500,
            mimetype="application/json"
        )
        
