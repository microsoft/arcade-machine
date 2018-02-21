import { Direction, IArcEvent, IArcHandler } from './model';

export class ArcEvent implements IArcEvent {
  public readonly directive?: IArcHandler;
  public readonly event: Direction;
  public readonly target: HTMLElement | null;
  public next: HTMLElement | null;

  public defaultPrevented = false;
  public propagationStopped = false;

  constructor({
    event,
    target,
    next,
    directive,
  }: {
    directive?: IArcHandler;
    next: HTMLElement | null;
    event: Direction;
    target: HTMLElement | null;
  }) {
    this.directive = directive;
    this.event = event;
    this.target = target;
    this.next = next;
  }

  public stopPropagation() {
    this.propagationStopped = true;
  }

  public preventDefault() {
    this.defaultPrevented = true;
  }
}
