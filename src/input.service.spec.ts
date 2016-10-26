import { InputService } from './input.service';
import { Direction } from './model';

describe('input service', () => {
  let fire: jasmine.Spy;
  let setRoot: jasmine.Spy;
  let input: InputService;
  beforeEach(() => {
    fire = jasmine.createSpy('fire');
    setRoot = jasmine.createSpy('fire');
    input = new InputService(<any> {
      fire,
      setRoot,
      teardown: () => { /* noop */},
    });
  });

  afterEach(() => input.teardown());

  // from http://stackoverflow.com/questions/18001169/how-do-i-trigger-a-keyup
  // -keydown-event-in-an-angularjs-unit-test
  const sendKeyDown = (target: HTMLElement, keyCode: number) => {
    const e = new KeyboardEvent('keydown', {
      bubbles: true,
      cancelable: true,
      shiftKey: true,
    });

    delete e.keyCode;
    Object.defineProperty(e, 'keyCode', { value: keyCode });
    target.dispatchEvent(e);
  };

  describe('keyboard events', () => {
    beforeEach(() => input.bootstrap());

    it('triggers key events', () => {
      sendKeyDown(document.body, 40);
      expect(fire).toHaveBeenCalledWith(Direction.DOWN);
    });

    it('does not trigger events when defaults have been prevented', () => {
      const handler = (ev: KeyboardEvent) => ev.preventDefault();
      document.body.addEventListener('keydown', handler);
      sendKeyDown(document.body, 40);
      expect(fire).not.toHaveBeenCalledWith(Direction.DOWN);
    });
  });

  it('enables virtual keyboards when they\'re present', () => {
    const nav: any = navigator;
    nav.gamepadInputEmulation = 'mouse';
    input.bootstrap();
    expect(nav.gamepadInputEmulation).toEqual('keyboard');
    input.teardown();
    expect(nav.gamepadInputEmulation).toEqual('mouse');
    delete nav.gamepadInputEmulation;
  });

  describe('gamepads', () => {
    beforeEach(() => input.bootstrap());

    const createFakeGamepad = () => {
      const pad = {
        id: 'xbox one controller',
        connected: true,
        axes: [0, 0],
        buttons: <{ pressed: boolean }[]> [],
      };
      for (let i = 0; i < 15; i += 1) {
        pad.buttons.push({ pressed: false });
      }
      return pad;
    };

    const afterTwoFrames = (fn: () => void) => {
      requestAnimationFrame(() => requestAnimationFrame(fn));
    };

    it('polls gamepads when they are connected, and disconnects', done => {
      const pad = createFakeGamepad();
      input.gamepadSrc.next({ gamepad: <any> pad });
      pad.axes[0] = -1;
      pad.buttons[0].pressed = true;
      afterTwoFrames(() => {
        expect(fire).toHaveBeenCalledWith(Direction.LEFT);
        expect(fire).toHaveBeenCalledWith(Direction.SUBMIT);
        expect((<any> input).pollRaf).toBeTruthy();
        pad.connected = false;

        afterTwoFrames(() => {
          expect((<any> input).pollRaf).toBeNull();
          done();
        });
      });
    });

    it('starts triggering fast presses after an amount of time', done => {
      const pad = createFakeGamepad();
      input.gamepadSrc.next({ gamepad: <any> pad });
      pad.axes[0] = -1;
      setTimeout(() => expect(fire.calls.count()).toEqual(1), 400);
      setTimeout(() => expect(fire.calls.count()).toEqual(2), 550);
      setTimeout(
        () => {
          expect(fire.calls.count()).toEqual(4);
          done();
        },
        850
      );
    });

    it('starts triggers when joysticks are newly moved', done => {
      const pad = createFakeGamepad();
      input.gamepadSrc.next({ gamepad: <any> pad });
      pad.axes[0] = -1;
      afterTwoFrames(() => {
        expect(fire.calls.count()).toEqual(1);
        pad.axes[0] = 0;
        afterTwoFrames(() => {
          expect(fire.calls.count()).toEqual(1);
          pad.axes[0] = -1;
          afterTwoFrames(() => {
            expect(fire.calls.count()).toEqual(2);
            done();
          });
        });
      });
    });

    it('starts triggers when buttons are newly pressed', done => {
      const pad = createFakeGamepad();
      input.gamepadSrc.next({ gamepad: <any> pad });
      pad.buttons[0].pressed = true;
      afterTwoFrames(() => {
        expect(fire.calls.count()).toEqual(1);
        pad.buttons[0].pressed = false;
        afterTwoFrames(() => {
          expect(fire.calls.count()).toEqual(1);
          pad.buttons[0].pressed = true;
          afterTwoFrames(() => {
            expect(fire.calls.count()).toEqual(2);
            done();
          });
        });
      });
    });
  });
});
