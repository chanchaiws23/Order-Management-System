export interface DomainEvent {
  readonly eventId: string;
  readonly occurredOn: Date;
  readonly eventType: string;
  readonly aggregateId: string;
}

export abstract class BaseDomainEvent implements DomainEvent {
  readonly eventId: string;
  readonly occurredOn: Date;
  abstract readonly eventType: string;
  abstract readonly aggregateId: string;

  constructor(eventId: string) {
    this.eventId = eventId;
    this.occurredOn = new Date();
  }
}
