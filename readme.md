# arcade-machine

arcade-machine is an Angular plugin to provide navigation and interactive semantics using the GamePad API. This allows the application to be navigated using a controller connected to a PC, the PC's keyboard, or on Univsersal Windows Platform (UWP) web applications running on the Xbox.

> See the [reference controller](https://i-msdn.sec.s-msft.com/en-us/windows/uwp/input-and-devices/images/designing-for-tv/hardware-buttons-gamepad-remote.png) for mappings with buttons.

We use [WinJS' navigation algorithm](https://github.com/winjs/winjs/blob/master/src/js/WinJS/XYFocus.ts#L11) to move between focusable components on the page. Most interactive components, including link tags `<a>`, buttons, and form controls are able to receive focus by default, and for those which are not focusable by default you can use the `arc` directive.

> Here we have a basic app which contains three buttons. The user can use their joystick to navigate between each selectable button. Note that the app itself is marked as focusable; this is how bootstrapping is done. More on this in a minute.
>
> ```html
> <my-app arc>
>   <button>Button 1</button>
>   <button>Button 2</button>
>   <button>Button 3</button>
> </my-app>
> ```

For the majority of navigation, we represent controller actions as keyboard events; the left joystick or arrow keys on a keyboard can be used to fire up, down, left, and right events in order to navigate the page. We determine the next element to focus in a direction using WinJS' algorithm based on each focusable element's physical location, but you can also fine tune what happens when via directives. This can help to avoid [inaccessible UI](https://msdn.microsoft.com/windows/uwp/input-and-devices/designing-for-tv#inaccessible-ui) and provide more fined-tuned experiences on each platform.

It's possible that an element contains multiple other elements which can be focused. For instance,

## Demo App

You can see a demo Angular 2 app in the `demo` folder and run it locally with `npm start`.

## Usage

### Directives & Attributes

##### arc

You must define `arc` directive on element which you want to be focusable that are not otherwise focusable, or when you want to define custom logic. That is, anything except the following tags:

- `a`
- `button`
- `input`
- `select`
- `textarea`

##### [arc-set-focus]="Observable\<boolean\>"

You can pass an Observable to `arc-set-focus` which, when fired, will forcefully cause the element to be focused.

##### arc-default-focus

When `arc-focus` is on an element, that element will steal the page focus when it's instantiated. Setting this is a shortcut to passing `Observable.of(undefined)` to `arc-set-focus` to immediately trigger a focus capture.

##### (arc-capture)="onEvent(IArcEvent)"

`arc-capture` can be set to handle, and possibly cancel, events sent while the element or one of its children are focused. See the `IArcEvent` type for more details:

```typescript
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

/**
 * Direction is an enum of possible gamepad events which can fire.
 */
export enum Direction {
  LEFT,
  RIGHT,
  UP,
  DOWN,
  SUBMIT,
  BACK,
}
```



##### (arc-focus)="onFocusChange(Element?)"

`arc-focus` is an event that's fired when the element or any of its children gain or lose focus. The newly-selected element will be passed to the function, and `null` will be passed if none of the elements in the node's tree are selected.

##### (arc-submit)="onSubmit(IArcEvent)"

`arc-submit` is a shortcut to create a handler via `arc-capture` that fires when a "submit" event is fired.

##### (arc-back)="onBack(IArcEvent)"

`arc-back` is a shortcut to create a handler via `arc-capture` that fires when a "back" event is fired.

##### [arc-[left|right|up|down]]="ElementRef"

Allows you to explicitly tell the directive which element to focus when off the element in the provided direction. Again, this is a shortcut to a `arc-capture` handler which sets the `next` element if it matches the target direction.

### Classes

By default, the `arc--selected` class is added to any element which is selected or who has a child element selected. An `arc--selected-direct` class is additionally added to the lowermost node in the tree which is selected.
