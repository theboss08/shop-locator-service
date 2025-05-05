import { DynamoDBClient } from "@aws-sdk/client-dynamodb";
import {
  DynamoDBDocumentClient,
  ScanCommand,
  PutCommand,
  GetCommand,
  DeleteCommand,
  QueryCommand
} from "@aws-sdk/lib-dynamodb";

import { randomUUID } from 'crypto';

import { CognitoIdentityProviderClient, GetUserCommand } from "@aws-sdk/client-cognito-identity-provider";

const client = new DynamoDBClient({});

const dynamo = DynamoDBDocumentClient.from(client);

const tableName = "items";

const cognitoClient = new CognitoIdentityProviderClient({ region: "us-east-1" });

const userPoolId = process.env.USER_POOL_ID;

const getUserDetails = async access_token => {
  const getUserCommand = new GetUserCommand({
    AccessToken : access_token
  });
  return await cognitoClient.send(getUserCommand);
};

export const handler = async (event, context) => {
  let body;
  let statusCode = 200;
  const headers = {
    "Access-Control-Allow-Origin": '*',
    "Content-Type": "application/json",
  };
  
  let userDetails = await getUserDetails(event.headers['x-amz-security-token']);

  try {
    switch (event.httpMethod) {
        case 'GET':
            if(event.httpMethod === 'GET' && event.resource === '/items') {
              if(event.queryStringParameters != null && event.queryStringParameters.lastEvaluatedKey != null) {
                body = await dynamo.send(
                  new QueryCommand({
                    TableName: tableName,
                    IndexName : 'username-index',
                    KeyConditionExpression: "username = :u",
                    // Limit: 5,
                    ExclusiveStartKey : {id: event.queryStringParameters.lastEvaluatedKey, username: userDetails.Username},
                    ExpressionAttributeValues : {":u" : userDetails.Username}
                  })
                );
              }
              else {
                body = await dynamo.send(
                  new QueryCommand({
                    TableName: tableName,
                    IndexName : 'username-index',
                    KeyConditionExpression: "username = :u",
                    Limit: 5,
                    ExpressionAttributeValues : {":u" : userDetails.Username}
                  })
                );
              }
            }
            else if (event.httpMethod === 'GET' && event.resource === '/items/search') {
              if (event.queryStringParameters != null && event.queryStringParameters.product != null) {
                body = await dynamo.send(
                  new ScanCommand({ TableName: tableName, FilterExpression : "contains(#name, :n) or contains(#description, :d) or contains(#category, :c)",
                  ExpressionAttributeNames: {
                    "#name": "name",
                    "#description": "description",
                    "#category": "category"
                  },
                  ExpressionAttributeValues : {
                    ":n" : event.queryStringParameters.product,
                    ":d" : event.queryStringParameters.product,
                    ":c" : event.queryStringParameters.product
                  }})
                );
                let storeList = new Set()
                let uniqueUserList = new Set()
                for (let item of body.Items) {
                  if (uniqueUserList.has(item.username)) continue;
                  uniqueUserList.add(item.username)
                  let store = await dynamo.send(
                    new QueryCommand({
                      TableName: 'stores',
                      KeyConditionExpression: "id = :i",
                      ExpressionAttributeValues: {
                        ":i": item.username
                      }
                    })
                  )
                  if (store.Items.length > 0) {
                    store.Items[0].price = item.price
                    storeList.add(store.Items[0])
                  }
                }
                body = {
                  stores: Array.from(storeList)
                }
              }
              else if (event.queryStringParameters != null && event.queryStringParameters.suggest != null) {
                body = await dynamo.send(
                  new ScanCommand({ TableName: tableName, FilterExpression : "contains(#name, :n) or contains(#description, :d) or contains(#category, :c)",
                  ExpressionAttributeNames: {
                    "#name": "name",
                    "#description": "description",
                    "#category": "category"
                  },
                  ExpressionAttributeValues : {
                    ":n" : event.queryStringParameters.suggest,
                    ":d" : event.queryStringParameters.suggest,
                    ":c" : event.queryStringParameters.suggest
                  }})
                );
                let uniqueSuggestions = {}
                for (let item of body.Items) {
                  uniqueSuggestions[item.name] = {name : item.name, description : item.description}
                }
                body = {
                  suggestions: Object.values(uniqueSuggestions)
                }
              }
            }
            else if (event.httpMethod === 'GET' && event.resource === '/items/store') {
              body = await dynamo.send(
                new QueryCommand({
                  TableName: 'stores',
                  KeyConditionExpression: "id = :i",
                  ExpressionAttributeValues: {
                    ":i": userDetails.Username
                  }
                })
              );
            }
            else if(event.httpMethod === 'GET' && event.resource === '/items/{id}') {
                body = await dynamo.send(
                  new QueryCommand({ TableName: tableName, KeyConditionExpression: "id = :i", FilterExpression : "username = :u", ExpressionAttributeValues : {
                    ":i" : event.pathParameters.id,
                    ":u" : userDetails.Username
                  }})
                );
            }
            break;
        case 'PUT':
          if (event.httpMethod === 'PUT' && event.resource === '/items/store') {
            const putBody = JSON.parse(event.body);
            await dynamo.send(
              new PutCommand({
                TableName: 'stores',
                Item: {
                  id: userDetails.Username,
                  latitude: Number(putBody.latitude),
                  longitude: Number(putBody.longitude),
                  name: putBody.name,
                },
              })
            );
            body = `Put store ${userDetails.Username}`;
          }
          else if (event.httpMethod === 'PUT' && event.resource === '/items') {
            const putBody = JSON.parse(event.body);
            await dynamo.send(
              new PutCommand({
                TableName: tableName,
                Item: {
                  id: randomUUID(),
                  name : putBody.name,
                  description : putBody.description,
                  price : Number(putBody.price),
                  quantity : Number(putBody.quantity),
                  category : putBody.category,
                  username : userDetails.Username
                },
              })
            );
            body = `Put item ${event.body.id}`;
          }
          break;
        case 'POST':
          if (event.httpMethod === 'POST' && event.resource === '/items/{id}') {
            const postBody = JSON.parse(event.body);
            await dynamo.send(
              new PutCommand({
                TableName: tableName,
                Item: {
                  id: postBody.id,
                  name : postBody.name,
                  description : postBody.description,
                  price : Number(postBody.price),
                  quantity : Number(postBody.quantity),
                  category : postBody.category,
                  username : userDetails.Username
                },
              })
            );
            body = `Post item ${event.body.id}`;
          }
        case 'DELETE':
          if (event.httpMethod === 'DELETE' && event.resource === '/items/{id}') {
            await dynamo.send(
              new DeleteCommand({
                TableName: tableName,
                Key: {
                  id: event.pathParameters.id,
                },
              })
            );
            body = `Deleted item ${event.pathParameters.id}`;
          }
    }
    
  } catch (err) {
    statusCode = 400;
    console.log('err', err)
    body = err.message;
  } finally {
    body = JSON.stringify(body);
  }
  
  return {
    statusCode,
    body,
    headers,
  };
};