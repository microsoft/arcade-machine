import { ArcDirective } from './arc.directive';
import { NgModule, ModuleWithProviders } from '@angular/core';

import { InputService } from './input.service';
import { FocusService } from './focus.service';
import { RegistryService } from './registry.service';

export { InputService } from './input.service';
export { FocusService } from './focus.service';
export { RegistryService } from './registry.service';
export * from './model';

@NgModule({
  declarations: [ArcDirective],
  exports: [ArcDirective],
})
export class ArcModule {
  public static forRoot(): ModuleWithProviders {
    return {
      ngModule: ArcModule,
      providers: [InputService, FocusService, RegistryService],
    };
  }
}
