import { Logger } from "@aws-lambda-powertools/logger";
import { type TaskTelemetry } from "../stack";

interface HandlerEvent {
  FunctionName: string;
  Payload: TaskTelemetry;
}

const logger = new Logger({
  serviceName: process.env.SERVICE_NAME,
});

export const handler = async (event: HandlerEvent) => {
  Object.keys(event.Payload).map((key) => {
    event.Payload[key].log.map((log) => {
      return logger.info(log.input);
    });
  });

  return;
};
