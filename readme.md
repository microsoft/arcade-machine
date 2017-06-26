# arcade-machine

arcade-machine is an Angular plugin to provide navigation and interactive semantics using the GamePad API. This allows the application to be navigated using a controller connected to a PC, the PC's keyboard, or on Universal Windows Platform (UWP) web applications running on the Xbox.

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

> By default only elements that explicity have `tabindex > 0` are considered for focus

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

##### [arc-exclude-this]="value"

You can pass a value to `arc-exclude-this` which, if not `false`, exclude this element from arcade-machine's focus.

##### [arc-exclude]="value"

You can pass a value to `arc-exclude-this` which, if not `false`, exclude this element and all its children from arcade-machine's focus.


##### [arc-set-focus]="Observable\<boolean\>"

You can pass an Observable to `arc-set-focus` which, when fired, will forcefully cause the element to be focused.

##### arc-default-focus

When `arc-focus` is on an element, that element will steal the page focus when it's instantiated. Setting this is a shortcut to passing `Observable.of(undefined)` to `arc-set-focus` to immediately trigger a focus capture.

It can also be used with *ngFor. For instance, following will focus the 3rd element in ngFor
```html
<div
  *ngFor="let box of boxes; let i = index"
  arc [arc-default-focus]="i === 2">
</div>
```
##### (arc-capture-outgoing)="onEvent(IArcEvent)"

`arc-capture-outgoing` can be set to handle, and possibly cancel, events sent while the element or one of its children are focused. See the `IArcEvent` type for more details:

##### (arc-capture-incoming)="onEvent(IArcEvent)"

`arc-capture-incoming` can be set to handle, and possibly cancel, events sent while the element is the next target of navigation. See the `IArcEvent` type for more details:

```typescript
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
  SUBMIT = 0,
  BACK = 1,
  X = 2,
  Y = 3,
  TABLEFT = 4, // Left Bumper
  TABRIGHT = 5, // Right Bumper
  TABUP = 6, // Left Trigger
  TABDOWN = 7, // Right Trigger
  UP = 12,
  DOWN = 13,
  LEFT = 14,
  RIGHT = 15,
}
```

##### (arc-focus)="onFocusChange(Element?)"

`arc-focus` is an event that's fired when the element or any of its children gain or lose focus. The newly-selected element will be passed to the function, and `null` will be passed if none of the elements in the node's tree are selected.

##### (arc-submit)="onSubmit(IArcEvent)"

`arc-submit` is a shortcut to create a handler via `arc-capture-outgoing` that fires when a "submit" event is fired.

##### (arc-back)="onBack(IArcEvent)"

`arc-back` is a shortcut to create a handler via `arc-capture-outgoing` that fires when a "back" event is fired.

##### [arc-[left|right|up|down]]="Element"

Allows you to explicitly tell the directive which element to focus when off the element in the provided direction. Again, this is a shortcut to a `arc-capture-outgoing` handler which sets the `next` element if it matches the target direction.

##### [arc-focus-[left|right|up|down]]="Element | CSSQueryString"

Allows you to explicitly tell the directive which element to focus when off the element in the provided direction. This will take precedence over all other FindFocus strategies

### Focus Service

#### trapFocus
```typescript
trapFocus(newRootElem: HTMLElement)
```
To trap the focus inside newRootElem.
To release the focus, call releaseFocus

#### releaseFocus

```typescript
releaseFocus(releaseElem?: HTMLElement)
```
To trap the release the previously trapped focus.
Multiple call to this method will precedurally remove focus traps all the way up to body.
Further calls without releaseElem param will throw a warning on console while keeping the focus at body.
If releaseElem is provided, this method will release focus only if the last trapped focus element was releaseElem.

#### releaseFocus
```typescript
clearAllTraps()
```
Useful for resetting all focus traps e.g. on page navigation

### Classes

By default, the `arc--selected-direct` class is added to the selected node.

### Events
#### arcselectingnode

Fired when arcade machine is about to select a node

#### arcfocuschanging

Fire when arcade-machine is about to call native focus method. This event can be canceled for example to smooth-scroll to the element before focusing it in browser.
