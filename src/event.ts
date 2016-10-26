import { Direction, IArcDirective, IArcEvent } from './model';

export class ArcEvent implements IArcEvent {

  public readonly directive: IArcDirective;
  public next: Element;

  public readonly event: Direction;
  public readonly target: Element;

  public defaultPrevented = false;
  public propagationStopped = false;

  constructor(opts: {
    directive: IArcDirective,
    next: Element,
    event: Direction,
    target: Element
  }) { Object.assign(this, opts); }

  public stopPropagation() {
    this.propagationStopped = true;
  }

  public preventDefault() {
    this.defaultPrevented = false;
  }
}
