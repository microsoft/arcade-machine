import { Direction, IArcDirective, IArcEvent } from './model';
import { RegistryService } from './registry.service';
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

function createDirectionCapture(direction: Direction, target: Element) {
  if (!target) {
    throw new Error(
      `Cannot set [arc-${Direction[direction]}] to an undefined element!` +
      'Make sure the element you\'re passing is defined correctly.'
    );
  }

  return (ev: IArcEvent) => {
    if (ev.event === direction && !ev.defaultPrevented) {
      ev.next = target;
    }
  };
}

@Directive({ selector: '[arc]' })
export class ArcDirective implements OnInit, OnDestroy, IArcDirective {

  // 'Primitive' I/O handlers: ================================================

  @Input('arc-set-focus')
  public arcSetFocus: Observable<void> = Observable.never<void>();

  @Output('arc-capture')
  public arcCapture = new EventEmitter<IArcEvent>();

  @Output('arc-focus')
  public arcFocus = new EventEmitter<Element>();

  @Input('arc-default-focus')
  public set arcDefaultFocus(ignored: any) {
    this.arcSetFocus = this.arcSetFocus.startWith(undefined);
  }

  // Directional/event shortcuts: =============================================

  @Output('arc-submit')
  public arcSubmit = new EventEmitter<IArcEvent>();

  @Output('arc-back')
  public arcBack = new EventEmitter<IArcEvent>();

  @Input('arc-left')
  public set arcLeft(target: Element) {
    this.handlers.push(createDirectionCapture(Direction.LEFT, target));
  }

  @Input('arc-right')
  public set arcRight(target: Element) {
    this.handlers.push(createDirectionCapture(Direction.RIGHT, target));
  }

  @Input('arc-up')
  public set arcUp(target: Element) {
    this.handlers.push(createDirectionCapture(Direction.UP, target));
  }

  @Input('arc-down')
  public set arcDown(target: Element) {
    this.handlers.push(createDirectionCapture(Direction.DOWN, target));
  }

  private handlers: ((ev: IArcEvent) => void)[] = [];

  constructor(
    private el: ElementRef,
    private registry: RegistryService
  ) {}

  public ngOnInit() {
    this.registry.add(this);
    this.arcSetFocus.subscribe(() => this.registry.setFocus.next(this.el.nativeElement));
  }

  public ngOnDestroy() {
    this.registry.remove(this);
  }

  public getElement() {
    return this.el.nativeElement;
  }

  public fireEvent(ev: IArcEvent) {
    this.arcCapture.emit(ev);

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

  public onFocus(el: Element) {
    this.arcFocus.next(el);
  }
}
