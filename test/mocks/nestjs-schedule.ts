/**
 * Jest stand-in for `@nestjs/schedule`, which ships ESM only and cannot be
 * loaded by the CommonJS unit-test runtime. Decorators become no-ops; unit
 * tests call scheduled methods directly.
 */
export const Cron = (): MethodDecorator => () => undefined;
export const Interval = (): MethodDecorator => () => undefined;
export const Timeout = (): MethodDecorator => () => undefined;

export enum CronExpression {
  EVERY_MINUTE = '*/1 * * * *',
  EVERY_HOUR = '0 0-23/1 * * *',
  EVERY_DAY_AT_MIDNIGHT = '0 0 * * *',
}

export class ScheduleModule {
  static forRoot() {
    return { module: ScheduleModule };
  }
}
