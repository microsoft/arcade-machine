import { EventEmitter, Injectable } from '@angular/core';
import { Observable } from 'rxjs/Observable';
import { Subject } from 'rxjs/Subject';
import { Subscription } from 'rxjs/Subscription';

import 'rxjs/add/observable/fromEvent';
import 'rxjs/add/observable/merge';

import { ArcEvent } from './event';
import { FocusService } from './focus.service';
import { Direction } from './model';

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
   * Returns if the user is pressing the "view" or "menu" button.
   */
  view(now: number): boolean;
  menu(now: number): boolean;

  /**
   * Returns whether the gamepad is still connected;
   */
  isConnected(): boolean;

  /**
   * The actual Gamepad object that can be updated/accessed;
   */
  pad: Gamepad;
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
  public view: (now: number) => boolean;
  public menu: (now: number) => boolean;
  public back: (now: number) => boolean;
  public submit: (now: number) => boolean;
  public x: (now: number) => boolean;
  public y: (now: number) => boolean;

  constructor(public pad: Gamepad) {
    const left = new DirectionalDebouncer(() => {
      /* left joystick                                 */
      return this.pad.axes[0] < -XboxGamepadWrapper.joystickThreshold || this.pad.buttons[Direction.LEFT].pressed;
    });
    const right = new DirectionalDebouncer(() => {
      /* right joystick                               */
      return this.pad.axes[0] > XboxGamepadWrapper.joystickThreshold || this.pad.buttons[Direction.RIGHT].pressed;
    });
    const up = new DirectionalDebouncer(() => {
      /* up joystick                                   */
      return this.pad.axes[1] < -XboxGamepadWrapper.joystickThreshold || this.pad.buttons[Direction.UP].pressed;
    });
    const down = new DirectionalDebouncer(() => {
      /* down joystick                                */
      return this.pad.axes[1] > XboxGamepadWrapper.joystickThreshold || this.pad.buttons[Direction.DOWN].pressed;
    });

    const tabLeft = new FiredDebouncer(() => this.pad.buttons[Direction.TABLEFT].pressed);
    const tabRight = new FiredDebouncer(() => this.pad.buttons[Direction.TABRIGHT].pressed);
    const tabUp = new FiredDebouncer(() => this.pad.buttons[Direction.TABUP].pressed);
    const tabDown = new FiredDebouncer(() => this.pad.buttons[Direction.TABDOWN].pressed);

    const view = new FiredDebouncer(() => this.pad.buttons[Direction.VIEW].pressed);
    const menu = new FiredDebouncer(() => this.pad.buttons[Direction.MENU].pressed);

    const back = new FiredDebouncer(() => this.pad.buttons[Direction.BACK].pressed);
    const submit = new FiredDebouncer(() => this.pad.buttons[Direction.SUBMIT].pressed);
    const x = new FiredDebouncer(() => this.pad.buttons[Direction.X].pressed);
    const y = new FiredDebouncer(() => this.pad.buttons[Direction.Y].pressed);

    this.left = now => left.attempt(now);
    this.right = now => right.attempt(now);
    this.up = now => up.attempt(now);
    this.down = now => down.attempt(now);
    this.tabLeft = () => tabLeft.attempt();
    this.tabRight = () => tabRight.attempt();
    this.tabUp = () => tabUp.attempt();
    this.tabDown = () => tabDown.attempt();
    this.view = () => view.attempt();
    this.menu = () => menu.attempt();
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
  if (direction === Direction.SUBMIT) {
    for (let parent = selected; parent; parent = parent.parentElement) {
      if (parent.tagName === 'FORM' || parent.tagName === 'INPUT' || parent.tagName === 'TEXTAREA') {
        return true;
      }
    }

    return false;
  }

  // Okay, not a submission? Well, if we aren't inside a text input, go ahead
  // and let arcade-machine try to deal with the output.
  const tag = selected.tagName;
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

  if (input.type !== 'text' && input.type !== 'search' && input.type !== 'url' && input.type !== 'tel' && input.type !== 'password') {
    return false;
  }

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
   * Inputpane and boolean to indicate whether it's visible
   */
  public inputPane = (<any>window).Windows ? Windows.UI.ViewManagement.InputPane.getForCurrentView() : null;

  public get keyboardVisible(): boolean {
    return !!this.inputPane && (this.inputPane.occludedRect.y !== 0 || this.inputPane.visible);
  }

  /**
   * directionFromCode returns a direction from keyCode
   */
  public directionFromCode(keyCode: number): Direction {
    switch (keyCode) {
      case 37:  // LeftArrow
      case 214: // GamepadLeftThumbstickLeft
      case 205: // GamepadDPadLeft
      case 140: // NavigationLeft
        return Direction.LEFT;
      case 39:  // RightArrow
      case 213: // GamepadLeftThumbstickRight
      case 206: // GamepadDPadRight
      case 141: // NavigationRight
        return Direction.RIGHT;
      case 38:  // UpArrow
      case 211: // GamepadLeftThumbstickUp
      case 203: // GamepadDPadUp
      case 138: // NavigationUp
        return Direction.UP;
      case 40:  // DownArrow
      case 212: // GamepadLeftThumbstickDown
      case 204: // GamepadDPadDown
      case 139: // NavigationDown
        return Direction.DOWN;
      case 13:  // Enter
      case 32:  // Space
      case 142: // NavigationAccept
      case 195: // GamepadA
        return Direction.SUBMIT;
      case 8:   // Backspace
      case 196: // GamepadB
        return Direction.BACK;
      case 103: // Numpad 7
      case 197: // GamepadX
        return Direction.X;
      case 105: // Numpad 9
      case 198: // GamepadY
        return Direction.Y;
      case 100: // Numbpad Left
      case 200: // Left Bumper
        return Direction.TABLEFT;
      case 102: // Numpad Right
      case 199: // Right Bumper
        return Direction.TABRIGHT;
      case 104: // Numpad Up
      case 201: // Left Trigger
        return Direction.TABUP;
      case 98:  // Numpad Down
      case 202: // Right Trigger
        return Direction.TABDOWN;
      case 111: // Numpad Divide
      case 208: // View Button
        return Direction.VIEW;
      case 106: // Numpad Multiply
      case 207: // Menu Button
        return Direction.MENU;
      default:
        return null;
    }
  }

  public onYPressed = new EventEmitter<ArcEvent>();
  public onXPressed = new EventEmitter<ArcEvent>();
  public onAPressed = new EventEmitter<ArcEvent>();
  public onBPressed = new EventEmitter<ArcEvent>();
  public onLeftTab = new EventEmitter<ArcEvent>();
  public onRightTab = new EventEmitter<ArcEvent>();
  public onLeftTrigger = new EventEmitter<ArcEvent>();
  public onRightTrigger = new EventEmitter<ArcEvent>();
  public onView = new EventEmitter<ArcEvent>();
  public onMenu = new EventEmitter<ArcEvent>();
  public onLeft = new EventEmitter<ArcEvent>();
  public onRight = new EventEmitter<ArcEvent>();
  public onUp = new EventEmitter<ArcEvent>();
  public onDown = new EventEmitter<ArcEvent>();

  /**
   * DirectionCodes is a map of directions to key code names.
   */
  public directionEmitters = new Map<Direction, EventEmitter<ArcEvent>>([
    [Direction.LEFT, this.onLeft],
    [Direction.RIGHT, this.onRight],
    [Direction.UP, this.onUp],
    [Direction.DOWN, this.onDown],
    [Direction.SUBMIT, this.onAPressed],
    [Direction.BACK, this.onBPressed],
    [Direction.X, this.onXPressed],
    [Direction.Y, this.onYPressed],
    [Direction.TABLEFT, this.onLeftTab],
    [Direction.TABRIGHT, this.onRightTab],
    [Direction.TABDOWN, this.onRightTrigger],
    [Direction.TABUP, this.onLeftTrigger],
    [Direction.VIEW, this.onView],
    [Direction.MENU, this.onMenu],
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
   * Animation speed in pixels per second for scrolling elements into view.
   * This can be Infinity to disable the animation, or null to disable scrolling.
   */
  public scrollSpeed = 1000;

  private subscriptions: Subscription[] = [];
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
      // mouse like cursor. The gamepad will provide such keyboard events and provide
      // input to the DOM
      (<any>navigator).gamepadInputEmulation = 'keyboard';
    }

    this.addKeyboardListeners();
    this.focus.setRoot(root, this.scrollSpeed);

    this.subscriptions.push(
      Observable.fromEvent<FocusEvent>(document, 'focusin', { passive: true })
        .subscribe(ev => this.focus.onFocusChange(<HTMLElement>ev.target, this.scrollSpeed)),
    );
  }

  /**
   * Unregisters all listeners and frees resources associated with the service.
   */
  public teardown() {
    this.focus.teardown();
    this.subscriptions.forEach(sub => sub.unsubscribe());

    if ('gamepadInputEmulation' in navigator) {
      (<any>navigator).gamepadInputEmulation = 'mouse';
    }
  }

  public setRoot(root: HTMLElement) {
    this.focus.setRoot(root, this.scrollSpeed);
  }

  private handleDirection(ev: ArcEvent): boolean {
    const event = ev.event;
    if (event === Direction.UP || event === Direction.RIGHT ||
      event === Direction.DOWN || event === Direction.LEFT ||
      event === Direction.SUBMIT || event === Direction.BACK) {
      return this.focus.fire(ev);
    }
    return false;
  }

  /**
   * Handles a key down event, returns whether the event has resulted
   * in a navigation and should be cancelled.
   */
  private handleKeyDown(keyCode: number): boolean {
    const direction = this.directionFromCode(keyCode);
    if (!direction) {
      return false;
    }

    let result: boolean;
    const ev = this.focus.createArcEvent(direction);
    const forForm = isForForm(direction, this.focus.selected);
    result = !forForm && this.handleDirection(ev);
    this.directionEmitters.get(direction).emit(ev);
    if (!forForm) {
      result = result || this.focus.defaultFires(ev);
    }

    return result;
  }

  /**
   * Adds listeners for keyboard events.
   */
  private addKeyboardListeners() {
    this.subscriptions.push(
      Observable.merge(
        this.keyboardSrc,
        Observable.fromEvent<KeyboardEvent>(window, 'keydown'),
      ).subscribe(ev => {
        if (!ev.defaultPrevented && this.handleKeyDown(ev.keyCode)) {
          ev.preventDefault();
        }
      }),
    );
  }
}
