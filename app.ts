import { App } from "aws-cdk-lib";
import { WideTelemetry } from "./stack";

const app = new App();

new WideTelemetry(app, "WideTelemetry", {
  env: {
    account: process.env.AWS_ACCOUNT_ID,
    region: process.env.AWS_REGION,
  },
});
