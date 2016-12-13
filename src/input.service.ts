import { FocusService } from './focus.service';
import { Direction } from './model';
import { EventEmitter, Injectable } from '@angular/core';
import { Observable } from 'rxjs/Observable';
import { Subject } from 'rxjs/Subject';
import { Subscription } from 'rxjs/Subscription';

import 'rxjs/add/observable/fromEvent';
import 'rxjs/add/observable/merge';

interface IGamepadWrapper {
  // Directional returns from the gamepad. They debounce themselves and
  // trigger again after debounce times.
  left(now: number): boolean;
  right(now: number): boolean;
  up(now: number): boolean;
  down(now: number): boolean;

  // Navigational directions
  tabLeft(now: number): boolean;
  tabRight(now: number): boolean;
  tabUp(now: number): boolean;
  tabDown(now: number): boolean;

  /**
   * Returns if the user is pressing the "back" button.
   */
  back(now: number): boolean;

  /**
   * Returns if the user is pressing the "submit" button.
   */
  submit(now: number): boolean;

  /**
   * Returns if the user is pressing the "X" or "Y" button.
   */
  x(now: number): boolean;
  y(now: number): boolean;

  /**
   * Returns whether the gamepad is still connected;
   */
  isConnected(): boolean;
}

enum DebouncerStage {
  IDLE,
  HELD,
  FAST,
}

/**
 * DirectionalDebouncer debounces directional navigation like arrow keys,
 * handling "holding" states.
 */
class DirectionalDebouncer {

  /**
   * fn is a bound function that can be called to check if the key is held.
   */
  public fn: (time: number) => boolean;

  /**
   * Initial debounce after a joystick is pressed before beginning shorter
   * press debouncded.
   */
  public static initialDebounce = 500;

  /**
   * Fast debounce time for joysticks when they're being held in a direction.
   */
  public static fastDebounce = 150;

  private heldAt = 0;
  private stage = DebouncerStage.IDLE;

  constructor(private predicate: () => boolean) { }

  /**
   * Returns whether the key should be registered as pressed.
   */
  public attempt(now: number): boolean {
    const result = this.predicate();
    if (!result) {
      this.stage = DebouncerStage.IDLE;
      return false;
    }

    switch (this.stage) {
      case DebouncerStage.IDLE:
        this.stage = DebouncerStage.HELD;
        this.heldAt = now;
        return true;

      case DebouncerStage.HELD:
        if (now - this.heldAt < DirectionalDebouncer.initialDebounce) {
          return false;
        }
        this.heldAt = now;
        this.stage = DebouncerStage.FAST;
        return true;

      case DebouncerStage.FAST:
        if (now - this.heldAt < DirectionalDebouncer.fastDebounce) {
          return false;
        }
        this.heldAt = now;
        return true;

      default:
        throw new Error(`Unknown debouncer stage ${this.stage}!`);
    }
  }
}

/**
 * FiredDebouncer handles single "fired" states that happen from button presses.
 */
class FiredDebouncer {
  private fired = false;

  constructor(private predicate: () => boolean) { }

  /**
   * Returns whether the key should be registered as pressed.
   */
  public attempt(): boolean {
    const result = this.predicate();
    const hadFired = this.fired;
    this.fired = result;

    return !hadFired && result;
  }
}

class XboxGamepadWrapper implements IGamepadWrapper {

  /**
   * Mangitude that joysticks have to go in one direction to be translated
   * into a direction key press.
   */
  public static joystickThreshold = 0.5;

  public left: (now: number) => boolean;
  public right: (now: number) => boolean;
  public up: (now: number) => boolean;
  public down: (now: number) => boolean;
  public tabLeft: (now: number) => boolean;
  public tabRight: (now: number) => boolean;
  public tabUp: (now: number) => boolean;
  public tabDown: (now: number) => boolean;
  public back: (now: number) => boolean;
  public submit: (now: number) => boolean;
  public x: (now: number) => boolean;
  public y: (now: number) => boolean;

  constructor(private pad: Gamepad) {
    const left = new DirectionalDebouncer(() => {
      /* left joystick                                 */
      return pad.axes[0] < -XboxGamepadWrapper.joystickThreshold || pad.buttons[Direction.LEFT].pressed;
    });
    const right = new DirectionalDebouncer(() => {
      /* right joystick                               */
      return pad.axes[0] > XboxGamepadWrapper.joystickThreshold || pad.buttons[Direction.RIGHT].pressed;
    });
    const up = new DirectionalDebouncer(() => {
      /* up joystick                                   */
      return pad.axes[1] < -XboxGamepadWrapper.joystickThreshold || pad.buttons[Direction.UP].pressed;
    });
    const down = new DirectionalDebouncer(() => {
      /* down joystick                                */
      return pad.axes[1] > XboxGamepadWrapper.joystickThreshold || pad.buttons[Direction.DOWN].pressed;
    });

    const tabLeft = new FiredDebouncer(() => pad.buttons[Direction.TABLEFT].pressed);
    const tabRight = new FiredDebouncer(() => pad.buttons[Direction.TABRIGHT].pressed);
    const tabUp = new FiredDebouncer(() => pad.buttons[Direction.TABUP].pressed);
    const tabDown = new FiredDebouncer(() => pad.buttons[Direction.TABDOWN].pressed);

    const back = new FiredDebouncer(() => pad.buttons[Direction.BACK].pressed);
    const submit = new FiredDebouncer(() => pad.buttons[Direction.SUBMIT].pressed);
    const x = new FiredDebouncer(() => pad.buttons[Direction.X].pressed);
    const y = new FiredDebouncer(() => pad.buttons[Direction.Y].pressed);

    this.left = now => left.attempt(now);
    this.right = now => right.attempt(now);
    this.up = now => up.attempt(now);
    this.down = now => down.attempt(now);
    this.tabLeft = () => tabLeft.attempt();
    this.tabRight = () => tabRight.attempt();
    this.tabUp = () => tabUp.attempt();
    this.tabDown = () => tabDown.attempt();
    this.back = () => back.attempt();
    this.submit = () => submit.attempt();
    this.x = () => x.attempt();
    this.y = () => y.attempt();
  }

  public isConnected() {
    return this.pad.connected;
  }
}

/**
 * Based on the currently focused DOM element, returns whether the directional
 * input is part of a form control and should be allowed to bubble through.
 */
function isForForm(direction: Direction, selected: Element): boolean {
  if (!selected) {
    return false;
  }

  // Always allow the browser to handle enter key presses in a form or text area.
  const tag = selected.tagName;
  if (direction === Direction.SUBMIT) {
    if (tag === 'TEXTAREA') {
      return true;
    }

    for (let parent = selected; parent; parent = parent.parentElement) {
      if (parent.tagName === 'FORM') {
        return true;
      }
    }

    return false;
  }

  // Okay, not a submission? Well, if we aren't inside a text input, go ahead
  // and let arcade-machine try to deal with the output.
  if (tag !== 'INPUT' && tag !== 'TEXTAREA') {
    return false;
  }

  // We'll say that up/down has no effect.
  if (direction === Direction.DOWN || direction === Direction.UP) {
    return false;
  }

  // Deal with the output ourselves, allowing arcade-machine to handle it only
  // if the key press would not have any effect in the context of the input.
  const input = <HTMLInputElement | HTMLTextAreaElement>selected;
  const cursor = input.selectionStart;
  if (cursor !== input.selectionEnd) { // key input on any range selection will be effectual.
    return true;
  }

  return (cursor > 0 && direction === Direction.LEFT)
    || (cursor > 0 && direction === Direction.BACK)
    || (cursor < input.value.length && direction === Direction.RIGHT);
}

/**
 * InputService handles passing input from the external device (gamepad API
 * or keyboard) to the arc internals.
 */
@Injectable()
export class InputService {

  /**
   * DirectionCodes is a map of directions to key code names.
   */
  public static directionCodes = new Map<Direction, number[]>([
    [Direction.LEFT, [
      37,  // LeftArrow
      214, // GamepadLeftThumbstickLeft
      205, // GamepadDPadLeft
      140, // NavigationLeft
    ]],
    [Direction.RIGHT, [
      39,  // RightArrow
      213, // GamepadLeftThumbstickRight
      206, // GamepadDPadRight
      141, // NavigationRight
    ]],
    [Direction.UP, [
      38,  // UpArrow
      211, // GamepadLeftThumbstickUp
      203, // GamepadDPadUp
      138, // NavigationUp
    ]],
    [Direction.DOWN, [
      40,  // UpArrow
      212, // GamepadLeftThumbstickDown
      204, // GamepadDPadDown
      139, // NavigationDown
    ]],
    [Direction.SUBMIT, [
      13,  // Enter
      32,  // Space
      142, // NavigationAccept
      195, // GamepadA
    ]],
    [Direction.BACK, [
      8,   // Backspace
      196, // GamepadB
    ]],
    [Direction.X, [
      103, // Numpad 7
      197, // GamepadX
    ]],
    [Direction.Y, [
      105,   // Numpad 9
      198, // GamepadY
    ]],
    [Direction.TABLEFT, [
      100, // Numbpad Left
      200, // Left Bumper
    ]],
    [Direction.TABRIGHT, [
      102, // Numpad Right
      199, // Right Bumper
    ]],
    [Direction.TABUP, [
      104, // Numpad Up
      201, // Left Trigger
    ]],
    [Direction.TABDOWN, [
      98, // Numpad Down
      202, // Right Trigger
    ]],
  ]);

  /**
   * Mock source for gamepad connections. You can provide gamepads manually
   * here, but this is mostly for testing purposes.
   */
  public gamepadSrc = new Subject<{ gamepad: Gamepad }>();

  /**
   * Mock source for keyboard events. You can provide events manually
   * here, but this is mostly for testing purposes.
   */
  public keyboardSrc = new Subject<{
    defaultPrevented: boolean,
    keyCode: number,
    preventDefault: () => void,
  }>();

  /**
   * Animation duration for scrolling elements into view, in pixels per second.
   * This can be Infinity to disable the animation, or null to disable scrolling.
   */
  public scrollDuration = 300;

  private gamepads: IGamepadWrapper[] = [];
  private subscriptions: Subscription[] = [];
  private pollRaf: number = null;

  public onYPressed = new EventEmitter<void>();
  public onXPressed = new EventEmitter<void>();
  public onLeftTab = new EventEmitter<void>();
  public onRightTab = new EventEmitter<void>();
  public onLeftTrigger = new EventEmitter<void>();
  public onRightTrigger = new EventEmitter<void>();

  constructor(private focus: FocusService) { }

  /**
   * Bootstrap attaches event listeners from the service to the DOM and sets
   * up the focuser rooted in the target element.
   */
  public bootstrap(root: HTMLElement = document.body) {

    // The gamepadInputEmulation is a string property that exists in
    // JavaScript UWAs and in WebViews in UWAs. It won't exist in
    // Win8.1 style apps or browsers.
    if ('gamepadInputEmulation' in navigator) {
      // We want the gamepad to provide gamepad VK keyboard events rather than moving a
      // mouse like cursor. Set to "keyboard", the gamepad will provide such keyboard events
      // and provide input to the DOM navigator.getGamepads API.
      (<any>navigator).gamepadInputEmulation = 'keyboard';
    } else if (typeof navigator.getGamepads === 'function') {
      // Otherwise poll for connected gamepads and use that for input.
      this.watchForGamepad();
    }

    this.addKeyboardListeners();
    this.focus.setRoot(root);

    this.subscriptions.push(
      Observable.fromEvent<FocusEvent>(document, 'focusin', { passive: true })
        .subscribe(ev => this.focus.onFocusChange(<Element>ev.target))
    );
  }

  /**
   * Unregisters all listeners and frees resources associated with the service.
   */
  public teardown() {
    this.focus.teardown();
    this.gamepads = [];
    cancelAnimationFrame(this.pollRaf);
    while (this.subscriptions.length) {
      this.subscriptions.pop().unsubscribe();
    }

    if ('gamepadInputEmulation' in navigator) {
      (<any>navigator).gamepadInputEmulation = 'mouse';
    }
  }

  /**
   * Detects any connected gamepads and watches for new ones to start
   * polling them. This is the entry point for gamepad input handling.
   */
  private watchForGamepad() {
    const addGamepad = (pad: Gamepad) => {
      let gamepad: IGamepadWrapper;
      if (/xbox/i.test(pad.id)) {
        gamepad = new XboxGamepadWrapper(pad);
      }
      if (!gamepad) {
        // We can try, at least ¯\_(ツ)_/¯ and this should
        // usually be OK due to remapping.
        gamepad = new XboxGamepadWrapper(pad);
      }

      this.gamepads.push(gamepad);
    };

    Array.from(navigator.getGamepads())
      .filter(pad => !!pad)
      .forEach(addGamepad);

    if (this.gamepads.length > 0) {
      this.scheduleGamepadPoll();
    }

    this.subscriptions.push(
      Observable.merge(
        this.gamepadSrc,
        Observable.fromEvent(window, 'gamepadconnected')
      ).subscribe(ev => {
        addGamepad((<any>ev).gamepad);
        cancelAnimationFrame(this.pollRaf);
        this.scheduleGamepadPoll();
      })
    );
  }

  /**
   * Schedules a new gamepad poll at the next animation frame.
   */
  private scheduleGamepadPoll() {
    this.pollRaf = requestAnimationFrame(now => {
      this.pollGamepad(now)
    });
  }

  /**
   * Checks for input provided by the gamepad and fires off events as
   * necessary. It schedules itself again provided that there's still
   * a connected gamepad somewhere.
   */
  private pollGamepad(now: number) {
    navigator.getGamepads(); // refreshes all checked-out gamepads

    for (let i = 0; i < this.gamepads.length; i += 1) {
      const gamepad = this.gamepads[i];
      if (!gamepad.isConnected()) {
        this.gamepads.splice(i, 1);
        i -= 1;
        continue;
      }

      if (gamepad.left(now)) {
        this.handleDirection(Direction.LEFT);
      }
      if (gamepad.right(now)) {
        this.handleDirection(Direction.RIGHT);
      }
      if (gamepad.down(now)) {
        this.handleDirection(Direction.DOWN);
      }
      if (gamepad.up(now)) {
        this.handleDirection(Direction.UP);
      }
      if (gamepad.tabLeft(now)) {
        this.onLeftTab.emit();
      }
      if (gamepad.tabRight(now)) {
        this.onRightTab.emit();
      }
      if (gamepad.tabDown(now)) {
        this.onRightTrigger.emit();
      }
      if (gamepad.tabUp(now)) {
        this.onLeftTrigger.emit();
      }
      if (gamepad.submit(now)) {
        this.handleDirection(Direction.SUBMIT);
      }
      if (gamepad.back(now)) {
        this.handleDirection(Direction.BACK);
      }
      if (gamepad.x(now)) {
        this.onXPressed.emit();
      }
      if (gamepad.y(now)) {
        this.onYPressed.emit();
      }
    }

    if (this.gamepads.length > 0) {
      this.scheduleGamepadPoll();
    } else {
      this.pollRaf = null;
    }
  }

  private handleDirection(direction: Direction): boolean {
    return this.focus.fire(direction, this.scrollDuration);
  }

  /**
   * Handles a key down event, returns whether the event has resulted
   * in a navigation and should be cancelled.
   */
  private handleKeyDown(keyCode: number): boolean {
    let result: boolean;
    InputService.directionCodes.forEach((codes, direction) => {
      // Abort if we already handled the event (can't abort a forEach!)
      // or if we don't have the right code.
      if (result !== undefined || codes.indexOf(keyCode) === -1) {
        return;
      }

      result = !isForForm(direction, this.focus.selected)
        && this.handleDirection(direction);
    });

    return result;
  }

  /**
   * Adds listeners for keyboard events.
   */
  private addKeyboardListeners() {
    this.subscriptions.push(
      Observable.merge(
        this.keyboardSrc,
        Observable.fromEvent<KeyboardEvent>(window, 'keydown')
      ).subscribe(ev => {
        if (!ev.defaultPrevented && this.handleKeyDown(ev.keyCode)) {
          ev.preventDefault();
        }
      })
    );
  }
}
