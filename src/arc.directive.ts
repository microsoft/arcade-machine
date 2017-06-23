import {
  Directive,
  ElementRef,
  EventEmitter,
  Input,
  OnDestroy,
  OnInit,
  Output,
} from '@angular/core';
import { Observable } from 'rxjs/Observable';

import 'rxjs/add/observable/never';
import 'rxjs/add/operator/startWith';

import { Direction, IArcEvent, IArcHandler } from './model';
import { RegistryService } from './registry.service';

function createDirectionCapture(direction: Direction, target: HTMLElement) {
  if (!target) {
    throw new Error(
      `Cannot set [arc-${Direction[direction]}] to an undefined element!` +
      'Make sure the element you\'re passing is defined correctly.',
    );
  }

  return (ev: IArcEvent) => {
    if (ev.event === direction && !ev.defaultPrevented) {
      ev.next = target;
    }
  };
}

@Directive({ selector: '[arc]' })
export class ArcDirective implements OnInit, OnDestroy, IArcHandler {

  // 'Primitive' I/O handlers: ================================================

  @Input('arc-set-focus')
  public arcSetFocus: Observable<void> = Observable.never<void>();

  @Output('arc-capture-outgoing')
  public arcCaptureOutgoing = new EventEmitter<IArcEvent>();

  @Output('arc-capture-incoming')
  public arcCaptureIncoming = new EventEmitter<IArcEvent>();

  @Output('arc-focus')
  public arcFocus = new EventEmitter<HTMLElement>();

  @Input('arc-default-focus')
  public set arcDefaultFocus(_ignored: any) {
    this.arcSetFocus = this.arcSetFocus.startWith(undefined);
  }

  @Input('arc-exclude')
  public set arcExclude(exclude: any) {
    this.innerExclude = exclude !== false;
  }

  @Input('arc-exclude-this')
  public set arcExcludeThis(exclude: any) {
    this.innerExcludeThis = exclude !== false;
  }

  // Directional/event shortcuts: =============================================

  @Output('arc-submit')
  public arcSubmit = new EventEmitter<IArcEvent>();

  @Output('arc-back')
  public arcBack = new EventEmitter<IArcEvent>();

  @Input('arc-left')
  public set arcLeft(target: HTMLElement) {
    this.handlers.push(createDirectionCapture(Direction.LEFT, target));
  }

  @Input('arc-right')
  public set arcRight(target: HTMLElement) {
    this.handlers.push(createDirectionCapture(Direction.RIGHT, target));
  }

  @Input('arc-up')
  public set arcUp(target: HTMLElement) {
    this.handlers.push(createDirectionCapture(Direction.UP, target));
  }

  @Input('arc-down')
  public set arcDown(target: HTMLElement) {
    this.handlers.push(createDirectionCapture(Direction.DOWN, target));
  }

  @Input('arc-focus-left')
  public arcFocusLeft: HTMLElement | string;

  @Input('arc-focus-right')
  public arcFocusRight: HTMLElement | string;

  @Input('arc-focus-up')
  public arcFocusUp: HTMLElement | string;

  @Input('arc-focus-down')
  public arcFocusDown: HTMLElement | string;

  private handlers: ((ev: IArcEvent) => void)[] = [];
  private innerExcludeThis = false;
  private innerExclude = false;

  constructor(
    private el: ElementRef,
    private registry: RegistryService,
  ) { }

  public ngOnInit() {
    this.registry.add(this);
    if (!this.innerExclude && !this.innerExcludeThis) {
      this.el.nativeElement.tabIndex = 0;
    }
    this.arcSetFocus.subscribe(() => this.registry.setFocus.next(this.el.nativeElement));
  }

  public ngOnDestroy() {
    this.registry.remove(this);
  }

  public getElement(): HTMLElement {
    return this.el.nativeElement;
  }

  public excludeThis(): boolean {
    return this.innerExcludeThis;
  }

  public exclude(): boolean {
    return this.innerExclude;
  }

  public onOutgoing(ev: IArcEvent): void {
    this.arcCaptureOutgoing.emit(ev);

    switch (ev.event) {
      case Direction.SUBMIT:
        this.arcSubmit.next(ev);
        break;
      case Direction.BACK:
        this.arcBack.next(ev);
        break;
      default:
      // ignore
    }

    for (let i = 0; i < this.handlers.length; i += 1) {
      this.handlers[i](ev);
    }
  }

  public onIncoming(ev: IArcEvent) {
    this.arcCaptureIncoming.emit(ev);
  }

  public onFocus(el: HTMLElement): void {
    this.arcFocus.next(el);
  }
}
