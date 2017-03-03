import { EventEmitter, Injectable } from '@angular/core';
import { Observable } from 'rxjs/Observable';
import { Subject } from 'rxjs/Subject';
import { Subscription } from 'rxjs/Subscription';

import 'rxjs/add/observable/fromEvent';
import 'rxjs/add/observable/merge';

import { ArcEvent } from './event';
import { FocusService } from './focus.service';
import { Direction } from './model';

const directionNumsList: number[] = Object.keys(Direction).map(dir => Number(dir)).filter(n => !isNaN(n));

interface IGamepadWrapper {
  /**
   * Map from a direction to a function that takes in a time (now)
   * and returns whether that direction fired
   */
  events: Map<Direction, (now: number) => boolean>;

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
   * Magnitude that joysticks have to go in one direction to be translated
   * into a direction key press.
   */
  public static joystickThreshold = 0.5;

  /**
   * Map from Direction to a function that takes a time (now) and returns
   * whether that direction fired
   */
  public events = new Map<Direction, (now: number) => boolean>();

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

    this.events.set(Direction.LEFT, now => left.attempt(now));
    this.events.set(Direction.RIGHT, now => right.attempt(now));
    this.events.set(Direction.UP, now => up.attempt(now));
    this.events.set(Direction.DOWN, now => down.attempt(now));

    directionNumsList
      .filter(dir => dir !== Direction.LEFT && dir !== Direction.RIGHT && dir !== Direction.UP && dir !== Direction.DOWN)
      .forEach(dir => this.events.set(dir, () => (new FiredDebouncer(() => this.pad.buttons[dir].pressed).attempt())));
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
   * codeToDirection returns a direction from keyCode
   */
  public codeDirectionMap = new Map<number, Direction>([
    [37, Direction.LEFT],      // LeftArrow
    [214, Direction.LEFT],     // GamepadLeftThumbstickLeft
    [205, Direction.LEFT],     // GamepadDPadLeft
    [140, Direction.LEFT],     // NavigationLeft
    [39, Direction.RIGHT],     // RightArrow
    [213, Direction.RIGHT],    // GamepadLeftThumbstickRight
    [206, Direction.RIGHT],    // GamepadDPadRight
    [141, Direction.RIGHT],    // NavigationRight
    [38, Direction.UP],        // UpArrow
    [211, Direction.UP],       // GamepadLeftThumbstickUp
    [203, Direction.UP],       // GamepadDPadUp
    [138, Direction.UP],       // NavigationUp
    [40, Direction.DOWN],      // DownArrow
    [212, Direction.DOWN],     // GamepadLeftThumbstickDown
    [204, Direction.DOWN],     // GamepadDPadDown
    [139, Direction.DOWN],     // NavigationDown
    [13, Direction.SUBMIT],    // Enter
    [32, Direction.SUBMIT],    // Space
    [142, Direction.SUBMIT],   // NavigationAccept
    [195, Direction.SUBMIT],   // GamepadA
    [8, Direction.BACK],       // Backspace
    [196, Direction.BACK],     // GamepadB
    [103, Direction.X],        // Numpad 7
    [197, Direction.X],        // GamepadX
    [105, Direction.Y],        // Numpad 9
    [198, Direction.Y],        // GamepadY
    [100, Direction.TABLEFT],  // Numbpad Left
    [200, Direction.TABLEFT],  // Left Bumper
    [102, Direction.TABRIGHT], // Numpad Right
    [199, Direction.TABRIGHT], // Right Bumper
    [104, Direction.TABUP],    // Numpad Up
    [201, Direction.TABUP],    // Left Trigger
    [98, Direction.TABDOWN],   // Numpad Down
    [202, Direction.TABDOWN],  // Right Trigger
    [111, Direction.VIEW],     // Numpad Divide
    [208, Direction.VIEW],     // View Button
    [106, Direction.MENU],     // Numpad Multiply
    [207, Direction.MENU],     // Menu Button
  ]);

  /**
   * Map from a direction to its (global) ArcEvent emitter
   */
  public emitters = new Map<Direction, EventEmitter<ArcEvent>>();

  /**
   * Shortcut to get an event emitter
   */
  public on(direction: Direction): EventEmitter<ArcEvent> {
    return this.emitters.get(direction);
  }

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

  private gamepads: { [key: string]: IGamepadWrapper } = {};
  private subscriptions: Subscription[] = [];
  private pollRaf: number = null;

  constructor(private focus: FocusService) { }

  /**
   * Bootstrap attaches event listeners from the service to the DOM and sets
   * up the focuser rooted in the target element.
   */
  public bootstrap(root: HTMLElement = document.body) {
    directionNumsList.forEach(num => this.emitters.set(num, new EventEmitter<ArcEvent>()));

    // The gamepadInputEmulation is a string property that exists in
    // JavaScript UWAs and in WebViews in UWAs. It won't exist in
    // Win8.1 style apps or browsers.
    if ('gamepadInputEmulation' in navigator) {
      // We want the gamepad to provide gamepad VK keyboard events rather than moving a
      // mouse like cursor. The gamepad will provide such keyboard events and provide
      // input to the DOM
      (<any>navigator).gamepadInputEmulation = 'keyboard';
    } else if (typeof navigator.getGamepads === 'function') {
      // Poll connected gamepads and use that for input if keyboard emulation isn't available
      this.watchForGamepad();
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
    this.gamepads = {};
    if (this.pollRaf) { cancelAnimationFrame(this.pollRaf); }
    this.subscriptions.forEach(sub => sub.unsubscribe());

    if ('gamepadInputEmulation' in navigator) {
      (<any>navigator).gamepadInputEmulation = 'mouse';
    }
  }

  public setRoot(root: HTMLElement) {
    this.focus.setRoot(root, this.scrollSpeed);
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

      this.gamepads[pad.id] = gamepad;
    };

    Array.from(navigator.getGamepads())
      .filter(pad => !!pad)
      .forEach(addGamepad);

    if (Object.keys(this.gamepads).length > 0) {
      this.scheduleGamepadPoll();
    }

    this.subscriptions.push(
      Observable.merge(
        this.gamepadSrc,
        Observable.fromEvent(window, 'gamepadconnected'),
      ).subscribe(ev => {
        addGamepad((<any>ev).gamepad);
        cancelAnimationFrame(this.pollRaf);
        this.scheduleGamepadPoll();
      }),
    );
  }

  /**
   * Schedules a new gamepad poll at the next animation frame.
   */
  private scheduleGamepadPoll() {
    this.pollRaf = requestAnimationFrame(now => {
      this.pollGamepad(now);
    });
  }

  /**
   * Checks for input provided by the gamepad and fires off events as
   * necessary. It schedules itself again provided that there's still
   * a connected gamepad somewhere.
   */
  private pollGamepad(now: number) {
    const rawpads = Array.from(navigator.getGamepads()).filter(pad => !!pad); // refreshes all checked-out gamepads

    for (let i = 0; i < rawpads.length; i += 1) {
      const gamepad = this.gamepads[rawpads[i].id];
      if (!gamepad) {
        continue;
      }
      gamepad.pad = rawpads[i];

      if (!gamepad.isConnected()) {
        delete this.gamepads[rawpads[i].id];
        continue;
      }

      if (this.keyboardVisible) {
        continue;
      }

      directionNumsList
        .forEach(dir => {
          if (gamepad.events.get(dir)(now)) {
            this.handleDirection(dir);
          }
        });
    }

    if (Object.keys(this.gamepads).length > 0) {
      this.scheduleGamepadPoll();
    } else {
      this.pollRaf = null;
    }
  }

  private bubbleDirection(ev: ArcEvent): boolean {
    const event = ev.event;
    if (event === Direction.UP || event === Direction.RIGHT ||
      event === Direction.DOWN || event === Direction.LEFT ||
      event === Direction.SUBMIT || event === Direction.BACK) {
      return this.focus.bubble(ev);
    }
    return false;
  }

  /**
   * Handles a key down event, returns whether the event has resulted
   * in a navigation and should be cancelled.
   */
  private handleKeyDown(keyCode: number): boolean {
    const direction = this.codeDirectionMap.get(keyCode);
    return direction === undefined ? false : this.handleDirection(direction);
  }

  /**
   * Handles a direction event, returns whether the event has been handled
   */
  private handleDirection(direction: Direction): boolean {
    let dirHandled: boolean;
    const ev = this.focus.createArcEvent(direction);
    const forForm = isForForm(direction, this.focus.selected);
    dirHandled = !forForm && this.bubbleDirection(ev);
    this.emitters.get(direction).emit(ev);
    if (!forForm && !dirHandled) {
      return this.focus.defaultFires(ev);
    }

    return false;
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
