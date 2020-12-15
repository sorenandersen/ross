# ROSS

Restaurant Ordering System with Serverless.

- [Architecture](./docs/architecture.md)
- [User stories](./docs/user-stories.md)
- [Use cases](./docs/use-cases.md)
- [Data model](./docs/data-model.md)

## Getting started

### Codebase organization

This application is separated into services that are individually deployed to AWS' cloud

- infra: Contains core infrastructure resources that change infrequently such as DynamoDB tables, Cognito resources, EventBridge custom service bus, SQS queues and S3 buckets.
- rest-api: Contains Lambda and API Gateway resources comprising the RESTful API as well as functions for background processing.

### Development hint: TypeScript compiler in watch mode

In VS Code, open the integrated terminal. Once open, click _Split Terminal_ to get two terminals side-by-side.

In the one teminal run `npm run tsc` to start the TypeScript compiler in watch mode. It'll watch input files and trigger recompilation on changes, giving immediate feedback on syntax or type errors (`.ts` files only) that might have crept in.

## Build and deployment

```
# Once for the terminal session
#export AWS_PROFILE=TODO

# Deploy infrastructure stack
npm run infra:deploy

# Deploy REST API stack
npm run api:deploy
```

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
