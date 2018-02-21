// tslint:disable-next-line no-implicit-dependencies
import 'jasmine';
import { FocusService } from './focus.service';
import { InputService } from './input.service';
import { Direction } from './model';
import { RegistryService } from './registry.service';

describe('input service', () => {
  let fire: jasmine.Spy;
  let input: InputService;
  beforeEach(() => {
    const focusService = new FocusService(new RegistryService());

    input = new InputService(focusService);

    fire = spyOn(input, 'handleDirection');
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

    delete (<any>e).keyCode;
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
});
