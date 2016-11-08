import { ArcDirective } from './arc.directive';
import { NgModule } from '@angular/core';

export { InputService } from './input.service';
export { FocusService } from './focus.service';
export { RegistryService } from './registry.service';
export * from './model';

@NgModule({
  declarations: [ArcDirective],
  exports: [ArcDirective],
})
export class ArcModule {
}
