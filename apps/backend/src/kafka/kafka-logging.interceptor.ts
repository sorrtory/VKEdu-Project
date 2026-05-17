// kafka-logging.interceptor.ts

import {
  CallHandler,
  ExecutionContext,
  Injectable,
  Logger,
  NestInterceptor,
} from "@nestjs/common"
import { KafkaContext } from "@nestjs/microservices"
import { Observable } from "rxjs"

@Injectable()
export class KafkaLoggingInterceptor implements NestInterceptor {
  private readonly logger = new Logger(KafkaLoggingInterceptor.name)

  intercept(context: ExecutionContext, next: CallHandler): Observable<any> {
    const kafkaContext = context.switchToRpc().getContext<KafkaContext>()
    const message = kafkaContext.getMessage()

    this.logger.log({
      topic: kafkaContext.getTopic(),
      partition: kafkaContext.getPartition(),
      offset: message.offset,
      value: message.value,
    })

    // Log after the handler has processed the message
    // const startedAt = Date.now()
    // return next.handle().pipe(
    //   tap(() => {
    //     this.logger.log({
    //       topic: kafkaContext.getTopic(),
    //       partition: kafkaContext.getPartition(),
    //       offset: message.offset,
    //       durationMs: Date.now() - startedAt,
    //     })
    //   }),
    // )
    return next.handle()
  }
}
