import { Direction } from './focus.service';
import { Injectable } from '@angular/core';

interface GamepadWrapper {
    // Directional returns from the gamepad. They debounce themselves and
    // trigger again after debounce times.
    left(now: number): boolean;
    right(now: number): boolean;
    up(now: number): boolean;
    down(now: number): boolean;

    /**
     * Returns if the user is pressing the "back" button.
     */
    back(now: number): boolean;

    /**
     * Returns if the user is pressing the "submit" button.
     */
    submit(now: number): boolean;

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

class DirectionalDebouncer {

    /**
     * fn is a bound function that can be called to check if the key is held.
     */
    public fn: (time: number) => boolean;

    /**
     * Initial debounce after a joystick is pressed before beginning shorter
     * press debouncded.
     */
    public static JoystickInitialDebounce = 500;

    /**
     * Fast debounce time for joysticks when they're being held in a direction.
     */
    public static JoystickFastDebounce = 200;

    private heldAt = 0;
    private stage = DebouncerStage.IDLE;

    constructor(private predicate: () => boolean) {}

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
            return true;

        case DebouncerStage.HELD:
            if (now - this.heldAt < DirectionalDebouncer.JoystickInitialDebounce) {
                this.heldAt = now;
                return false;
            }
            this.stage = DebouncerStage.FAST;
            return true;

        case DebouncerStage.FAST:
            if (now - this.heldAt < DirectionalDebouncer.JoystickFastDebounce) {
                this.heldAt = now;
                return false;
            }
            return true;

        default:
            throw new Error(`Unknown debouncer stage ${this.stage}!`);
        }
    }
}
class XboxGamepadWrapper implements GamepadWrapper {

    public left: (now: number) => boolean;
    public right: (now: number) => boolean;
    public up: (now: number) => boolean;
    public down: (now: number) => boolean;
    public back: (now: number) => boolean;
    public submit: (now: number) => boolean;

    constructor(private pad: Gamepad) {
        const left = new DirectionalDebouncer(() => pad.axes[0] < -InputService.JoystickThreshold);
        const right = new DirectionalDebouncer(() => pad.axes[0] > InputService.JoystickThreshold);
        const up = new DirectionalDebouncer(() => pad.axes[1] < -InputService.JoystickThreshold);
        const down = new DirectionalDebouncer(() => pad.axes[0] > InputService.JoystickThreshold);
        const back = new DirectionalDebouncer(() => pad.buttons[1].pressed);
        const submit = new DirectionalDebouncer(() => pad.buttons[0].pressed);

        this.left = now => left.attempt(now);
        this.right = now => right.attempt(now);
        this.up = now => up.attempt(now);
        this.down = now => down.attempt(now);
        this.back = now => back.attempt(now);
        this.submit = now => submit.attempt(now);
    }

    public isConnected() {
        return this.pad.connected;
    }
}

/**
 * InputService handles passing input from the external device (gamepad API
 * or keyboard) to the arc internals.
 */
@Injectable()
export class InputService {

    /**
     * Mangitude that joysticks have to go in one direction to be translated
     * into a direction key press.
     */
    public static JoystickThreshold = 0.5;

    /**
     * DirectionCodes is a map of directions to key code names.
     */
    public static DirectionCodes = new Map<Direction, number[]>([
        [Direction.DOWN, []]
    ]);

    private gamepads: GamepadWrapper[];
    private pollRaf: number;

    /**
     * Bootstrap attaches event listeners from the service to the DOM.
     */
    public bootstrap() {
        // The gamepadInputEmulation is a string property that exists in
        // JavaScript UWAs and in WebViews in UWAs. It won't exist in
        // Win8.1 style apps or browsers.
        if (typeof (<any> navigator).gamepadInputEmulation === "string") {
            // We want the gamepad to provide gamepad VK keyboard events rather than moving a
            // mouse like cursor. Set to "keyboard", the gamepad will provide such keyboard events
            // and provide input to the DOM navigator.getGamepads API.
            (<any> navigator).gamepadInputEmulation = "keyboard";
        } else if (typeof navigator.getGamepads === 'function') {
            // Otherwise poll for connected gamepads and use that for input.
            this.watchForGamepad();
        }

        this.addKeyboardListeners();
    }
    /**
     * Detects any connected gamepads and watches for new ones to start
     * polling them. This is the entry point for gamepad input handling.
     */
    private watchForGamepad() {
        const addGamepads = () => {
            // it's not an array, originally, and contains undefined elements.
            this.gamepads = Array.from(navigator.getGamepads())
                .filter(pad => !!pad)
                .map(pad => {
                    if (/xbox/i.test(pad.id)) {
                        return new XboxGamepadWrapper(pad);
                    }

                    // We can try, at least ¯\_(ツ)_/¯ and this should
                    // usually be OK due to remapping.
                    return new XboxGamepadWrapper(pad);
                });
        };

        addGamepads();
        if (this.gamepads.length > 0) {
            this.scheduleGamepadPoll();
        }

        addEventListener('gamepadconnected', () => {
            addGamepads();
            cancelAnimationFrame(this.pollRaf);
            this.scheduleGamepadPoll();
        });
    }

    /**
     * Schedules a new gamepad poll at the next animation frame.
     */
    private scheduleGamepadPoll() {
        this.pollRaf = requestAnimationFrame(now => this.pollGamepad(now));
    }

    /**
     * Checks for input provided by the gamepad and fires off events as
     * necessary. It schedules itself again provided that there's still
     * a connected gamepad somewhere.
     */
    private pollGamepad(now: number) {
        for (let i = 0; i < this.gamepads.length; i++) {
            const gamepad = this.gamepads[i];
            if (!gamepad.isConnected()) {
                this.gamepads.splice(i, 1);
                i -= 1;
                continue;
            }

            if (gamepad.left(now)) {
                this.handleDirection(Direction.LEFT);
            } else if (gamepad.right(now)) {
                this.handleDirection(Direction.RIGHT);
            } else if (gamepad.down(now)) {
                this.handleDirection(Direction.DOWN);
            } else if (gamepad.up(now)) {
                this.handleDirection(Direction.UP);
            } else if (gamepad.submit(now)) {
                this.handleDirection(Direction.SUBMIT);
            } else if (gamepad.back(now)) {
                this.handleDirection(Direction.BACK);
            }
        }

        if (this.gamepads.length > 0) {
            this.scheduleGamepadPoll();
        }
    }


    private handleDirection(direction: Direction): boolean {
        console.log('dir', direction);
        return true;
    }

    /**
     * Handles a key down event, returns whether the event has resulted
     * in a navigation and should be cancelled.
     */
    private handleKeyDown(keyCode: number): boolean {
        let result: boolean;
        InputService.DirectionCodes.forEach((codes, direction) => {
            if (result === undefined && codes.indexOf(keyCode) !== -1) {
                result = this.handleDirection(direction);
            }
        });

        return result;
    }

    /**
     * Adds listeners for keyboard events.
     */
    private addKeyboardListeners() {
        addEventListener('keydown', ev => {
            if (!ev.defaultPrevented && this.handleKeyDown(ev.keyCode)) {
                ev.preventDefault();
            }
        });
    }
}
