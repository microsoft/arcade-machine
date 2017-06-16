export const directiveName = 'arc';

/**
 * Direction is an enum of possible gamepad events which can fire.
 */
export enum Direction {
  SUBMIT = 0,
  BACK = 1,
  X = 2,
  Y = 3,
  TABLEFT = 4, // Left Bumper
  TABRIGHT = 5, // Right Bumper
  TABUP = 6, // Left Trigger
  TABDOWN = 7, // Right Trigger
  VIEW = 8, // Left small button aka start
  MENU = 9, // Right small button
  UP = 12,
  DOWN = 13,
  LEFT = 14,
  RIGHT = 15,
}

/**
 * Returns if the direction is left or right.
 */
export function isHorizontal(direction: Direction) {
  return direction === Direction.LEFT || direction === Direction.RIGHT;
}

/**
 * Returns if the direction is up or down.
 */
export function isVertical(direction: Direction) {
  return direction === Direction.UP || direction === Direction.DOWN;
}

/**
 * IArcEvents are fired on an element when an input occurs. They include
 * information about the input and provide utilities similar to standard
 * HTML events.
 */
export interface IArcEvent {
  // The 'arc' directive reference, may not be filled for elements which
  // are focusable without the directive, like form controls.
  readonly directive?: IArcHandler;
  // `next` is the element that we'll select next, on directional navigation,
  // unless the element is cancelled. This *is* settable and you can use it
  // to modify the focus target. This will be set to `null` on non-directional
  // navigation or if we can't find a subsequent element to select.
  next?: HTMLElement;

  readonly event: Direction;
  readonly target: HTMLElement;
  readonly defaultPrevented: boolean;

  stopPropagation(): void;
  preventDefault(): void;
}

export interface IArcHandler {

  /**
   * Returns the associated DOM element.
   */
  getElement(): HTMLElement;

  /**
   * A method which can return "false" if this handler should not be
   * included as focusable.
   */
  excludeThis?(): boolean;

  /**
   * A method which can return "false" if this handler and all its children
   * should not be included as focusable.
   */
  exclude?(): boolean;

  /**
   * Called with an IArcEvent focus is about
   * to leave this element or one of its children.
   */
  onOutgoing?(ev: IArcEvent): void;

  /**
   * Called with an IArcEvent focus is about
   * to enter this element or one of its children.
   */
  onIncoming?(ev: IArcEvent): void;

  /**
   * Triggers a focus change event.
   */
  onFocus?(el: HTMLElement | null): void;

  arcFocusLeft: HTMLElement | string;
  arcFocusRight: HTMLElement | string;
  arcFocusUp: HTMLElement | string;
  arcFocusDown: HTMLElement | string;
}
