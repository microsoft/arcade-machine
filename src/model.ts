export const directiveName = 'arc';

/**
 * Direction is an enum of possible gamepad events which can fire.
 */
export enum Direction {
  LEFT = 14,
  RIGHT = 15,
  UP = 12,
  DOWN = 13,
  SUBMIT = 0,
  BACK = 1,
  X = 2,
  Y = 3,
  TABLEFT = 4, // Left Bumper
  TABRIGHT = 5, // Right Bumper
  TABUP = 6, // Left Trigger
  TABDOWN = 7 // Right Trigger
}

/**
 * IArcEvents are fired on an element when an input occurs. They include
 * information about the input and provide utilities similar to standard
 * HTML events.
 */
export interface IArcEvent {
  // The 'arc' directive reference, may not be filled for elements which
  // are focusable without the directive, like form controls.
  readonly directive?: IArcDirective;
  // `next` is the element that we'll select next, on directional navigation,
  // unless the element is cancelled. This *is* settable and you can use it
  // to modify the focus target. This will be set to `null` on non-directional
  // navigation or if we can't find a subsequent element to select.
  next?: Element;

  readonly event: Direction;
  readonly target: Element;
  readonly defaultPrevented: boolean;

  stopPropagation(): void;
  preventDefault(): void;
}

export interface IArcDirective {

  /**
   * Returns the associated DOM element.
   */
  getElement(): Element;

  /**
   * Calls event handlers for the event.
   */
  fireEvent(ev: IArcEvent): void;

  /**
   * Triggers a focus change event.
   */
  onFocus(el: Element): void;
}
