import { DomainEvent } from '../../domain/events/DomainEvent';
import {
  IEventPublisher,
  IEventObserver,
} from '../../application/interfaces/IEventPublisher';

export class EventPublisher implements IEventPublisher {
  private readonly observers: Map<string, IEventObserver> = new Map();

  async publish(event: DomainEvent): Promise<void> {
    console.log(`[EventPublisher] Publishing event: ${event.eventType}`);

    const relevantObservers = Array.from(this.observers.values()).filter(
      (observer) => observer.supports(event.eventType)
    );

    if (relevantObservers.length === 0) {
      console.log(`[EventPublisher] No observers for event: ${event.eventType}`);
      return;
    }

    const results = await Promise.allSettled(
      relevantObservers.map((observer) => observer.handleEvent(event))
    );

    results.forEach((result, index) => {
      const observer = relevantObservers[index];
      if (result.status === 'rejected') {
        console.error(
          `[EventPublisher] Observer '${observer.observerName}' failed: ${result.reason}`
        );
      } else {
        console.log(
          `[EventPublisher] Observer '${observer.observerName}' handled event successfully`
        );
      }
    });
  }

  async publishAll(events: DomainEvent[]): Promise<void> {
    console.log(`[EventPublisher] Publishing ${events.length} event(s)`);

    for (const event of events) {
      await this.publish(event);
    }
  }

  subscribe(observer: IEventObserver): void {
    if (this.observers.has(observer.observerName)) {
      console.warn(
        `[EventPublisher] Observer '${observer.observerName}' is already subscribed`
      );
      return;
    }

    this.observers.set(observer.observerName, observer);
    console.log(`[EventPublisher] Subscribed observer: ${observer.observerName}`);
  }

  unsubscribe(observerName: string): void {
    if (!this.observers.has(observerName)) {
      console.warn(
        `[EventPublisher] Observer '${observerName}' is not subscribed`
      );
      return;
    }

    this.observers.delete(observerName);
    console.log(`[EventPublisher] Unsubscribed observer: ${observerName}`);
  }

  getSubscribers(): ReadonlyArray<IEventObserver> {
    return Array.from(this.observers.values());
  }
}
