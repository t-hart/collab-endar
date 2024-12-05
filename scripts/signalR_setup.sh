#!/bin/bash

signalrName=mySignalRName
region=eastus


az signalr create -n $signalrName -g $RESOURCE_GROUP --service-mode Serverless --sku Free_F1
# Get connection string for later use.
# connectionString=$(az signalr key list -n $signalrName -g $RESOURCE_GROUP --query primaryConnectionString -o tsv)