# ROSS

**R**estaurant **O**rdering **S**ystem with **S**erverless.

A sample serverless backend for managing restaurants, reservations (seatings), orders and users.

## Motivation

To skill up on serverless while designing, developing and testing a near real-world project that touches on the key AWS services for building event-driven applications with AWS' serverless stack.

### Sources of influence

- Paul Swail: Mentoring (thank you Paul!) as well as invaluable learnings from the fabulous [Serverless Testing Workshop](https://serverlessfirst.com/workshops/testing/)
- Yan Cui's [Production-Ready Serverless](https://theburningmonk.com/workshops/) workshop, equally fabulous

### Related posts

Posts covering some of my learnings from designing and developing this project.

- [Manage user profile data between Cognito and DynamoDB](https://www.sorenandersen.com/manage-user-profile-data-between-cognito-and-dynamodb/)
- [Design with DynamoDB Streams to avoid distributed transactions in Lambda](https://www.sorenandersen.com/use-dynamodb-streams-to-avoid-distributed-transactions/)

## Documentation

Docs and core use cases with architecural diagrams.

- [Architecture](./docs/architecture.md)
- [Core use cases](./docs/use-cases.md)
- [User stories](./docs/user-stories.md)
- [Data model](./docs/data-model.md)

## Getting started

### Codebase organization

This application is separated into stacks that are individually deployed to the AWS cloud.

- **infra**: Contains core infrastructure resources that change infrequently such as DynamoDB tables, Cognito resources, EventBridge custom service bus, SQS queues and S3 buckets.
- **rest-api**: Contains Lambda and API Gateway resources comprising the RESTful API as well as functions for background processing.

## Build and deployment

```
# Ensure correct profile, e.g. once for the terminal session run
export AWS_PROFILE=profile-name

# Deploy infrastructure stack
npm run infra:deploy

# Deploy REST API stack
npm run api:deploy
```

## Development

### TypeScript compiler in watch mode

In VS Code, open the integrated terminal. Once open, click _Split Terminal_ to get two terminals side-by-side.

In the one teminal run `npm run tsc` to start the TypeScript compiler in watch mode. It'll watch input files and trigger recompilation on changes, giving immediate feedback on syntax or type errors (`.ts` files only) that might have crept in.

## Test setup

Testing framework is Jest.

Groups of tests (`describe` blocks) as well as individual tests (`test`, `it`) accepts labels within their names to only run in certain modes. The following labels are supported:

- `[e2e]`: Instruct Jest runner to only include when running E2E tests

### Running the tests

```
npm run test-unit
npm run test-integration
npm run test-e2e
npm run test-all
```

### Manual testing

```
# GET /me
curl -H "Authorization: Bearer ACCESS_TOKEN" https://rl0a2vvuzk.execute-api.eu-west-1.amazonaws.com/me -i
```

#### Restaurants

```
# Fetch single restaurant (Customer and StaffUser role)
# GET /restaurants
curl -H "Authorization: Bearer ACCESS_TOKEN" https://rl0a2vvuzk.execute-api.eu-west-1.amazonaws.com/restaurants/restaurantId -i

# Fetch restaurants within specified region
# GET /restaurants/region/{region} (Customer role)
curl -H "Authorization: Bearer ACCESS_TOKEN" https://rl0a2vvuzk.execute-api.eu-west-1.amazonaws.com/restaurants/region/FOO -i

# Create restaurant
# POST /restaurants (StaffUser role)
curl -X POST -H "Authorization: Bearer ACCESS_TOKEN" -H "Content-Type: application/json" -d '{"name":"test-curl-1", "description":"test-curl","region":"NOT_SPECIFIED"}' https://rl0a2vvuzk.execute-api.eu-west-1.amazonaws.com/restaurants -i

# Update restaurant visibility to PUBLIC or PRIVATE (StaffUser role)
# PATCH /restaurants/{id}/visibility
curl -X PATCH -H "Authorization: Bearer ACCESS_TOKEN" -H "Content-Type: application/json" -d '{"visibility": "PUBLIC"}' https://rl0a2vvuzk.execute-api.eu-west-1.amazonaws.com/restaurants/restaurantId/visibility -i
```

#### Seatings

```
# Create seating (Customer role)
# POST /restaurants/{id}/seatings
curl -X POST -H "Authorization: Bearer ACCESS_TOKEN" -H "Content-Type: application/json" -d '{"seatingTime":"2021-01-26T18:30:00Z", "numSeats":2, "notes":"Notes"}' https://rl0a2vvuzk.execute-api.eu-west-1.amazonaws.com/restaurants/restaurantId/seatings -i

# Cancel seating (Customer role)
# DELETE /restaurants/{restaurantId}/seatings/{seatingId}/cancel
curl -X DELETE -H "Authorization: Bearer ACCESS_TOKEN" https://rl0a2vvuzk.execute-api.eu-west-1.amazonaws.com/restaurants/restaurantId/seatings/seatingId/cancel -i

# Accept seating (StaffUser role)
# PATCH /restaurants/{restaurantId}/seatings/{seatingId}/accept
curl -X PATCH -H "Authorization: Bearer ACCESS_TOKEN" https://rl0a2vvuzk.execute-api.eu-west-1.amazonaws.com/restaurants/restaurantId/seatings/seatingId/accept -i

# Decline seating (StaffUser role)
# PATCH /restaurants/{restaurantId}/seatings/{seatingId}/decline
curl -X PATCH -H "Authorization: Bearer ACCESS_TOKEN" https://rl0a2vvuzk.execute-api.eu-west-1.amazonaws.com/restaurants/restaurantId/seatings/seatingId/decline -i
```
