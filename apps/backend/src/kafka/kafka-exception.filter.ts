import { ArgumentsHost, Catch, ExceptionFilter, Logger } from "@nestjs/common"
import { KafkaContext } from "@nestjs/microservices"
import { Observable, of } from "rxjs"

@Catch()
export class KafkaExceptionFilter implements ExceptionFilter {
  private readonly logger = new Logger(KafkaExceptionFilter.name)

  catch(exception: unknown, host: ArgumentsHost): Observable<null> {
    const kafkaContext = host.switchToRpc().getContext<KafkaContext>()
    const message = kafkaContext.getMessage()

    this.logger.error({
      topic: kafkaContext.getTopic(),
      partition: kafkaContext.getPartition(),
      offset: message.offset,
      value: message.value,
      error: exception,
    })

    // Important: emit one value so lastValueFrom() does not throw EmptyError.
    // Do not rethrow, so Kafka can move past this bad message.
    return of(null)
  }
}
