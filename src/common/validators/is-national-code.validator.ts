import {
  registerDecorator,
  ValidationOptions,
  ValidatorConstraint,
  ValidatorConstraintInterface,
} from 'class-validator';

const ALL_DIGIT_EQUAL = [
  '0000000000',
  '1111111111',
  '2222222222',
  '3333333333',
  '4444444444',
  '5555555555',
  '6666666666',
  '7777777777',
  '8888888888',
  '9999999999',
];

const NATIONAL_CODE_PATTERN = /^([0-9]{10})+$/;

export function isValidNationalCode(val: string): boolean {
  if (ALL_DIGIT_EQUAL.includes(val) || !NATIONAL_CODE_PATTERN.test(val)) {
    return false;
  }

  const chArray = Array.from(val);
  const num0 = parseInt(chArray[0], 10) * 10;
  const num2 = parseInt(chArray[1], 10) * 9;
  const num3 = parseInt(chArray[2], 10) * 8;
  const num4 = parseInt(chArray[3], 10) * 7;
  const num5 = parseInt(chArray[4], 10) * 6;
  const num6 = parseInt(chArray[5], 10) * 5;
  const num7 = parseInt(chArray[6], 10) * 4;
  const num8 = parseInt(chArray[7], 10) * 3;
  const num9 = parseInt(chArray[8], 10) * 2;
  const a = parseInt(chArray[9], 10);
  const b = num0 + num2 + num3 + num4 + num5 + num6 + num7 + num8 + num9;
  const c = b % 11;

  return (c < 2 && a === c) || (c >= 2 && 11 - c === a);
}

@ValidatorConstraint({ name: 'isNationalCode', async: false })
export class IsNationalCodeConstraint implements ValidatorConstraintInterface {
  validate(value: unknown): boolean {
    return typeof value === 'string' && isValidNationalCode(value);
  }

  defaultMessage(): string {
    return 'validation.IS_NATIONAL_CODE';
  }
}

export function IsNationalCode(validationOptions?: ValidationOptions) {
  return function (object: object, propertyName: string) {
    registerDecorator({
      target: object.constructor,
      propertyName,
      options: validationOptions,
      constraints: [],
      validator: IsNationalCodeConstraint,
    });
  };
}
