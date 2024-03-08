import { Tracer } from "@aws-lambda-powertools/tracer";
import { type TaskTelemetry } from "../stack";

interface HandlerEvent {
  FunctionName: string;
  Payload: TaskTelemetry;
}

const tracer = new Tracer({ serviceName: process.env.SERVICE_NAME });

export const handler = async (event: HandlerEvent) => {
  // TODO: decorator: subsegment, tracer.annotateColdStart(), tracer.addServiceNameAnnotation();

  Object.keys(event.Payload).map((key) => {
    event.Payload[key].trace.map((trace) => {
      return tracer.putAnnotation(Object.keys(trace)[0], trace.value);
    });
  });

  return;
};
