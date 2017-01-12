import { Direction, IArcDirective, IArcEvent } from './model';

export class ArcEvent implements IArcEvent {

  public readonly directive: IArcDirective;
  public next: HTMLElement;

  public readonly event: Direction;
  public readonly target: HTMLElement;

  public defaultPrevented = false;
  public propagationStopped = false;

  constructor(opts: {
    directive: IArcDirective,
    next: HTMLElement,
    event: Direction,
    target: HTMLElement
  }) { Object.assign(this, opts); }

  public stopPropagation() {
    this.propagationStopped = true;
  }

  public preventDefault() {
    this.defaultPrevented = true;
  }
}
