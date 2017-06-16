import { Direction, IArcEvent, IArcHandler } from './model';

export class ArcEvent implements IArcEvent {

  public readonly directive: IArcHandler;
  public next: HTMLElement;

  public readonly event: Direction;
  public readonly target: HTMLElement;

  public defaultPrevented = false;
  public propagationStopped = false;

  constructor(opts: {
    directive?: IArcHandler,
    next: HTMLElement | null,
    event: Direction,
    target: HTMLElement | null,
  }) { Object.assign(this, opts); }

  public stopPropagation() {
    this.propagationStopped = true;
  }

  public preventDefault() {
    this.defaultPrevented = true;
  }
}
