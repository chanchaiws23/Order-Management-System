import { DomainEvent } from '../../domain/events/DomainEvent';

export interface IEventObserver {
  readonly observerName: string;
  
  handleEvent(event: DomainEvent): Promise<void>;
  
  supports(eventType: string): boolean;
}

export interface IEventPublisher {
  publish(event: DomainEvent): Promise<void>;
  
  publishAll(events: DomainEvent[]): Promise<void>;
  
  subscribe(observer: IEventObserver): void;
  
  unsubscribe(observerName: string): void;
  
  getSubscribers(): ReadonlyArray<IEventObserver>;
}
