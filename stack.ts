import path from "path";
import {
  LogItemExtraInput,
  LogItemMessage,
} from "@aws-lambda-powertools/logger/types";
import { App, Stack, StackProps } from "aws-cdk-lib";
import { Architecture, Runtime } from "aws-cdk-lib/aws-lambda";
import { NodejsFunction } from "aws-cdk-lib/aws-lambda-nodejs";
import { LogGroup } from "aws-cdk-lib/aws-logs";
import {
  DefinitionBody,
  LogLevel,
  Parallel,
  Pass,
  Result,
  StateMachine,
  StateMachineType,
  TaskInput,
} from "aws-cdk-lib/aws-stepfunctions";
import { LambdaInvoke } from "aws-cdk-lib/aws-stepfunctions-tasks";

interface Annotation {
  [key: string]: string | number | boolean;
}

interface Log {
  input: LogItemMessage;
  extraInput?: LogItemExtraInput[];
}

interface Telemetry {
  log: Log[];
  trace: Annotation[];
}

export interface TaskTelemetry {
  [key: string]: Telemetry;
}

export class WideTelemetry extends Stack {
  constructor(scope: App, id: string, props?: StackProps) {
    super(scope, id, props);

    const SERVICE_NAME = this.stackName;

    const wideLogger = new NodejsFunction(this, "WideLogger", {
      architecture: Architecture.ARM_64,
      entry: path.join(path.resolve(), "functions/wide-logger.ts"),
      environment: {
        SERVICE_NAME: SERVICE_NAME,
      },
      functionName: "WideLogger",
      runtime: Runtime.NODEJS_20_X,
    });

    const wideTracer = new NodejsFunction(this, "WideTracer", {
      architecture: Architecture.ARM_64,
      entry: path.join(path.resolve(), "functions/wide-tracer.ts"),
      environment: {
        SERVICE_NAME: SERVICE_NAME,
      },
      functionName: "WideTracer",
      runtime: Runtime.NODEJS_20_X,
    });

    new StateMachine(this, "WideTelemetry", {
      // TODO: LambdaInvoke example
      definitionBody: DefinitionBody.fromChainable(
        new Pass(this, "SimplePass", {
          result: Result.fromObject({
            log: [{ input: "log me" }],
            trace: [{ key: "value" }],
          } as Telemetry),
          resultPath: "$.taskTelemetry.simplePass",
        }).next(
          new Parallel(this, "PutWideTelemetry")
            .branch(
              new LambdaInvoke(this, "CallWideLogger", {
                lambdaFunction: wideLogger,
                payload: TaskInput.fromJsonPathAt("$.taskTelemetry"),
              }),
            )
            .branch(
              new LambdaInvoke(this, "CallWideTracer", {
                lambdaFunction: wideTracer,
                payload: TaskInput.fromJsonPathAt("$.taskTelemetry"),
              }),
            ),
        ),
      ),
      logs: {
        destination: new LogGroup(this, "WideTelemetryLogs", {
          logGroupName: "/aws/vendedlogs/states/widetelemetry",
        }),
        includeExecutionData: true,
        level: LogLevel.ALL,
      },
      stateMachineName: "WideTelemetry",
      stateMachineType: StateMachineType.EXPRESS,
      tracingEnabled: true,
    });
  }
}
